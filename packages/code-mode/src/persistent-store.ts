import type { StoreEntry } from "./types";

// ===========================================================================
// Persistent Store ($) with memory-based eviction
// ===========================================================================

export const MAX_STORE_MEMORY = 50 * 1024 * 1024; // 50MB — eviction threshold


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

export function createPersistentStore(opts?: { getEscaped?: () => boolean }) {
  const store = new Map<string, StoreEntry>();
  let currentTurn = 0;

  function totalMemoryBytes(): number {
    let total = 0;
    for (const [, entry] of store) {
      total += sizeInBytes(entry.value);
    }
    return total;
  }

  function processExpiry(): string[] {
    const warnings: string[] = [];

    // Evict unpinned entries when total memory exceeds cap
    while (totalMemoryBytes() > MAX_STORE_MEMORY) {
      // Find the least-recently-accessed unpinned entry
      let oldest: { key: string; turn: number; entry: StoreEntry } | null = null;
      for (const [key, entry] of store) {
        if (entry.pinned) continue;
        if (!oldest || entry.lastAccessTurn < oldest.turn) {
          oldest = { key, turn: entry.lastAccessTurn, entry };
        }
      }
      if (!oldest) break; // only pinned vars left, can't evict further

      const size = estimateSize(oldest.entry.value);
      const age = currentTurn - oldest.turn;
      warnings.push(
        "\u23f3 $." +
          oldest.key +
          " EVICTED to free memory (was " +
          size +
          ", last used " +
          age +
          " turns ago). Use $.__pin('" +
          oldest.key +
          "') to protect.",
      );
      store.delete(oldest.key);
    }

    return warnings;
  }

  function getStatus(): string {
    if (store.size === 0) return "$ is empty";
    const totalBytes = totalMemoryBytes();
    const totalHuman =
      totalBytes < 1024 * 1024
        ? Math.round(totalBytes / 1024) + "KB"
        : (totalBytes / (1024 * 1024)).toFixed(1) + "MB";
    const pinnedCount = [...store.values()].filter((e) => e.pinned).length;
    const lines: string[] = [
      "$ store: " +
        store.size +
        " variable(s), " +
        totalHuman +
        " used of " +
        MAX_STORE_MEMORY / (1024 * 1024) +
        "MB cap",
    ];
    if (pinnedCount > 0) {
      lines[0] += " (" + pinnedCount + " pinned)";
    }
    for (const [key, entry] of store) {
      const size = estimateSize(entry.value);
      const age = currentTurn - entry.lastAccessTurn;
      if (entry.pinned) {
        lines.push("  $." + key + ": " + size + " (pinned, last used " + age + " turns ago)");
      } else {
        lines.push("  $." + key + ": " + size + " (last used " + age + " turns ago)");
      }
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
  ]);

  const proxy = new Proxy({} as Record<string, unknown>, {
    set(_target, prop: string, value) {
      if (RESERVED.has(prop)) return false;
      const existing = store.get(prop);
      store.set(prop, { value, lastAccessTurn: currentTurn, pinned: existing?.pinned ?? false });
      return true;
    },
    get(_target, prop: string) {
      switch (prop) {
        case "__reset":
          return () => {
            store.clear();
            return "$ cleared";
          };
        case "__status":
          return () => getStatus();
        case "__pin":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            entry.pinned = true;
            entry.lastAccessTurn = currentTurn;
            return "$." + name + " pinned (will not expire)";
          };
        case "__unpin":
          return (name: string) => {
            const entry = store.get(name);
            if (!entry) return "$." + name + " not found";
            entry.pinned = false;
            entry.lastAccessTurn = currentTurn;
            return "$." + name + " unpinned (subject to memory eviction)";
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
        case "__escaped":
          return () => !!(opts?.getEscaped?.());
        case Symbol.toPrimitive:
        case Symbol.toStringTag:
          return undefined;
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
    has(_target, prop: string) {
      return store.has(prop) || RESERVED.has(prop);
    },
    deleteProperty(_target, prop: string) {
      if (RESERVED.has(prop)) return false;
      store.delete(prop);
      return true;
    },
    ownKeys() {
      return [...store.keys()];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (store.has(prop)) {
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
