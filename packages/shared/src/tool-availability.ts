/**
 * Unified dependency checking for pi extensions.
 *
 * One pattern for all external deps — CLI binaries and env vars.
 * Extensions check at init, guard at runtime, show status in footer.
 *
 * Usage:
 *   const dep = createDep({ binary: "mai", install: "bun add -g maitake" });
 *   dep.guard();           // throws if not available
 *   dep.status(ctx);       // sets footer ⚠ if missing
 *   if (dep.ok) { ... }    // check availability
 */

import { execSync } from "node:child_process";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BinaryDep {
  binary: string;
  install: string;
  name?: string;         // human-readable name (defaults to binary name)
}

interface EnvDep {
  env: string;
  install: string;
  name?: string;         // human-readable name (defaults to env var name)
}

export type DepSpec = BinaryDep | EnvDep;

export interface Dep {
  /** Human-readable name */
  name: string;
  /** Whether the dependency is available right now */
  ok: boolean;
  /** Why it's not available (null if ok) */
  reason: string | null;
  /** Install instructions */
  install: string;
  /** Resolved path (for binaries) or value hint (for env vars) */
  resolved: string | null;
  /**
   * Guard — throws if not available.
   * Consistent error format across all extensions.
   */
  guard(): void;
  /**
   * Set footer status if missing. Call in session_start.
   * Shows "⚠ name" in footer. Clears if available.
   */
  status(ctx: { ui: { setStatus(key: string, text: string | undefined): void } }): void;
  /**
   * Re-check availability (clears cache).
   * Use after install or env change.
   */
  recheck(): boolean;
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
 * Create a dependency check. Call once at extension init.
 * The result is cached but can be rechecked with .recheck().
 */
export function createDep(spec: DepSpec): Dep {
  const name = spec.name ?? (isBinaryDep(spec) ? spec.binary : spec.env);
  const statusKey = `dep-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  let ok: boolean;
  let resolved: string | null;
  let reason: string | null;

  function check() {
    if (isBinaryDep(spec)) {
      resolved = checkBinary(spec.binary);
      ok = resolved !== null;
      reason = ok ? null : `${name} is not installed`;
    } else {
      resolved = checkEnv(spec.env);
      ok = resolved !== null;
      reason = ok ? null : `${spec.env} is not set`;
    }
  }

  check();

  return {
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

    status(ctx) {
      ctx.ui.setStatus(statusKey, ok ? undefined : `⚠ ${name}`);
    },

    recheck() {
      check();
      return ok;
    },
  };
}

// ─── Convenience ─────────────────────────────────────────────────────────────

/** Shorthand for common CLI tools. */
export const KNOWN_DEPS: Record<string, DepSpec> = {
  mai:       { binary: "mai", install: "Install: bun add -g maitake", name: "mai" },
  foresight: { binary: "foresight", install: "Install: bun add -g foresight-memory", name: "foresight" },
  "llm-tldr":{ binary: "llm-tldr", install: "Install: uv tool install llm-tldr", name: "llm-tldr" },
  rg:        { binary: "rg", install: "Install: brew install ripgrep", name: "ripgrep" },
  fd:        { binary: "fd", install: "Install: brew install fd", name: "fd" },
};

/** Create a dep from a known tool name. */
export function knownDep(name: keyof typeof KNOWN_DEPS): Dep {
  const spec = KNOWN_DEPS[name];
  if (!spec) throw new Error(`Unknown dep: ${name}`);
  return createDep(spec);
}
