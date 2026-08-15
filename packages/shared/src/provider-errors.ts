/** Shared HTTP-provider error detection — one matcher for transcription and TTS, no drift. */

const OUT_OF_CREDITS_CODES = new Set([
	"billing_hard_limit_reached",
	"credits_depleted",
	"credits_exhausted",
	"insufficient_credits",
	"insufficient_funds",
	"insufficient_quota",
	"out_of_credits",
	"out_of_funds",
	"quota_depleted",
	"quota_exceeded",
	"quota_exhausted",
]);

const OUT_OF_CREDITS_PATTERNS = [
	/\binsufficient(?:\s+(?:account|available|current))?\s+(?:credits?|funds?|quota)\b/i,
	/\b(?:credits?|funds?|quota)\s+(?:is|are|has\s+been)?\s*(?:depleted|exhausted|insufficient)\b/i,
	/\bout\s+of\s+(?:credits?|funds?|quota)\b/i,
	/\b(?:credits?|funds?|quota)\s+(?:depleted|exhausted|exceeded)\b/i,
	/\b(?:billing\s+)?hard\s+limit\s+(?:exceeded|reached)\b/i,
	/\byou\s+exceeded\s+your\s+(?:current\s+)?quota\b/i,
	/\bnot\s+enough\s+(?:credits?|funds?)\b/i,
];

export interface ProviderErrorPayload {
	readonly code?: unknown;
	readonly error?: unknown;
	readonly message?: unknown;
}

export interface ProviderErrorDetails {
	readonly code?: string;
	readonly outOfCredits: boolean;
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === "string") return value.trim() || undefined;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return undefined;
}

export function isOutOfCreditsCode(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
	return OUT_OF_CREDITS_CODES.has(normalized);
}

export function isOutOfCreditsText(value: string): boolean {
	const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
	return OUT_OF_CREDITS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Extract a machine code + out-of-credits flag from an HTTP provider error body (JSON or plain text). */
export function providerErrorDetails(body: string): ProviderErrorDetails {
	if (!body) return { outOfCredits: false };
	let parsed: unknown;
	try { parsed = JSON.parse(body); } catch {
		return { outOfCredits: isOutOfCreditsText(body) };
	}
	const root = parsed && typeof parsed === "object" ? parsed as ProviderErrorPayload : undefined;
	const nested = root?.error && typeof root.error === "object" ? root.error as ProviderErrorPayload : undefined;
	const rawCode = stringValue(nested?.code) ?? stringValue(root?.code);
	const code = rawCode && /^[A-Za-z0-9_.-]{1,64}$/.test(rawCode) ? rawCode : undefined;
	const messages = [stringValue(nested?.message), stringValue(root?.message), body].filter((message): message is string => message !== undefined);
	return {
		code,
		outOfCredits: isOutOfCreditsCode(rawCode) || messages.some(isOutOfCreditsText),
	};
}
