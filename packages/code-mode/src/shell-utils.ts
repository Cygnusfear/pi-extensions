import {
  isGitPath,
  isGitUnsafeBash,
  isProcessKillBroadcast,
} from "@pi-extensions/shared/git-guards";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

// =============================================================================
// Constants shared with sandbox tools
// =============================================================================

export const SUBPROCESS_TIMEOUT_MS = 30_000; // 30s per subprocess

const MAX_BUFFER = 10 * 1024 * 1024; // 10MB subprocess buffer

// =============================================================================
// Git guard helpers
// =============================================================================

export function isGitLockActive(): boolean {
  return process.env.PI_GIT_LOCK_MODE !== "off";
}

export function isLocked(): boolean {
  return process.env.PI_LOCK_MODE === "1";
}

export function lockError(tool: string): string {
  return "\u{1F512} " + tool + " is disabled -- session is locked. Use /unlock to restore write access.";
}

export function gitGuardError(reason: string): string {
  return `❌ BLOCKED: ${reason} 🛡️ GUARD PROTOCOL: HOOMAN MUST CONFIRM WITH [OK]`;
}

export function processKillGuardError(reason: string): string {
  return `🛡️ HARD-BLOCKED (process kill guard): ${reason}. This guard cannot be disabled.`;
}

export { isGitPath, isGitUnsafeBash, isProcessKillBroadcast };

// =============================================================================
// Shell utilities
// =============================================================================

/**
 * Split a shell-style argument string into an array, respecting quotes and escapes.
 * Prevents shell injection by avoiding `sh -c` for tools that take user-provided args.
 */
export function splitShellArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escape = false;

  for (const char of input) {
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escape = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char as "'" | '"';
      continue;
    }
    if (/\s/.test(char)) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

export function shellEsc(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export const FORESIGHT_BANK =
  process.env.FORESIGHT_BANK || process.env.HINDSIGHT_BANK || path.basename(process.cwd());

// =============================================================================
// Path utilities
// =============================================================================

export function resolvePath(filePath: string, cwd: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  if (filePath.startsWith("~/")) return path.join(os.homedir(), filePath.slice(2));
  return path.resolve(cwd, filePath);
}

// =============================================================================
// Process utilities
// =============================================================================

export interface SpawnAsyncOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  /** External abort signal — kills the child process tree on abort */
  signal?: AbortSignal;
}

export interface SpawnAsyncResult {
  stdout: string;
  stderr: string;
  status: number | null;
  error?: Error;
}

/**
 * Kill a process and its entire process group.
 */
export function killTree(pid: number): void {
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already dead
    }
  }
}

/**
 * Async spawn that doesn't block the event loop.
 * Uses AbortSignal.timeout for the deadline and settles immediately
 * when it fires — never waits for `close` after a kill.
 */
export function spawnAsync({
  cmd,
  args,
  cwd: spawnCwd,
  timeout = SUBPROCESS_TIMEOUT_MS,
  env,
  signal: externalSignal,
}: SpawnAsyncOptions): Promise<SpawnAsyncResult> {
  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutLen = 0;
    let stderrLen = 0;
    let settled = false;

    const timeoutSignal = AbortSignal.timeout(timeout);
    const combinedSignal = externalSignal
      ? AbortSignal.any([timeoutSignal, externalSignal])
      : timeoutSignal;

    const child = spawn(cmd, args, {
      cwd: spawnCwd,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const onAbort = () => {
      if (settled) return;
      settled = true;
      if (child.pid) killTree(child.pid);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        status: null,
        error: new Error(externalSignal?.aborted ? "Aborted" : `Timed out after ${timeout}ms`),
      });
    };

    combinedSignal.addEventListener("abort", onAbort, { once: true });

    child.stdout!.on("data", (chunk: Buffer) => {
      stdoutLen += chunk.length;
      if (stdoutLen <= MAX_BUFFER) stdoutChunks.push(chunk);
    });

    child.stderr!.on("data", (chunk: Buffer) => {
      stderrLen += chunk.length;
      if (stderrLen <= MAX_BUFFER) stderrChunks.push(chunk);
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      combinedSignal.removeEventListener("abort", onAbort);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        status: null,
        error: err,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      combinedSignal.removeEventListener("abort", onAbort);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        status: code,
      });
    });
  });
}
