import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { PiMesh } from "@pi-extensions/pi-mesh/extension/pi-mesh.js";
import { GRACE_PERIOD_MS } from "./types.js";

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
	const coordinatorId = process.env.PI_TEAMS_COORDINATOR_ID;

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

	let ticketClosed = false;
	let lastStopReason: string | undefined;

	const closeTicket = async (cwd: string, event: string) => {
		if (ticketClosed) return;
		ticketClosed = true;

		// If the last assistant response was an error (rate limit, auth failure, etc.),
		// do NOT close with "DONE" — mark the ticket as failed so the leader knows.
		const isError = lastStopReason === "error" || lastStopReason === "aborted";
		const note = isError
			? "FAILED: Worker exited without completing work (provider error)"
			: "DONE: Task completed.";

		writeHeartbeat(event, { isError });
		// Notify coordinator instantly via mesh
		meshTell({ kind: isError ? "teams:failed" : "teams:done", workerName, workerInstanceId, ticketId, event, isError });
		try {
			await pi.exec("mai", ["add-note", ticketId, note], { cwd, timeout: 5000 });
			if (!isError) {
				await pi.exec("mai", ["close", ticketId], { cwd, timeout: 5000 });
			}
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

	const stopHeartbeat = () => {
		clearInterval(heartbeatTimer);
		if (mesh) { try { mesh.stop(); } catch {} mesh = null; }
	};

	const announceInitWhenReady = (attempt = 0) => {
		if (!mesh || !channelId) return;
		const selfId = mesh.self().id;
		if (!selfId) {
			if (attempt >= 50) return;
			setTimeout(() => announceInitWhenReady(attempt + 1), 100);
			return;
		}
		mesh.chat(channelId, { kind: "teams:init", workerName, workerInstanceId, ticketId });
	};

	// Start mesh connection (non-blocking — if sidecar isn't available, mesh stays null)
	pi.on("session_start", (_event, ctx) => {
		try {
			const binPath = resolveWorkerMeshBinPath();
			if (!binPath) { console.warn("[teams-worker] mesh binary not found"); return; }
			mesh = new PiMesh();
			mesh.start(binPath, ctx.sessionManager.getSessionId(), ctx.cwd, { mode: "peer", scouting: true });
			if (channelId) mesh.joinChannel(channelId);
			announceInitWhenReady();
		} catch (e) {
			console.warn(`[teams-worker] mesh init failed: ${e}`);
			mesh = null;
		}
	});

	pi.on("session_shutdown", () => {
		stopHeartbeat();
	});

	if (autoCloseOnSessionShutdown) {
		pi.on("session_shutdown", async (_event, ctx) => {
			await closeTicket(ctx.cwd, "session_shutdown_close");
		});
	}

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

	pi.registerTool({
		name: "team_comment",
		label: "Team Comment",
		description: `Comment on your assigned ticket (${ticketId}). Use this to report progress, ask questions, or flag blockers.`,
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
			// Send progress instantly to coordinator via mesh channel
			meshChat({ kind: "teams:comment", workerName, workerInstanceId, ticketId, message: params.message });
			return { content: [{ type: "text" as const, text: `Commented on ticket #${ticketId}` }] };
		},
	});

	pi.on("agent_end", async (_event, ctx) => {
		writeHeartbeat("agent_end");
		meshChat({ kind: "teams:agent_end", workerName, workerInstanceId, ticketId });

		if (!autoCloseOnAgentEnd) {
			// Persistent worker: process exits normally after this turn.
			// The leader will re-spawn with `pi -p --session <file> "new input"`
			// to continue the session when new mesh input arrives.
			return;
		}

		// Grace period: wait before auto-closing so coordinator can follow up
		const graceMs = GRACE_PERIOD_MS;
		if (graceMs > 0) {
			meshChat({ kind: "teams:grace", workerName, workerInstanceId, ticketId, graceMs });
			await new Promise((r) => setTimeout(r, graceMs));
			// If a new turn started during grace (coordinator sent input), don't close
			// The agent_start event would have fired and we'd be mid-turn
		}

		stopHeartbeat();
		await closeTicket(ctx.cwd, "agent_end");
	});
}
