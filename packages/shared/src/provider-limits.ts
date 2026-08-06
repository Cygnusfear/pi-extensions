export type ProviderLimitKind = "rate_limit" | "quota";

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
