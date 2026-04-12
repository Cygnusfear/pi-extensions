import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildLeaderLeasePath } from "./lease.js";
import type { SpawnConfig, WorkerHandle } from "./types.js";

export function buildWorkerPrompt(ticketId: string, workerName: string, ticketText?: string, additionalPrompt?: string, freeform?: boolean, coordinatorMeshId?: string, ticketCwd?: string): string {
	const lines = [
		`You are worker "${workerName}". You have been assigned ticket ${ticketId}.`,
		"",
	];

	if (coordinatorMeshId) {
		lines.push(
			`Your coordinator's mesh ID is "${coordinatorMeshId}" — FYI only.`,
			`To talk to the coordinator, use \`team_comment\` (progress, questions, acknowledgements, blockers) and \`team_finish\` (terminal status).`,
			`\`team_comment\` writes to the ticket AND broadcasts on the team's mesh channel — the coordinator sees it immediately, plus a durable note is kept.`,
			`Do NOT use raw \`mesh_tell\` to the coordinator id — direct point-to-point has a peer-discovery race at spawn time and will fail for the first few seconds of worker life. \`team_comment\` uses the team channel, which bypasses that race entirely.`,
			"",
		);
	}

	if (additionalPrompt) {
		lines.push("Role:", additionalPrompt, "");
	}

	const ticketReadHint = ticketCwd
		? `Read ticket metadata from the coordinator ticket cwd: (cd ${ticketCwd} && mai show ${ticketId})`
		: `Read ticket metadata: mai show ${ticketId}`;
	if (ticketText?.trim()) {
		lines.push("Ticket body:", ticketText.trim(), "");
	}
	if (freeform) {
		lines.push(
			"Instructions:",
			ticketReadHint,
			"Do the work described in the ticket body above.",
			"Comment on the ticket as you work using team_comment.",
			"",
			"This is a freeform/interactive session. The coordinator will send you messages — respond to them.",
			"Use team_comment to communicate. Do NOT close the ticket yourself — the coordinator will end the session.",
			"Stay focused on the task and respond to coordinator messages.",
		);
	} else {
		lines.push(
			"Instructions:",
			ticketReadHint,
			"Do the work described in the ticket body above.",
			`Use team_comment to report progress while you work.`,
			`When done, call team_finish with status=done and a concise summary.`,
			`If you are quitting or blocked, call team_finish with status=quit and explain why.`,
			"",
			"GUARD PROTOCOL: YOU MUST DECLARE YOUR TERMINAL STATE VIA team_finish.",
			"Do not end by only writing raw mai notes or closing the ticket manually.",
			"team_finish is the authoritative terminal signal for the coordinator.",
			"",
			"Stay focused on the ticket. Do not ask for confirmation — just do the work.",
		);
	}
	return lines.join("\n");
}

export function spawnWorker(config: SpawnConfig): { process: ChildProcess; handle: WorkerHandle } {
	const leaseFile = buildLeaderLeasePath(config.leaderSessionFile);
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		PI_TEAMS_WORKER: "1",
		PI_TEAMS_WORKER_INSTANCE_ID: config.workerInstanceId,
		PI_TEAMS_TICKET_ID: config.ticketId,
		PI_TEAMS_LEADER_SESSION: config.leaderSessionFile,
		PI_TEAMS_WORKER_NAME: config.workerName,
		PI_TEAMS_LEASE_FILE: leaseFile,
	};

	// Mesh channel for instant worker→coordinator communication
	if (config.channelId) env.PI_TEAMS_CHANNEL_ID = config.channelId;
	if (config.teamId) env.PI_TEAMS_TEAM_ID = config.teamId;
	if (config.leaderEpoch) env.PI_TEAMS_LEADER_EPOCH = config.leaderEpoch;
	if (config.coordinatorMeshId) env.PI_TEAMS_COORDINATOR_ID = config.coordinatorMeshId;
	if (config.ticketCwd) env.PI_TEAMS_TICKET_CWD = config.ticketCwd;
	if (config.freeform) env.PI_TEAMS_FREEFORM = "1";
	if (config.sessionMode) env.PI_TEAMS_SESSION_MODE = JSON.stringify(config.sessionMode);

	if (config.hasTools) {
		env.PI_TEAMS_HAS_TOOLS = "1";
	} else {
		delete env.PI_TEAMS_HAS_TOOLS;
	}

	// Always keep worker sessions under the REPO ROOT, not the worktree cwd.
	// Worktree cleanup (removeWorktree) nukes the entire worktree directory —
	// if sessions lived there, a cleanup of one worker could destroy the session
	// of another worker sharing the same worktree path, or even the same worker
	// on a retry. Using repoRoot ensures sessions survive worktree lifecycle.
	const baseSessionDir = path.join(config.repoRoot, ".pi", "sessions", "teams-workers");
	const sessionDir = path.join(baseSessionDir, `team-${config.workerName}-${config.ticketId}-${Date.now()}`);

	// Ensure session dir exists so we can write stdout/stderr logs
	fs.mkdirSync(sessionDir, { recursive: true });
	const stdoutLog = path.join(sessionDir, "stdout.log");
	const stderrLog = path.join(sessionDir, "stderr.log");
	// Don't open fd-based stdio — the shell wrapper handles redirection.
	// This sidesteps a Bun race in the coordinator process where rapid
	// back-to-back spawns with fd-based stdio leave the 2nd+ children with
	// broken inherited fds (silent exit 0, zero output). Verified that
	// routing through sh -c with file redirection fixes 5/5 workers.

	const sessionFile = path.join(sessionDir, "session.jsonl");
	if (!fs.existsSync(sessionFile)) fs.writeFileSync(sessionFile, "", "utf-8");

	const args: string[] = [];
	if (config.sessionMode?.kind === "fork" || config.sessionMode?.kind === "resume") {
		const sessionFileArg = config.sessionMode.sessionFile;
		args.push("--session", sessionFileArg);
	} else {
		args.push("--session", sessionFile);
	}
	if (config.model) args.push("--model", config.model);
	args.push("-p", buildWorkerPrompt(config.ticketId, config.workerName, config.ticketText, config.additionalPrompt, config.freeform, config.coordinatorMeshId, config.ticketCwd));

	// Route through `sh -c "exec pi ..."` so the shell handles stdout/stderr
	// redirection via its own open() calls, avoiding the coordinator's fd race.
	// `exec` replaces sh with pi in the same pid so killWorker() targets pi.
	const shellCmd = ["exec", "pi", ...args.map((a) => `'${a.replace(/'/g, "'\\''")}'`)].join(" ") +
		` > ${JSON.stringify(stdoutLog)} 2> ${JSON.stringify(stderrLog)}`;
	const child = spawn("sh", ["-c", shellCmd], {
		cwd: config.cwd,
		env,
		stdio: ["ignore", "ignore", "ignore"],
		detached: true,
	});

	const now = Date.now();
	const handle: WorkerHandle = {
		workerInstanceId: config.workerInstanceId,
		name: config.workerName,
		pid: child.pid!,
		ticketId: config.ticketId,
		ticketStatus: "open",
		lastNote: undefined,
		sessionDir,
		sessionFile,
		worktreePath: config.useWorktree ? config.cwd : null,
		model: config.model,
		hasTools: config.hasTools,
		status: "spawning",
		spawnedAt: now,
		lastActivityAt: now,
		lastProcessActivityAt: now,
		lastOutputAt: now,
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "pending",
		attempts: [{ workerInstanceId: config.workerInstanceId, pid: child.pid!, sessionDir, sessionFile, spawnedAt: now, sessionMode: config.sessionMode }],
	};

	return { process: child, handle };
}

