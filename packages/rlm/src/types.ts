import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, Context, Model, ProviderStreamOptions } from "@mariozechner/pi-ai";

export type RlmCompleteFn = (model: Model<any>, request: Context, auth?: ProviderStreamOptions) => Promise<AssistantMessage>;

export interface RlmOptions {
	task: string;
	tools: string[];
	model?: string;
	maxIterations?: number;
	maxDepth?: number;
	systemPrompt?: string;
	signal?: AbortSignal;
}

export type RlmResult = Record<string, unknown> & {
	__rlm_usage?: { input: number; output: number; model: string };
};

export interface RlmHandle<T = RlmResult> extends PromiseLike<T> {
	timeout(ms: number): this;
	unsubscribe(): void;
}

export interface RlmDeps {
	signal: AbortSignal;
	cwd: string;
	parentModel: { provider: string; id: string };
	modelRegistry: ModelRegistry;
	completeFn?: RlmCompleteFn;
	sendMessage?: (msg: unknown, opts?: unknown) => void;
	sendUserMessage?: (msg: string, opts?: { deliverAs?: "followUp" | "steer" }) => void;
}

export interface RlmState {
	resolved: boolean;
	value: RlmResult | undefined;
	disposed: boolean;
	disposeAbort: AbortController;
	timeoutHandle: ReturnType<typeof setTimeout> | null;
	usage: { input: number; output: number };
}
