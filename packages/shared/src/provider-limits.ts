export type ProviderLimitKind = "rate_limit" | "quota";

/** Synchronous extension-bus channel used when alternate credentials own recovery. */
export const PROVIDER_KEY_RECOVERY_HANDLED_CHANNEL = "provider-key-router:recovery-handled";

export interface ProviderKeyRecoveryHandled {
	/** The exact Pi lifecycle event object; consumers coordinate by object identity. */
	event: object;
	provider: string;
	kind: "retryable-limit" | "hard-key-limit" | "all-keys-exhausted";
}

/** Emitted after a provider receives a different active credential. */
export const PROVIDER_KEY_CHANGED_CHANNEL = "provider-key-router:key-changed";

export interface ProviderKeyChanged {
	providerIds: string[];
}

export const PROVIDER_KEY_RECOVERY_QUERY_CHANNEL = "provider-key-router:recovery-query";

export interface ProviderKeyRecoveryQuery {
	/** Exact host lifecycle event being offered to the router. */
	event: object;
	/** Host context is intentionally opaque to the shared coordination layer. */
	context: unknown;
	handled: boolean;
	pending?: Promise<boolean>;
}

export interface ProviderKeyRecoveryEventBus {
	on(channel: string, handler: (data: unknown) => void): () => void;
	emit(channel: string, data: unknown): void;
}

/**
 * Coordinate key recovery independently of extension listener order.
 *
 * The exact event is first offered synchronously to the router. If the router
 * already handled it through its host listener, the identity gate answers true;
 * if rate-limit recovery runs first, the router answers the mutable query.
 */
export function createProviderKeyRecoveryGate(events: ProviderKeyRecoveryEventBus | undefined): {
	claim(event: object, context: unknown): boolean | Promise<boolean>;
	isHandled(event: object): boolean;
	dispose(): void;
} {
	const handled = new WeakSet<object>();
	if (!events) return { claim: () => false, isHandled: () => false, dispose: () => {} };
	const dispose = events.on(PROVIDER_KEY_RECOVERY_HANDLED_CHANNEL, (data) => {
		if (!data || typeof data !== "object") return;
		const event = (data as Partial<ProviderKeyRecoveryHandled>).event;
		if (event && typeof event === "object") handled.add(event);
	});
	return {
		claim: (event, context) => {
			if (handled.has(event)) return true;
			const query: ProviderKeyRecoveryQuery = { event, context, handled: false };
			events.emit(PROVIDER_KEY_RECOVERY_QUERY_CHANNEL, query);
			if (!query.pending) return query.handled || handled.has(event);
			return query.pending.then((accepted) => accepted || query.handled || handled.has(event));
		},
		isHandled: (event) => handled.has(event),
		dispose,
	};
}

/** Match a retryable provider rate-limit / throttle error message. */
export function isRateLimitError(message: string | undefined): boolean {
	if (!message) return false;
	return /rate.?limit|\b429\b|too many requests|tpm|throttl|quota.*exceeded.*per/i.test(message);
}

/** Match a non-retryable provider quota or usage-window error message. */
export function isQuotaLimitError(message: string | undefined): boolean {
	if (!message) return false;
	return (
		/5[- ]hour usage limit|usage limit reached|credit balance|insufficient credits?|usage cap|plan limit|account limit/i.test(
			message,
		) ||
		/GoUsageLimitError|FreeUsageLimitError|monthly usage limit|insufficient_quota|quota exceeded|out of budget|billing/i.test(
			message,
		)
	);
}

/** Classify quota before a generic 429 so RLM reports the actionable condition. */
export function classifyProviderLimit(message: string | undefined): ProviderLimitKind | undefined {
	if (isQuotaLimitError(message)) return "quota";
	if (isRateLimitError(message)) return "rate_limit";
	return undefined;
}
