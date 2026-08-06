import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
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

/** A resolved, absolute Pi CLI capability. Never a Bun runtime or bare PATH command. */
export interface PiExecutable {
	readonly path: string;
	readonly source: "PI_BIN" | "current-cli" | "bun-install" | "PATH";
}

export type PiExecutableResolution =
	| { readonly kind: "resolved"; readonly executable: PiExecutable }
	| { readonly kind: "unavailable"; readonly message: string };

export interface PiExecutableResolver {
	resolve(): PiExecutableResolution;
}

/**
 * Resolve the Pi *CLI* once per coordinator runtime. `process.execPath` is
 * deliberately absent: that identifies Bun/Node, not the CLI entrypoint that
 * accepts `--session`. A successful or unsuccessful result is cached, keeping
 * spawn coordination O(1) after the first request.
 */
export function createPiExecutableResolver(input: {
	env?: NodeJS.ProcessEnv;
	argv?: readonly string[];
	homeDir?: string;
} = {}): PiExecutableResolver {
	const env = input.env ?? process.env;
	const argv = input.argv ?? process.argv;
	const homeDir = input.homeDir ?? os.homedir();
	let cached: { key: string; resolution: PiExecutableResolution } | undefined;

	const executable = (candidate: string | undefined, source: PiExecutable["source"]): PiExecutable | null => {
		if (!candidate || !path.isAbsolute(candidate)) return null;
		try {
			const stat = fs.statSync(candidate);
			fs.accessSync(candidate, fs.constants.X_OK);
			return stat.isFile() ? { path: candidate, source } : null;
		} catch {
			return null;
		}
	};

	const likelyPiCli = (candidate: string | undefined): boolean => {
		if (!candidate) return false;
		const base = path.basename(candidate).toLowerCase();
		return base === "pi" || base === "pi.exe";
	};

	return {
		resolve(): PiExecutableResolution {
			// A coordinator's normal environment is stable, so this is an O(1) map
			// lookup. Fingerprinting lets an explicit runtime environment change (and
			// package-manager replacement) re-resolve rather than retain stale PATH data.
			const key = [env.PI_BIN ?? "", env.PATH ?? "", env.BUN_INSTALL ?? "", ...argv].join("\0");
			const remember = (resolution: PiExecutableResolution): PiExecutableResolution => {
				cached = { key, resolution };
				return resolution;
			};
			if (cached?.key === key) {
				if (cached.resolution.kind === "unavailable") return cached.resolution;
				// Hot path: one direct executable validation, never another PATH scan.
				if (executable(cached.resolution.executable.path, cached.resolution.executable.source)) return cached.resolution;
				// A package-manager upgrade/uninstall may replace the cached symlink.
				cached = undefined;
			}

			const override = env.PI_BIN;
			if (override !== undefined) {
				const resolved = executable(override, "PI_BIN");
				return remember(resolved
					? { kind: "resolved", executable: resolved }
					: { kind: "unavailable", message: "PI_BIN must name an absolute executable Pi CLI" });
			}

			for (const candidate of [argv[1], argv[0]]) {
				if (!likelyPiCli(candidate)) continue;
				const resolved = executable(candidate, "current-cli");
				if (resolved) return remember({ kind: "resolved", executable: resolved });
			}

			for (const directory of (env.PATH ?? "").split(path.delimiter)) {
				const resolved = executable(path.join(directory || ".", "pi"), "PATH");
				if (resolved) return remember({ kind: "resolved", executable: resolved });
			}

			for (const candidate of [
				env.BUN_INSTALL ? path.join(env.BUN_INSTALL, "bin", "pi") : undefined,
				path.join(homeDir, ".bun", "bin", "pi"),
			]) {
				const resolved = executable(candidate, "bun-install");
				if (resolved) return remember({ kind: "resolved", executable: resolved });
			}

			return remember({
				kind: "unavailable",
				message: "Pi CLI executable is unavailable (set PI_BIN to an absolute executable, or install pi on the coordinator PATH)",
			});
		},
	};
}

