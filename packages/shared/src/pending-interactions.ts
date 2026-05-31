/**
 * Pending blocking interactions registry.
 *
 * In-process singleton tracking blocking UI dialogs that are currently
 * waiting on the hooman (e.g. a git-safety confirm popup). Lets other
 * parts of the agent runtime (notably code-mode's auto-promote path)
 * distinguish "agent is doing slow async work" from "agent is stuck on
 * a popup the hooman hasn't seen yet."
 *
 * Why this exists:
 *   - When git-safety opens `ctx.ui.confirm(...)`, the tool call awaits
 *     the popup. Inside execute_code that means the whole block awaits
 *     the popup, and the code-mode auto-promote eventually fires with
 *     a generic "long async" stub. The agent reads "long async" → idles.
 *     If the hooman is in another tab, the popup sits unanswered.
 *   - With this registry, code-mode can detect "there's a confirm
 *     pending" and emit a SPECIFIC stub that tells the agent to fire
 *     `notify()` and pull the hooman in.
 *
 * Singleton across the entire node process: each extension imports the
 * same resolved module path, so the module cache returns the same
 * `pending` Map.
 *
 * No coupling to git-safety specifically. Any extension that opens a
 * blocking UI dialog should wrap with `beginConfirm` / `endConfirm`.
 */

export interface PendingConfirmMeta {
	/** Extension that opened the dialog, e.g. "git-safety", "lock-mode". */
	source: string;
	/** Tool the dialog was triggered by, e.g. "bash", "write", "apply_patch". */
	tool: string;
	/** Human-readable reason ("git push --force in /repo"). */
	reason: string;
	/** Optional extra context (cwd, command, target path). */
	context?: Record<string, string>;
}

export interface PendingConfirmEntry extends PendingConfirmMeta {
	/** Stable handle returned by beginConfirm; pass to endConfirm. */
	handle: number;
	/** Unix ms when the dialog opened. */
	openedAt: number;
}

const pending = new Map<number, PendingConfirmEntry>();
let nextHandle = 1;

/**
 * Register a newly-opened blocking confirm dialog. Returns a handle the
 * caller MUST pass to `endConfirm` once the dialog resolves (whether by
 * approve, deny, or abort). Wrap in try/finally to guarantee cleanup.
 *
 * @example
 *   const h = beginConfirm({ source: "git-safety", tool: "bash", reason: "git push --force" });
 *   try {
 *     const ok = await ctx.ui.confirm(title, body);
 *     return ok ? undefined : { block: true, reason: "denied" };
 *   } finally {
 *     endConfirm(h);
 *   }
 */
export function beginConfirm(meta: PendingConfirmMeta): number {
	const handle = nextHandle++;
	pending.set(handle, { ...meta, handle, openedAt: Date.now() });
	return handle;
}

/** Release a handle. Idempotent — double-end is a no-op, not an error. */
export function endConfirm(handle: number): void {
	pending.delete(handle);
}

/** Snapshot of all currently-pending confirms. Returned in open-order. */
export function getPendingConfirms(): readonly PendingConfirmEntry[] {
	return Array.from(pending.values()).sort((a, b) => a.openedAt - b.openedAt);
}

/** Quick count check without allocating the snapshot array. */
export function pendingConfirmCount(): number {
	return pending.size;
}

/**
 * Format the pending-confirms list for inclusion in an agent-visible
 * message (the code-mode auto-promote stub uses this).
 *
 * Returns null when nothing is pending — callers branch on that to
 * decide whether to emit the special path.
 */
export function formatPendingConfirmsForAgent(): string | null {
	if (pending.size === 0) return null;
	const lines: string[] = [];
	lines.push(`${pending.size} blocking dialog(s) awaiting the hooman:`);
	for (const e of getPendingConfirms()) {
		const ageS = Math.max(0, Math.round((Date.now() - e.openedAt) / 1000));
		lines.push(`  • [${e.source}] ${e.reason} (tool: ${e.tool}, open ${ageS}s)`);
	}
	return lines.join("\n");
}

/** TEST ONLY — wipe all state. Do not call from production code. */
export function __resetForTests(): void {
	pending.clear();
	nextHandle = 1;
}
