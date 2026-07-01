import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { randomBytes } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { registerSandboxFn, registerContextualSandboxFn, type SandboxCallContext } from "@pi-extensions/shared/sandbox-registry";

const DEFAULT_LOG_LIMIT = 200;
const MAX_LOG_LIMIT = 2000;

type BackgroundJobStatus = "running" | "exited" | "stopped";
type BashCompatAction = "run" | "start" | "status" | "logs" | "stop" | "list";

/** Terminal status reported by a BashBgHandle.then / .stop / .timeout. */
export type BashBgWaitStatus = "exited" | "stopped" | "timeout" | "aborted";

/** Stream label for line callbacks attached via handle.each(). */
export type BashBgStream = "stdout" | "stderr";

export type BashBgResult = {
	id: string;
	pid: number;
	command: string;
	cwd: string;
	logPath: string;
	status: BashBgWaitStatus;
	exitCode: number | null;
	signal?: string;
	runtimeMs: number;
};

export type BackgroundBashJob = {
	id: string;
	command: string;
	cwd: string;
	pid: number;
	logPath: string;
	status: BackgroundJobStatus;
	startedAt: number;
	endedAt?: number;
	exitCode?: number | null;
	signal?: string;
};

export type BackgroundLogsResult = {
	text: string;
	offset: number;
	limit: number;
	nextOffset: number;
	totalLines: number;
	hasMore: boolean;
	status: BackgroundJobStatus;
};

/**
 * Per-line callback for BashBgHandle.each(). Receives the line (without trailing
 * newline) and the originating stream. Synchronous; throwing is logged and ignored.
 */
export type BashBgLineCallback = (line: string, stream: BashBgStream) => void;

/**
 * Thenable handle returned synchronously by bashBgStart(). Mirrors execa /
 * teams.on:
 *   - properties (id, pid, cwd, logPath, status) populated at call time
 *   - chain setters (.each, .timeout) return `this`
 *   - `await handle` or `.then(cb)` resolves on child exit (or timeout/abort)
 *
 * @example
 *   // Wait for exit with deadline. .timeout is a chainable setter; await
 *   // (or .then) triggers the actual wait.
 *   const r = await bashBgStart({ command: "cargo check" }).timeout(120_000);
 *
 *   // Fire-and-react: attach .then without awaiting. Combine with .each for
 *   // line streaming. This is the canonical long-running shape.
 *   bashBgStart({ command: "cargo build" })
 *     .each(line => console.log(line))
 *     .then(result => console.wake(`done: ${result.exitCode}`));
 *
 *   // Truly fire-and-forget — just don't await and don't attach .then.
 *   const dev = bashBgStart({ command: "npm run dev" });
 *   console.log(dev.id, dev.pid, dev.status);
 *   // ...later
 *   await dev.stop();
 *
 * FOOTGUN: `await bashBgStart({ command: "npm run dev" })` will block until
 * the dev server exits (which is never). Don't await long-running processes;
 * attach `.then(cb)` or use `.stop()` when you're done with them.
 */
export interface BashBgHandle extends PromiseLike<BashBgResult> {
	readonly id: string;
	readonly pid: number;
	readonly command: string;
	readonly cwd: string;
	readonly logPath: string;
	/** Current job status as a STRING (live getter). Mirrors the old job.status field for backward compat. */
	readonly status: BackgroundJobStatus;
	/** Resolves once the child has spawned successfully; rejects on spawn error. */
	readonly started: Promise<void>;

	// ── Chainable setup (return `this`) ───────────────────────────────────
	/** Stream stdout/stderr lines as they're written. Late subscribers do NOT receive history; use .logs() to backfill. */
	each(callback: BashBgLineCallback): this;
	/** Set a deadline for the eventual await/.then. Reject-free; the child is NOT killed on timeout — the wait just resolves early with status="timeout". Last call wins; takes effect only on the first .then/await (single-flight). */
	timeout(ms: number): this;

	// ── Terminal Promise-returning helpers ────────────────────────────────
	/** Wait for child exit. Resolves (never rejects) with status="exited" / "stopped" / "timeout" / "aborted". */
	wait(opts?: { timeoutMs?: number }): Promise<BashBgResult>;
	/** Send a signal. Resolves with the eventual exit result (status: "stopped" / "exited"). */
	stop(signal?: NodeJS.Signals): Promise<BashBgResult>;
	/** Read the persisted log file (paginated). Matches bashBgLogs semantics. */
	logs(opts?: { offset?: number; limit?: number }): Promise<BackgroundLogsResult>;

	// ── Sync helpers ───────────────────────────────────────────────────────
	/** Full sync snapshot of the current job state. */
	inspect(): BackgroundBashJob;
	/** Detach all line-listeners attached via this handle. Does NOT kill the child. */
	unsubscribe(): void;
	/** Alias for unsubscribe. */
	cancel(): void;