export interface WorkerSpawnFailure {
	readonly kind: "pi-unavailable" | "spawn-prepare-failed" | "spawn-threw" | "spawn-no-pid" | "spawn-error";
	readonly message: string;
	readonly executable?: string;
}

export interface WorkerProcessLaunch {
	readonly kind: "started";
	readonly process: ChildProcess;
	readonly executable: string;
	/** Receives a stored failure even when the child emitted before leader wiring. */
	onFailure(listener: (failure: WorkerSpawnFailure) => void): () => void;
}

export type WorkerLaunchResult = WorkerProcessLaunch | { readonly kind: "failed"; readonly failure: WorkerSpawnFailure };
export type SpawnWorkerResult =
	| (WorkerProcessLaunch & { readonly handle: WorkerHandle })
	| { readonly kind: "failed"; readonly failure: WorkerSpawnFailure };
export type ResumeWorkerResult = WorkerProcessLaunch | { readonly kind: "refused" } | { readonly kind: "failed"; readonly failure: WorkerSpawnFailure };

export interface WorkerSpawnDependencies {
	readonly piExecutable: PiExecutableResolver;
	readonly spawn: typeof spawn;
}

const coordinatorPiExecutable = createPiExecutableResolver();
const defaultWorkerSpawnDependencies: WorkerSpawnDependencies = { piExecutable: coordinatorPiExecutable, spawn };

/** Test seam for a concrete Pi capability or a launcher that sync-throws / emits error. */
export function createWorkerSpawnDependencies(
	piExecutable: PiExecutableResolver,
	spawnProcess: typeof spawn = spawn,
): WorkerSpawnDependencies {
	return { piExecutable, spawn: spawnProcess };
}

interface PreparedPiInvocation {
	readonly command: string;
	readonly args: readonly string[];
	readonly options: SpawnOptions;
	cleanup?(): void;
}

