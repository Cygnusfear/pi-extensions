import type { StoreEntry } from "./types";
import fs from "node:fs";
import path from "node:path";

// ===========================================================================
// Persistent Store ($) — NO eviction, durable for the whole session.
//
// Two guarantees the agents rely on:
//   1. NO eviction. The store never silently drops data. Agents stash
//      load-bearing state here (worktree paths, parsed configs); silently
//      evicting e.g. $.wt mid-task caused hard-to-trace failures. Everything
//      stays until the agent clears it (delete $.x / $.__reset()).
//   2. SURVIVES RELOAD/RESUME. The $ store used to live only in a module-level
//      singleton in the extension. A reload_runtime or a pi restart-with-resume
//      re-evaluated that module, reset the singleton, and silently wiped every
//      $ var mid-session — the session continued (same JSONL) but $ came back
//      empty ("$ flakiness"). To honour "persists for the WHOLE session", the
//      store now snapshots every JSON-serializable var to a SESSION-SCOPED disk
//      file and hydrates it back when the store is rebuilt.
//
// Inherent limit: promises/functions/class instances can't be JSON-serialized,
// so they cannot survive a reload — they are recreated on the next run. Only
// JSON-serializable values are durable across reload/resume. Within a single
// process (across execute_code calls) ALL values — including promises — persist
// as before.
// ===========================================================================

const STORE_FILENAME = ".pi/code-mode-store.json";
const MAX_DISK_SIZE = 25 * 1024 * 1024; // 25MB — on-disk snapshot cap (separate from in-memory $)


function estimateSizeHuman(value: unknown): string {
  try {
    const bytes = sizeInBytes(value);
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + "KB";
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  } catch {
    return "?";
  }
}

function sizeInBytes(value: unknown): number {
  try {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return Buffer.byteLength(value, "utf-8");
    const json = JSON.stringify(value);
    return json ? Buffer.byteLength(json, "utf-8") : 0;
  } catch {
    return 0;
  }
}

function estimateSize(value: unknown): string {
  try {
    if (value === null || value === undefined) return "0B";
    if (Array.isArray(value)) {
      const bytes = sizeInBytes(value);
      const items = value.length;
      if (bytes < 1024) return items + " items, " + bytes + "B";
      if (bytes < 1024 * 1024) return items + " items, " + Math.round(bytes / 1024) + "KB";
      return items + " items, " + (bytes / (1024 * 1024)).toFixed(1) + "MB";
    }
    return estimateSizeHuman(value);
  } catch {
    return "?";
  }
}

/**
 * A value is durable iff it can round-trip through a reload as itself.
 * Functions and promises/thenables are excluded: a promise serializes to "{}"
 * (JSON.stringify(Promise.resolve(1)) === "{}") which would "restore" as a dead
 * empty object, not a working promise — worse than honestly recreating it. Such
 * values persist across calls in-process but are recreated after a reload.
 */
function isDurable(value: unknown): boolean {
  if (typeof value === "function") return false;
  if (value !== null && typeof value === "object" && typeof (value as { then?: unknown }).then === "function") {
    return false; // promise / thenable
  }
  try {
    return JSON.stringify(value) !== undefined;
  } catch {
    return false;
  }
}

