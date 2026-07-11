import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildLeaderLeasePath, commitActivationLease, releaseActivationLease, tryAcquireActivationLease } from "./lease.js";
import {
	buildReviveDescriptor,
	pickReviveDescriptorEnv,
	SPAWNER_PARTIAL_DESCRIPTOR_FILE,
} from "@pi-extensions/shared/revive-descriptor";
import type { SpawnConfig, WorkerHandle } from "./types.js";

/**
 * Write the SPAWNER's PARTIAL revive descriptor next to the worker's session
 * file (ADD-1, contract pe-jimphzxj). The activator (pi-mesh) reads it on
 * identity resolution and materialises the canonical descriptor keyed by the
 * durable id. Only the spawner knows the semantic params (model, ticket,
 * worktree, PI_TEAMS_* env) that pi-mesh's process-view cannot see.
 */
function writeWorkerReviveDescriptor(input: {
	sessionFile: string;
	cwd: string;
	model?: string;
	ticketId?: string;
	worktreePath?: string | null;
	env: Record<string, string | undefined>;
	supervisors?: string[];
}): string {
	const args = ["--session", input.sessionFile];
	if (input.model) args.push("--model", input.model);
	const descriptor = buildReviveDescriptor({
		sessionFile: input.sessionFile,
		cwd: input.cwd,
		command: "pi",
		args,
		model: input.model,
		ticketId: input.ticketId,
		worktreePath: input.worktreePath ?? undefined,
		env: pickReviveDescriptorEnv(input.env),
		supervisors: input.supervisors && input.supervisors.length > 0 ? input.supervisors : undefined,
	});
	const descriptorPath = path.join(path.dirname(input.sessionFile), SPAWNER_PARTIAL_DESCRIPTOR_FILE);
	fs.mkdirSync(path.dirname(descriptorPath), { recursive: true });
	const tmp = `${descriptorPath}.${process.pid}.${Date.now()}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(descriptor, null, 2), "utf-8");
	fs.renameSync(tmp, descriptorPath);
	return descriptorPath;
}


export function buildWorkerPrompt(ticketId: string, workerName: string, ticketText?: string, additionalPrompt?: string, freeform?: boolean, coordinatorMeshId?: string, ticketCwd?: string): string {
	const lines = [
		`You are worker "${workerName}". You have been assigned ticket ${ticketId}.`,
		"",
	];

	if (coordinatorMeshId) {
		lines.push(
			`Your coordinator's mesh ID is "${coordinatorMeshId}" — FYI only.`,
			`To talk to the coordinator, use \`team_comment\` (progress, questions, acknowledgements, blockers) and \`team_finish\` (terminal status).`,
			`\`team_comment\` writes to the ticket AND sends an ordinary durable mesh tell to the coordinator, plus a durable note is kept.`,
			`Do NOT use raw \`mesh_tell\` to the coordinator id — ad hoc point-to-point messages can race peer discovery at spawn time. \`team_comment\` uses the teams envelope over the coordinator durable id.`,
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
			"If you need to post a long review/note with markdown, code fences, or backticks, write it to a file and send it with team_comment { filePath } instead of inlining it in shell commands or JS template literals.",
			`When done, call team_finish with status=done and a concise summary.`,
			`If you are quitting or blocked, call team_finish with status=quit and explain why.`,
			"",
			"GUARD PROTOCOL: YOU MUST DECLARE YOUR TERMINAL STATE VIA team_finish.",
			"ASYNC HANDOFF: if execute_code says it was auto-promoted to async, that is NOT completion. The background job is still part of your task. Do NOT write a final answer or stop; make a follow-up tool call to wait for/inspect it, then continue.",
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

	const activeSessionFile =
		config.sessionMode?.kind === "fork" || config.sessionMode?.kind === "resume"
			? config.sessionMode.sessionFile
			: sessionFile;

	// v1c ADD-1: write the spawner's PARTIAL revive descriptor next to the session
	// file so the activator (pi-mesh) materialises the canonical one keyed by the
	// durable id. Point the worker at it explicitly (pi-mesh also has a session-dir
	// fallback).
	const descriptorPath = writeWorkerReviveDescriptor({
		sessionFile: activeSessionFile,
		cwd: config.cwd,
		model: config.model,
		ticketId: config.ticketId,
		worktreePath: config.useWorktree ? config.cwd : null,
		env,
		supervisors: config.coordinatorMeshId ? [config.coordinatorMeshId] : undefined,
	});
	env.PI_TEAMS_REVIVE_DESCRIPTOR = descriptorPath;

	const args: string[] = ["--session", activeSessionFile];
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

	// v1c: this fresh incarnation holds the activation lease so a concurrent resume
	// of the same session is refused while it is live (single-activation authority).
	const activation = tryAcquireActivationLease(activeSessionFile);
	if (activation.acquired && activation.epoch) {
		commitActivationLease(activeSessionFile, activation.epoch, child.pid!);
		handle.activationEpoch = activation.epoch;
		handle.activationSessionFile = activeSessionFile;
	}

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

	// v1c per-worker activation LOCK (part C): refuse a concurrent resume of the
	// SAME session — two `pi --session <file>` would corrupt one session.jsonl.
	// tryAcquire is atomic (openSync "wx"), so two racing resumes → exactly one
	// wins; the loser gets null and the caller skips it. A dead prior incarnation's
	// stale lease is stolen (that IS the orphan = kill + standard-revive path).
	const activation = tryAcquireActivationLease(sessionFile);
	if (!activation.acquired || !activation.epoch) return null;

	// Refresh the revive descriptor with the CURRENT resume env so a future revive
	// is reconstructable from the latest incarnation's params.
	const descriptorPath = writeWorkerReviveDescriptor({
		sessionFile,
		cwd: handle.worktreePath ?? process.cwd(),
		model: handle.model,
		ticketId: handle.ticketId,
		worktreePath: handle.worktreePath,
		env,
		supervisors: env.PI_TEAMS_COORDINATOR_ID ? [env.PI_TEAMS_COORDINATOR_ID] : undefined,
	});
	env.PI_TEAMS_REVIVE_DESCRIPTOR = descriptorPath;

	const stdoutLog = path.join(handle.sessionDir, "stdout.log");
	const stderrLog = path.join(handle.sessionDir, "stderr.log");
	const stdoutFd = fs.openSync(stdoutLog, "a"); // append
	const stderrFd = fs.openSync(stderrLog, "a");

	const args = ["--session", sessionFile];
	if (handle.model) args.push("--model", handle.model);
	args.push("-p", message);

	let child: ChildProcess;
	try {
		child = spawn("pi", args, {
			cwd: handle.worktreePath ?? process.cwd(),
			env,
			stdio: ["ignore", stdoutFd, stderrFd],
			detached: true,
		});
	} catch (err) {
		// Spawn failed (e.g. pi not found) — do NOT strand the activation lease.
		// Release the reservation so a later revive can re-acquire immediately.
		try { fs.closeSync(stdoutFd); } catch {}
		try { fs.closeSync(stderrFd); } catch {}
		releaseActivationLease(sessionFile, activation.epoch);
		throw err;
	}

	fs.closeSync(stdoutFd);
	fs.closeSync(stderrFd);

	const now = Date.now();
	handle.pid = child.pid!;
	handle.status = "running";
	handle.lastActivityAt = now;
	handle.lastProcessActivityAt = now;
	handle.attempts = handle.attempts ?? [];
	handle.attempts.push({ workerInstanceId: handle.workerInstanceId, pid: child.pid!, sessionDir: handle.sessionDir, sessionFile, spawnedAt: now, sessionMode: { kind: "resume", sessionFile } });

	// Commit the reservation to the new incarnation's pid so single-activation
	// liveness tracks the actual `pi` process; store the epoch for release on exit.
	commitActivationLease(sessionFile, activation.epoch, child.pid!);
	handle.activationEpoch = activation.epoch;
	handle.activationSessionFile = sessionFile;

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

/**
 * Release this worker's activation lease when its incarnation exits or is killed.
 * Idempotent + best-effort: a dead worker pid already makes the lease stealable,
 * so this is immediacy + hygiene (no leftover lease file). No-op if the worker
 * never held a lease.
 */
export function releaseWorkerActivation(handle: WorkerHandle): void {
	if (handle.activationSessionFile && handle.activationEpoch) {
		releaseActivationLease(handle.activationSessionFile, handle.activationEpoch);
		handle.activationEpoch = undefined;
		handle.activationSessionFile = undefined;
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
