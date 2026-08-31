import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	BridgeRequestTracker,
	DetachedTransportQueue,
} from "./maestri-bridge/bridge-state.ts";
import {
	type ConfigurationReadIssue,
	findTerminalLaunchConfiguration,
} from "./maestri-bridge/maestri-config.ts";
import {
	type MaestriTerminalList,
	parseMaestriTerminalList,
} from "./maestri-bridge/maestri-list.ts";
import {
	type AssistantOutcome,
	type BridgeRequest,
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
} from "./maestri-bridge/protocol.ts";
import {
	agentDir,
	consumeProcessLaunchMode,
	exposeLaunchModeForRestart,
	isManagedLaunch,
	isValidTerminalId,
	MAESTRI_TERMINAL_ID_ENV,
	type PinLaunchMode,
	pinnedSessionFileForTerminal,
	recordSessionForTerminal,
	terminalPinState,
} from "./maestri-bridge/session-pinning.ts";

// The agent directory mirrors Pi's own resolution: the bridge test seam,
// then PI_CODING_AGENT_DIR, then ~/.pi/agent (see session-pinning.ts).
const AGENT_DIR = agentDir();
const SECRET_PATH = join(AGENT_DIR, "maestri-bridge.secret");
const WRAPPER_PATH = join(AGENT_DIR, "bin", "pi-maestri");
const MAESTRI_CONFIG_HOME =
	process.env.PI_MAESTRI_CONFIG_HOME ??
	join(process.env.HOME ?? "", ".maestri");
const SOURCE_ASK_TIMEOUT_MS = 10 * 60 * 1000;
const TRANSPORT_SUBMIT_TIMEOUT_MS = 20 * 1000;
const REPLY_WINDOW_MS = 30 * 1000;
const OUTBOUND_RECORD_TTL_MS =
	SOURCE_ASK_TIMEOUT_MS + REPLY_WINDOW_MS + 60 * 1000;
export const REPLAY_CACHE_LIMIT = 256;
export const REPLAY_GRACE_MS = 60 * 1000;
export const INBOUND_WORK_LIMIT = 8;
export const INJECTED_DELIVERY_LIMIT = 256;
export const INJECTED_DELIVERY_TTL_MS = 60 * 1000;
const AUDIT_ENTRY_TYPE = "maestri-pi-bridge";

interface PendingRequest {
	request: BridgeRequest;
	latestMessages: readonly unknown[];
	hasEnded: boolean;
	/** True while this request holds a reply-capacity reservation (H2). */
	replyReserved: boolean;
}

interface DeferredReply {
	requestId: string;
	result: string;
	/** Delivery attempts so far; a reply is requeued until delivered (G1). */
	attempts: number;
}

interface MaestriEnvironment {
	cli: string;
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
	return new Error(
		`Maestri bridge could not ${action}. Run \`maestri debug\` from this terminal.`,
	);
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
	if (result.killed || result.code !== 0)
		throw executableResultError(args[0] ?? "run its command");
	return result.stdout.trim();
}

async function loadMaestriTerminalList(
	pi: ExtensionAPI,
	environment: MaestriEnvironment,
	signal?: AbortSignal,
): Promise<MaestriTerminalList> {
	return parseMaestriTerminalList(
		await runMaestri(pi, environment, ["list"], 10_000, signal),
	);
}

function replyResult(outcome: AssistantOutcome): string {
	return outcome.status === "ok"
		? outcome.text
		: `Target did not produce a deliverable final answer: ${outcome.reason}.`;
}

