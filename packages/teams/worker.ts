import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getMaiBin } from "../shared/src/mai-binary.js";
import { Type } from "@sinclair/typebox";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PiMesh } from "@pi-extensions/pi-mesh/extension/pi-mesh.js";
import { LEASE_STALE_AFTER_MS, isLeaderLeaseStale } from "./lease.js";
import { createWorkerCommentEnvelope, createWorkerFinishEnvelope, createWorkerHelloEnvelope } from "./v2/mesh-adapter.ts";
import type { LeaderAckPayload, TeamEnvelope, WorkerSessionMode } from "./v2/protocol.ts";
import {
	WORKER_FINISH_PENDING_ENTRY_TYPE,
	createDeclarationEventId,
	hasAssistantMessage,
	parseWorkerFinishPending,
	type WorkerFinishPending,
} from "./v2/session-facts.ts";

const HEARTBEAT_ENTRY_TYPE = "teams-worker-heartbeat";
const WORKER_FINISH_COMPLETED_ENTRY_TYPE = "teams-worker-finish-completed-v1";

type TerminalStatus = "done" | "quit";

function resolveHeartbeatIntervalMs(): number {
	const raw = Number(process.env.PI_TEAMS_WORKER_HEARTBEAT_MS ?? "5000");
	if (!Number.isFinite(raw) || raw < 1000) return 5000;
	return Math.floor(raw);
}

