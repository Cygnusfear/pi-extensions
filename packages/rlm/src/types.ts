import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, Context, Model, ProviderStreamOptions } from "@mariozechner/pi-ai";

export type RlmCompleteFn = (model: Model<any>, request: Context, auth?: ProviderStreamOptions) => Promise<AssistantMessage>;

export interface RlmOptions {
	task: string;
	tools: string[];
	model?: string;
	/** Optional human-readable worker identity. Used for progress snapshots and git-ai attribution. */
	identity?: string | { name?: string; email?: string };
	maxIterations?: number;
	maxDepth?: number;
	/** Optional runtime schema guard: rlm.return() result must contain every listed top-level key. */
	requiredKeys?: string[];
	systemPrompt?: string;
	signal?: AbortSignal;
}

export type RlmResult = Record<string, unknown> & {
	__rlm_usage?: { input: number; output: number; model: string; identity?: string };
};

export type RlmStatus = "pending" | "running" | "resolved" | "failed" | "cancelled" | "timeout";

export interface RlmIdentity {
	name: string;
	email: string;
}

export interface RlmToolCallSummary {
	name: string;
	arguments?: unknown;
	timestamp: number;
}

export interface RlmSnapshot {
	status: RlmStatus;
	identity: RlmIdentity;
	model?: string;
	iteration: number;
	maxIterations?: number;
	usage: { input: number; output: number };
	lastAssistantSummary?: string;
	lastToolCall?: RlmToolCallSummary;
	toolHistory: RlmToolCallSummary[];
	startedAt: number;
	updatedAt: number;
	error?: string;
}

export type RlmEventType = "start" | "step" | "tool" | "return" | "error" | "settled";

export interface RlmEvent {
	type: RlmEventType;
	snapshot: RlmSnapshot;
}

export type RlmEventCallback = (event: RlmEvent) => void;

export interface RlmHandle<T = RlmResult> extends PromiseLike<T> {
	timeout(ms: number): this;
	inspect(): RlmSnapshot;
	on(type: RlmEventType, callback: RlmEventCallback): this;
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
	/** Called immediately when rlm.return stores a value, even if its control-flow signal is thrown from an unawaited promise. */
	onReturn?: () => void;
}
