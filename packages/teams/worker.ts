import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getMaiBin } from "../shared/src/mai-binary.js";
import { Type } from "@sinclair/typebox";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PiMesh } from "@pi-extensions/pi-mesh/extension/pi-mesh.js";
import { LEASE_STALE_AFTER_MS, isLeaderLeaseStale } from "./lease.js";
import { createWorkerCommentEnvelope, createWorkerFinishEnvelope, createWorkerHelloEnvelope } from "./v2/mesh-adapter.ts";
import type { WorkerSessionMode } from "./v2/protocol.ts";

const HEARTBEAT_ENTRY_TYPE = "teams-worker-heartbeat";

type TerminalStatus = "done" | "quit";

function resolveHeartbeatIntervalMs(): number {
	const raw = Number(process.env.PI_TEAMS_WORKER_HEARTBEAT_MS ?? "5000");
	if (!Number.isFinite(raw) || raw < 1000) return 5000;
	return Math.floor(raw);
}

export function runWorker(pi: ExtensionAPI): void {
	const ticketId = process.env.PI_TEAMS_TICKET_ID ?? "";
	const workerName = process.env.PI_TEAMS_WORKER_NAME ?? "worker";
	const workerInstanceId = process.env.PI_TEAMS_WORKER_INSTANCE_ID ?? "unknown-worker-instance";

	const channelId = process.env.PI_TEAMS_CHANNEL_ID;
	const teamId = process.env.PI_TEAMS_TEAM_ID ?? ticketId;
	const leaderEpoch = process.env.PI_TEAMS_LEADER_EPOCH ?? "legacy";
	const sessionMode = (() => {
		try {
			return process.env.PI_TEAMS_SESSION_MODE ? JSON.parse(process.env.PI_TEAMS_SESSION_MODE) as WorkerSessionMode : { kind: "fresh" as const };
		} catch {
			return { kind: "fresh" as const };
		}
	})();
	const coordinatorId = process.env.PI_TEAMS_COORDINATOR_ID;
	const ticketCwd = process.env.PI_TEAMS_TICKET_CWD;
	const leaseFile = process.env.PI_TEAMS_LEASE_FILE;
	let meshSeq = 0;

	if (!ticketId) {
		console.error("[teams-worker] PI_TEAMS_TICKET_ID not set");
		return;
	}

	// Connect to mesh for instant progress delivery (if available)
	let mesh: PiMesh | null = null;
	const meshChat = (payload: unknown) => {
		if (mesh && channelId) {
			try { mesh.chat(channelId, payload); } catch {}
		}
	};
	const meshTell = (payload: unknown) => {
		if (mesh && coordinatorId) {
			try { mesh.tell(coordinatorId, payload); } catch {}
		}
	};
	const meshTellCritical = async (payload: unknown) => {
		if (!mesh || !coordinatorId) return;
		try {
			await mesh.tellAndWaitForReceipt(coordinatorId, payload, "delivered", 5000);
		} catch {
			try { mesh.tell(coordinatorId, payload); } catch {}
		}
	};
	const nextSeq = () => ++meshSeq;
	// Our durable mesh identity (shared instance). Declared on every worker→leader
	// envelope so the leader binds handle→durableId and routes over the durable topic.
	const selfMeshId = (): string | undefined => mesh?.getIdentity()?.id ?? undefined;

	let lastStopReason: string | undefined;
	let terminalStatus: TerminalStatus | null = null;


	const getTicketCwd = (cwd: string) => ticketCwd ?? cwd;

	const finalizeTask = async (cwd: string, status: TerminalStatus, summary: string) => {
		if (terminalStatus) return;
		terminalStatus = status;

		const normalizedSummary = summary.trim() || (status === "done" ? "Task completed." : "Worker quit.");
		const note = status === "done"
			? `DONE: ${normalizedSummary}`
			: `QUIT: ${normalizedSummary}`;

		writeHeartbeat("worker_terminal", { status, summary: normalizedSummary });
		await meshTellCritical(
			createWorkerFinishEnvelope({
				teamId,
				leaderEpoch,
				workerId: workerName,
				attemptId: workerInstanceId,
				seq: nextSeq(),
				status,
				summary: normalizedSummary,
				meshId: selfMeshId(),
			}),
		);
		// Report status ONLY — the worker does NOT close its own ticket. A terminal
		// signal is a STATUS REPORT (done/quit + summary via the note + the honest
		// mesh finish tell above), not a lifecycle decision. Auto-closing a
		// coordinator-owned (often shared-slice) ticket from the worker marks it
		// "shipped" even at 9/10 before the gate passes (Cecilia symptom, same class
		// as opaque-lifecycle #5). The coordinator/human owns ticket-close on a true pass.
		try {
			const effectiveCwd = getTicketCwd(cwd);
			await pi.exec(getMaiBin(), ["add-note", ticketId, note], { cwd: effectiveCwd, timeout: 5000 });
		} catch {
			// best effort
		}
	};

	const writeHeartbeat = (event: string, details?: Record<string, unknown>) => {
		try {
			pi.appendEntry(HEARTBEAT_ENTRY_TYPE, {
				event,
				ticketId,
				workerName,
				workerInstanceId,
				timestamp: Date.now(),
				...(details ?? {}),
			});
		} catch {
			// best effort
		}
	};

	writeHeartbeat("worker_init");

	const heartbeatTimer = setInterval(() => {
		writeHeartbeat("tick");
	}, resolveHeartbeatIntervalMs());

	let leaseWatchdog: ReturnType<typeof setInterval> | null = null;
	const stopHeartbeat = () => {
		clearInterval(heartbeatTimer);
		if (leaseWatchdog) { clearInterval(leaseWatchdog); leaseWatchdog = null; }
		// The mesh instance is SHARED (owned by the pi-mesh extension) — drop our
		// reference but never stop it, or we'd kill the process's only mesh.
		mesh = null;
	};

	const killOwnProcessGroup = () => {
		try {
			process.kill(-process.pid, "SIGTERM");
		} catch {
			try { process.kill(process.pid, "SIGTERM"); } catch {}
		}
		setTimeout(() => {
			try {
				process.kill(-process.pid, "SIGKILL");
			} catch {
				try { process.kill(process.pid, "SIGKILL"); } catch {}
			}
		}, 3000);
	};

	const announceInitWhenReady = (attempt = 0) => {
		if (!mesh || !channelId) return;
		// Wait for the DURABLE identity (not just any clientId) so the hello declares
		// the stable mesh id the leader binds the route to. mesh.self().id would
		// return the clientId before the identity resolves — too early to route by.
		const durableId = mesh.getIdentity()?.id;
		if (!durableId) {
			if (attempt >= 50) return;
			setTimeout(() => announceInitWhenReady(attempt + 1), 100);
			return;
		}
		mesh.chat(
			channelId,
			createWorkerHelloEnvelope({
				teamId,
				leaderEpoch,
				workerId: workerName,
				attemptId: workerInstanceId,
				seq: nextSeq(),
				meshId: durableId,
				runtime: {
					protocolVersion: 1,
					teamId,
					leaderEpoch,
					workerId: workerName,
					attemptId: workerInstanceId,
					coordinatorSessionId: coordinatorId ?? "",
					channelId,
					leasePath: leaseFile ?? "",
					sessionMode,
				},
			}),
		);
	};

	// Consume the SHARED pi-mesh instance (v1a M1). The pi-mesh extension runs in
	// this same worker process and owns the mesh lifecycle + the pinned durable
	// identity. Minting a second PiMesh here (the old behaviour) created a second
	// sidecar clientId that defeated the pinned id and forced the stale-route +
	// identity-churn bugs. Exactly one PiMesh per worker.
	pi.on("session_start", (_event, _ctx) => {
		try {
			mesh = (globalThis as { __piMesh?: PiMesh }).__piMesh ?? null;
			if (!mesh) { console.warn("[teams-worker] shared mesh instance not available"); }
			else {
				if (channelId) mesh.joinChannel(channelId);
				announceInitWhenReady();
			}
		} catch (e) {
			console.warn(`[teams-worker] mesh init failed: ${e}`);
			mesh = null;
		}

		if (leaseFile) {
			leaseWatchdog = setInterval(() => {
				if (terminalStatus) return;
				if (!isLeaderLeaseStale(leaseFile, Date.now(), LEASE_STALE_AFTER_MS)) return;
				writeHeartbeat("leader_lease_expired", { leaseFile });
				stopHeartbeat();
				killOwnProcessGroup();
			}, 3000);
		}
	});

	pi.on("session_shutdown", () => {
		writeHeartbeat("session_shutdown", { terminalStatus });
		stopHeartbeat();
	});

	pi.on("agent_start", () => {
		writeHeartbeat("agent_start");
	});

	// Track the last assistant stop reason so we can detect error exits
	// (rate limits, auth failures, etc.) and avoid marking them as "done".
	pi.on("message_end", (event) => {
		const msg = event.message;
		if (msg && typeof msg === "object" && msg.role === "assistant" && msg.stopReason) {
			lastStopReason = msg.stopReason;
		}
	});

	pi.on("turn_start", () => {
		writeHeartbeat("turn_start");
	});

	pi.on("tool_call", (event) => {
		writeHeartbeat("tool_call", { toolName: event.toolName });
	});

	pi.on("tool_result", (event) => {
		writeHeartbeat("tool_result", { toolName: event.toolName, isError: event.isError });
	});

	pi.on("turn_end", () => {
		writeHeartbeat("turn_end");
	});

	const CommentParams = Type.Object({
		message: Type.Optional(Type.String({ description: "Inline comment text" })),
		filePath: Type.Optional(Type.String({ description: "Path to a UTF-8 text/markdown file whose contents should be posted as the comment" })),
	});
	const FinishParams = Type.Object({
		status: Type.Union([Type.Literal("done"), Type.Literal("quit")]),
		summary: Type.String({ description: "Short result summary" }),
	});

	pi.registerTool({
		name: "team_comment",
		label: "Team Comment",
		description: `Comment on your assigned ticket (${ticketId}). Use this to report progress, ask questions, or flag blockers. For long markdown/code-heavy notes, prefer { filePath } so the note is posted from a file instead of inline escaping.`,
		parameters: CommentParams,
		async execute(_id, params: { message?: string; filePath?: string }, _signal, _onUpdate, ctx) {
			const hasMessage = typeof params.message === "string" && params.message.length > 0;
			const hasFilePath = typeof params.filePath === "string" && params.filePath.length > 0;
			if (hasMessage === hasFilePath) {
				return {
					content: [{ type: "text" as const, text: "Provide exactly one of { message } or { filePath }." }],
					isError: true,
					details: undefined,
				};
			}

			const effectiveCwd = getTicketCwd(ctx.cwd);
			let result;
			let commentText: string;
			if (hasFilePath) {
				const resolvedPath = resolve(ctx.cwd, params.filePath!);
				try {
					commentText = await readFile(resolvedPath, "utf-8");
				} catch (error) {
					return {
						content: [{ type: "text" as const, text: `Failed to read comment file: ${error}` }],
						isError: true,
						details: undefined,
					};
				}
				result = await pi.exec(getMaiBin(), ["add-note", ticketId, "--file", resolvedPath], {
					cwd: effectiveCwd,
					timeout: 5000,
				});
			} else {
				commentText = params.message!;
				result = await pi.exec(getMaiBin(), ["add-note", ticketId, commentText], {
					cwd: effectiveCwd,
					timeout: 5000,
				});
			}
			if (result.code !== 0) {
				return {
					content: [{ type: "text" as const, text: `Failed to comment: ${result.stderr}` }],
					isError: true,
					details: undefined,
				};
			}
			meshChat(
				createWorkerCommentEnvelope({
					teamId,
					leaderEpoch,
					workerId: workerName,
					attemptId: workerInstanceId,
					seq: nextSeq(),
					text: commentText,
					meshId: selfMeshId(),
				}),
			);
			return { content: [{ type: "text" as const, text: `Commented on ticket #${ticketId}` }], details: undefined };
		},
	});

	pi.registerTool({
		name: "team_finish",
		label: "Team Finish",
		description: `Mark your assigned ticket (${ticketId}) as done or quit. This is the authoritative terminal signal for teams workers.`,
		parameters: FinishParams,
		async execute(_id, params: { status: TerminalStatus; summary: string }, _signal, _onUpdate, ctx) {
			await finalizeTask(ctx.cwd, params.status, params.summary);
			return { content: [{ type: "text" as const, text: `Marked ${ticketId} as ${params.status}` }], details: undefined };
		},
	});

	pi.on("agent_end", async () => {
		writeHeartbeat("agent_end", { terminalStatus });
		// Workers must use team_finish to declare terminal success/quit.
		// agent_end only says the turn ended; it is not success by itself.
		stopHeartbeat();
	});
}
