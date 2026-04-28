import type { Message } from "@mariozechner/pi-ai";
import { completeRlm } from "./api-client";
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_ITERATIONS, NO_CODE_STRIKE_LIMIT } from "./constants";
import { disposeSub } from "./dispose";
import { extractCodeBlocks } from "./extract";
import { createRlmHandle } from "./handle";
import { buildIterationPrompt, buildSystemPrompt } from "./prompts";
import { buildRlmReturn } from "./return-injection";
import { isRlmReturnSignal } from "./return-signal";
import { createRlmSubContext } from "./sub-context";
import { buildAllowedTools } from "./whitelist";
import type { RlmDeps, RlmOptions, RlmResult, RlmState } from "./types";
import { resolveModel, validateOptions } from "./validate";

function combineSignals(signals: AbortSignal[]): AbortSignal {
	const live = signals.filter(Boolean);
	if (live.length === 1) return live[0];
	return AbortSignal.any(live);
}

function abortError(signal: AbortSignal): Error {
	return signal.reason instanceof Error ? signal.reason : new Error("Aborted");
}

function usageInput(usage: unknown): number {
	const u = usage as any;
	return Number(u?.input ?? u?.inputTokens ?? 0);
}

function usageOutput(usage: unknown): number {
	const u = usage as any;
	return Number(u?.output ?? u?.outputTokens ?? 0);
}

function errorFromUnknown(e: unknown): Error {
	return e instanceof Error ? e : new Error(String(e));
}

export async function runRlm(deps: RlmDeps, opts: RlmOptions, depth = 0): Promise<RlmResult> {
	validateOptions(opts, deps);
	const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
	if (depth >= maxDepth) throw new Error("rlm: max depth reached");

	const state: RlmState = {
		resolved: false,
		value: undefined,
		disposed: false,
		disposeAbort: new AbortController(),
		timeoutHandle: null,
		usage: { input: 0, output: 0 },
		debug: [],
	};
	const combined = combineSignals([deps.signal, opts.signal, state.disposeAbort.signal].filter(Boolean) as AbortSignal[]);
	if (combined.aborted) throw abortError(combined);

	const [p, id] = opts.model ? resolveModel(opts.model) : [deps.parentModel.provider, deps.parentModel.id];
	const model = deps.modelRegistry.find(p, id);
	if (!model) throw new Error("rlm: unknown model '" + (opts.model ?? p + "/" + id) + "'");
	const auth = await deps.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth?.ok || !auth.apiKey) throw new Error("rlm: no API key for model '" + p + "/" + id + "'");

	const subSession = await createRlmSubContext();
	const { executeInSession } = await import("@pi-extensions/code-mode" + "/session-factory");
	const rlmCallable = (depth + 1 >= maxDepth)
		? (() => { throw new Error("rlm: max depth reached"); })
		: ((subOpts: RlmOptions) => createRlmHandle(deps, subOpts, depth + 1));
	const rlmWithReturn = Object.assign(rlmCallable, { return: buildRlmReturn(state) });

	const messages: Message[] = [{ role: "user", content: opts.task } as unknown as Message];
	const systemPrompt = opts.systemPrompt ?? buildSystemPrompt(opts);
	let strikes = 0;
	let lastError: Error | null = null;
	let lastStdout = "";
	const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
	const maxTokens = opts.maxTokens ?? Infinity;

	try {
		for (let i = 0; i < maxIterations; i++) {
			if (state.resolved) break;
			if (combined.aborted) throw abortError(combined);
			if (state.usage.input + state.usage.output >= maxTokens) throw new Error("rlm: maxTokens reached");

			const iterationMsg = buildIterationPrompt({ iterationIndex: i, strikes, lastError, lastStdout }) as Message;
			const response = await completeRlm(model, { systemPrompt, messages: [...messages, iterationMsg] }, { apiKey: auth.apiKey, headers: auth.headers, signal: combined });

			if (combined.aborted || response.stopReason === "aborted") throw new Error("Aborted");

			const text = response.content
				.filter((c): c is { type: string; text: string } => c.type === "text" && typeof c.text === "string")
				.map((c) => c.text)
				.join("\n");

			state.usage.input += usageInput(response.usage);
			state.usage.output += usageOutput(response.usage);
			if (state.usage.input + state.usage.output >= maxTokens) throw new Error("rlm: maxTokens reached");

			const blocks = extractCodeBlocks(text);
			if (blocks.length === 0) {
				strikes++;
				messages.push({ role: "assistant", content: text } as unknown as Message);
				lastError = null;
				lastStdout = "";
				if (strikes >= NO_CODE_STRIKE_LIMIT) throw new Error("rlm: sub-LLM not emitting code blocks");
				continue;
			}
			strikes = 0;

			let blockError: Error | null = null;
			for (const block of blocks) {
				try {
					await executeInSession(subSession, block, {
						signal: combined,
						cwd: deps.cwd,
						model: { provider: p, id },
						modelRegistry: deps.modelRegistry,
						hydrateBareGlobals: false,
						injectSessionApi: false,
						injectConsoleWake: false,
						injectRunbookRun: false,
						errorMode: "rethrow",
						allowedTools: buildAllowedTools(opts.tools),
						extraBindings: { rlm: rlmWithReturn },
					});
				} catch (e) {
					if (isRlmReturnSignal(e)) break;
					blockError = errorFromUnknown(e);
					break;
				}
			}
			lastStdout = subSession.drainLogs();
			if (state.resolved) break;

			if (blockError?.message === "rlm.return: value must be JSON-serializable") throw blockError;
			lastError = blockError;
			messages.push({ role: "assistant", content: text } as unknown as Message);
			messages.push({ role: "user", content: blockError ? "stdout: " + lastStdout + "\n\nExecution error: " + blockError.message : "stdout: " + lastStdout } as unknown as Message);
		}
		if (!state.resolved) throw new Error("rlm: maxIterations (" + maxIterations + ") reached without rlm.return");
		return { ...(state.value ?? {}), __rlm_usage: { input: state.usage.input, output: state.usage.output, model: p + "/" + id } };
	} finally {
		disposeSub(state);
	}
}