export default function (pi: ExtensionAPI) {
	const restartCapablePi = pi as ExtensionAPI & {
		registerRestartLauncher?: (executable: string) => void;
	};
	const terminalId = process.env[MAESTRI_TERMINAL_ID_ENV];
	if (
		terminalId &&
		isValidTerminalId(terminalId) &&
		typeof restartCapablePi.registerRestartLauncher === "function"
	) {
		restartCapablePi.registerRestartLauncher(WRAPPER_PATH);
	}

	// Consume wrapper ownership before a user command can spawn descendants.
	// The mode remains process-local; nested bare Pi processes cannot inherit it.
	const pinLaunchMode: PinLaunchMode = consumeProcessLaunchMode();
	let pending: PendingRequest | undefined;
	const deferredReplies: DeferredReply[] = [];
	let inboundWorkCount = 0;
	const tracker = new BridgeRequestTracker({
		replayLimit: REPLAY_CACHE_LIMIT,
		replayGraceMs: REPLAY_GRACE_MS,
		outboundRecordTtlMs: OUTBOUND_RECORD_TTL_MS,
	});
	// Every detached `maestri ask` transport is a live process for up to
	// TRANSPORT_SUBMIT_TIMEOUT_MS. Replies to accepted requests queue (never
	// dropped); courtesy rejections are droppable and never queued.
	const transports = new DetachedTransportQueue(4, 16);
	// Counted exact texts of deferred-reply deliveries we injected ourselves.
	// The input boundary consumes each extension-source token once whether idle
	// or busy; entries are count-, capacity-, and time-bounded. A Map preserves
	// duplicate-text delivery semantics.
	const injectedDeliveries = new Map<
		string,
		{ count: number; expiresAt: number }
	>();
	let injectedDeliveryCount = 0;

	const pruneInjectedDeliveries = (now: number = Date.now()): void => {
		for (const [text, entry] of injectedDeliveries) {
			if (entry.expiresAt <= now) {
				injectedDeliveryCount -= entry.count;
				injectedDeliveries.delete(text);
			}
		}
	};

	const registerInjectedDelivery = (text: string): boolean => {
		const now = Date.now();
		pruneInjectedDeliveries(now);
		if (injectedDeliveryCount >= INJECTED_DELIVERY_LIMIT) return false;
		const current = injectedDeliveries.get(text);
		injectedDeliveries.set(text, {
			count: (current?.count ?? 0) + 1,
			expiresAt: now + INJECTED_DELIVERY_TTL_MS,
		});
		injectedDeliveryCount += 1;
		return true;
	};

	const consumeInjectedDelivery = (text: string): boolean => {
		pruneInjectedDeliveries();
		const entry = injectedDeliveries.get(text);
		if (entry === undefined) return false;
		injectedDeliveryCount -= 1;
		if (entry.count <= 1) injectedDeliveries.delete(text);
		else injectedDeliveries.set(text, { ...entry, count: entry.count - 1 });
		return true;
	};

	const claimInboundWork = (): boolean => {
		if (inboundWorkCount >= INBOUND_WORK_LIMIT) return false;
		inboundWorkCount += 1;
		return true;
	};

	const releaseInboundWork = (): void => {
		inboundWorkCount -= 1;
	};

	function audit(
		pi: ExtensionAPI,
		event: string,
		requestId: string,
		replyTo?: string,
	): void {
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

	// ── Session-file pinning ─────────────────────────────────────────────
	let unmanagedWarningShown = false;
	const warnUnmanaged = (ctx: {
		ui: { notify(message: string, type?: "warning"): void };
	}): void => {
		if (unmanagedWarningShown) return;
		unmanagedWarningShown = true;
		const message =
			"This Pi was started directly inside Maestri, not through pi-maestri. " +
			"Session continuity is not protected until restart_runtime re-enters through pi-maestri.";
		console.error(`[maestri-pi-bridge] ${message}`);
		ctx.ui.notify(message, "warning");
	};

	const recordLiveSession = (ctx: {
		ui: { notify(message: string, type?: "warning"): void };
		sessionManager: {
			getSessionId(): string;
			getSessionFile(): string | undefined;
		};
	}): void => {
		const terminalId = process.env[MAESTRI_TERMINAL_ID_ENV];
		if (!terminalId) return;
		if (pinLaunchMode === "unmanaged") {
			warnUnmanaged(ctx);
			return;
		}
		if (pinLaunchMode === "disabled") return;
		try {
			if (!isValidTerminalId(terminalId)) {
				throw new Error("MAESTRI_TERMINAL_ID is not a canonical UUID");
			}
			const sessionId = ctx.sessionManager.getSessionId();
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionId || !sessionFile)
				throw new Error("current session is not persistable");
			const recorded = recordSessionForTerminal(
				terminalId,
				sessionId,
				sessionFile,
			);
			if (recorded === "rejected")
				throw new Error("current session identity failed validation");
			// v2 provenance is embedded in the same concrete file so recovery can
			// bind the terminal back to the containing JSONL after map-store loss.
			pi.appendEntry(AUDIT_ENTRY_TYPE, {
				version: 2,
				event: "session-pinned",
				terminalId,
				sessionId,
				sessionFile,
				launchMode: pinLaunchMode,
				at: new Date().toISOString(),
			});
		} catch (error) {
			const message = `Session continuity could not be recorded: ${(error as Error)?.message ?? String(error)}`;
			console.error(`[maestri-pi-bridge] ${message}`);
			ctx.ui.notify(message, "warning");
		}
	};

	// startup/reload/new/resume/fork covers /new, /resume, /fork, and /clone;
	// navigation, naming, and compaction remain inside the same concrete file.
	pi.on("session_start", (_event, ctx) => {
		recordLiveSession(ctx);
	});

	// Pi restart re-execs from the current concrete session. Re-expose the
	// consumed capability only during that deliberate restart boundary.
	pi.on("session_shutdown", (event) => {
		if ((event as { reason: string }).reason === "restart")
			exposeLaunchModeForRestart(pinLaunchMode);
	});

	// ── Detached ask-back transport (D2) ────────────────────────────────────
	// `maestri ask` types the reply into the requester's PTY almost
	// immediately, then BLOCKS waiting for completion detection that never
	// fires for agentType "custom". Awaiting it therefore stalls the settled
	// handler and every kill-at-bound used to be misreported as a delivery
	// failure. The submit is fire-and-forget with a bounded exec: a
	// killed-at-bound process has still typed the reply (delivered), and only
	// a real non-zero exit means the transport actually failed.
	const submitAskBack = async (
		request: BridgeRequest,
		outcome: AssistantOutcome,
	): Promise<"ok" | "submitted"> => {
		const environment = maestriEnvironment();
		const secret = await bridgeSecret();
		if (!environment || !secret)
			throw executableResultError("access the authenticated Maestri bridge");

		const reply = buildBridgeReply({
			secret,
			requestId: request.id,
			result: replyResult(outcome),
		});
		const result = await pi.exec(
			environment.cli,
			["ask", request.replyTo, reply.input],
			{
				cwd: process.cwd(),
				timeout: TRANSPORT_SUBMIT_TIMEOUT_MS,
			},
		);
		// Killed-at-bound means the CLI was still blocked on completion
		// detection after typing the reply — delivery already happened.
		if (result.killed) return "submitted";
		if (result.code !== 0)
			throw executableResultError(`reply to ${request.replyTo}`);
		return "ok";
	};

	const rejectRequest = (
		request: BridgeRequest,
		reason: string,
		auditEvent: string,
	): void => {
		audit(pi, auditEvent, request.id, request.replyTo);
		const submission = transports.submitRejection(() =>
			submitAskBack(request, { status: "error", reason }),
		);
		if (!submission.done) {
			audit(pi, "rejection-transport-dropped", request.id, request.replyTo);
			return;
		}
		void submission.done
			.then((transport) => {
				audit(
					pi,
					transport === "ok"
						? "rejection-transport-ok"
						: "rejection-transport-submitted",
					request.id,
					request.replyTo,
				);
			})
			.catch(() => {
				audit(pi, "rejection-transport-failed", request.id, request.replyTo);
				console.error("[maestri-pi-bridge] rejection delivery failed");
			});
	};

	const deliverDeferredReplies = (replies: readonly DeferredReply[]): void => {
		if (replies.length === 0) return;

		// One-shot deferral, not polling: send after agent_settled has fully unwound so
		// an unrelated reply cannot become part of the just-completed target run.
		// Register the exact texts first: when a follow-up re-enters the input
		// handler while another bridge request is pending, the gate below must
		// let our own deliveries through instead of eating them (H1). A delivery
		// that itself fails is unregistered again so its count cannot linger.
		const admitted: DeferredReply[] = [];
		const rejected: DeferredReply[] = [];
		for (const reply of replies) {
			if (registerInjectedDelivery(formatVerifiedBridgeReply(reply.result))) {
				admitted.push(reply);
			} else {
				rejected.push(reply);
				audit(pi, "verified-reply-requeued", reply.requestId);
			}
		}
		deferredReplies.unshift(...rejected);
		if (admitted.length === 0) return;
		setTimeout(() => {
			void (async () => {
				for (const reply of admitted) {
					const text = formatVerifiedBridgeReply(reply.result);
					try {
						await pi.sendUserMessage(text, { deliverAs: "followUp" });
						audit(pi, "verified-reply-delivered", reply.requestId);
					} catch {
						// The claimed reply is never dropped: unregister the injection
						// (no extension-source input will arrive) and requeue it so the
						// next settle boundary retries — exactly once, until delivered.
						consumeInjectedDelivery(text);
						reply.attempts += 1;
						if (reply.attempts >= 3) {
							audit(pi, "verified-reply-undeliverable", reply.requestId);
							console.error(
								"[maestri-pi-bridge] deferred reply could not be delivered after 3 attempts",
							);
						} else {
							deferredReplies.unshift(reply);
							audit(pi, "verified-reply-requeued", reply.requestId);
						}
					}
				}
			})();
		}, 0);
	};

	const handleReplyInput = async (
		text: string,
		ctx: {
			ui: {
				notify(message: string, type?: "info" | "warning" | "error"): void;
			};
		},
		defer: boolean,
	) => {
		const secret = await bridgeSecret();
		if (!secret) {
			ctx.ui.notify(
				"Pi↔Maestri bridge reply ignored: local bridge secret is unavailable.",
				"warning",
			);
			return { action: "handled" as const };
		}

		const parsedReply = parseBridgeReplyInput(text, secret);
		if (
			parsedReply.kind !== "valid" ||
			!tracker.claimOutboundReply(parsedReply.reply.id)
		) {
			ctx.ui.notify(
				"Pi↔Maestri bridge reply ignored: it is invalid, expired, replayed, or not awaited by this terminal.",
				"warning",
			);
			return { action: "handled" as const };
		}

		if (defer) {
			deferredReplies.push({
				requestId: parsedReply.reply.id,
				result: parsedReply.result,
				attempts: 0,
			});
			audit(pi, "verified-reply-deferred", parsedReply.reply.id);
			return { action: "handled" as const };
		}

		audit(pi, "verified-reply-received", parsedReply.reply.id);
		return {
			action: "transform" as const,
			text: formatVerifiedBridgeReply(parsedReply.result),
		};
	};

	pi.on("input", async (event, ctx) => {
		const requestCandidate = isBridgeCandidate(event.text);
		const replyCandidate = isBridgeReplyCandidate(event.text);
		const hasInboundBridgeWork = requestCandidate || replyCandidate;

		// Claim before any secret, topology, audit, or ask-back I/O. Excess
		// candidates are deliberately handled without a side effect or queue.
		if (hasInboundBridgeWork && !claimInboundWork())
			return { action: "handled" };

		try {
			// An exact extension-sourced delivery token is provenance for this event,
			// independent of whether a bridge task happens to be active. Consume it
			// once at the boundary so an idle delivery cannot become a stale bypass.
			if (
				event.source === "extension" &&
				!hasInboundBridgeWork &&
				consumeInjectedDelivery(event.text)
			)
				return;

			// A target owns an exclusive completion boundary for the duration of the
			// bridge task. All non-request input, including another valid bridge
			// reply, is handled rather than transformed.
			if (pending) {
				if (replyCandidate)
					return await handleReplyInput(event.text, ctx, true);
				if (!requestCandidate) {
					ctx.ui.notify(
						"Pi↔Maestri bridge task is active; local input was not delivered. Re-enter it after the bridge reply completes.",
						"warning",
					);
					return { action: "handled" };
				}
			}

			if (replyCandidate) return await handleReplyInput(event.text, ctx, false);
			if (!requestCandidate) return;

			const secret = await bridgeSecret();
			if (!secret) {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored: local bridge secret is unavailable.",
					"warning",
				);
				return { action: "handled" };
			}

			const parsed = parseBridgeInput(event.text, secret);
			if (parsed.kind !== "valid") {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored: its signed envelope is invalid.",
					"warning",
				);
				return { action: "handled" };
			}

			const environment = maestriEnvironment();
			if (!environment) {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored outside a Maestri terminal.",
					"warning",
				);
				return { action: "handled" };
			}

			let terminals: MaestriTerminalList;
			try {
				terminals = await loadMaestriTerminalList(pi, environment);
			} catch {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored: this terminal identity could not be verified.",
					"warning",
				);
				return { action: "handled" };
			}
			if (
				!terminals.self ||
				parsed.request.replyTo === terminals.self ||
				!terminals.connected.has(parsed.request.replyTo)
			) {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored: its reply route is not a directly connected peer.",
					"warning",
				);
				audit(
					pi,
					"reply-route-rejected",
					parsed.request.id,
					parsed.request.replyTo,
				);
				return { action: "handled" };
			}

			const admission = tracker.claimIncomingRequest(parsed.request);
			if (admission === "replay") {
				ctx.ui.notify(
					"Pi↔Maestri bridge request ignored: duplicate request ID.",
					"warning",
				);
				return { action: "handled" };
			}
			if (admission === "saturated") {
				rejectRequest(
					parsed.request,
					"target bridge request capacity is full; retry after existing request IDs expire",
					"capacity-rejected",
				);
				return { action: "handled" };
			}

			if (pending || event.streamingBehavior !== undefined || !ctx.isIdle()) {
				rejectRequest(
					parsed.request,
					"target was busy, so this request was not delivered to its active Pi task; retry after it is idle",
					"busy-rejected",
				);
				return { action: "handled" };
			}

			// Reserve reply capacity BEFORE accepting: a request whose answer
			// cannot be guaranteed a transport slot must be rejected here, not
			// accepted and silently dropped at settle time (H2).
			if (!transports.tryReserveReply()) {
				rejectRequest(
					parsed.request,
					"target reply transport capacity is fully committed; retry after in-flight replies complete",
					"capacity-rejected",
				);
				return { action: "handled" };
			}

			pending = {
				request: parsed.request,
				latestMessages: [],
				hasEnded: false,
				replyReserved: true,
			};
			audit(pi, "accepted", parsed.request.id, parsed.request.replyTo);
			return { action: "transform", text: formatBridgeTask(parsed.task) };
		} finally {
			if (hasInboundBridgeWork) releaseInboundWork();
		}
	});

	pi.on("agent_end", (event) => {
		if (!pending) return;
		pending.latestMessages = event.messages;
		pending.hasEnded = true;
	});

	pi.on("agent_settled", async (_event, ctx) => {
		// D3: replies deferred during ANY busy run (bridge task or unrelated
		// work) drain at every settle — a reply must never starve behind work
		// that has no bridge request in flight.
		deliverDeferredReplies(deferredReplies.splice(0));
		if (!pending || !pending.hasEnded) return;

		const accepted = pending;
		pending = undefined;
		const outcome = extractFinalAssistantOutcome(accepted.latestMessages);

		// D2: the completion boundary is released immediately; the ask-back
		// transport consumes the admission-time reservation — a reserved reply
		// always starts or queues, it is never dropped (H2).
		const submission = transports.submitReservedReply(() =>
			submitAskBack(accepted.request, outcome),
		);
		void submission.done
			.then((transport) => {
				const state = transport === "ok" ? "reply-ok" : "reply-submitted";
				audit(
					pi,
					outcome.status === "ok" ? state : `${state}-error-outcome`,
					accepted.request.id,
					accepted.request.replyTo,
				);
			})
			.catch(() => {
				audit(
					pi,
					"reply-transport-failed",
					accepted.request.id,
					accepted.request.replyTo,
				);
				ctx.ui.notify(
					"Pi↔Maestri bridge could not deliver the final answer; the requester may retry.",
					"error",
				);
			});
	});

	pi.registerTool({
		name: "maestri_ask",
		label: "Ask a Maestri Pi peer",
		description:
			"Send a signed, deterministic request to an idle Pi terminal directly connected through Maestri and wait for its verified final answer. Use this instead of shelling out to `maestri ask` when the target runs this same bridge.",
		promptSnippet:
			"maestri_ask(target, prompt) — ask an idle directly connected bridge-enabled Pi peer",
		promptGuidelines: [
			"Use maestri_ask for a bridge-enabled Pi peer instead of invoking maestri ask through a shell.",
			"Treat a busy rejection as a real transport outcome; do not retry automatically.",
		],
		parameters: Type.Object({
			target: Type.String({
				minLength: 1,
				maxLength: 128,
				description:
					"Exact directly connected Maestri terminal name of the bridge-enabled Pi peer",
			}),
			prompt: Type.String({
				minLength: 1,
				maxLength: 24 * 1024,
				description: "Task for that peer",
			}),
		}),
		executionMode: "sequential",
		execute: async (_toolCallId, params, signal) => {
			const environment = maestriEnvironment();
			if (!environment)
				throw executableResultError("ask from a non-Maestri terminal");

			const secret = await bridgeSecret();
			if (!secret)
				throw new Error(
					`Pi↔Maestri bridge secret is unavailable at ${SECRET_PATH}.`,
				);

			const terminals = await loadMaestriTerminalList(pi, environment, signal);
			const replyTo = terminals.self;
			if (!replyTo)
				throw executableResultError(
					"determine this terminal's Maestri identity",
				);
			if (!isValidTerminalName(params.target))
				throw new Error("The target is not a valid Maestri terminal name.");
			if (params.target === replyTo)
				throw new Error(
					"A Pi↔Maestri bridge request cannot target its own terminal.",
				);
			if (!terminals.connected.has(params.target)) {
				throw new Error(
					"The target is not directly connected to this Maestri terminal. Choose an exact name from `maestri list` → Connected agents.",
				);
			}

			const outbound = buildBridgeRequest({
				secret,
				replyTo,
				task: params.prompt,
			});
			if (!tracker.rememberOutboundRequest(outbound.request.id)) {
				throw new Error(
					"Pi↔Maestri bridge has too many unresolved requests; wait for replies or expiry before sending another request.",
				);
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
				const result = await pi.exec(
					environment.cli,
					["ask", params.target, outbound.input],
					{
						cwd: process.cwd(),
						timeout: TRANSPORT_SUBMIT_TIMEOUT_MS,
					},
				);
				if (result.killed) {
					audit(pi, "transport-submitted", outbound.request.id, replyTo);
					return;
				}
				if (result.code !== 0)
					throw executableResultError(`ask ${params.target}`);
				audit(pi, "transport-ok", outbound.request.id, replyTo);
			};

			void submitTransport().catch((error) => {
				tracker.dropOutboundRequest(outbound.request.id);
				audit(pi, "transport-failed", outbound.request.id, replyTo);
				// ExtensionAPI declares sendUserMessage(): void while sibling
				// interfaces declare Promise<void>, and a stale runtime can throw
				// synchronously inside the call itself (assertActive). Deferring
				// the call into the promise chain absorbs BOTH a synchronous
				// throw and a returned rejection (M1).
				void Promise.resolve()
					.then(() =>
						pi.sendUserMessage(
							`Pi↔Maestri bridge could not deliver maestri_ask to ${params.target}: ${(error as Error)?.message ?? String(error)}`,
							{ deliverAs: "followUp" },
						),
					)
					.catch(() => {
						// a failed failure-notice is best-effort void; it must not mask the transport failure.
					});
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
		description:
			"Show Pi↔Maestri bridge and concrete session-file continuity status",
		handler: async (_args, ctx) => {
			const ready =
				Boolean(maestriEnvironment()) && Boolean(await bridgeSecret());
			const lines: string[] = [
				ready
					? "bridge: ready — use maestri_ask for bridge-enabled Pi peers."
					: "bridge: inactive — Maestri environment or bridge secret is missing.",
			];
			const terminalId = process.env[MAESTRI_TERMINAL_ID_ENV];
			if (!terminalId) {
				lines.push("terminal: not running inside Maestri.");
			} else if (!isValidTerminalId(terminalId)) {
				lines.push(
					`terminal: invalid identity (${JSON.stringify(terminalId)})`,
				);
			} else {
				const pinState = terminalPinState(terminalId);
				const mapped = pinnedSessionFileForTerminal(terminalId);
				const live = ctx.sessionManager.getSessionFile();
				lines.push(`terminal: ${terminalId}`);
				lines.push(`process launch: ${pinLaunchMode}`);
				lines.push(
					pinState.kind === "pinned"
						? `map: pinned -> ${pinState.sessionFile}`
						: `map: ${pinState.kind}${"reason" in pinState ? ` (${pinState.reason})` : ""}`,
				);
				lines.push(`live session file: ${live ?? "ephemeral / unknown"}`);
				lines.push(
					`continuity: ${mapped !== undefined && mapped === live ? "matches" : "NOT PROTECTED"}`,
				);
				const configurationIssues: ConfigurationReadIssue[] = [];
				const configured = findTerminalLaunchConfiguration(
					MAESTRI_CONFIG_HOME,
					terminalId,
					WRAPPER_PATH,
					configurationIssues,
				);
				for (const issue of configurationIssues)
					lines.push(
						`configured launch: BLOCKED malformed ${issue.path} (${issue.reason})`,
					);
				if (configurationIssues.length === 0)
					lines.push(
						configured === undefined
							? "configured launch: terminal not found in persisted Maestri state"
							: `configured launch: ${configured.protected ? "protected" : "BLOCKED"} (command=${configured.commandState}, resume=${configured.resumeState}${configured.commandFallback ? " command-fallback" : ""}, lifecycle=${configured.lifecycle})`,
					);
			}
			const hasBlockedConfiguration = lines.some((line) =>
				line.startsWith("configured launch: BLOCKED"),
			);
			const continuityProtected = (() => {
				if (hasBlockedConfiguration) return false;
				if (!isManagedLaunch(pinLaunchMode))
					return pinLaunchMode === "disabled";
				if (!terminalId || !isValidTerminalId(terminalId)) return false;
				const live = ctx.sessionManager.getSessionFile();
				return pinnedSessionFileForTerminal(terminalId) === live;
			})();
			ctx.ui.notify(
				lines.join("\n"),
				ready && continuityProtected ? "info" : "warning",
			);
		},
	});
}
