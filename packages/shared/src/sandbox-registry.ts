/**
 * Shared registry for sandbox-callable functions.
 * Extensions register their tool implementations here.
 * Code-mode reads and injects them into the sandbox.
 *
 * Uses globalThis to guarantee shared state across module instances
 * (jiti/bun may create separate module instances per extension).
 */

const REGISTRY_KEY = "__pi_sandbox_fn_registry__";

function getRegistry(): Map<string, (...args: any[]) => any> {
	if (!(globalThis as any)[REGISTRY_KEY]) {
		(globalThis as any)[REGISTRY_KEY] = new Map<string, (...args: any[]) => any>();
	}
	return (globalThis as any)[REGISTRY_KEY];
}

export function registerSandboxFn(name: string, fn: (...args: any[]) => any): void {
	getRegistry().set(name, fn);
}

export function unregisterSandboxFn(name: string): void {
	getRegistry().delete(name);
}

export function getSandboxFns(): Record<string, (...args: any[]) => any> {
	return Object.fromEntries(getRegistry());
}

export function getSandboxFnNames(): string[] {
	return [...getRegistry().keys()];
}
