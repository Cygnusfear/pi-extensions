import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { PiMesh } from "@pi-extensions/pi-mesh/extension/pi-mesh.js";
import { LEASE_STALE_AFTER_MS, isLeaderLeaseStale } from "./lease.js";
import { createWorkerCommentEnvelope, createWorkerFinishEnvelope, createWorkerHelloEnvelope } from "./v2/mesh-adapter.ts";

function resolveWorkerMeshBinPath(): string | null {
	const binName = process.platform === "win32" ? "pi-mesh.exe" : "pi-mesh";
	const workerDir = dirname(new URL(import.meta.url).pathname);
	const meshNative = resolve(workerDir, "..", "pi-mesh", "native");
	const primary = join(meshNative, binName);
	const fallback = join(meshNative, "target", "release", binName);
	if (existsSync(primary)) return primary;
	if (existsSync(fallback)) return fallback;
	return null;
}

const HEARTBEAT_ENTRY_TYPE = "teams-worker-heartbeat";

type WorkerOptions = {
	autoCloseOnAgentEnd?: boolean;
	autoCloseOnSessionShutdown?: boolean;
};

type TerminalStatus = "done" | "quit";

function resolveHeartbeatIntervalMs(): number {
	const raw = Number(process.env.PI_TEAMS_WORKER_HEARTBEAT_MS ?? "5000");
	if (!Number.isFinite(raw) || raw < 1000) return 5000;
	return Math.floor(raw);
}

export function runWorker(pi: ExtensionAPI, options: WorkerOptions = {}): void {
	const ticketId = process.env.PI_TEAMS_TICKET_ID;
	const workerName = process.env.PI_TEAMS_WORKER_NAME ?? "worker";
	const workerInstanceId = process.env.PI_TEAMS_WORKER_INSTANCE_ID ?? "unknown-worker-instance";
	const autoCloseOnAgentEnd = options.autoCloseOnAgentEnd !== false;
	const autoCloseOnSessionShutdown = options.autoCloseOnSessionShutdown === true;

	const channelId = process.env.PI_TEAMS_CHANNEL_ID;
	const teamId = process.env.PI_TEAMS_TEAM_ID ?? ticketId;
	const leaderEpoch = process.env.PI_TEAMS_LEADER_EPOCH ?? "legacy";
	const coordinatorId = process.env.PI_TEAMS_COORDINATOR_ID;
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
	const nextSeq = () => ++meshSeq;

	let ticketClosed = false;
	let lastStopReason: string | undefined;
	let terminalStatus: TerminalStatus | null = null;

	let agentEndFired = false;

	const finalizeTask = async (cwd: string, status: TerminalStatus, summary: string) => {
		if (terminalStatus) return;
		terminalStatus = status;
		ticketClosed = true;

		const normalizedSummary = summary.trim() || (status === "done" ? "Task completed." : "Worker quit.");
		const note = status === "done"
			? `DONE: ${normalizedSummary}`
			: `QUIT: ${normalizedSummary}`;

		writeHeartbeat("worker_terminal", { status, summary: normalizedSummary });
		meshTell(
			createWorkerFinishEnvelope({
				teamId,
				leaderEpoch,
				workerId: workerName,
				attemptId: workerInstanceId,
				seq: nextSeq(),
				status,
				summary: normalizedSummary,
			}),
		);
		try {
			await pi.exec("mai", ["add-note", ticketId, note], { cwd, timeout: 5000 });
			await pi.exec("mai", ["close", ticketId], { cwd, timeout: 5000 });
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
		if (mesh) { try { mesh.stop(); } catch {} mesh = null; }
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
		const selfId = mesh.self().id;
		if (!selfId) {
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
				runtime: {
					protocolVersion: 1,
					teamId,
					leaderEpoch,
					workerId: workerName,
					attemptId: workerInstanceId,
					coordinatorSessionId: coordinatorId ?? "",
					channelId,
					leasePath: leaseFile ?? "",
					sessionMode: { kind: "fresh" },
				},
			}),
		);
	};

	// Start mesh connection (non-blocking — if sidecar isn't available, mesh stays null)
	pi.on("session_start", (_event, ctx) => {
		try {
			const binPath = resolveWorkerMeshBinPath();
			if (!binPath) { console.warn("[teams-worker] mesh binary not found"); }
			else {
				mesh = new PiMesh();
				mesh.start(binPath, ctx.sessionManager.getSessionId(), ctx.cwd, { mode: "peer", scouting: true });
				if (channelId) mesh.joinChannel(channelId);
				announceInitWhenReady();
			}
		} catch (e) {
			console.warn(`[teams-worker] mesh init failed: ${e}`);
			mesh = null;
		}

		if (leaseFile) {
			leaseWatchdog = setInterval(() => {
				if (ticketClosed || terminalStatus) return;
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
		message: Type.String({ description: "Your comment" }),
	});

	const FinishParams = Type.Object({
		status: Type.Union([Type.Literal("done"), Type.Literal("quit")]),
		summary: Type.String({ description: "Short result summary" }),
	});

	pi.registerTool({
		name: "team_comment",
		label: "Team Comment",		description: `Comment on your assigned ticket (${ticketId}). Use this to report progress, ask questions, or flag blockers.`,
		parameters: CommentParams,
		async execute(_id, params: { message: string }, _signal, _onUpdate, ctx) {
			const result = await pi.exec("mai", ["add-note", ticketId, params.message], {
				cwd: ctx.cwd,
				timeout: 5000,
			});
			if (result.code !== 0) {
				return {
					content: [{ type: "text" as const, text: `Failed to comment: ${result.stderr}` }],
					isError: true,
				};
			}
			meshChat(
				createWorkerCommentEnvelope({
					teamId,
					leaderEpoch,
					workerId: workerName,
					attemptId: workerInstanceId,
					seq: nextSeq(),
					text: params.message,
				}),
			);
			return { content: [{ type: "text" as const, text: `Commented on ticket #${ticketId}` }] };
		},
	});

	pi.registerTool({
		name: "team_finish",
		label: "Team Finish",
		description: `Mark your assigned ticket (${ticketId}) as done or quit. This is the authoritative terminal signal for teams workers.`,
		parameters: FinishParams,
		async execute(_id, params: { status: TerminalStatus; summary: string }, _signal, _onUpdate, ctx) {
			await finalizeTask(ctx.cwd, params.status, params.summary);
			return { content: [{ type: "text" as const, text: `Marked ${ticketId} as ${params.status}` }] };
		},
	});

	pi.on("agent_end", async () => {
		agentEndFired = true;
		writeHeartbeat("agent_end", { terminalStatus });
		// Workers must use team_finish to declare terminal success/quit.
		// agent_end only says the turn ended; it is not success by itself.
		stopHeartbeat();
	});
}
