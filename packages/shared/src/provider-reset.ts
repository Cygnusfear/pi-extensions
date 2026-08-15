const ANTHROPIC_RESET_HEADERS = [
	"anthropic-ratelimit-requests-reset",
	"anthropic-ratelimit-tokens-reset",
	"anthropic-ratelimit-input-tokens-reset",
	"anthropic-ratelimit-output-tokens-reset",
] as const;

/** Whether a number is a finite timestamp in the JavaScript Date range. */
export function isRepresentableDateTimestamp(timestamp: number): boolean {
	return (
		Number.isFinite(timestamp) && Number.isFinite(new Date(timestamp).getTime())
	);
}

/** Return a non-negative delay only when its absolute wake time is representable. */
function normalizeTrustworthyDelayMs(
	delayMs: number,
	now: number,
): number | undefined {
	if (!Number.isFinite(delayMs)) return undefined;
	const normalizedDelayMs = Math.max(0, delayMs);
	return isRepresentableDateTimestamp(now + normalizedDelayMs)
		? normalizedDelayMs
		: undefined;
}

/** Parse Retry-After seconds/date, then retry-after-ms, into a trustworthy delay. */
export function parseRetryAfterMs(
	headers: Record<string, string> | undefined,
	now: number = Date.now(),
): number | undefined {
	if (!headers) return undefined;
	const retryAfter = headers["retry-after"];
	if (retryAfter) {
		if (/^\d+$/.test(retryAfter)) {
			const delay = normalizeTrustworthyDelayMs(Number(retryAfter) * 1000, now);
			if (delay !== undefined) return delay;
		} else {
			const parsed = Date.parse(retryAfter);
			if (!Number.isNaN(parsed)) {
				const delay = normalizeTrustworthyDelayMs(parsed - now, now);
				if (delay !== undefined) return delay;
			}
		}
	}
	const retryAfterMs = headers["retry-after-ms"];
	if (retryAfterMs && /^\d+$/.test(retryAfterMs)) {
		const delay = normalizeTrustworthyDelayMs(Number(retryAfterMs), now);
		if (delay !== undefined) return delay;
	}
	return undefined;
}

/** Return the latest parseable Anthropic bucket reset delay. */
export function parseAnthropicResetDelayMs(
	headers: Record<string, string> | undefined,
	now: number = Date.now(),
): number | undefined {
	if (!headers) return undefined;
	let maxDelay = -Infinity;
	for (const header of ANTHROPIC_RESET_HEADERS) {
		const value = headers[header];
		if (!value) continue;
		const parsed = Date.parse(value);
		if (Number.isNaN(parsed)) continue;
		maxDelay = Math.max(maxDelay, parsed - now);
	}
	return maxDelay === -Infinity ? undefined : Math.max(0, maxDelay);
}

/** Best trustworthy provider reset delay, preferring Retry-After. */
export function getPrimaryRateLimitDelayMs(
	providerError: { headers?: Record<string, string> } | undefined,
	now: number = Date.now(),
): number | undefined {
	if (!providerError?.headers) return undefined;
	return (
		parseRetryAfterMs(providerError.headers, now) ??
		parseAnthropicResetDelayMs(providerError.headers, now)
	);
}
