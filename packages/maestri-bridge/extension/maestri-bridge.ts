import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	buildBridgeReply,
	buildBridgeRequest,
	extractFinalAssistantOutcome,
	formatBridgeTask,
	formatVerifiedBridgeReply,
	isBridgeCandidate,
	isBridgeReplyCandidate,
	isValidTerminalName,
	parseBridgeInput,
	parseBridgeReplyInput,
	parseBridgeSecret,
	type AssistantOutcome,
	type BridgeRequest,
} from "./maestri-bridge/protocol.ts";

const SECRET_PATH = join(homedir(), ".pi", "agent", "maestri-bridge.secret");
const SOURCE_ASK_TIMEOUT_MS = 10 * 60 * 1000;
const TRANSPORT_SUBMIT_TIMEOUT_MS = 20 * 1000;
const REPLY_TIMEOUT_MS = 30 * 1000;
const OUTBOUND_RECORD_TTL_MS = SOURCE_ASK_TIMEOUT_MS + REPLY_TIMEOUT_MS + 60 * 1000;
export const REPLAY_CACHE_LIMIT = 256;
const REPLAY_GRACE_MS = 60 * 1000;
export const INBOUND_WORK_LIMIT = 8;
const AUDIT_ENTRY_TYPE = "maestri-pi-bridge";

type RequestAdmission = "new" | "replay" | "saturated";

interface PendingRequest {
	request: BridgeRequest;
	latestMessages: readonly unknown[];
	hasEnded: boolean;
}

interface DeferredReply {
	requestId: string;
	result: string;
}

interface MaestriEnvironment {
	cli: string;
}

interface MaestriTerminalList {
	self: string | undefined;
	connected: ReadonlySet<string>;
}

function maestriEnvironment(): MaestriEnvironment | undefined {
	const cli = process.env.MAESTRI_CLI;
	const socket = process.env.MAESTRI_SOCKET;
	const terminalId = process.env.MAESTRI_TERMINAL_ID;
	return cli && socket && terminalId ? { cli } : undefined;
}

async function bridgeSecret(): Promise<Buffer | undefined> {
	try {
		return parseBridgeSecret(await readFile(SECRET_PATH, "utf8"));
	} catch {
		return undefined;
	}
}

function executableResultError(action: string): Error {
	return new Error(`Maestri bridge could not ${action}. Run \`maestri debug\` from this terminal.`);
}

async function runMaestri(
	pi: ExtensionAPI,
	environment: MaestriEnvironment,
	args: string[],
	timeout: number,
	signal?: AbortSignal,
): Promise<string> {
	const result = await pi.exec(environment.cli, args, {
		cwd: process.cwd(),
		timeout,
		signal,
	});
	if (result.killed || result.code !== 0) throw executableResultError(args[0] ?? "run its command");
	return result.stdout.trim();
}