export function runWorker(pi: ExtensionAPI): void {
	const ticketId = process.env.PI_TEAMS_TICKET_ID ?? "";
	const workerName = process.env.PI_TEAMS_WORKER_NAME ?? "worker";
	const workerId = process.env.PI_TEAMS_WORKER_ID ?? workerName;
	const workerInstanceId = process.env.PI_TEAMS_WORKER_INSTANCE_ID ?? "unknown-worker-instance";

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
	const coordinatorSessionId = process.env.PI_TEAMS_COORDINATOR_SESSION_ID ?? "";
	const leaseFile = process.env.PI_TEAMS_LEASE_FILE;
	let meshSeq = 0;
	const acknowledgedFinishEvents = new Set<string>();
	const finishAckWaiters = new Map<string, Set<() => void>>();

	if (!ticketId) {
		console.error("[teams-worker] PI_TEAMS_TICKET_ID not set");
		return;
	}

	// Connect to mesh for instant progress delivery (if available)
	let mesh: PiMesh | null = null;
	const meshTell = (payload: unknown) => {
		if (mesh && coordinatorId) {
			try { mesh.tell(coordinatorId, payload); } catch {}
		}
	};
	const waitForPersistedAck = (eventId: string, timeoutMs: number): Promise<boolean> => {
		if (acknowledgedFinishEvents.has(eventId)) return Promise.resolve(true);
		return new Promise((resolveAck) => {
			const done = () => { clearTimeout(timer); finishAckWaiters.get(eventId)?.delete(done); resolveAck(true); };
			const timer = setTimeout(() => { finishAckWaiters.get(eventId)?.delete(done); resolveAck(false); }, timeoutMs);
			const waiters = finishAckWaiters.get(eventId) ?? new Set<() => void>();
			waiters.add(done);
			finishAckWaiters.set(eventId, waiters);
		});
	};
	const sendFinishUntilPersisted = async (payload: unknown, eventId: string) => {
		if (!mesh || !coordinatorId) throw new Error("Teams coordinator route is unavailable; finish remains pending in the worker session");
		for (let attempt = 0; attempt < 3; attempt++) {
			try { await mesh.tellAndWaitForReceipt(coordinatorId, payload, "delivered", 5000); }
			catch { try { mesh.tell(coordinatorId, payload); } catch {} }
			if (await waitForPersistedAck(eventId, 5000)) return;
		}
		throw new Error("Teams coordinator did not acknowledge durable finish persistence; finish remains pending in the worker session");
	};
	const nextSeq = () => ++meshSeq;
	// Our durable mesh identity (shared instance). Declared on every worker→leader
	// envelope so the leader binds handle→durableId and routes over the durable topic.
	const selfMeshId = (): string | undefined => mesh?.getIdentity()?.id ?? undefined;

	let lastStopReason: string | undefined;
	let terminalStatus: TerminalStatus | null = null;
	let workerSessionFile = "";



	const finalizeTask = async (ctx: ExtensionContext, status: TerminalStatus, summary: string) => {
		if (terminalStatus) return;
		if (!coordinatorSessionId) throw new Error("team_finish requires the canonical coordinator session identity");
		const normalizedSummary = summary.trim() || (status === "done" ? "Task completed." : "Worker quit.");
		const entries = ctx.sessionManager.getEntries();
		if (!ctx.sessionManager.getSessionFile() || !hasAssistantMessage(entries)) {
			throw new Error("team_finish requires a persisted worker Pi session with an assistant message");
		}
		const existing = entries
			.filter((entry): entry is Extract<(typeof entries)[number], { type: "custom" }> => entry.type === "custom" && entry.customType === WORKER_FINISH_PENDING_ENTRY_TYPE)
			.map((entry) => parseWorkerFinishPending(entry.data))
			.filter((entry): entry is WorkerFinishPending => entry !== null)
			.find((entry) => entry.coordinatorSessionId === coordinatorSessionId && entry.teamId === teamId && entry.workerId === workerId && entry.attemptId === workerInstanceId);
		if (existing) {
			const expectedExistingEventId = createDeclarationEventId(
				{ coordinatorSessionId, teamId, workerId, attemptId: workerInstanceId },
				existing.status,
				existing.summary,
			);
			if (existing.eventId !== expectedExistingEventId) {
				throw new Error("team_finish found corrupt pending declaration evidence in the worker session");
			}
			if (existing.status !== status || existing.summary !== normalizedSummary) {
				throw new Error("team_finish conflicts with the declaration already pending for this attempt");
			}
		}
		const eventId = typeof existing?.eventId === "string"
			? existing.eventId
			: createDeclarationEventId({ coordinatorSessionId, teamId, workerId, attemptId: workerInstanceId }, status, normalizedSummary);
		const pending: WorkerFinishPending = {
			schemaVersion: 1,
			coordinatorSessionId,
			teamId,
			workerId,
			attemptId: workerInstanceId,
			status: existing?.status === "done" || existing?.status === "quit" ? existing.status : status,
			summary: typeof existing?.summary === "string" ? existing.summary : normalizedSummary,
			eventId,
			createdAt: typeof existing?.createdAt === "number" ? existing.createdAt : Date.now(),
		};
		if (!existing) pi.appendEntry(WORKER_FINISH_PENDING_ENTRY_TYPE, pending);
		const note = pending.status === "done" ? `DONE: ${pending.summary}` : `QUIT: ${pending.summary}`;
		await sendFinishUntilPersisted(
			createWorkerFinishEnvelope({
				teamId,
				leaderEpoch,
				workerId,
				attemptId: workerInstanceId,
				seq: nextSeq(),
				status: pending.status,
				summary: pending.summary,
				eventId,
				meshId: selfMeshId(),
			}),
			eventId,
		);
		pi.appendEntry(WORKER_FINISH_COMPLETED_ENTRY_TYPE, { ...pending, completedAt: Date.now() });
		terminalStatus = pending.status;
		// Report status ONLY — the worker does NOT close its own ticket. A terminal
		// signal is a STATUS REPORT (done/quit + summary via the note + the honest
		// mesh finish tell above), not a lifecycle decision. Auto-closing a
		// coordinator-owned (often shared-slice) ticket from the worker marks it
		// "shipped" even at 9/10 before the gate passes (Cecilia symptom, same class
		// as opaque-lifecycle #5). The coordinator/human owns ticket-close on a true pass.
		try {
			// Run mai in the worker's OWN cwd (its worktree / target repoRoot), which is
			// always a valid git repo. The retired `ticketCwd ?? cwd` preferred the
			// LEADER's cwd, which can be a non-repo (Cecilia bug 4: leader launched from
			// /Users/alexander/Projects → "not a git repository" → silent note loss).
			// maitake is global + ticket-id-keyed, so the note attaches by id from any repo.
			const effectiveCwd = ctx.cwd;
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
		if (!mesh || !coordinatorId) return;
		// Wait for the DURABLE identity (not just any clientId) so the hello declares
		// the stable mesh id the leader binds the route to. mesh.self().id would
		// return the clientId before the identity resolves — too early to route by.
		const durableId = mesh.getIdentity()?.id;
		if (!durableId) {
			if (attempt >= 50) return;
			setTimeout(() => announceInitWhenReady(attempt + 1), 100);
			return;
		}
		meshTell(
			createWorkerHelloEnvelope({
				teamId,
				leaderEpoch,
				workerId,
				attemptId: workerInstanceId,
				seq: nextSeq(),
				meshId: durableId,
				runtime: {
					protocolVersion: 1,
					teamId,
					leaderEpoch,
					workerId,
					attemptId: workerInstanceId,
					coordinatorSessionId,
					leasePath: leaseFile ?? "",
					sessionMode,
					workerSessionFile,
				},
			}),
		);
	};

	// Consume the SHARED pi-mesh instance (v1a M1). The pi-mesh extension runs in
	// this same worker process and owns the mesh lifecycle + the pinned durable
	// identity. Minting a second PiMesh here (the old behaviour) created a second
	// sidecar clientId that defeated the pinned id and forced the stale-route +
	// identity-churn bugs. Exactly one PiMesh per worker.
	pi.on("session_start", (_event, ctx) => {
		workerSessionFile = ctx.sessionManager.getSessionFile() ?? "";
		try {
			mesh = (globalThis as { __piMesh?: PiMesh }).__piMesh ?? null;
			if (!mesh) { console.warn("[teams-worker] shared mesh instance not available"); }
			else {
				mesh.on("message", (inbound: { message: { from: string; payload: unknown } }) => {
					if (!coordinatorId || inbound.message.from !== coordinatorId) return;
					const envelope = inbound.message.payload as TeamEnvelope<LeaderAckPayload>;
					if (!envelope || envelope.version !== 1 || envelope.from !== "leader" || envelope.type !== "leader.ack" || envelope.to !== "worker") return;
					if (envelope.teamId !== teamId || envelope.workerId !== workerId || envelope.attemptId !== workerInstanceId) return;
					if (envelope.payload?.phase !== "persisted" || typeof envelope.payload.eventId !== "string" || envelope.correlationId !== envelope.payload.eventId) return;
					acknowledgedFinishEvents.add(envelope.payload.eventId);
					for (const resolveAck of finishAckWaiters.get(envelope.payload.eventId) ?? []) resolveAck();
					finishAckWaiters.delete(envelope.payload.eventId);
				});
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

			// Worker's OWN cwd (its worktree / target repoRoot) — always a valid git repo.
			// See finalizeTask for why the leader's ticketCwd is not used (Cecilia bug 4).
			const effectiveCwd = ctx.cwd;
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
			meshTell(
				createWorkerCommentEnvelope({
					teamId,
					leaderEpoch,
					workerId,
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
			await finalizeTask(ctx, params.status, params.summary);
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
