/**
 * Unified dependency checking for pi extensions.
 *
 * One pattern for all external deps — CLI binaries and env vars.
 * All deps register into a shared registry. On session_start, call
 * showMissingDeps(ctx) ONCE to show a single consolidated notification.
 *
 * Usage in any extension:
 *   const dep = createDep({ binary: "mai", install: "bun add -g maitake" });
 *   dep.guard();           // throws if not available
 *   if (dep.ok) { ... }    // check availability
 *
 * In ONE place (e.g. defaults or a dedicated extension):
 *   showMissingDeps(ctx);  // consolidated footer + notification
 */

import { execSync } from "node:child_process";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BinaryDep {
  binary: string;
  install: string;
  name?: string;
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
    ctx.ui.setStatus("deps", undefined);
    return;
  }

  // Footer: compact summary
  const names = missing.map(d => d.name);
  ctx.ui.setStatus("deps", `⚠ ${names.join(", ")}`);

  // Notification: actionable install instructions
  const lines = missing.map(d => `  • ${d.name} — ${d.install}`);
  ctx.ui.notify(
    `Optional dependencies not found:\n${lines.join("\n")}\n\nRun /deps for details.`,
    "warning"
  );
}

// ─── Implementation ──────────────────────────────────────────────────────────

function isBinaryDep(spec: DepSpec): spec is BinaryDep {
  return "binary" in spec;
}

function checkBinary(name: string): string | null {
  try {
    return execSync(`command -v ${name} 2>/dev/null`, { encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
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
      resolved = checkBinary(spec.binary);
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