/** Find the session JSONL file in a worker's session directory. */
function findSessionFile(sessionDir: string): string | null {
	try {
		const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith(".jsonl"));
		return files.length > 0 ? path.join(sessionDir, files[0]) : null;
	} catch {
		return null;
	}
}

/**
 * Resume a persistent worker by continuing its existing session with a new message.
 * Uses `pi -p --session <file> "message"` to continue where the worker left off.
 */
export function resumeWorker(
	handle: WorkerHandle,
	message: string,
	env: Record<string, string>,
): ChildProcess | null {
	const sessionFile = findSessionFile(handle.sessionDir);
	if (!sessionFile) return null;

	const stdoutLog = path.join(handle.sessionDir, "stdout.log");
	const stderrLog = path.join(handle.sessionDir, "stderr.log");
	const stdoutFd = fs.openSync(stdoutLog, "a"); // append
	const stderrFd = fs.openSync(stderrLog, "a");

	const args = ["--session", sessionFile];
	if (handle.model) args.push("--model", handle.model);
	args.push("-p", message);

	const child = spawn("pi", args, {
		cwd: handle.worktreePath ?? process.cwd(),
		env,
		stdio: ["ignore", stdoutFd, stderrFd],
		detached: true,
	});

	fs.closeSync(stdoutFd);
	fs.closeSync(stderrFd);

	const now = Date.now();
	handle.pid = child.pid!;
	handle.status = "running";
	handle.lastActivityAt = now;
	handle.lastProcessActivityAt = now;
	handle.attempts = handle.attempts ?? [];
	handle.attempts.push({ workerInstanceId: handle.workerInstanceId, pid: child.pid!, sessionDir: handle.sessionDir, sessionFile, spawnedAt: now, sessionMode: { kind: "resume", sessionFile } });

	return child;
}

export function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function killWorker(pid: number): void {
	// Workers run in their own process group (`detached: true`), so kill the
	// whole group, not just the root pid. This catches sidecars like pi-mesh.
	const killGroup = (signal: NodeJS.Signals) => {
		try {
			process.kill(-pid, signal);
			return true;
		} catch {
			return false;
		}
	};
	const killPid = (signal: NodeJS.Signals) => {
		try {
			process.kill(pid, signal);
			return true;
		} catch {
			return false;
		}
	};

	killGroup("SIGTERM") || killPid("SIGTERM");

	// Use an external detached helper for escalation. An in-process setTimeout
	// dies with the coordinator on reload/crash, which leaves ghost workers.
	try {
		const helper = spawn(
			"bash",
			[
				"-lc",
				`sleep 5; kill -0 -- -${pid} 2>/dev/null && kill -KILL -- -${pid} 2>/dev/null || kill -0 ${pid} 2>/dev/null && kill -KILL ${pid} 2>/dev/null || true`,
			],
			{
				stdio: "ignore",
				detached: true,
			},
		);
		helper.unref();
	} catch {
		// Best effort fallback if bash isn't available
		setTimeout(() => {
			killGroup("SIGKILL") || killPid("SIGKILL");		}, 5000);
	}
}