export function createPersistentStore(opts?: {
  getEscaped?: () => boolean;
  cwd?: string;
  /** Absolute path to the session-scoped snapshot file. Takes precedence over `cwd`. */
  storePath?: string;
}) {
  const store = new Map<string, StoreEntry>();
  let currentTurn = 0;
  // `diskPath` is mutable so the extension can late-bind a session-scoped path
  // once the per-call sessionManager is available (see bindPersistence).
  let diskPath: string | null =
    opts?.storePath ?? (opts?.cwd ? path.join(opts.cwd, STORE_FILENAME) : null);
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let overflowWarned = false;

  function loadFromDisk(): void {
    if (!diskPath) return;
    try {
      if (!fs.existsSync(diskPath)) return;
      const raw = fs.readFileSync(diskPath, "utf-8");
      const data = JSON.parse(raw) as Record<string, { value: unknown }>;
      for (const [key, entry] of Object.entries(data)) {
        if (key.startsWith("__")) continue;
        // In-memory wins: never clobber a value already set this process.
        if (store.has(key)) continue;
        store.set(key, { value: entry.value, lastAccessTurn: currentTurn, pinned: false });
      }
    } catch {}
  }

  function flushToDisk(): void {
    if (!diskPath) return;
    try {
      // Snapshot EVERY JSON-serializable var (not an opt-in subset) so the whole
      // store survives reload/resume. Non-serializable values are skipped — they
      // can't round-trip and are recreated on the next run.
      const data: Record<string, { value: unknown; persistedAt: string }> = {};
      for (const [key, entry] of store) {
        if (key.startsWith("__")) continue;
        if (!isDurable(entry.value)) continue;
        data[key] = { value: entry.value, persistedAt: new Date().toISOString() };
      }
      const json = JSON.stringify(data, null, 2);
      if (Buffer.byteLength(json) > MAX_DISK_SIZE) {
        // Refuse oversized snapshot, but make the loss-of-durability VISIBLE
        // rather than silent (silent non-persistence is the whole footgun).
        if (!overflowWarned) {
          overflowWarned = true;
          console.error(
            "[code-mode] $ store snapshot exceeds " +
              Math.round(MAX_DISK_SIZE / (1024 * 1024)) +
              "MB — NOT persisted to disk; vars will NOT survive reload until the store shrinks.",
          );
        }
        return;
      }
      overflowWarned = false;
      const dir = path.dirname(diskPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Atomic write: a process death mid-write (e.g. the very reload we protect
      // against) must not leave a truncated, unparseable snapshot. Write to a
      // temp sibling then rename — rename is atomic on POSIX.
      const tmp = diskPath + ".tmp";
      fs.writeFileSync(tmp, json, "utf-8");
      fs.renameSync(tmp, diskPath);
    } catch {}
  }

  function debouncedFlush(): void {
    if (!diskPath) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushToDisk();
    }, 500);
    // Don't let a pending snapshot keep the process alive (or leak across tests).
    (flushTimer as { unref?: () => void }).unref?.();
  }

  // Load any pre-existing snapshot for the path bound at construction time.
  loadFromDisk();

  /**
   * Late-bind a session-scoped snapshot file. Called by the extension on the
   * first execute_code of a process, once the sessionManager (hence session id)
   * is known. Hydrates any prior snapshot (in-memory wins) and enables flushing.
   * Idempotent for a given path.
   */
  function bindPersistence(absPath: string): void {
    if (!absPath || diskPath === absPath) return;
    diskPath = absPath;
    loadFromDisk();
    // Persist current in-memory state immediately so a snapshot exists even if
    // the process dies before the next debounced write.
    flushToDisk();
  }

  function totalMemoryBytes(): number {
    let total = 0;
    for (const [, entry] of store) {
      total += sizeInBytes(entry.value);
    }
    return total;
  }

  // No eviction. Kept as a no-op so the per-turn caller (session-factory) keeps
  // a stable interface; it never drops data and costs nothing per turn.
  function processExpiry(): string[] {
    return [];
  }

  function getStatus(): string {
    if (store.size === 0) return "$ is empty";
    const totalBytes = totalMemoryBytes();
    const totalHuman =
      totalBytes < 1024 * 1024
        ? Math.round(totalBytes / 1024) + "KB"
        : (totalBytes / (1024 * 1024)).toFixed(1) + "MB";
    const durable = diskPath
      ? "durable (survives reload/resume)"
      : "in-memory only (NOT yet bound to disk)";
    const lines: string[] = [
      "$ store: " + store.size + " variable(s), " + totalHuman + " — no eviction, " + durable,
    ];
    let nonDurable = 0;
    for (const [key, entry] of store) {
      const size = estimateSize(entry.value);
      const age = currentTurn - entry.lastAccessTurn;
      const transient = diskPath && !isDurable(entry.value);
      if (transient) nonDurable++;
      lines.push(
        "  $." + key + ": " + size + " (last used " + age + " turns ago)" +
          (transient ? " [transient — won't survive reload]" : ""),
      );
    }
    if (nonDurable > 0) {
      lines.push(
        "note: " + nonDurable + " var(s) are non-serializable (promises/functions) and will be recreated, not restored, after a reload.",
      );
    }
    return lines.join("\n");
  }

  const RESERVED = new Set([
    "__reset",
    "__status",
    "__pin",
    "__unpin",
    "__keys",
    "__turn",
    "__escaped",
    "__sandbox",
    "__escape",
    "__persist",
    "__forget",
    "__persisted",
    "__bindPersistence",
  ]);

  const proxy = new Proxy({} as Record<string, unknown>, {
    set(_target, prop: string | symbol, value) {
      if (typeof prop !== "string") return false;
      if (prop === "__escaped") {
        store.set("__escaped", { value: value === true, lastAccessTurn: currentTurn, pinned: true });
        return true;
      }
      if (RESERVED.has(prop)) return false;
      const existing = store.get(prop);
      store.set(prop, { value, lastAccessTurn: currentTurn, pinned: existing?.pinned ?? false });
      // Every write snapshots the whole store (debounced) so $ survives reload.
      debouncedFlush();
      return true;
    },
    get(_target, prop: string | symbol) {
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
      if (typeof prop !== "string") return undefined;
      switch (prop) {
        case "__reset":
          return () => {
            store.clear();
            // Persist the cleared state so the wipe survives reload too.
            flushToDisk();
            return "$ cleared";
          };
        case "__status":
          return () => getStatus();
        // The $ store no longer evicts, so pinning is a no-op kept for backward
        // compatibility (older code/docs call $.__pin). Nothing is ever dropped.
        case "__pin":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            entry.lastAccessTurn = currentTurn;
            return "$." + name + " — note: $ no longer evicts, so pinning is unnecessary (nothing is dropped)";
          };
        case "__unpin":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            entry.lastAccessTurn = currentTurn;
            return "$." + name + " — note: $ no longer evicts (nothing is dropped)";
          };
        case "__keys":
          return () => [...store.keys()];
        case "__turn":
          return () => currentTurn;
        case "__escape":
          return () => {
            store.set("__escaped", { value: true, lastAccessTurn: currentTurn, pinned: true });
            return "Escape mode: raw tools will be available on your next call";
          };
        case "__sandbox":
          return () => {
            store.set("__escaped", { value: false, lastAccessTurn: currentTurn, pinned: true });
            return "Sandbox mode: tools restricted to execute_code";
          };

        // $ now persists every serializable var by default, so __persist/__forget
        // are compat no-ops. They report the actual durability of the value.
        case "__persist":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            if (!diskPath)
              return "$." + name + " — store not yet bound to disk; it will persist once bound (automatic).";
            if (!isDurable(entry.value))
              return "$." + name + " is non-serializable (promise/function) — cannot survive reload; it is recreated on the next run.";
            flushToDisk();
            return "$." + name + " — note: all serializable $ vars already persist automatically (survives reload).";
          };
        case "__forget":
          return (name: string) =>
            "$." + name + " — note: persistence is automatic and per-var opt-out is gone. Use `delete $." + name + "` to remove it entirely.";
        case "__persisted":
          return () =>
            [...store.entries()]
              .filter(([k, e]) => !k.startsWith("__") && isDurable(e.value))
              .map(([k]) => k);
        case "__bindPersistence":
          return (absPath: string) => {
            bindPersistence(absPath);
            return "$ store bound to " + absPath;
          };
        case "__escaped":
          return store.get("__escaped")?.value ?? !!(opts?.getEscaped?.());
        case "toJSON":
          return () => {
            const obj: Record<string, unknown> = {};
            for (const [k, e] of store) obj[k] = e.value;
            return obj;
          };
      }
      const entry = store.get(prop);
      if (entry) {
        entry.lastAccessTurn = currentTurn;
        return entry.value;
      }
      return undefined;
    },
    has(_target, prop: string | symbol) {
      return typeof prop === "string" && (store.has(prop) || RESERVED.has(prop));
    },
    deleteProperty(_target, prop: string | symbol) {
      if (typeof prop !== "string") return false;
      if (RESERVED.has(prop)) return false;
      const had = store.delete(prop);
      if (had) debouncedFlush(); // deletions must survive reload too
      return true;
    },
    ownKeys() {
      return [...store.keys()];
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === "string" && store.has(prop)) {
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: store.get(prop)!.value,
        };
      }
      return undefined;
    },
  });

  return {
    proxy,
    store,
    processExpiry,
    getStatus,
    nextTurn: () => ++currentTurn,
    bindPersistence,
    /** Synchronous snapshot — call at run-end so vars are durable without waiting for the debounce. No-op until a disk path is bound. */
    flush: () => flushToDisk(),
    /** Cancel any pending debounced flush. Use when tearing a store down (tests/disposal). */
    dispose: () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    },
  };
}
// =============================================================================
