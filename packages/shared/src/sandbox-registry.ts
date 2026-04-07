/**
 * Shared registry for sandbox-callable functions.
 * Extensions register their tool implementations here.
 * Code-mode reads and injects them into the sandbox.
 *
 * Pattern:
 *   // In your extension's session_start:
 *   import { registerSandboxFn } from "@pi-extensions/shared/sandbox-registry";
 *   registerSandboxFn("meshTell", async (params) => { ... });
 *
 *   // Code-mode picks them up automatically.
 */

const registry = new Map<string, (...args: any[]) => any>();

export function registerSandboxFn(name: string, fn: (...args: any[]) => any): void {
  registry.set(name, fn);
}

export function unregisterSandboxFn(name: string): void {
  registry.delete(name);
}

export function getSandboxFns(): Record<string, (...args: any[]) => any> {
  return Object.fromEntries(registry);
}

export function getSandboxFnNames(): string[] {
  return [...registry.keys()];
}