function parseQuotedName(value: string): string | undefined {
	// `maestri list` emits a JSON-quoted name and may append local metadata,
	// for example `- name: "Dante", maestro: true` for the active maestro.
	const match = /^("(?:\\.|[^"\\])*")(?:\s*,.*)?$/.exec(value.trim());
	if (!match) return undefined;

	try {
		const parsed: unknown = JSON.parse(match[1]!);
		return typeof parsed === "string" && isValidTerminalName(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function parseMaestriTerminalList(listOutput: string): MaestriTerminalList {
	let section: "you" | "connected" | undefined;
	let self: string | undefined;
	const connected = new Set<string>();

	for (const line of listOutput.split("\n")) {
		const heading = line.trim();
		if (heading === "You:") {
			section = "you";
			continue;
		}
		if (heading === "Connected agents:") {
			section = "connected";
			continue;
		}
		if (heading.endsWith(":")) {
			section = undefined;
			continue;
		}

		// Only direct list rows use the documented two-space depth. Nested rows,
		// including future `- name:` children, are never directly reachable peers.
		const match = line.match(/^ {2}- name: (.+?)\s*$/);
		if (!match || !section) continue;
		const name = parseQuotedName(match[1]!);
		if (!name) continue;
		if (section === "you" && self === undefined) self = name;
		if (section === "connected") connected.add(name);
	}

	return { self, connected };
}

async function loadMaestriTerminalList(
	pi: ExtensionAPI,
	environment: MaestriEnvironment,
	signal?: AbortSignal,
): Promise<MaestriTerminalList> {
	return parseMaestriTerminalList(await runMaestri(pi, environment, ["list"], 10_000, signal));
}

function replyResult(outcome: AssistantOutcome): string {
	return outcome.status === "ok"
		? outcome.text
		: `Target did not produce a deliverable final answer: ${outcome.reason}.`;
}

function audit(pi: ExtensionAPI, event: string, requestId: string, replyTo?: string): void {
	try {
		pi.appendEntry(AUDIT_ENTRY_TYPE, {
			version: 1,
			event,
			requestId,
			replyTo,
			at: new Date().toISOString(),
		});
	} catch {
		console.error("[maestri-pi-bridge] audit persistence failed");
	}
}

export default function (pi: ExtensionAPI) {
	let pending: PendingRequest | undefined;
	let settling = false;
	const deferredReplies: DeferredReply[] = [];
	let inboundWorkCount = 0;
	const seenRequestIds = new Map<string, number>();

	const claimInboundWork = (): boolean => {
		if (inboundWorkCount >= INBOUND_WORK_LIMIT) return false;
		inboundWorkCount += 1;
		return true;
	};

	const releaseInboundWork = (): void => {
		inboundWorkCount -= 1;
	};
	const outboundRequestIds = new Map<string, number>();

	const pruneExpired = (cache: Map<string, number>, now: number): void => {
		for (const [id, expiresAt] of cache) {
			if (expiresAt <= now) cache.delete(id);
		}
	};

	const claimIncomingRequest = (request: BridgeRequest): RequestAdmission => {
		const now = Date.now();
		pruneExpired(seenRequestIds, now);
		if (seenRequestIds.has(request.id)) return "replay";
		if (seenRequestIds.size >= REPLAY_CACHE_LIMIT) return "saturated";
		seenRequestIds.set(request.id, request.expiresAt + REPLAY_GRACE_MS);
		return "new";
	};

	const rememberOutboundRequest = (requestId: string): boolean => {
		const now = Date.now();
		pruneExpired(outboundRequestIds, now);
		if (outboundRequestIds.size >= REPLAY_CACHE_LIMIT) return false;
		outboundRequestIds.set(requestId, now + OUTBOUND_RECORD_TTL_MS);
		return true;
	};

	const claimOutboundReply = (requestId: string): boolean => {
		const now = Date.now();
		pruneExpired(outboundRequestIds, now);
		if (!outboundRequestIds.has(requestId)) return false;
		outboundRequestIds.delete(requestId);
		return true;
	};

	const sendAskBack = async (request: BridgeRequest, outcome: AssistantOutcome): Promise<void> => {
		const environment = maestriEnvironment();
		const secret = await bridgeSecret();
		if (!environment || !secret) throw executableResultError("access the authenticated Maestri bridge");

		const reply = buildBridgeReply({ secret, requestId: request.id, result: replyResult(outcome) });
		await runMaestri(pi, environment, ["ask", request.replyTo, reply.input], REPLY_TIMEOUT_MS);
	};

	const rejectRequest = async (request: BridgeRequest, reason: string, auditEvent: string): Promise<void> => {
		try {
			await sendAskBack(request, { status: "error", reason });
			audit(pi, auditEvent, request.id, request.replyTo);
		} catch {
			console.error("[maestri-pi-bridge] rejection delivery failed");
		}
	};

	const deliverDeferredReplies = (replies: readonly DeferredReply[]): void => {
		if (replies.length === 0) return;

		// One-shot deferral, not polling: send after agent_settled has fully unwound so
		// an unrelated reply cannot become part of the just-completed target run.
		setTimeout(() => {
			void (async () => {
				for (const reply of replies) {
					try {
						await pi.sendUserMessage(formatVerifiedBridgeReply(reply.result), { deliverAs: "followUp" });
						audit(pi, "verified-reply-delivered", reply.requestId);
					} catch {
						console.error("[maestri-pi-bridge] deferred reply delivery failed");
					}
				}
			})();
		}, 0);
	};

	const handleReplyInput = async (text: string, ctx: { ui: { notify(message: string, type?: "info" | "warning" | "error"): void } }, defer: boolean) => {
		const secret = await bridgeSecret();
		if (!secret) {
			ctx.ui.notify("Pi↔Maestri bridge reply ignored: local bridge secret is unavailable.", "warning");
			return { action: "handled" as const };
		}

		const parsedReply = parseBridgeReplyInput(text, secret);
		if (parsedReply.kind !== "valid" || !claimOutboundReply(parsedReply.reply.id)) {
			ctx.ui.notify("Pi↔Maestri bridge reply ignored: it is invalid, expired, replayed, or not awaited by this terminal.", "warning");
			return { action: "handled" as const };
		}

		if (defer) {
			deferredReplies.push({ requestId: parsedReply.reply.id, result: parsedReply.result });
			audit(pi, "verified-reply-deferred", parsedReply.reply.id);
			return { action: "handled" as const };
		}

		audit(pi, "verified-reply-received", parsedReply.reply.id);
		return { action: "transform" as const, text: formatVerifiedBridgeReply(parsedReply.result) };
	};

	pi.on("input", async (event, ctx) => {
		const requestCandidate = isBridgeCandidate(event.text);
		const replyCandidate = isBridgeReplyCandidate(event.text);
		const hasInboundBridgeWork = requestCandidate || replyCandidate;

		// Claim before any secret, topology, audit, or ask-back I/O. Excess
		// candidates are deliberately handled without a side effect or queue.
		if (hasInboundBridgeWork && !claimInboundWork()) return { action: "handled" };

		try {
			// A target owns an exclusive completion boundary. All non-request input,
			// including another valid bridge reply, is handled rather than transformed.
			if (pending || settling) {
				if (replyCandidate) return await handleReplyInput(event.text, ctx, true);
				if (!requestCandidate) {
					ctx.ui.notify("Pi↔Maestri bridge task is active; local input was not delivered. Re-enter it after the bridge reply completes.", "warning");
					return { action: "handled" };
				}
			}

			if (replyCandidate) return await handleReplyInput(event.text, ctx, false);
			if (!requestCandidate) return;

			const secret = await bridgeSecret();
			if (!secret) {
				ctx.ui.notify("Pi↔Maestri bridge request ignored: local bridge secret is unavailable.", "warning");
				return { action: "handled" };
			}

			const parsed = parseBridgeInput(event.text, secret);
			if (parsed.kind !== "valid") {
				ctx.ui.notify("Pi↔Maestri bridge request ignored: its signed envelope is invalid.", "warning");
				return { action: "handled" };
			}

			const environment = maestriEnvironment();
			if (!environment) {
				ctx.ui.notify("Pi↔Maestri bridge request ignored outside a Maestri terminal.", "warning");
				return { action: "handled" };
			}

			let terminals: MaestriTerminalList;
			try {
				terminals = await loadMaestriTerminalList(pi, environment);
			} catch {
				ctx.ui.notify("Pi↔Maestri bridge request ignored: this terminal identity could not be verified.", "warning");
				return { action: "handled" };
			}
			if (!terminals.self || parsed.request.replyTo === terminals.self || !terminals.connected.has(parsed.request.replyTo)) {
				ctx.ui.notify("Pi↔Maestri bridge request ignored: its reply route is not a directly connected peer.", "warning");
				audit(pi, "reply-route-rejected", parsed.request.id, parsed.request.replyTo);
				return { action: "handled" };
			}

			const admission = claimIncomingRequest(parsed.request);
			if (admission === "replay") {
				ctx.ui.notify("Pi↔Maestri bridge request ignored: duplicate request ID.", "warning");
				return { action: "handled" };
			}
			if (admission === "saturated") {
				await rejectRequest(parsed.request, "target bridge request capacity is full; retry after existing request IDs expire", "capacity-rejected");
				return { action: "handled" };
			}

			if (pending || settling || event.streamingBehavior !== undefined || !ctx.isIdle()) {
				await rejectRequest(parsed.request, "target was busy, so this request was not delivered to its active Pi task; retry after it is idle", "busy-rejected");
				return { action: "handled" };
			}

			pending = { request: parsed.request, latestMessages: [], hasEnded: false };
			audit(pi, "accepted", parsed.request.id, parsed.request.replyTo);
			return { action: "transform", text: formatBridgeTask(parsed.task) };
		} finally {
			if (hasInboundBridgeWork) releaseInboundWork();
		}
	});

	pi.on("agent_end", (event) => {
		if (!pending || settling) return;
		pending.latestMessages = event.messages;
		pending.hasEnded = true;
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (!pending || settling || !pending.hasEnded) return;
		settling = true;
		const accepted = pending;
		const outcome = extractFinalAssistantOutcome(accepted.latestMessages);

		try {
			await sendAskBack(accepted.request, outcome);
			audit(pi, outcome.status === "ok" ? "reply-sent" : "reply-sent-error-outcome", accepted.request.id, accepted.request.replyTo);
		} catch {
			audit(pi, "reply-delivery-failed", accepted.request.id, accepted.request.replyTo);
			ctx.ui.notify("Pi↔Maestri bridge could not deliver the final answer; the requester may retry.", "error");
		} finally {
			pending = undefined;
			settling = false;
			deliverDeferredReplies(deferredReplies.splice(0));
		}
	});

	pi.registerTool({
		name: "maestri_ask",
		label: "Ask a Maestri Pi peer",
		description:
			"Send a signed, deterministic request to an idle Pi terminal directly connected through Maestri and wait for its verified final answer. Use this instead of shelling out to `maestri ask` when the target runs this same bridge.",
		promptSnippet: "maestri_ask(target, prompt) — ask an idle directly connected bridge-enabled Pi peer",
		promptGuidelines: [
			"Use maestri_ask for a bridge-enabled Pi peer instead of invoking maestri ask through a shell.",
			"Treat a busy rejection as a real transport outcome; do not retry automatically.",
		],
		parameters: Type.Object({
			target: Type.String({ minLength: 1, maxLength: 128, description: "Exact directly connected Maestri terminal name of the bridge-enabled Pi peer" }),
			prompt: Type.String({ minLength: 1, maxLength: 24 * 1024, description: "Task for that peer" }),
		}),
		executionMode: "sequential",
		execute: async (_toolCallId, params, signal) => {
			const environment = maestriEnvironment();
			if (!environment) throw executableResultError("ask from a non-Maestri terminal");

			const secret = await bridgeSecret();
			if (!secret) throw new Error(`Pi↔Maestri bridge secret is unavailable at ${SECRET_PATH}.`);

			const terminals = await loadMaestriTerminalList(pi, environment, signal);
			const replyTo = terminals.self;
			if (!replyTo) throw executableResultError("determine this terminal's Maestri identity");
			if (!isValidTerminalName(params.target)) throw new Error("The target is not a valid Maestri terminal name.");
			if (params.target === replyTo) throw new Error("A Pi↔Maestri bridge request cannot target its own terminal.");
			if (!terminals.connected.has(params.target)) {
				throw new Error("The target is not directly connected to this Maestri terminal. Choose an exact name from `maestri list` → Connected agents.");
			}

			const outbound = buildBridgeRequest({ secret, replyTo, task: params.prompt });
			if (!rememberOutboundRequest(outbound.request.id)) {
				throw new Error("Pi↔Maestri bridge has too many unresolved requests; wait for replies or expiry before sending another request.");
			}
			audit(pi, "requested", outbound.request.id, replyTo);

			// Fire-and-forget transport: `maestri ask` types the prompt into the
			// target PTY almost immediately, then BLOCKS waiting for completion
			// detection (pi runs as agentType "custom", which never fires it). The
			// verified answer returns asynchronously through the signed inbound
			// channel, so the caller's session must NEVER be held open awaiting the
			// CLI. We submit a bounded detached exec; a killed-at-bound process has
			// still delivered the prompt (ask-back on the target flows regardless),
			// so only a real non-zero CLI exit is treated as an undelivered transport.
			const submitTransport = async (): Promise<void> => {
				const result = await pi.exec(environment.cli, ["ask", params.target, outbound.input], {
					cwd: process.cwd(),
					timeout: TRANSPORT_SUBMIT_TIMEOUT_MS,
				});
				if (result.killed) {
					audit(pi, "transport-submitted", outbound.request.id, replyTo);
					return;
				}
				if (result.code !== 0) throw executableResultError(`ask ${params.target}`);
				audit(pi, "transport-ok", outbound.request.id, replyTo);
			};

			void submitTransport().catch((error) => {
				outboundRequestIds.delete(outbound.request.id);
				audit(pi, "transport-failed", outbound.request.id, replyTo);
				try {
					pi.sendUserMessage(
						`Pi↔Maestri bridge could not deliver maestri_ask to ${params.target}: ${(error as Error)?.message ?? String(error)}`,
						{ deliverAs: "followUp" },
					);
				} catch {
					// sendUserMessage is best-effort void; a throw here must not mask the transport failure.
				}
			});

			return {
				content: [
					{
						type: "text",
						text: `Bridge request ${outbound.request.id} transport submitted to ${params.target}. Its signed peer reply is delivered separately as a verified incoming Pi message.`,
					},
				],
				details: { requestId: outbound.request.id, target: params.target },
			};
		},
	});

	pi.registerCommand("maestri-bridge", {
		description: "Show whether this Pi session can use the local Pi↔Maestri bridge",
		handler: async (_args, ctx) => {
			const ready = Boolean(maestriEnvironment()) && Boolean(await bridgeSecret());
			ctx.ui.notify(
				ready
					? "Pi↔Maestri bridge ready: use the maestri_ask tool for bridge-enabled Pi peers."
					: "Pi↔Maestri bridge inactive: this terminal needs Maestri environment variables and the local bridge secret.",
				ready ? "info" : "warning",
			);
		},
	});
}
