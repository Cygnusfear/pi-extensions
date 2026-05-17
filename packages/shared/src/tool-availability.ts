/**
 * Unified dependency checking for pi extensions.
 *
 * One pattern for all external deps — CLI binaries and env vars.
 * All deps register into a shared registry. On session_start, call
 * showMissingDeps(ctx) ONCE to show a single consolidated notification.
 *
 * Usage in any extension:
 *   const dep = createDep({ binary: "mai", install: "Install: go install github.com/cygnusfear/maitake/cmd/mai@latest" });
 *   dep.guard();           // throws if not available
 *   if (dep.ok) { ... }    // check availability
 *
 * In ONE place (e.g. defaults or a dedicated extension):
 *   showMissingDeps(ctx);  // consolidated footer + notification
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BinaryDep {
  binary: string;
  install: string;
  name?: string;
  /** Env var that may hold an absolute override path (e.g. "MAI_BIN"). */
  envOverride?: string;
  /** Absolute fallback paths probed if PATH lookup fails. */
  fallbacks?: string[];
}

interface EnvDep {
  env: string;
  install: string;
  name?: string;
}

export type DepSpec = BinaryDep | EnvDep;

export interface Dep {
  /** Human-readable name */
  readonly name: string;
  /** Whether the dependency is available right now */
  readonly ok: boolean;
  /** Why it's not available (null if ok) */
  readonly reason: string | null;
  /** Install instructions */
  readonly install: string;
  /** Resolved path (for binaries) or "set" (for env vars) */
  readonly resolved: string | null;
  /** Guard — throws consistent error if not available. */
  guard(): void;
  /** Re-check availability (clears cache). */
  recheck(): boolean;
}

// ─── Safe action helper ──────────────────────────────────────────────────────

/** Substring used by the pi runtime to identify stale-ctx errors. */
const STALE_CTX_MARKER = "extension ctx is stale";

/**
 * Test whether an error is the pi runtime's "stale ctx after session
 * replacement or reload" diagnostic. Used by safeAction and safeActionAsync
 * to swallow exactly that error class and re-throw everything else.
 */
export function isStaleCtxError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes(STALE_CTX_MARKER);
}

/**
 * Run a sync action that touches pi runtime state (action methods like
 * pi.sendMessage / pi.appendEntry / pi.setSessionName, or ctx getters like
 * ctx.cwd / ctx.hasUI / ctx.ui which are assertActive-guarded in pi 0.74) and
 * swallow exactly the stale-ctx error. Anything else re-throws.
 *
 * Wrap whole handler bodies, not individual calls — ctx accessors are getters
 * that throw on the FIRST read after invalidate(), so a single stale ctx.cwd
 * read upstream of a wrapped action call still surfaces the warning.
 *
 * Example:
 *
 *     pi.on("agent_end", (_event, ctx) => {
 *       safeAction(() => updateTitle(ctx));   // catches ctx.* stale + ui.* stale
 *     });
 */
export function safeAction<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    if (isStaleCtxError(err)) return undefined;
    throw err;
  }
}

/**
 * Async variant of safeAction. Use for handlers that await before touching
 * pi/ctx (e.g. session-name's generateAndSetTitle which awaits an LLM call
 * and only then calls pi.setSessionName).
 */
export async function safeActionAsync<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    if (isStaleCtxError(err)) return undefined;
    throw err;
  }
}

// ─── Global Registry ─────────────────────────────────────────────────────────

const registry: Dep[] = [];

/** Get all registered deps. */
export function getAllDeps(): readonly Dep[] {
  return registry;
}

/** Get all missing deps. */
export function getMissingDeps(): readonly Dep[] {
  return registry.filter(d => !d.ok);
}

/**
 * Show ONE consolidated notification + footer status for all missing deps.
 * Call this once in session_start from a single extension.
 */
export function showMissingDeps(ctx: {
  ui: {
    setStatus(key: string, text: string | undefined): void;
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
}) {
  const missing = getMissingDeps();

  if (missing.length === 0) {
    safeAction(() => ctx.ui.setStatus("deps", undefined));
    return;
  }

  // Footer: compact summary. If setStatus is stale, skip the notify too —
  // there's no point trying once we know this runtime is gone.
  const names = missing.map(d => d.name);
  const statusResult = safeAction(() => {
    ctx.ui.setStatus("deps", `\u26a0 ${names.join(", ")}`);
    return true;
  });
  if (statusResult === undefined) return;

  // Notification: actionable install instructions
  const lines = missing.map(d => `  • ${d.name} — ${d.install}`);
  safeAction(() => ctx.ui.notify(
    `Optional dependencies not found:
${lines.join("\n")}

Run /deps for details.`,
    "warning",
  ));
}

// ─── Implementation ──────────────────────────────────────────────────────────

function isBinaryDep(spec: DepSpec): spec is BinaryDep {
  return "binary" in spec;
}

/**
 * Resolve a binary to an ABSOLUTE existing path.
 * Resolution order:
 *   1. envOverride (if set and points to an absolute existing file)
 *   2. `command -v <binary>` in current PATH (must be absolute + exist)
 *   3. explicit absolute fallback candidates
 * Never returns a bare binary name — callers can safely `spawn(resolved)`
 * without relying on PATH at spawn time. This is what stops posix_spawn ENOENT
 * failures when the child inherits a stripped PATH.
 */
function checkBinary(spec: BinaryDep): string | null {
  if (spec.envOverride) {
    const override = process.env[spec.envOverride];
    if (override && path.isAbsolute(override) && existsSync(override)) {
      return override;
    }
  }
  try {
    const out = execSync(`command -v ${spec.binary} 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (out && path.isAbsolute(out) && existsSync(out)) {
      return out;
    }
  } catch {
    // fall through to fallbacks
  }
  for (const candidate of spec.fallbacks ?? []) {
    if (candidate && path.isAbsolute(candidate) && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function checkEnv(name: string): string | null {
  return process.env[name] || null;
}

/**
 * Create and register a dependency check. Call once at extension init.
 */
export function createDep(spec: DepSpec): Dep {
  const name = spec.name ?? (isBinaryDep(spec) ? spec.binary : spec.env);

  let ok: boolean;
  let resolved: string | null;
  let reason: string | null;

  function check() {
    if (isBinaryDep(spec)) {
      resolved = checkBinary(spec);
      ok = resolved !== null;
      reason = ok ? null : `${name} is not installed`;
    } else {
      resolved = checkEnv(spec.env) ? "set" : null;
      ok = resolved !== null;
      reason = ok ? null : `${spec.env} is not set`;
    }
  }

  check();

  const dep: Dep = {
    get name() { return name; },
    get ok() { return ok; },
    get reason() { return reason; },
    get install() { return spec.install; },
    get resolved() { return resolved; },

    guard() {
      if (!ok) {
        throw new Error(`${reason}. ${spec.install}`);
      }
    },

    recheck() {
      check();
      return ok;
    },
  };

  registry.push(dep);
  return dep;
}
