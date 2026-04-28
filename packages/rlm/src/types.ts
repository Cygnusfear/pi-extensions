import type { ModelRegistry } from "@mariozechner/pi-coding-agent";

export interface RlmOptions {
	task: string;
	tools: string[];
	model?: string;
	maxIterations?: number;
	maxDepth?: number;
	maxTokens?: number;
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
	sendMessage?: (msg: unknown, opts?: unknown) => void;
	sendUserMessage?: (msg: string, opts?: { deliverAs?: "followUp" }) => void;
}

export interface RlmState {
	resolved: boolean;
	value: RlmResult | undefined;
	disposed: boolean;
	disposeAbort: AbortController;
	timeoutHandle: ReturnType<typeof setTimeout> | null;
	usage: { input: number; output: number };
	debug: string[];
}
