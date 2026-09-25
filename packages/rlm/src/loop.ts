import { runAgentLoop, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import {
	createAssistantMessageEventStream,
	type AssistantMessage,
	type Model,
	type ModelThinkingLevel,
	type SimpleStreamOptions,
	type ThinkingLevel,
} from "@earendil-works/pi-ai";
import { streamSimple } from "@earendil-works/pi-ai/compat";
import { Type } from "@sinclair/typebox";
import { createCodeModeSession, executeInSession } from "@pi-extensions/code-mode/session-factory";
import { budgetSuffix } from "./budget";
import { combineSignals } from "./combine-signals";
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_ITERATIONS } from "./constants";
import { disposeSub } from "./dispose";
import { createRlmHandle } from "./handle";
import { assistantToolCalls, summarizeAssistantMessage, type RlmProgressMonitor } from "./progress";
import { buildSystemPrompt, getCodeModeManual } from "./prompts";
import { buildRlmReturn } from "./return-injection";
import { isRlmReturnSignal } from "./return-signal";
import type { RlmDeps, RlmOptions, RlmResult, RlmState } from "./types";
import { resolveModel, validateOptions } from "./validate";
import { classifyProviderLimit } from "@pi-extensions/shared/provider-limits";
import type { ProviderLimitNotice } from "@pi-extensions/shared/alert-provenance";

const DEFAULT_MODEL_ROLE = "rlm";

class RlmResolvedSignal extends Error {
	constructor() {
		super("rlm resolved");
	}
}