interface PiLaunchRequest {
	readonly args: readonly string[];
	readonly cwd: string;
	readonly env: Record<string, string>;
	prepare(executable: PiExecutable): PreparedPiInvocation;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Single resolver + spawn boundary for fresh and resumed workers. It owns an
 * immediate error listener, so the EventEmitter error path cannot escape the
 * coordinator between `spawn()` and leader listener installation.
 */
function launchPiWorker(request: PiLaunchRequest, dependencies: WorkerSpawnDependencies): WorkerLaunchResult {
	const resolution = dependencies.piExecutable.resolve();
	if (resolution.kind === "unavailable") {
		return { kind: "failed", failure: { kind: "pi-unavailable", message: resolution.message } };
	}

	let invocation: PreparedPiInvocation;
	try {
		invocation = request.prepare(resolution.executable);
	} catch (error) {
		return {
			kind: "failed",
			failure: { kind: "spawn-prepare-failed", message: errorMessage(error), executable: resolution.executable.path },
		};
	}

	let child: ChildProcess;
	try {
		child = dependencies.spawn(invocation.command, [...invocation.args], invocation.options);
	} catch (error) {
		try { invocation.cleanup?.(); } catch {}
		return {
			kind: "failed",
			failure: { kind: "spawn-threw", message: errorMessage(error), executable: resolution.executable.path },
		};
	}
	try { invocation.cleanup?.(); } catch {}

	let observedFailure: WorkerSpawnFailure | undefined;
	const listeners = new Set<(failure: WorkerSpawnFailure) => void>();
	child.once("error", (error) => {
		observedFailure = {
			kind: "spawn-error",
			message: errorMessage(error),
			executable: resolution.executable.path,
		};
		for (const listener of [...listeners]) listener(observedFailure);
	});

	if (!Number.isInteger(child.pid) || child.pid === undefined || child.pid <= 0) {
		return {
			kind: "failed",
			failure: {
				kind: "spawn-no-pid",
				message: `Pi launcher returned no process PID for ${resolution.executable.path}`,
				executable: resolution.executable.path,
			},
		};
	}

	return {
		kind: "started",
		process: child,
		executable: resolution.executable.path,
		onFailure(listener) {
			if (observedFailure) {
				listener(observedFailure);
				return () => {};
			}
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function quoteForPosixShell(arg: string): string {
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Write the SPAWNER's PARTIAL revive descriptor in its worker-owned runtime
 * directory (ADD-1, contract pe-jimphzxj). The descriptor stores the resolved
 * absolute CLI capability, never a bare `pi` that a later revival must find in
 * an unrelated shell PATH.
 */
function writeWorkerReviveDescriptor(input: {
	sessionFile: string;
	descriptorDir?: string;
	cwd: string;
	command: string;
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
		command: input.command,
		args,
		model: input.model,
		ticketId: input.ticketId,
		worktreePath: input.worktreePath ?? undefined,
		env: pickReviveDescriptorEnv(input.env),
		supervisors: input.supervisors && input.supervisors.length > 0 ? input.supervisors : undefined,
	});
	const descriptorPath = path.join(input.descriptorDir ?? path.dirname(input.sessionFile), SPAWNER_PARTIAL_DESCRIPTOR_FILE);
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

/**
 * Teams launch state is an attempt-owned, versioned contract, never ambient
 * process state. A nested Teams coordinator is itself a worker, so copying any
 * PI_TEAMS_* value can make its child inherit stale provenance or behavior.
 */
export const TEAMS_LAUNCH_ENV_PREFIX = "PI_TEAMS_";
export const WORKER_LAUNCH_ENV_CONTRACT_VERSION = "1";

/**
 * Build the complete worker launch contract from SpawnConfig. Non-Teams ambient
 * values (PATH, locale, credentials, etc.) remain available, while every
 * inherited PI_TEAMS_* value is discarded before the typed contract is emitted.
 * Optional false/absent facts intentionally have no environment representation.
 */
export function buildWorkerLaunchEnvironment(
	config: SpawnConfig,
	inheritedEnv: Record<string, string | undefined> = process.env,
): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(inheritedEnv)) {
		if (typeof value === "string" && !key.startsWith(TEAMS_LAUNCH_ENV_PREFIX)) env[key] = value;
	}

	const contract: Record<string, string> = {
		PI_TEAMS_LAUNCH_CONTRACT_VERSION: WORKER_LAUNCH_ENV_CONTRACT_VERSION,
		PI_TEAMS_WORKER: "1",
		PI_TEAMS_WORKER_ID: config.workerId,
		PI_TEAMS_WORKER_INSTANCE_ID: config.workerInstanceId,
		PI_TEAMS_TICKET_ID: config.ticketId,
		PI_TEAMS_LEADER_SESSION: config.leaderSessionFile,
		PI_TEAMS_WORKER_NAME: config.workerName,
		PI_TEAMS_LEASE_FILE: buildLeaderLeasePath(config.leaderSessionFile),
	};
	if (config.teamId) contract.PI_TEAMS_TEAM_ID = config.teamId;
	if (config.leaderEpoch) contract.PI_TEAMS_LEADER_EPOCH = config.leaderEpoch;
	if (config.coordinatorSessionId) contract.PI_TEAMS_COORDINATOR_SESSION_ID = config.coordinatorSessionId;
	if (config.coordinatorMeshId) contract.PI_TEAMS_COORDINATOR_ID = config.coordinatorMeshId;
	if (config.coordinatorSessionName) contract.PI_TEAMS_COORDINATOR_SESSION_NAME = config.coordinatorSessionName;
	if (config.coordinatorNickname) contract.PI_TEAMS_COORDINATOR_NICKNAME = config.coordinatorNickname;
	if (config.ticketCwd) contract.PI_TEAMS_TICKET_CWD = config.ticketCwd;
	if (config.freeform) contract.PI_TEAMS_FREEFORM = "1";
	if (config.sessionMode) contract.PI_TEAMS_SESSION_MODE = JSON.stringify(config.sessionMode);
	if (config.hasTools) contract.PI_TEAMS_HAS_TOOLS = "1";
	return { ...env, ...contract };
}

export function spawnWorker(
	config: SpawnConfig,
	dependencies: WorkerSpawnDependencies = defaultWorkerSpawnDependencies,
): SpawnWorkerResult {
	if (config.sessionMode?.kind === "adopt") {
		throw new Error("Adopted sessions must be activated through resumeWorker so the activation lease is acquired before spawn");
	}
	const env = buildWorkerLaunchEnvironment(config);

	// Sessions live below the repo root, not a disposable worktree.
	const sessionDir = config.sessionDir;
	const sessionFile = path.join(sessionDir, "session.jsonl");
	const activeSessionFile = config.sessionMode?.kind === "fork" || config.sessionMode?.kind === "resume"
		? config.sessionMode.sessionFile
		: sessionFile;
	const args: string[] = ["--session", activeSessionFile];
	if (config.model) args.push("--model", config.model);
	args.push("-p", buildWorkerPrompt(config.ticketId, config.workerName, config.ticketText, config.additionalPrompt, config.freeform, config.coordinatorMeshId, config.ticketCwd));

	const launch = launchPiWorker({
		args,
		cwd: config.cwd,
		env,
		prepare(executable) {
			fs.mkdirSync(sessionDir, { recursive: true });
			if (!fs.existsSync(sessionFile)) fs.writeFileSync(sessionFile, "", "utf-8");
			const descriptorPath = writeWorkerReviveDescriptor({
				sessionFile: activeSessionFile,
				cwd: config.cwd,
				command: executable.path,
				model: config.model,
				ticketId: config.ticketId,
				worktreePath: config.useWorktree ? config.cwd : null,
				env,
				supervisors: config.coordinatorMeshId ? [config.coordinatorMeshId] : undefined,
			});
			env.PI_TEAMS_REVIVE_DESCRIPTOR = descriptorPath;

			// Keep the existing shell-owned log redirection workaround for Bun's
			// fd inheritance race, but execute the already-resolved absolute CLI.
			if (process.platform !== "win32" && fs.existsSync("/bin/sh")) {
				const shellCommand = ["exec", quoteForPosixShell(executable.path), ...args.map(quoteForPosixShell)].join(" ")
					+ ` > ${JSON.stringify(path.join(sessionDir, "stdout.log"))} 2> ${JSON.stringify(path.join(sessionDir, "stderr.log"))}`;
				return {
					command: "/bin/sh",
					args: ["-c", shellCommand],
					options: { cwd: config.cwd, env, stdio: ["ignore", "ignore", "ignore"], detached: true },
				};
			}

			const stdoutFd = fs.openSync(path.join(sessionDir, "stdout.log"), "a");
			const stderrFd = fs.openSync(path.join(sessionDir, "stderr.log"), "a");
			return {
				command: executable.path,
				args,
				options: { cwd: config.cwd, env, stdio: ["ignore", stdoutFd, stderrFd], detached: true },
				cleanup() {
					try { fs.closeSync(stdoutFd); } catch {}
					try { fs.closeSync(stderrFd); } catch {}
				},
			};
		},
	}, dependencies);
	if (launch.kind === "failed") return launch;

	const now = Date.now();
	const handle: WorkerHandle = {
		workerId: config.workerId,
		workerInstanceId: config.workerInstanceId,
		name: config.workerName,
		pid: launch.process.pid!,
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
		attempts: [{ workerId: config.workerId, workerInstanceId: config.workerInstanceId, pid: launch.process.pid!, sessionDir, sessionFile, spawnedAt: now, sessionMode: config.sessionMode }],
	};

	const activation = tryAcquireActivationLease(activeSessionFile);
	if (activation.acquired && activation.epoch) {
		commitActivationLease(activeSessionFile, activation.epoch, launch.process.pid!);
		handle.activationEpoch = activation.epoch;
		handle.activationSessionFile = activeSessionFile;
	}
	// The launch boundary owns the raw EventEmitter error; release this attempt's
	// disposable lease even if a caller has not wired lifecycle handling yet.
	launch.onFailure(() => releaseWorkerActivation(handle));

	return { ...launch, handle };
}

/** Find the session JSONL file in a worker's session directory. */
function findSessionFile(handle: Pick<WorkerHandle, "sessionDir" | "sessionFile">): string | null {
	if (handle.sessionFile && fs.existsSync(handle.sessionFile)) return handle.sessionFile;
	try {
		const files = fs.readdirSync(handle.sessionDir).filter((f) => f.endsWith(".jsonl"));
		return files.length === 1 ? path.join(handle.sessionDir, files[0]) : null;
	} catch {
		return null;
	}
}

/**
 * Resume a persistent worker with the same typed Pi capability/launch boundary
 * used by fresh recruitment. Refusal, unavailable CLI, sync throw, and async
 * child error are distinct lifecycle outcomes rather than coordinator errors.
 */
export function resumeWorker(
	handle: WorkerHandle,
	message: string,
	config: SpawnConfig,
	dependencies: WorkerSpawnDependencies = defaultWorkerSpawnDependencies,
	inheritedEnv: Record<string, string | undefined> = process.env,
): ResumeWorkerResult {
	const env = buildWorkerLaunchEnvironment(config, inheritedEnv);
	const sessionFile = findSessionFile(handle);
	if (!sessionFile) return { kind: "refused" };

	const activation = tryAcquireActivationLease(sessionFile);
	if (!activation.acquired || !activation.epoch) return { kind: "refused" };

	const executionCwd = config.cwd;
	const args = ["--session", sessionFile];
	if (handle.model) args.push("--model", handle.model);
	args.push("-p", message);

	const launch = launchPiWorker({
		args,
		cwd: executionCwd,
		env,
		prepare(executable) {
			const descriptorPath = writeWorkerReviveDescriptor({
				sessionFile,
				descriptorDir: handle.sessionDir,
				cwd: executionCwd,
				command: executable.path,
				model: handle.model,
				ticketId: handle.ticketId,
				worktreePath: handle.worktreePath,
				env,
				supervisors: env.PI_TEAMS_COORDINATOR_ID ? [env.PI_TEAMS_COORDINATOR_ID] : undefined,
			});
			env.PI_TEAMS_REVIVE_DESCRIPTOR = descriptorPath;
			const stdoutFd = fs.openSync(path.join(handle.sessionDir, "stdout.log"), "a");
			const stderrFd = fs.openSync(path.join(handle.sessionDir, "stderr.log"), "a");
			return {
				command: executable.path,
				args,
				options: { cwd: executionCwd, env, stdio: ["ignore", stdoutFd, stderrFd], detached: true },
				cleanup() {
					try { fs.closeSync(stdoutFd); } catch {}
					try { fs.closeSync(stderrFd); } catch {}
				},
			};
		},
	}, dependencies);
	if (launch.kind === "failed") {
		releaseActivationLease(sessionFile, activation.epoch);
		return launch;
	}

	const now = Date.now();
	handle.pid = launch.process.pid!;
	handle.spawnedAt = now;
	handle.status = "running";
	handle.exitCode = undefined;
	handle.spawnError = undefined;
	handle.terminalStatus = undefined;
	handle.terminalSummary = undefined;
	handle.lastActivityAt = now;
	handle.lastProcessActivityAt = now;
	handle.attempts = handle.attempts ?? [];
	handle.attempts.push({
		workerId: handle.workerId,
		workerInstanceId: handle.workerInstanceId,
		pid: launch.process.pid!,
		sessionDir: handle.sessionDir,
		sessionFile,
		spawnedAt: now,
		sessionMode: handle.spawnConfig?.sessionMode ?? { kind: "resume", sessionFile },
	});
	commitActivationLease(sessionFile, activation.epoch, launch.process.pid!);
	handle.activationEpoch = activation.epoch;
	handle.activationSessionFile = sessionFile;
	// Never strand a lease when a Node-style child error arrives after spawn().
	launch.onFailure(() => releaseWorkerActivation(handle));
	return launch;
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
