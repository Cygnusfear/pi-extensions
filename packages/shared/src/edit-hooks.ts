/**
 * Shared registry for sandbox edit hooks.
 *
 * Extensions (like git-ai) register hooks that fire before/after every file
 * write performed by code-mode sandbox tools (Write, Edit, hashEdit, applyPatch).
 *
 * Why this exists:
 *   Code-mode runs under a single outer `execute_code` tool_call. Its inner
 *   file operations do `fs.writeFileSync` directly — they do NOT emit pi
 *   `tool_call` / `tool_result` events. Extensions that listen to those
 *   events (git-ai for AI authorship tracking, etc.) would be blind to every
 *   code-mode edit without this hook.
 *
 * Uses globalThis to guarantee shared state across module instances
 * (jiti/bun may create separate module instances per extension).
 */

export type EditHookPhase = "pre" | "post";

export interface EditHookEvent {
	phase: EditHookPhase;
	/** Logical tool name: "Write" | "Edit" | "hashEdit" | "applyPatch" | ... */
	toolName: string;
	/** Absolute file paths that will be / were written. */
	filePaths: string[];
	/** Working directory the sandbox is executing in. */
	cwd: string;
	/** Read-only SessionManager (pi), if available. */
	sessionManager?: any;
	/** Abort signal from the enclosing tool call, if available. */
	signal?: AbortSignal;
}

export type EditHook = (event: EditHookEvent) => Promise<void> | void;

const REGISTRY_KEY = "__pi_edit_hooks_registry__";

function getRegistry(): Set<EditHook> {
	if (!(globalThis as any)[REGISTRY_KEY]) {
		(globalThis as any)[REGISTRY_KEY] = new Set<EditHook>();
	}
	return (globalThis as any)[REGISTRY_KEY];
}

/** Register an edit hook. Returns an unregister function. */
export function registerEditHook(hook: EditHook): () => void {
	const reg = getRegistry();
	reg.add(hook);
	return () => {
		reg.delete(hook);
	};
}

export function unregisterEditHook(hook: EditHook): void {
	getRegistry().delete(hook);
}

export function getEditHooks(): EditHook[] {
	return [...getRegistry()];
}

/**
 * Run all registered edit hooks sequentially. Hooks that throw are isolated —
 * one misbehaving extension must not break a sandbox write.
 */
export async function runEditHooks(event: EditHookEvent): Promise<void> {
	const hooks = getEditHooks();
	for (const hook of hooks) {
		try {
			await hook(event);
		} catch (err) {
			// Never let a hook failure break the sandbox tool.
			// eslint-disable-next-line no-console
			console.warn(
				`[edit-hooks] hook failed (${event.phase}/${event.toolName}):`,
				err instanceof Error ? err.message : String(err),
			);
		}
	}
}