function abortError(signal: AbortSignal): Error {
	if (signal.reason instanceof Error && signal.reason.name !== "AbortError") return signal.reason;
	return new Error("Aborted");
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

/** Current Z.AI GLM reasoning APIs reject disabled thinking; RLM defaults those requests to low. */
const ZAI_PROVIDER_IDS: ReadonlySet<string> = new Set(["zai", "zai-coding-cn"]);

/** Explicit RLM level wins, then the agent-loop level, then the mandatory Z.AI low default. */
export function resolveRlmReasoningLevel(
	model: Model<any>,
	requested?: ThinkingLevel,
	inherited?: ModelThinkingLevel,
): ThinkingLevel | undefined {
	const selected = requested ?? inherited;
	const compat = (model as Model<any> & { compat?: { thinkingFormat?: string } }).compat;
	const usesZaiThinking = ZAI_PROVIDER_IDS.has(model.provider) || compat?.thinkingFormat === "zai";
	if (model.reasoning && usesZaiThinking && (selected === undefined || selected === "off")) {
		return "low";
	}
	return selected === "off" ? undefined : selected;
}

/** Build the pi-ai options used by RLM streamSimple, retaining caller settings. */
export function buildRlmStreamOptions(
	model: Model<any>,
	options: SimpleStreamOptions | undefined,
	requested?: ThinkingLevel,
): SimpleStreamOptions {
	const inherited = options?.reasoning as ModelThinkingLevel | undefined;
	return {
		...options,
		reasoning: resolveRlmReasoningLevel(model, requested, inherited),
	};
}

function formatExecutionError(error: Error, stdout: string): string {
	const formatted = error.name && error.name !== "Error" ? error.name + ": " + error.message : error.message;
	return stdout ? "stdout: " + stdout + "\n\nExecution error: " + formatted : formatted;
}

function executeCodeFromToolParams(toolParams: unknown): string {
	if (
		typeof toolParams !== "object" ||
		toolParams === null ||
		!("code" in toolParams) ||
		typeof toolParams.code !== "string"
	) {
		throw new Error("rlm: execute_code requires a string code argument");
	}
	return toolParams.code;
}

function completeFnStream(
	deps: RlmDeps,
	model: Model<any>,
	auth: { apiKey: string; headers?: Record<string, string> },
	configuredReasoning?: ThinkingLevel,
) {
	return (_model: Model<any>, context: any, options: any) => {
		const stream = createAssistantMessageEventStream();
		void (async () => {
			try {
				const reasoning = resolveRlmReasoningLevel(
					model,
					configuredReasoning,
					options?.reasoning,
				);
				const message = await deps.completeFn!(model, context, {
					apiKey: auth.apiKey,
					headers: auth.headers,
					signal: options?.signal,
					reasoning,
				});
				stream.push({ type: "start", partial: message });
				stream.push({ type: message.stopReason === "error" || message.stopReason === "aborted" ? "error" : "done", reason: message.stopReason === "aborted" ? "aborted" : message.stopReason === "error" ? "error" : message.stopReason === "length" ? "length" : message.stopReason === "toolUse" ? "toolUse" : "stop", ...(message.stopReason === "error" || message.stopReason === "aborted" ? { error: message } : { message }) } as any);
		} catch (e) {
			const err = errorFromUnknown(e);
			const message: AssistantMessage = { role: "assistant", content: [{ type: "text", text: "" }], api: model.api, provider: model.provider, model: model.id, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: options?.signal?.aborted ? "aborted" : "error", errorMessage: err.message, timestamp: Date.now() } as any;
			stream.push({ type: "error", reason: message.stopReason as any, error: message });
		}
		})();
		return stream;
	};
}

function buildExecuteCodeTool(params: {
	subSession: ReturnType<typeof createCodeModeSession>;
	combined: AbortSignal;
	deps: RlmDeps;
	opts: RlmOptions;
	modelRef: { provider: string; id: string };
	rlmWithReturn: unknown;
	state: RlmState;
	monitor?: RlmProgressMonitor;
	maxIterations: number;
}): AgentTool<any, any> {
	return {
		name: "execute_code",
		label: "Code Mode",
		description: "Execute JavaScript/TypeScript code in a persistent code-mode sandbox. Use this for every step. Call rlm.return({...}) inside the code when the final structured object is ready.",
		parameters: Type.Object({
			code: Type.String({ description: "JavaScript/TypeScript to execute. All sandbox functions are async; use await. Call rlm.return({...}) to finish." }),
		}),
		async execute(_toolCallId, toolParams, signal) {
			const effectiveSignal = signal ?? params.combined;
			const identity = params.monitor?.inspect().identity;
			try {
				await executeInSession(params.subSession, executeCodeFromToolParams(toolParams), {
					signal: effectiveSignal,
					cwd: params.deps.cwd,
					model: params.modelRef,
					modelRegistry: params.deps.modelRegistry,
					codeModeManual: getCodeModeManual(),
					hydrateBareGlobals: false,
					injectSessionApi: false,
					injectConsoleWake: false,
					injectRunbookRun: false,
					errorMode: "rethrow",
					allowedTools: new Set([...params.opts.tools, "man"]),
					extraBindings: { rlm: params.rlmWithReturn },
					agentGitIdentity: identity ? { ...identity, model: params.modelRef.provider + "/" + params.modelRef.id } : undefined,
				});
			} catch (e) {
				const stdout = params.subSession.drainLogs();
				if (isRlmReturnSignal(e) || params.state.resolved) {
					params.state.disposed = true;
					return { content: [{ type: "text", text: stdout || "rlm.return called" }], details: { returned: true, stdout } };
				}
				const err = errorFromUnknown(e);
				if (err.message === "rlm.return: value must be JSON-serializable") {
					// rlm.return misuse is fatal, not a retryable tool error. Carry it via state so
					// the loop terminates — runAgentLoop swallows a thrown tool error into a retryable
					// error-result, which would otherwise loop to maxIterations.
					params.state.fatalError = err;
					throw err;
				}
				throw new Error(formatExecutionError(err, stdout));
			}
			const stdout = params.subSession.drainLogs();
			if (params.state.resolved) {
				params.state.disposed = true;
				return { content: [{ type: "text", text: stdout || "rlm.return called" }], details: { returned: true, stdout } };
			}
			return { content: [{ type: "text", text: (stdout || "(no output)") + budgetSuffix(params.state, params.opts, params.maxIterations) }], details: { stdout } };
		},
	};
}

export async function runRlm(deps: RlmDeps, opts: RlmOptions, depth = 0): Promise<RlmResult> {
	return runRlmWithMonitor(deps, opts, depth, undefined);
}

export async function runRlmWithMonitor(deps: RlmDeps, opts: RlmOptions, depth = 0, monitor?: RlmProgressMonitor): Promise<RlmResult> {
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
	};
	state.onReturn = () => {
		if (!state.disposeAbort.signal.aborted) state.disposeAbort.abort(new RlmResolvedSignal());
	};
	const combined = combineSignals([deps.signal, opts.signal, state.disposeAbort.signal].filter(Boolean) as AbortSignal[]);
	if (combined.aborted) throw abortError(combined);

	const selected = opts.model ? undefined : deps.resolveModelRole(DEFAULT_MODEL_ROLE);
	if (!opts.model && !selected) {
		throw new Error(
			`rlm: no healthy available model configured for role '${DEFAULT_MODEL_ROLE}'`,
		);
	}
	const [p, id] = opts.model
		? resolveModel(opts.model)
		: [selected!.provider, selected!.id];
	const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
	monitor?.update({ status: "running", model: p + "/" + id, maxIterations }, "start");
	const model = deps.modelRegistry.find(p, id);
	if (!model) throw new Error("rlm: unknown model '" + (opts.model ?? p + "/" + id) + "'");
	const auth = await deps.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth?.ok || !auth.apiKey) throw new Error("rlm: no API key for model '" + p + "/" + id + "'");

	const subSession = createCodeModeSession();
	const rlmCallable = (depth + 1 >= maxDepth)
		? (() => { throw new Error("rlm: max depth reached"); })
		: ((subOpts: RlmOptions) => createRlmHandle(deps, subOpts, depth + 1));
	const rlmWithReturn = Object.assign((subOpts: RlmOptions) => rlmCallable(subOpts), { return: buildRlmReturn(state) });
	const effectiveOpts: RlmOptions = { ...opts, tools: opts.tools.filter((tool) => tool !== "rlm") };
	const executeCodeTool = buildExecuteCodeTool({ subSession, combined, deps, opts: effectiveOpts, modelRef: { provider: p, id }, rlmWithReturn, state, monitor, maxIterations });
	let turns = 0;
	let terminalError: Error | null = null;
	const messages: AgentMessage[] = [{ role: "user", content: [{ type: "text", text: opts.task }], timestamp: Date.now() } as any];

	const streamFn = deps.completeFn
		? completeFnStream(
			deps,
			model,
			{ apiKey: auth.apiKey, headers: auth.headers },
			opts.reasoning,
		)
		: ((streamModel: Model<any>, context: any, options: any) => {
			return streamSimple(streamModel, context, {
				...buildRlmStreamOptions(streamModel, options, opts.reasoning),
				apiKey: auth.apiKey,
				headers: auth.headers,
				signal: options?.signal,
			});
		});

	const swallowLateReturn = (reason: unknown) => {
		if (isRlmReturnSignal(reason)) state.onReturn?.();
	};
	process.on("unhandledRejection", swallowLateReturn);
	try {
		await runAgentLoop(messages, { systemPrompt: opts.systemPrompt ?? buildSystemPrompt(opts), messages: [], tools: [executeCodeTool] }, {
			model,
			convertToLlm: (msgs: AgentMessage[]) => msgs.filter((m: any) => m.role === "user" || m.role === "assistant" || m.role === "toolResult") as any,
			toolExecution: "sequential",
			getSteeringMessages: async () => [],
			getFollowUpMessages: async () => [],
		} as any, async (event) => {
			if (event.type === "message_end" && (event.message as any).role === "assistant") {
				const assistant = event.message as AssistantMessage;
				state.usage.input += usageInput(assistant.usage);
				state.usage.output += usageOutput(assistant.usage);
				monitor?.update({ usage: { ...state.usage }, lastAssistantSummary: summarizeAssistantMessage(assistant) }, "step");
				for (const toolCall of assistantToolCalls(assistant)) monitor?.recordTool(toolCall);
				if (assistant.stopReason === "error") {
					terminalError = new Error(assistant.errorMessage || "rlm: sub-agent error");
					// Producer-side provider-limit alert — fired exactly once per handle.
					const limitKind = classifyProviderLimit(assistant.errorMessage);
					if (limitKind && !state.limitAlerted) {
						state.limitAlerted = true;
						const rlmIdentity = typeof opts.identity === "string" ? opts.identity : opts.identity?.name;
						const notice: ProviderLimitNotice = {
							kind: limitKind === "quota" ? "quota" : "rate_limited",
							model: p + "/" + id,
							operation: "rlm",
							failed: {
								sessionId: deps.parentSession?.id,
								sessionName: deps.parentSession?.name,
							},
							rlmIdentity,
						};
						try { deps.notifyProviderLimit?.(notice); } catch { /* best-effort */ }
					}
				}
				if (assistant.stopReason === "aborted") terminalError = new Error(assistant.errorMessage || "Aborted");
			}
			if (event.type === "turn_end") {
				turns++;
				state.turns = turns;
				monitor?.update({ iteration: turns, usage: { ...state.usage } }, "step");
				if (state.fatalError) throw state.fatalError;
				if (state.resolved) throw new RlmResolvedSignal();
				if (turns >= maxIterations) throw new Error("rlm: maxIterations (" + maxIterations + ") reached without rlm.return");
			}
		}, combined, streamFn);
	} catch (e) {
		if (e instanceof RlmResolvedSignal) {
			// Expected terminal path: rlm.return was called inside execute_code.
		} else {
			if (combined.aborted) throw abortError(combined);
			throw e;
		}
	} finally {
		process.removeListener("unhandledRejection", swallowLateReturn);
	}

	if (combined.aborted && !state.resolved) throw abortError(combined);
	if (!state.resolved) {
		if (state.fatalError) throw state.fatalError;
		if (terminalError) throw terminalError;
		throw new Error("rlm: agent finished without rlm.return");
	}
	const missingKeys = (opts.requiredKeys ?? []).filter((key) => !Object.prototype.hasOwnProperty.call(state.value ?? {}, key));
	if (missingKeys.length > 0) throw new Error("rlm: returned object missing required keys: " + missingKeys.join(", "));
	const usage = { input: state.usage.input, output: state.usage.output, model: p + "/" + id, ...(monitor ? { identity: monitor.inspect().identity.name } : {}) };
	return { ...(state.value ?? {}), __rlm_usage: usage };
}
