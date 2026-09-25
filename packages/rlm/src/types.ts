import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import type {
	AssistantMessage,
	Context,
	Model,
	ProviderStreamOptions,
	ThinkingLevel,
} from "@earendil-works/pi-ai";
import type { ParentSessionIdentity } from "@pi-extensions/shared/sandbox-registry";
import type { ProviderLimitNotice } from "@pi-extensions/shared/alert-provenance";

export type RlmCompleteOptions = ProviderStreamOptions & {
	reasoning?: ThinkingLevel;
};
export type RlmCompleteFn = (
	model: Model<any>,
	request: Context,
	options?: RlmCompleteOptions,
) => Promise<AssistantMessage>;

export interface RlmOptions {
	task: string;
	tools: string[];
	/** Deliberate concrete-model override. When omitted, the central `rlm` role is resolved at call time. */
	model?: string;

	/** Provider-native reasoning level. Z.AI mandatory-thinking models default to low when omitted. */
	reasoning?: ThinkingLevel;
	/** Optional human-readable worker identity. Used for progress snapshots and git-ai attribution. */
	identity?: string | { name?: string; email?: string };
	maxIterations?: number;
	/** Input-token ceiling: once state.usage.input reaches this, every tool result carries a forced-return directive. */
	maxInputTokens?: number;
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
	/** Agent turns consumed so far (set at each turn_end; used by the budget countdown). */
	turns?: number;
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

export interface RlmModelRef {
	provider: string;
	id: string;
}

export type RlmRoleResolver = (role: string) => RlmModelRef | undefined;

export interface RlmDeps {
	signal: AbortSignal;
	cwd: string;
	/** Resolve one healthy, available model from a centrally configured role. */
	resolveModelRole: RlmRoleResolver;
	modelRegistry: ModelRegistry;
	completeFn?: RlmCompleteFn;
	sendMessage?: (msg: unknown, opts?: unknown) => void;
	sendUserMessage?: (msg: string, opts?: { deliverAs?: "followUp" | "steer" }) => void;
	/** Immutable parent-session identity, resolved once by code-mode. */
	parentSession?: ParentSessionIdentity;
	/** Optional notifier for provider rate-limit/quota failures so the parent owns the alert. */
	notifyProviderLimit?: (notice: ProviderLimitNotice) => void;
}

export interface RlmState {
	resolved: boolean;
	value: RlmResult | undefined;
	/** Agent turns consumed so far; used by the budget countdown. */
	turns?: number;
	disposed: boolean;
	disposeAbort: AbortController;
	timeoutHandle: ReturnType<typeof setTimeout> | null;
	usage: { input: number; output: number };
	/** Called immediately when rlm.return stores a value, even if its control-flow signal is thrown from an unawaited promise. */
	onReturn?: () => void;
	/** Set when rlm.return is called with a non-JSON-serializable value. Carried via
	 *  state (not exception propagation, which runAgentLoop swallows into a retryable
	 *  tool-error) so the loop terminates and rejects instead of looping to maxIterations. */
	fatalError?: Error;
	/** True once a provider-limit alert has been emitted for this handle so it never duplicates. */
	limitAlerted?: boolean;
}
