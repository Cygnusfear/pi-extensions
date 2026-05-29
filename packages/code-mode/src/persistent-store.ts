import type { StoreEntry } from "./types";
import fs from "node:fs";
import path from "node:path";

// ===========================================================================
// Persistent Store ($) — NO eviction.
//
// The store NEVER silently drops data. Agents stash load-bearing state here
// (worktree paths, parsed configs, pending promises); the amount is negligible,
// and silently evicting e.g. $.wt mid-task caused hard-to-trace failures. So we
// keep everything until the agent explicitly clears it (delete $.x / $.__reset())
// or the session ends. $.__status() still reports per-var sizes for diagnostics.
// ===========================================================================

const STORE_FILENAME = ".pi/code-mode-store.json";
const MAX_DISK_SIZE = 5 * 1024 * 1024; // 5MB — on-disk persistence cap (separate from in-memory $)


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

export function createPersistentStore(opts?: { getEscaped?: () => boolean; cwd?: string }) {
  const store = new Map<string, StoreEntry>();
  let currentTurn = 0;
  const persisted = new Set<string>();
  const diskPath = opts?.cwd ? path.join(opts.cwd, STORE_FILENAME) : null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function loadFromDisk(): void {
    if (!diskPath) return;
    try {
      if (!fs.existsSync(diskPath)) return;
      const raw = fs.readFileSync(diskPath, "utf-8");
      const data = JSON.parse(raw) as Record<string, { value: unknown; persistedAt: string }>;
      for (const [key, entry] of Object.entries(data)) {
        store.set(key, { value: entry.value, lastAccessTurn: currentTurn, pinned: true });
        persisted.add(key);
      }
    } catch {}
  }

  function flushToDisk(): void {
    if (!diskPath) return;
    try {
      const data: Record<string, { value: unknown; persistedAt: string }> = {};
      for (const key of persisted) {
        const entry = store.get(key);
        if (!entry) continue;
        // Skip non-serializable values
        try { JSON.stringify(entry.value); } catch { continue; }
        data[key] = { value: entry.value, persistedAt: new Date().toISOString() };
      }
      const json = JSON.stringify(data, null, 2);
      if (Buffer.byteLength(json) > MAX_DISK_SIZE) return; // refuse if too large
      const dir = path.dirname(diskPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(diskPath, json, "utf-8");
    } catch {}
  }

  function debouncedFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushToDisk, 500);
  }

  // Load persisted vars on creation
  loadFromDisk();

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
    const persistedCount = [...store.values()].filter((e) => e.pinned).length;
    const lines: string[] = [
      "$ store: " + store.size + " variable(s), " + totalHuman + " (no eviction — nothing is dropped)",
    ];
    if (persistedCount > 0) {
      lines[0] += " (" + persistedCount + " persisted to disk)";
    }
    for (const [key, entry] of store) {
      const size = estimateSize(entry.value);
      const age = currentTurn - entry.lastAccessTurn;
      const tag = entry.pinned ? " (persisted, last used " + age + " turns ago)" : " (last used " + age + " turns ago)";
      lines.push("  $." + key + ": " + size + tag);
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
      if (persisted.has(prop)) debouncedFlush();
      return true;
    },
    get(_target, prop: string | symbol) {
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
      if (typeof prop !== "string") return undefined;
      switch (prop) {
        case "__reset":
          return () => {
            store.clear();
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

        case "__persist":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            try { JSON.stringify(entry.value); } catch {
              return "$." + name + " cannot be persisted (not JSON-serializable)";
            }
            persisted.add(name);
            entry.pinned = true; // persisted vars are always pinned
            flushToDisk();
            return "$." + name + " persisted to disk (survives reload)";
          };
        case "__forget":
          return (name: string) => {
            persisted.delete(name);
            flushToDisk();
            return "$." + name + " removed from disk persistence";
          };
        case "__persisted":
          return () => [...persisted];
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
      store.delete(prop);
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

  return { proxy, store, processExpiry, getStatus, nextTurn: () => ++currentTurn };
}
// =============================================================================
