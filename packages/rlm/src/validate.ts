import { createToolBindings } from "@pi-extensions/code-mode/sandbox-tools";
import type { SandboxContext } from "@pi-extensions/code-mode/types";
import { getSandboxFnNames } from "@pi-extensions/shared/sandbox-registry";
import type { RlmDeps, RlmOptions } from "./types";

export function resolveModel(s: string): [provider: string, id: string] {
	const slash = s.indexOf("/");
	if (slash <= 0 || slash === s.length - 1) {
		throw new Error("rlm: model '" + s + "' must be in 'provider/id' form");
	}
	return [s.slice(0, slash), s.slice(slash + 1)];
}

function availableToolNames(deps: RlmDeps): Set<string> {
	const minimalCtx: SandboxContext = { cwd: deps.cwd, images: [], signal: deps.signal };
	const all = new Set([...Object.keys(createToolBindings(minimalCtx)), ...getSandboxFnNames()]);
	all.delete("runbookRun");
	return all;
}

export function validateOptions(opts: RlmOptions, deps: RlmDeps): void {
	if (!opts || typeof opts.task !== "string" || opts.task.trim().length === 0) throw new Error("rlm: task must be a non-empty string");
	if (!Array.isArray(opts.tools) || opts.tools.some((t) => typeof t !== "string")) throw new Error("rlm: tools must be an array of strings");
	if (opts.tools.includes("rlm")) throw new Error("rlm: 'rlm' is always injected and cannot be listed in tools");
	const known = availableToolNames(deps);
	for (const name of [...new Set(opts.tools)]) {
		if (!known.has(name)) throw new Error("rlm: unknown tool '" + name + "'");
	}
	if (opts.model) {
		const [p, id] = resolveModel(opts.model);
		if (!deps.modelRegistry.find(p, id)) throw new Error("rlm: unknown model '" + opts.model + "'");
	}
	if (opts.maxIterations !== undefined && (!Number.isInteger(opts.maxIterations) || opts.maxIterations < 1 || opts.maxIterations > 100)) throw new Error("rlm: maxIterations must be in [1, 100]");
	if (opts.maxDepth !== undefined && (!Number.isInteger(opts.maxDepth) || opts.maxDepth < 1 || opts.maxDepth > 5)) throw new Error("rlm: maxDepth must be in [1, 5]");
}