	// ── Thenable protocol — `await handle` resolves on exit ───────────────
	then<TResult1 = BashBgResult, TResult2 = never>(
		onfulfilled?: ((value: BashBgResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2>;
}

const toSignalName = (signal: NodeJS.Signals | number | null): string | undefined => {
	if (typeof signal === "number") return `SIG${signal}`;
	if (typeof signal === "string") return signal;
	return undefined;
};

const cloneJob = (job: BackgroundBashJob): BackgroundBashJob => ({ ...job });

const isProcessAlive = (pid: number): boolean => {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException)?.code;
		if (code === "EPERM") return true;
		return false;
	}
};

const sendSignal = (pid: number, signal: NodeJS.Signals): void => {
	try {
		process.kill(-pid, signal);
		return;
	} catch (_error) {
		process.kill(pid, signal);
	}
};

const resolveWorkingDirectory = (baseCwd: string, explicitCwd?: string): string => {
	if (!explicitCwd) return baseCwd;
	if (path.isAbsolute(explicitCwd)) return explicitCwd;
	return path.resolve(baseCwd, explicitCwd);
};

const createJobId = (): string => `bg-${randomBytes(4).toString("hex")}`;

const sanitizeLineNumber = (value: number | undefined, fallback: number, max: number): number => {
	if (value === undefined || !Number.isFinite(value)) return fallback;
	const normalized = Math.floor(value);
	if (normalized < 1) return 1;
	return Math.min(max, normalized);
};

const formatJobLine = (job: BackgroundBashJob): string => {
	const runtime = job.endedAt
		? `${Math.max(0, Math.floor((job.endedAt - job.startedAt) / 1000))}s`
		: `${Math.max(0, Math.floor((Date.now() - job.startedAt) / 1000))}s`;
	const code = job.exitCode === undefined ? "" : ` exit=${job.exitCode}`;
	const signal = job.signal ? ` signal=${job.signal}` : "";
	return `${job.id} ${job.status} pid=${job.pid}${code}${signal} runtime=${runtime} cwd=${job.cwd}\n  cmd: ${job.command}`;
};

const formatForegroundOutput = async (
	output: string,
): Promise<{ text: string; truncated: boolean; fullOutputPath?: string }> => {
	if (!output.trim()) {
		return { text: "(no output)", truncated: false };
	}

	const truncation = truncateHead(output, {
		maxLines: DEFAULT_MAX_LINES,
		maxBytes: DEFAULT_MAX_BYTES,
	});

	if (!truncation.truncated) {
		return { text: truncation.content, truncated: false };
	}

	const tempFile = path.join(os.tmpdir(), `pi-bash-fg-${Date.now()}.log`);
	await fs.writeFile(tempFile, output, "utf8");

	const summary = `\n\n[output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(
		truncation.outputBytes,
	)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${tempFile}]`;

	return {
		text: truncation.content + summary,
		truncated: true,
		fullOutputPath: tempFile,
	};
};

const errorResult = (message: string) => ({
	content: [{ type: "text" as const, text: `Error: ${message}` }],
	isError: true,
});

/**
 * Per-job runtime resources owned by the manager. These exist for the lifetime
 * of the child process and are torn down on exit. Intentionally NOT mixed into
 * BackgroundBashJob because that's the serializable view.
 */
interface JobRuntime {
	child: ChildProcess;
	logStream: WriteStream;
	lineListeners: Set<BashBgLineCallback>;
	exitWaiters: Array<(result: BashBgResult) => void>;
}

/**
 * Validate that spawn() returned a fully-formed ChildProcess. A healthy spawn
 * always yields an object with .on/.once and (for stdio:"pipe") Readable
 * stdout/stderr supporting .resume(). Under bun's test runner at many-file scale
 * the runtime can hand back an INCOMPLETE object (child missing .once, or a
 * stream missing .resume) — validated ONCE here at the spawn boundary so the
 * manager fails such a job cleanly instead of crashing on child.once/.on or
 * readline.createInterface. Production spawn verified healthy at 200 rapid
 * spawns; this is manager robustness, not an FD-pressure fix.
 */
export function isUsableChild(child: ChildProcess): boolean {
	if (typeof (child as unknown as { on?: unknown }).on !== "function") return false;
	if (typeof (child as unknown as { once?: unknown }).once !== "function") return false;
	if (child.stdout != null && typeof (child.stdout as unknown as { resume?: unknown }).resume !== "function") return false;
	if (child.stderr != null && typeof (child.stderr as unknown as { resume?: unknown }).resume !== "function") return false;
	return true;
}

/**
 * Wire a child-process stdio stream into line capture + log tee. Extracted for
 * SRP + testability. Callers guarantee `stream` is null or a usable Readable
 * (validated once at the spawn boundary by isUsableChild), so a null-guard suffices.
 */
export function wireLineStreams(
	stream: NodeJS.ReadableStream | null,
	label: BashBgStream,
	deps: { jobId: string; logStream: WriteStream; listeners: Set<BashBgLineCallback> },
): void {
	if (!stream) return;
	const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
	rl.on("line", (line: string) => {
		try {
			deps.logStream.write(line);
			deps.logStream.write("\n");
		} catch { /* file fd already closed */ }
		for (const cb of deps.listeners) {
			try {
				cb(line, label);
			} catch (err) {
				console.warn(`[bashBg ${deps.jobId}] .each callback threw: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	});
}


export class BackgroundBashManager {
	private readonly jobs = new Map<string, BackgroundBashJob>();
	private readonly runtimes = new Map<string, JobRuntime>();
	private readonly logRoot: string;

	constructor(options?: { logRoot?: string }) {
		this.logRoot = options?.logRoot ?? os.tmpdir();
	}

	/**
	 * Synchronously spawn a child and register a job. Returns the populated job
	 * record plus a spawnPromise that resolves once the child fires "spawn".
	 *
	 * The child is wired with stdio: ["ignore", "pipe", "pipe"] so the manager
	 * can both (a) tee each line to the log file and (b) fan out lines to
	 * handle.each() subscribers. Line-level (not byte-level) tee avoids
	 * torn-line interleave between stdout and stderr in the on-disk log.
	 *
	 * Throws synchronously on validation errors (empty command, duplicate id).
	 * Spawn-time failures are delivered asynchronously via child.on("error").
	 */
	startSync(input: { command: string; cwd: string; id?: string }): { job: BackgroundBashJob; runtime: JobRuntime; spawnPromise: Promise<void> } {
		const command = input.command.trim();
		if (!command) {
			throw new Error("Command must not be empty.");
		}

		const cwd = path.resolve(input.cwd);
		const id = input.id ?? createJobId();
		if (this.jobs.has(id)) {
			throw new Error(`Background job already exists: ${id}`);
		}

		const logPath = path.join(this.logRoot, `pi-bg-${id}.log`);
		const logStream = createWriteStream(logPath, { flags: "a" });
		// Swallow late-write errors from the log stream so an aborted close
		// can't surface as a process-level unhandledError.
		logStream.on("error", (err) => {
			console.warn(`[bashBg ${id}] log stream error: ${err.message}`);
		});

		const child = spawn("sh", ["-c", command], {
			cwd,
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env,
		});

		// Robustness boundary: a healthy spawn returns a fully-formed ChildProcess.
		// If the runtime hands back an incomplete object (observed under bun's test
		// runner at 25+ files; production spawn verified healthy at 200 rapid spawns),
		// fail the job cleanly here instead of crashing the manager on child.on/.once
		// or a readline stream missing .resume(). One diagnostic warn, no wiring.
		if (!isUsableChild(child)) {
			console.warn(`[bashBg ${id}] incomplete spawn result (malformed child/stdio) — failing job cleanly, no line capture`);
			const failedAt = Date.now();
			const job: BackgroundBashJob = {
				id,
				command,
				cwd,
				pid: 0,
				logPath,
				status: "exited",
				exitCode: null,
				startedAt: failedAt,
				endedAt: failedAt,
			};
			const runtime: JobRuntime = { child, logStream, lineListeners: new Set(), exitWaiters: [] };
			this.jobs.set(id, job);
			this.runtimes.set(id, runtime);
			try { logStream.end(); } catch { /* already closed */ }
			const spawnPromise = Promise.reject(new Error(`background job ${id}: incomplete spawn result`));
			spawnPromise.catch(() => {});
			return { job, runtime, spawnPromise };
		}

		const now = Date.now();
		const job: BackgroundBashJob = {
			id,
			command,
			cwd,
			pid: child.pid ?? 0,
			logPath,
			status: "running",
			startedAt: now,
		};

		const runtime: JobRuntime = {
			child,
			logStream,
			lineListeners: new Set(),
			exitWaiters: [],
		};

		this.jobs.set(id, job);
		this.runtimes.set(id, runtime);

		const wireLineStream = (stream: NodeJS.ReadableStream | null, label: BashBgStream): void =>
			wireLineStreams(stream, label, {
				jobId: id,
				logStream,
				listeners: runtime.lineListeners,
			});

		wireLineStream(child.stdout, "stdout");
		wireLineStream(child.stderr, "stderr");

		child.on("error", (err) => {
			const current = this.jobs.get(id);
			if (current && current.status === "running") {
				current.status = "exited";
				current.exitCode = null;
				current.endedAt = Date.now();
			}
			console.warn(`[bashBg ${id}] spawn error: ${err.message}`);
		});

		child.on("exit", (exitCode, signal) => {
			const current = this.jobs.get(id);
			const rt = this.runtimes.get(id);
			if (!current) return;
			current.status = signal ? "stopped" : "exited";
			current.exitCode = exitCode;
			current.signal = toSignalName(signal);
			current.endedAt = Date.now();
			if (rt) {
				try { rt.logStream.end(); } catch { /* already closed */ }
				const result = this.buildResult(current, current.status as BashBgWaitStatus);
				const waiters = [...rt.exitWaiters];
				rt.exitWaiters.length = 0;
				for (const w of waiters) {
					try { w(result); } catch { /* user handler */ }
				}
			}
		});

		const spawnPromise = new Promise<void>((resolve, reject) => {
			child.once("spawn", () => {
				if (job.pid === 0 && child.pid) job.pid = child.pid;
				resolve();
			});
			child.once("error", (err) => reject(err));
		});
		// Swallow spawnPromise rejection if nobody attaches to it. Without this
		// a sandbox caller that ignores `.started` would crash the host on a
		// spawn error.
		spawnPromise.catch(() => {});

		child.unref();
		return { job, runtime, spawnPromise };
	}

	/**
	 * Async start — preserved for the direct-tool path (bash_bg_start) which
	 * pre-validates cwd and surfaces a clear error before spawning.
	 */
	async start(input: { command: string; cwd: string; id?: string }): Promise<BackgroundBashJob> {
		const cwd = path.resolve(input.cwd);
		const stats = await fs.stat(cwd).catch(() => null);
		if (!stats || !stats.isDirectory()) {
			throw new Error(`Working directory does not exist: ${cwd}`);
		}

		const { job, spawnPromise } = this.startSync({ ...input, cwd });
		await spawnPromise;
		return cloneJob(job);
	}

	getStatus(id: string): BackgroundBashJob | null {
		const job = this.jobs.get(id);
		if (!job) return null;
		this.refreshJob(job);
		return cloneJob(job);
	}

	list(): BackgroundBashJob[] {
		const jobs = [...this.jobs.values()];
		for (const job of jobs) this.refreshJob(job);
		return jobs
			.sort((a, b) => b.startedAt - a.startedAt)
			.map((job) => cloneJob(job));
	}

	async stop(id: string, signal: NodeJS.Signals = "SIGTERM"): Promise<BackgroundBashJob> {
		const job = this.jobs.get(id);
		if (!job) {
			throw new Error(`Background job not found: ${id}`);
		}

		this.refreshJob(job);
		if (job.status !== "running") {
			return cloneJob(job);
		}

		try {
			sendSignal(job.pid, signal);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException)?.code;
			if (code !== "ESRCH") throw error;
		}

		this.refreshJob(job);
		return cloneJob(job);
	}

	async readLogs(id: string, options?: { offset?: number; limit?: number }): Promise<BackgroundLogsResult> {
		const job = this.jobs.get(id);
		if (!job) {
			throw new Error(`Background job not found: ${id}`);
		}

		this.refreshJob(job);
		const offset = sanitizeLineNumber(options?.offset, 1, Number.MAX_SAFE_INTEGER);
		const limit = sanitizeLineNumber(options?.limit, DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT);

		let content = "";
		try {
			content = await fs.readFile(job.logPath, "utf8");
		} catch (error) {
			const code = (error as NodeJS.ErrnoException)?.code;
			if (code !== "ENOENT") throw error;
		}

		const normalized = content.replace(/\r/g, "");
		const lines = normalized ? normalized.split("\n") : [];
		if (lines.length > 0 && lines[lines.length - 1] === "") {
			lines.pop();
		}

		const startIndex = Math.min(lines.length, offset - 1);
		const selected = lines.slice(startIndex, startIndex + limit);
		const nextOffset = startIndex + selected.length + 1;
		const hasMore = startIndex + selected.length < lines.length;

		const text =
			selected.length === 0
				? "(no output yet)"
				: selected.map((line, index) => `${startIndex + index + 1}: ${line}`).join("\n");

		return {
			text,
			offset: startIndex + 1,
			limit,
			nextOffset,
			totalLines: lines.length,
			hasMore,
			status: job.status,
		};
	}

	/**
	 * Subscribe to per-line output. Returns an unsubscribe function. Late
	 * subscribers do NOT receive history (use readLogs to backfill).
	 */
	subscribeLines(id: string, cb: BashBgLineCallback): () => void {
		const rt = this.runtimes.get(id);
		if (!rt) return () => {};
		rt.lineListeners.add(cb);
		return () => { rt.lineListeners.delete(cb); };
	}

	/**
	 * Wait for a job to exit. Resolves (never rejects) with a BashBgResult.
	 *
	 *   - status="exited"  → child exited on its own
	 *   - status="stopped" → child was killed by a signal
	 *   - status="timeout" → opts.timeoutMs elapsed; child is NOT killed
	 *   - status="aborted" → opts.signal aborted; child is NOT killed
	 *
	 * Multiple concurrent waiters on the same job are supported. Aborted
	 * and timeout waiters detach themselves cleanly.
	 *
	 * Resolve-on-abort (never reject) mirrors the sleep() abort-hardening
	 * pattern (commit 969b66a). Detached background promises that survive
	 * across execute_code turns must NOT produce unhandled rejections from
	 * stale signals — that's known to crash Bun.
	 */
	waitForExit(id: string, opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<BashBgResult> {
		const job = this.jobs.get(id);
		if (!job) {
			return Promise.reject(new Error(`Background job not found: ${id}`));
		}
		this.refreshJob(job);

		if (job.status !== "running") {
			return Promise.resolve(this.buildResult(job, job.status as BashBgWaitStatus));
		}

		const rt = this.runtimes.get(id);
		if (!rt) {
			return Promise.resolve(this.buildResult(job, "exited"));
		}

		return new Promise((resolve) => {
			let settled = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			let abortListener: (() => void) | undefined;

			const settle = (result: BashBgResult): void => {
				if (settled) return;
				settled = true;
				if (timer) clearTimeout(timer);
				if (abortListener && opts?.signal) {
					opts.signal.removeEventListener("abort", abortListener);
				}
				const idx = rt.exitWaiters.indexOf(exitWaiter);
				if (idx >= 0) rt.exitWaiters.splice(idx, 1);
				resolve(result);
			};

			const exitWaiter = (result: BashBgResult) => settle(result);
			rt.exitWaiters.push(exitWaiter);

			if (opts?.timeoutMs && opts.timeoutMs > 0) {
				timer = setTimeout(() => {
					const snapshot = this.jobs.get(id) ?? job;
					settle({
						id: snapshot.id,
						pid: snapshot.pid,
						command: snapshot.command,
						cwd: snapshot.cwd,
						logPath: snapshot.logPath,
						status: "timeout",
						exitCode: null,
						runtimeMs: Date.now() - snapshot.startedAt,
					});
				}, opts.timeoutMs);
			}

			if (opts?.signal) {
				const sig = opts.signal;
				abortListener = () => {
					const snapshot = this.jobs.get(id) ?? job;
					settle({
						id: snapshot.id,
						pid: snapshot.pid,
						command: snapshot.command,
						cwd: snapshot.cwd,
						logPath: snapshot.logPath,
						status: "aborted",
						exitCode: null,
						runtimeMs: Date.now() - snapshot.startedAt,
					});
				};
				if (sig.aborted) abortListener();
				else sig.addEventListener("abort", abortListener, { once: true });
			}
		});
	}

	/** Build a BashBgResult from a job snapshot. */
	private buildResult(job: BackgroundBashJob, status: BashBgWaitStatus): BashBgResult {
		return {
			id: job.id,
			pid: job.pid,
			command: job.command,
			cwd: job.cwd,
			logPath: job.logPath,
			status,
			exitCode: job.exitCode ?? null,
			signal: job.signal,
			runtimeMs: (job.endedAt ?? Date.now()) - job.startedAt,
		};
	}

	private refreshJob(job: BackgroundBashJob): void {
		if (job.status !== "running") return;
		if (!isProcessAlive(job.pid)) {
			job.status = "exited";
			job.endedAt ??= Date.now();
			job.exitCode ??= null;
			const rt = this.runtimes.get(job.id);
			if (rt && rt.exitWaiters.length > 0) {
				const result = this.buildResult(job, "exited");
				const waiters = [...rt.exitWaiters];
				rt.exitWaiters.length = 0;
				for (const w of waiters) {
					try { w(result); } catch { /* user handler */ }
				}
			}
		}
	}
}

/**
 * Construct a BashBgHandle around an active job.
 *
 * The handle IS thenable. `await handle` / `handle.then(cb)` resolves on
 * child exit (or .timeout / abort — never rejects).
 *
 * Chain setters `.each(cb)` and `.timeout(ms)` return `this` so you can
 * fluently set up streaming + deadline before the eventual await/.then:
 *
 *   const r = await bashBgStart({...}).each(cb).timeout(60_000);
 *
 *   bashBgStart({...})
 *     .each(cb)
 *     .then(r => console.wake(`done: ${r.exitCode}`));
 *
 * Single-flight wait: the first await/.then locks in the configured timeoutMs
 * and starts the wait. Subsequent await/.then calls share the same promise.
 * Calling .timeout() AFTER the wait has started is a no-op (with warning).
 */
export function createBashBgHandle(
	manager: BackgroundBashManager,
	job: BackgroundBashJob,
	spawnPromise: Promise<void>,
	contextSignal: AbortSignal | undefined,
): BashBgHandle {
	let timeoutMs: number | undefined;
	let waitPromise: Promise<BashBgResult> | undefined;
	const unsubs: Array<() => void> = [];

	// Single-flight: first call locks in timeoutMs and starts the wait;
	// subsequent calls return the same promise so concurrent listeners see
	// the same resolution.
	const ensureWait = (overrideTimeoutMs?: number): Promise<BashBgResult> => {
		if (!waitPromise) {
			waitPromise = manager.waitForExit(job.id, {
				timeoutMs: overrideTimeoutMs ?? timeoutMs,
				signal: contextSignal,
			});
		}
		return waitPromise;
	};

	const handle: BashBgHandle = {
		get id() { return job.id; },
		get pid() { return job.pid; },
		get command() { return job.command; },
		get cwd() { return job.cwd; },
		get logPath() { return job.logPath; },
		get status() {
			// Live getter — refreshes status (catches an externally-exited child).
			const snap = manager.getStatus(job.id);
			return (snap?.status ?? job.status) as BackgroundJobStatus;
		},
		started: spawnPromise,

		each(callback: BashBgLineCallback) {
			const off = manager.subscribeLines(job.id, callback);
			unsubs.push(off);
			return handle;
		},

		timeout(ms: number) {
			if (waitPromise) {
				console.warn(`[bashBg ${job.id}] .timeout(${ms}) called after wait started — ignored.`);
				return handle;
			}
			if (Number.isFinite(ms) && ms > 0) timeoutMs = ms;
			return handle;
		},

		wait(opts?: { timeoutMs?: number }) {
			return ensureWait(opts?.timeoutMs);
		},

		async stop(signal?: NodeJS.Signals) {
			await manager.stop(job.id, signal ?? "SIGTERM");
			return ensureWait();
		},

		async logs(opts?: { offset?: number; limit?: number }) {
			return manager.readLogs(job.id, opts);
		},

		inspect() {
			const snap = manager.getStatus(job.id);
			if (!snap) throw new Error(`Background job not found: ${job.id}`);
			return snap;
		},

		unsubscribe() {
			for (const off of unsubs) { try { off(); } catch { /* already gone */ } }
			unsubs.length = 0;
		},
		cancel() { handle.unsubscribe(); },

		then<TResult1 = BashBgResult, TResult2 = never>(
			onfulfilled?: ((value: BashBgResult) => TResult1 | PromiseLike<TResult1>) | null,
			onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
		): Promise<TResult1 | TResult2> {
			return ensureWait().then(onfulfilled ?? undefined, onrejected ?? undefined);
		},
	};

	return handle;
}

const StartParams = Type.Object({
	command: Type.String({ description: "Bash command to run in the background." }),
	cwd: Type.Optional(
		Type.String({ description: "Working directory (absolute or relative to current session cwd)." }),
	),
	repo: Type.Optional(Type.String({ description: "Alias for cwd." })),
});

const StatusParams = Type.Object({
	id: Type.String({ description: "Background job ID." }),
});

const LogsParams = Type.Object({
	id: Type.String({ description: "Background job ID." }),
	offset: Type.Optional(
		Type.Number({
			description: "1-indexed log line to start from (default: 1).",
		}),
	),
	limit: Type.Optional(
		Type.Number({
			description: "Maximum lines to return (default: 200, max: 2000).",
		}),
	),
});

const StopParams = Type.Object({
	id: Type.String({ description: "Background job ID." }),
	signal: Type.Optional(
		Type.Union([Type.Literal("SIGTERM"), Type.Literal("SIGKILL")], {
			description: "Signal to send. Defaults to SIGTERM.",
		}),
	),
});

const ListParams = Type.Object({});

const BashCompatParams = Type.Object({
	command: Type.Optional(Type.String({ description: "Bash command to execute." })),
	timeout: Type.Optional(
		Type.Number({ description: "Timeout in seconds for foreground execution (same as built-in bash)." }),
	),
	background: Type.Optional(
		Type.Boolean({ description: "Start command in background (equivalent to action='start')." }),
	),
	action: Type.Optional(
		Type.Union(
			[
				Type.Literal("run"),
				Type.Literal("start"),
				Type.Literal("status"),
				Type.Literal("logs"),
				Type.Literal("stop"),
				Type.Literal("list"),
			],
			{ description: "Lifecycle action: run (foreground), start/status/logs/stop/list for background jobs." },
		),
	),
	id: Type.Optional(Type.String({ description: "Background job ID for status/logs/stop." })),
	offset: Type.Optional(Type.Number({ description: "1-indexed line offset for logs action." })),
	limit: Type.Optional(Type.Number({ description: "Max lines for logs action." })),
	signal: Type.Optional(
		Type.Union([Type.Literal("SIGTERM"), Type.Literal("SIGKILL")], {
			description: "Signal used by stop action.",
		}),
	),
	cwd: Type.Optional(Type.String({ description: "Working directory (absolute or relative to current session cwd)." })),
	repo: Type.Optional(Type.String({ description: "Alias for cwd." })),
});

type StartParamsType = Static<typeof StartParams>;
type StatusParamsType = Static<typeof StatusParams>;
type LogsParamsType = Static<typeof LogsParams>;
type StopParamsType = Static<typeof StopParams>;
export type BashCompatParamsType = Static<typeof BashCompatParams>;

const resolveAction = (params: BashCompatParamsType): BashCompatAction => {
	if (params.action) return params.action;
	if (params.background) return "start";
	return "run";
};

const requireCommand = (params: BashCompatParamsType): string | null => {
	const command = params.command?.trim();
	return command && command.length > 0 ? command : null;
};

const requireJobId = (params: BashCompatParamsType): string | null => {
	const id = coerceJobId(params.id);
	return id && id.length > 0 ? id : null;
};

const coerceJobId = (value: unknown): string | null => {
	if (typeof value === "string") {
		const id = value.trim();
		return id.length > 0 ? id : null;
	}

	if (value && typeof value === "object") {
		const nested = (value as { id?: unknown }).id;
		return nested === value ? null : coerceJobId(nested);
	}

	return null;
};

const requireSandboxJobId = (toolName: string, input: unknown): string => {
	const candidate =
		input && typeof input === "object" && "id" in (input as Record<string, unknown>)
			? (input as { id?: unknown }).id
			: input;
	const id = coerceJobId(candidate);
	if (!id) {
		throw new Error(toolName + " requires a background job id string or a job object with an id field.");
	}
	return id;
};

async function runForegroundCommand(
	pi: ExtensionAPI,
	params: BashCompatParamsType,
	signal: AbortSignal | undefined,
	ctx: Pick<ExtensionContext, "cwd">,
) {
	const command = requireCommand(params);
	if (!command) {
		return errorResult("Command is required for foreground execution.");
	}

	const cwd = resolveWorkingDirectory(ctx.cwd, params.cwd ?? params.repo);
	const timeoutSeconds = params.timeout;
	const timeoutMs =
		timeoutSeconds !== undefined && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
			? Math.floor(timeoutSeconds * 1000)
			: undefined;

	try {
		const result = await pi.exec("sh", ["-c", command], {
			cwd,
			signal,
			timeout: timeoutMs,
		});

		const output = [result.stdout, result.stderr].filter(Boolean).join(result.stderr ? "\n" : "");
		const formatted = await formatForegroundOutput(output);

		if (result.code !== 0) {
			return {
				content: [{ type: "text" as const, text: `${formatted.text}\n\nCommand exited with code ${result.code}` }],
				isError: true,
				details: {
					command,
					cwd,
					exitCode: result.code,
					truncated: formatted.truncated,
					fullOutputPath: formatted.fullOutputPath,
				},
			};
		}

		return {
			content: [{ type: "text" as const, text: formatted.text }],
			details: {
				command,
				cwd,
				exitCode: result.code,
				truncated: formatted.truncated,
				fullOutputPath: formatted.fullOutputPath,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return errorResult(message);
	}
}

export async function runBashToolAction(
	pi: ExtensionAPI,
	manager: BackgroundBashManager,
	params: BashCompatParamsType,
	signal: AbortSignal | undefined,
	ctx: Pick<ExtensionContext, "cwd">,
) {
	const action = resolveAction(params);

	if (action === "run") {
		return runForegroundCommand(pi, params, signal, ctx);
	}

	if (action === "start") {
		const command = requireCommand(params);
		if (!command) {
			return errorResult("Command is required for start action.");
		}

		try {
			const cwd = resolveWorkingDirectory(ctx.cwd, params.cwd ?? params.repo);
			const job = await manager.start({ command, cwd });
			return {
				content: [
					{
						type: "text" as const,
						text: `Started background job ${job.id}\nPID: ${job.pid}\nCWD: ${job.cwd}\nLog: ${job.logPath}`,
					},
				],
				details: job,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return errorResult(message);
		}
	}

	if (action === "list") {
		const jobs = manager.list();
		if (jobs.length === 0) {
			return {
				content: [{ type: "text" as const, text: "No background bash jobs." }],
				details: { jobs: [] },
			};
		}

		return {
			content: [{ type: "text" as const, text: jobs.map(formatJobLine).join("\n\n") }],
			details: { jobs },
		};
	}

	const id = requireJobId(params);
	if (!id) {
		return errorResult(`${action} action requires id.`);
	}

	if (action === "status") {
		const status = manager.getStatus(id);
		if (!status) {
			return errorResult(`Background job not found: ${id}`);
		}

		return {
			content: [{ type: "text" as const, text: formatJobLine(status) }],
			details: status,
		};
	}

	if (action === "logs") {
		try {
			const result = await manager.readLogs(id, {
				offset: params.offset,
				limit: params.limit,
			});

			const header = `Job ${id} (${result.status}) lines ${result.offset}-${Math.max(result.offset, result.nextOffset - 1)} of ${result.totalLines}`;
			return {
				content: [{ type: "text" as const, text: `${header}\n\n${result.text}` }],
				details: result,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return errorResult(message);
		}
	}

	if (action === "stop") {
		try {
			const status = await manager.stop(id, params.signal ?? "SIGTERM");
			return {
				content: [{ type: "text" as const, text: `Stop signal sent to ${id}\n${formatJobLine(status)}` }],
				details: status,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return errorResult(message);
		}
	}

	return errorResult(`Unknown action: ${String(action)}`);
}

export default function (pi: ExtensionAPI) {
	const manager = new BackgroundBashManager();

	pi.registerTool({
		name: "bash",
		label: "bash",
		description:
			"Execute a bash command. Default action runs in foreground. Set background=true (or action='start') to run in background. Use action=status|logs|stop|list with id to manage background jobs.",
		parameters: BashCompatParams,
		async execute(_toolCallId, params: BashCompatParamsType, signal, _onUpdate, ctx) {
			return runBashToolAction(pi, manager, params, signal, ctx);
		},
	});

	pi.registerTool({
		name: "bash_bg_start",
		label: "bash-bg-start",
		description:
			"Start a bash command in the background and return immediately with a job ID. Use bash_bg_status/bash_bg_logs/bash_bg_stop to manage it.",
		parameters: StartParams,
		async execute(_toolCallId, params: StartParamsType, signal, _onUpdate, ctx) {
			return runBashToolAction(
				pi,
				manager,
				{ action: "start", command: params.command, cwd: params.cwd, repo: params.repo },
				signal,
				ctx,
			);
		},
	});

	pi.registerTool({
		name: "bash_bg_status",
		label: "bash-bg-status",
		description: "Get status for a background bash job.",
		parameters: StatusParams,
		async execute(_toolCallId, params: StatusParamsType, signal, _onUpdate, ctx) {
			return runBashToolAction(pi, manager, { action: "status", id: params.id }, signal, ctx);
		},
	});

	pi.registerTool({
		name: "bash_bg_logs",
		label: "bash-bg-logs",
		description: "Read logs from a background bash job.",
		parameters: LogsParams,
		async execute(_toolCallId, params: LogsParamsType, signal, _onUpdate, ctx) {
			return runBashToolAction(
				pi,
				manager,
				{ action: "logs", id: params.id, offset: params.offset, limit: params.limit },
				signal,
				ctx,
			);
		},
	});

	pi.registerTool({
		name: "bash_bg_stop",
		label: "bash-bg-stop",
		description: "Stop a background bash job.",
		parameters: StopParams,
		async execute(_toolCallId, params: StopParamsType, signal, _onUpdate, ctx) {
			return runBashToolAction(
				pi,
				manager,
				{ action: "stop", id: params.id, signal: params.signal },
				signal,
				ctx,
			);
		},
	});

	pi.registerTool({
		name: "bash_bg_list",
		label: "bash-bg-list",
		description: "List all background bash jobs started in this session.",
		parameters: ListParams,
		async execute(_toolCallId, _params, signal, _onUpdate, ctx) {
			return runBashToolAction(pi, manager, { action: "list" }, signal, ctx);
		},
	});

	// --- Sandbox function registrations (available inside execute_code) ---
	// Share the same BackgroundBashManager instance as the direct tools.

	// bashBgStart returns a thenable BashBgHandle synchronously.
	//
	//   const r = await bashBgStart({...}).timeout(60_000);   // wait for exit w/ deadline
	//   bashBgStart({...}).each(cb).then(r => console.wake(`done`));
	//   const dev = bashBgStart({ command: "npm run dev" }); await dev.stop();
	//
	// FOOTGUN: `await bashBgStart({ command: "npm run dev" })` hangs forever
	// (await on a thenable = wait for child exit; dev server never exits).
	// Don't await long-running processes; attach .then or use .stop().
	registerContextualSandboxFn("bashBgStart", (sbCtx: SandboxCallContext) => {
		return (input: { command: string; cwd?: string }): BashBgHandle => {
			const cwd = resolveWorkingDirectory(sbCtx.cwd, input.cwd);
			const { job, spawnPromise } = manager.startSync({ command: input.command, cwd });
			return createBashBgHandle(manager, job, spawnPromise, sbCtx.signal);
		};
	});

	registerSandboxFn("bashBgStatus", async (input: { id: string } | string | { id: { id: string } }) => {
		const id = requireSandboxJobId("bashBgStatus", input);
		const job = manager.getStatus(id);
		if (!job) throw new Error(`Background job not found: ${id}`);
		return { id: job.id, pid: job.pid, status: job.status, command: job.command, cwd: job.cwd, startedAt: job.startedAt, endedAt: job.endedAt, exitCode: job.exitCode, signal: job.signal };
	});

	registerSandboxFn("bashBgLogs", async (input: { id: string | { id: string }; offset?: number; limit?: number } | string) => {
		const id = requireSandboxJobId("bashBgLogs", input);
		const options = input && typeof input === "object"
			? { offset: (input as { offset?: number }).offset, limit: (input as { limit?: number }).limit }
			: undefined;
		const result = await manager.readLogs(id, options);
		return result;
	});

	registerSandboxFn("bashBgStop", async (input: { id: string | { id: string }; signal?: "SIGTERM" | "SIGKILL" } | string) => {
		const id = requireSandboxJobId("bashBgStop", input);
		const stopSignal = input && typeof input === "object" && "signal" in (input as Record<string, unknown>)
			? ((input as { signal?: "SIGTERM" | "SIGKILL" }).signal || "SIGTERM")
			: "SIGTERM";
		const job = await manager.stop(id, stopSignal);
		return { id: job.id, pid: job.pid, status: job.status, exitCode: job.exitCode, signal: job.signal };
	});

	registerSandboxFn("bashBgList", async () => {
		const jobs = manager.list();
		return jobs.map(j => ({ id: j.id, pid: j.pid, status: j.status, command: j.command, cwd: j.cwd, startedAt: j.startedAt, endedAt: j.endedAt, exitCode: j.exitCode }));
	});
}
