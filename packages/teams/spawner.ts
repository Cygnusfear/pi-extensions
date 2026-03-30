import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SpawnConfig, WorkerHandle } from "./types.js";

export function buildWorkerPrompt(ticketId: string, workerName: string, additionalPrompt?: string, freeform?: boolean, coordinatorMeshId?: string): string {
	const lines = [
		`You are worker "${workerName}". You have been assigned ticket ${ticketId}.`,
		"",
	];

	if (coordinatorMeshId) {
		lines.push(
			`Your coordinator's mesh ID is "${coordinatorMeshId}". If you use mesh_tell, send ONLY to this ID — do not broadcast to other peers.`,
			"",
		);
	}

	if (additionalPrompt) {
		lines.push("Role:", additionalPrompt, "");
	}

	if (freeform) {
		lines.push(
			"Instructions:",
			`1. Read your ticket: mai show ${ticketId}`,
			"2. Do the work described in the ticket.",
			`3. Comment on the ticket as you work: mai add-note ${ticketId} "your progress"`,
			"",
			"This is a freeform/interactive session. The coordinator will send you messages — respond to them.",
			"Use team_comment to communicate. Do NOT close the ticket yourself — the coordinator will end the session.",
			"Stay focused on the task and respond to coordinator messages.",
		);
	} else {
		lines.push(
			"Instructions:",
			`1. Read your ticket: mai show ${ticketId}`,
			"2. Do the work described in the ticket.",
			`3. Comment on the ticket as you work: mai add-note ${ticketId} "your progress"`,
			`4. When done, close the ticket with a result summary: mai add-note ${ticketId} "DONE: <summary>" && mai close ${ticketId}`,
			`5. If you are blocked, comment: mai add-note ${ticketId} "BLOCKED: <reason>"`,
			"",
			"GUARD PROTOCOL: AFTER WORK, UPDATE TICKET AND CLOSE",
			`Before you stop, run: mai add-note ${ticketId} "DONE: <summary>" && mai close ${ticketId}`,
			"Never finish with an open ticket.",
			"",
			"Stay focused on the ticket. Do not ask for confirmation — just do the work.",
		);
	}
	return lines.join("\n");
}

export function spawnWorker(config: SpawnConfig): { process: ChildProcess; handle: WorkerHandle } {
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		PI_TEAMS_WORKER: "1",
		PI_TEAMS_WORKER_INSTANCE_ID: config.workerInstanceId,
		PI_TEAMS_TICKET_ID: config.ticketId,
		PI_TEAMS_LEADER_SESSION: config.leaderSessionFile,
		PI_TEAMS_WORKER_NAME: config.workerName,
	};

	// Mesh channel for instant worker→coordinator communication
	if (config.channelId) env.PI_TEAMS_CHANNEL_ID = config.channelId;
	if (config.coordinatorMeshId) env.PI_TEAMS_COORDINATOR_ID = config.coordinatorMeshId;
	if (config.freeform) env.PI_TEAMS_FREEFORM = "1";

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
	const stdoutFd = fs.openSync(stdoutLog, "w");
	const stderrFd = fs.openSync(stderrLog, "w");

	const args = ["--non-interactive", "--session-dir", sessionDir];
	if (config.model) args.push("--model", config.model);
	args.push("-p", buildWorkerPrompt(config.ticketId, config.workerName, config.additionalPrompt, config.freeform, config.coordinatorMeshId));

	const child = spawn("pi", args, {
		cwd: config.cwd,
		env,
		stdio: ["ignore", stdoutFd, stderrFd],
		detached: false,
	});

	// Close the fds in the parent — the child inherited them
	fs.closeSync(stdoutFd);
	fs.closeSync(stderrFd);

	const sessionFile = path.join(sessionDir, "session.jsonl");

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

	const args = ["--non-interactive", "--session", sessionFile];
	if (handle.model) args.push("--model", handle.model);
	args.push("-p", message);

	const child = spawn("pi", args, {
		cwd: handle.worktreePath ?? process.cwd(),
		env,
		stdio: ["ignore", stdoutFd, stderrFd],
		detached: false,
	});

	fs.closeSync(stdoutFd);
	fs.closeSync(stderrFd);

	handle.pid = child.pid!;
	handle.status = "running";
	handle.lastActivityAt = Date.now();
	handle.lastProcessActivityAt = Date.now();

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
	try {
		process.kill(pid, "SIGTERM");
	} catch {
		// already dead
	}
	setTimeout(() => {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// already dead
		}
	}, 5000);
}
