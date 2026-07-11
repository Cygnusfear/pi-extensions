/**
 * pi-rate-limit-recovery
 *
 * Anthropic (and other providers) enforce a tokens-per-minute (TPM) throttle
 * that is SEPARATE from the account quota: when several agents hammer the API
 * at once, calls come back with `rate_limit_error` / HTTP 429. pi's built-in
 * auto-retry burns its 3 attempts in a few seconds of exponential backoff — far
 * shorter than the real TPM window — and then the turn dies. A storm can
 * silently kill an agent and the hooman only notices an hour later.
 *
 * Worse, the provider TELLS us exactly when it is safe to retry (the
 * `retry-after` header and the `anthropic-ratelimit-*-reset` RFC3339
 * timestamps). Blind fixed timers either retry far too early (burning more 429s)
 * or far too late (wasting the storm's downtime). This extension leans into that
 * metadata: it reads the real reset window and schedules the next `continue` at
 * the moment the provider said it would clear.
 *
 *   1. VISIBLE — the moment a rate-limit retry begins, the tab-title stage flips
 *      to 🚓 (rate-limited). The icon stays 🚓 until a turn actually succeeds.
 *
 *   2. SURVIVABLE (transient TPM storm) — when the built-in retries are
 *      exhausted on a retryable rate limit, we schedule self-`continue` triggers
 *      starting at the provider's real reset (retry-after / reset headers), with
 *      escalating backstops. Falls back to 30s/60s/120s when no headers are
 *      surfaced (older hosts, non-Anthropic providers, transport errors).
 *
 *      A. Transient TPM storm (retryable) — pi's auto_retry fired and exhausted.
 *         Schedule from the 429 response headers.
 *
 *      B. Quota / usage window (NON-retryable) — e.g. Claude-Code-OAuth
 *         "5-hour usage limit reached". pi deliberately does NOT retry these (it
 *         would loop). We detect them on turn_end and, IF the provider exposed a
 *         reset time, schedule a SINGLE delayed self-continue at/after that
 *         window. No reset metadata → leave it manual (🚓 + notify). We never
 *         reintroduce an immediate retry loop for a hard quota.
 *
 *   3. DIAGNOSABLE — if the scheduled resumes still hit the limit, we stop and
 *      leave 🚓 on the tab plus a desktop notification, so the hooman knows that
 *      session effectively needs hands-on attention.
 *
 * The stage icon is owned by session-tab-title; we drive it through the shared
 * stage-control bus (no hard package dependency).
 *
 * Metadata source: the host preserves a normalized provider error payload
 * (`providerError: { status, headers, errorType }`) on assistant error messages
 * and mirrors it onto the auto_retry_* extension events. The installed
 * @earendil-works/pi-coding-agent type package may predate those fields, so the
 * retry-event and message shapes are narrowed through local types — on an older
 * host the fields are simply absent and we degrade to the fixed fallback.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { requestStage, getActiveStage } from "../../shared/src/stage-control.ts";
import { fireNotification } from "../../shared/src/desktop-notify.ts";
import { relayToHooman } from "../../shared/src/relay-to-hooman.ts";

/**
 * Normalized provider error response metadata, mirrored from the host's
 * AssistantMessage.providerError / auto_retry_* events. Local copy (not imported
 * from the ai package) so the extension stays structurally typed and tolerant of
 * older hosts that emit the payload without declaring the type.
 */
export interface ProviderErrorMeta {
	status?: number;
	headers?: Record<string, string>;
	errorType?: string | null;
}

/** Fired per backoff attempt when the agent loop retries a retryable provider
 *  error. Mirrors the host's AutoRetryStartEvent, plus the additive provider
 *  error metadata field (absent on older hosts). */
interface AutoRetryStartEvent {
	type: "auto_retry_start";
	attempt: number;
	maxAttempts: number;
	delayMs: number;
	errorMessage: string;
	providerError?: ProviderErrorMeta;
}

/** Fired when a retry sequence ends. Mirrors the host's AutoRetryEndEvent. */
interface AutoRetryEndEvent {
	type: "auto_retry_end";
	success: boolean;
	attempt: number;
	finalError?: string;
	providerError?: ProviderErrorMeta;
}

/** turn_end carries the final AgentMessage; we only need a narrow view. */
interface TurnEndMessage {
	stopReason?: string;
	errorMessage?: string;
	providerError?: ProviderErrorMeta;
}

interface TurnEndEvent {
	type: "turn_end";
	message: TurnEndMessage;
}

/**
 * The host runtime exposes `auto_retry_start` / `auto_retry_end` on the
 * extension bus. The installed type package may predate the `providerError`
 * field, so we narrow `pi.on` through this local signature. On a host too old
 * to bridge these events the handlers simply never fire (no runtime error).
 */
type RetryAwareOn = {
	(event: "auto_retry_start", handler: (e: AutoRetryStartEvent, ctx: ExtensionContext) => void): void;
	(event: "auto_retry_end", handler: (e: AutoRetryEndEvent, ctx: ExtensionContext) => void): void;
	(event: "turn_end", handler: (e: TurnEndEvent, ctx: ExtensionContext) => void): void;
};

// ---------------------------------------------------------------------------
// Scheduling primitives — exported for unit tests.
// ---------------------------------------------------------------------------

/** Legacy fixed self-continue schedule (ms) — the fallback when no provider
 *  reset metadata is available. Exported for tests + compatibility. */
export const CONTINUE_DELAYS_MS = [30_000, 60_000, 120_000] as const;

/** Anthropic reset headers, in RFC 3339 format (absolute reset timestamp). */
const ANTHROPIC_RESET_HEADERS = [
	"anthropic-ratelimit-requests-reset",
	"anthropic-ratelimit-tokens-reset",
	"anthropic-ratelimit-input-tokens-reset",
	"anthropic-ratelimit-output-tokens-reset",
] as const;

/** Small buffer added on top of a header-derived delay so we don't retry the
 *  exact instant the window reopens (the provider's estimate can be optimistic
 *  by a second or two, and many panes share the same reset second). */
const GRACE_MS = 2_000;
/** Decision ceiling (NOT a clamp) for a transient (TPM) header-derived delay.
 *  A provider retry-after must NEVER be undercut — an early resume just 429s
 *  again and sticks the session. So a reset at or below this horizon is honored
 *  exactly; a reset exceeding it is suspect (a quota-shaped error
 *  mis-classified as retryable, or garbage) and we DECLINE to auto-continue
 *  (return [] -> manual wake) rather than clamp the reset down into an early
 *  retry. */
const MAX_TRANSIENT_DELAY_MS = 60 * 60_000;
/** Decision ceiling (NOT a clamp) for a quota / usage-window wake. Resets at or
 *  below this are honored with a single delayed wake; beyond it we decline to
 *  auto-continue (manual wake) rather than clamp down. Covers the Claude-Code-OAuth
 *  5-hour rolling window plus slack. */
const MAX_QUOTA_DELAY_MS = 6 * 60 * 60_000;
/** Escalation step for transient backstops after the primary header-derived
 *  resume fails. */
const TRANSIENT_BACKOFF_STEP_MS = 60_000;
/** Max random jitter (ms) added to each header-derived resume so a fleet of
 *  panes sharing the same retry-after don't all fire on the same tick. */
const JITTER_MS = 5_000;

const RATE_LIMITED_STAGE = "rate-limited";
/** Stage to fall back to if we somehow can't read the prior stage. */
const FALLBACK_STAGE = "implementing";

/**
 * Parse the HTTP `retry-after` family into a delay in ms.
 *
 * Precedence (per the rate-limit-recovery spec): `retry-after` first, then
 * `retry-after-ms`. `retry-after` is either integer seconds (Anthropic 429s)
 * or an HTTP-date (RFC 1123). Returns >= 0, or `undefined` when neither header
 * is present or parseable.
 */
export function parseRetryAfterMs(headers: Record<string, string> | undefined, now: number = Date.now()): number | undefined {
	if (!headers) return undefined;
	const retryAfter = headers["retry-after"];
	if (retryAfter) {
		if (/^\d+$/.test(retryAfter)) return Math.max(0, Number(retryAfter) * 1000);
		const parsed = Date.parse(retryAfter);
		if (!Number.isNaN(parsed)) return Math.max(0, parsed - now);
	}
	const retryAfterMs = headers["retry-after-ms"];
	if (retryAfterMs && /^\d+$/.test(retryAfterMs)) return Math.max(0, Number(retryAfterMs));
	return undefined;
}

/**
 * Parse Anthropic's `anthropic-ratelimit-*-reset` headers (RFC 3339 absolute
 * timestamps) into a delay in ms. Returns the LATEST reset across the present
 * headers (the most restrictive bucket that still needs to replenish), clamped
 * to >= 0, or `undefined` when none are present or parseable.
 */
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
		const delay = parsed - now;
		if (delay > maxDelay) maxDelay = delay;
	}
	return maxDelay === -Infinity ? undefined : Math.max(0, maxDelay);
}

/**
 * The single best header-derived "safe to retry" delay, in ms.
 *
 * Precedence: `retry-after` family → Anthropic reset timestamps. Returns
 * `undefined` when the provider surfaced no usable reset information.
 */
export function getPrimaryRateLimitDelayMs(
	providerError: ProviderErrorMeta | undefined,
	now: number = Date.now(),
): number | undefined {
	if (!providerError?.headers) return undefined;
	return parseRetryAfterMs(providerError.headers, now) ?? parseAnthropicResetDelayMs(providerError.headers, now);
}

export interface RecoveryScheduleOptions {
	/** Clock injection for deterministic tests. */
	now?: number;
	/** Schedule used when no header-derived primary exists (transient mode).
	 *  Defaults to {@link CONTINUE_DELAYS_MS}. */
	fallback?: readonly number[];
	/** Buffer added to a header-derived primary. Defaults to {@link GRACE_MS}. */
	graceMs?: number;
	/** Clamp for the primary delay. Defaults to {@link MAX_TRANSIENT_DELAY_MS}. */
	maxDelayMs?: number;
	/** Max jitter (ms) per header-derived resume. 0 disables. Defaults to {@link JITTER_MS}. */
	jitterMs?: number;
	/** RNG injection for deterministic tests. Defaults to Math.random. */
	rng?: () => number;
	/** transient = primary + escalating backstops; quota = single primary or none. */
	mode?: "transient" | "quota";
}

function jitter(rng: () => number, jitterMs: number): number {
	if (jitterMs <= 0) return 0;
	return Math.floor(rng() * (jitterMs + 1));
}

/**
 * Build the full self-continue schedule (ms) for a rate-limit episode.
 *
 * Hard rule: a scheduled resume is NEVER earlier than the provider-stated
 * reset + grace. An early resume just 429s again and sticks the session, so
 * the ceiling is a DECISION threshold, never a downward clamp.
 *
 * - transient (TPM storm): if a header-derived primary exists and is at/below
 *   the ceiling, honor it exactly (+ grace + jitter) with two escalating
 *   backstops AFTER it. No headers -> legacy fixed fallback (verbatim, no
 *   jitter). Primary above the ceiling -> [] (decline; manual wake).
 * - quota (usage window): a SINGLE wake at primary + grace (+ jitter) when at/below
 *   the ceiling; [] (manual) when no reset metadata OR the reset exceeds the
 *   ceiling. Single wake only — we never loop on a hard quota.
 */
export function getRateLimitRecoveryDelaysMs(
	providerError: ProviderErrorMeta | undefined,
	options: RecoveryScheduleOptions = {},
): number[] {
	const now = options.now ?? Date.now();
	const fallback = options.fallback ?? CONTINUE_DELAYS_MS;
	const graceMs = options.graceMs ?? GRACE_MS;
	const mode = options.mode ?? "transient";
	// The auto-wake horizon depends on the episode kind: a transient TPM storm
	// should never ask for more than an hour, but a quota / usage window (e.g. the
	// 5-hour rolling limit) legitimately needs hours.
	const maxDelayMs = options.maxDelayMs ?? (mode === "quota" ? MAX_QUOTA_DELAY_MS : MAX_TRANSIENT_DELAY_MS);
	const jitterMs = options.jitterMs ?? JITTER_MS;
	const rng = options.rng ?? Math.random;

	const primary = getPrimaryRateLimitDelayMs(providerError, now);

	// No provider reset metadata: quota stays manual; transient falls back to the
	// legacy fixed schedule (hosts/providers without structured headers).
	if (primary == null) return mode === "quota" ? [] : [...fallback];

	// The horizon is a DECISION threshold, never a downward clamp. A provider
	// reset must never be undercut (an early resume 429s and sticks the session),
	// so when the stated reset exceeds the sane auto-wake horizon we DECLINE to
	// auto-continue and let the hooman resume manually — we do NOT clamp it down.
	if (primary > maxDelayMs) return [];

	// Honor the provider reset exactly: first delay is always >= primary + grace.
	const base = primary + graceMs;
	if (mode === "quota") return [base + jitter(rng, jitterMs)];
	return [0, TRANSIENT_BACKOFF_STEP_MS, 2 * TRANSIENT_BACKOFF_STEP_MS].map(
		(step) => base + step + jitter(rng, jitterMs),
	);
}

/** Match a retryable provider rate-limit / throttle error message. Exported for tests. */
export function isRateLimit(message: string | undefined): boolean {
	if (!message) return false;
	return /rate.?limit|\b429\b|too many requests|tpm|throttl|quota.*exceeded.*per/i.test(message);
}

/**
 * Match a NON-retryable provider quota / usage-window error — the patterns pi's
 * built-in retry deliberately skips (it would loop into the same broken state).
 * Mirrors the host's non-retryable limit classifier so this extension can spot
 * them on turn_end and (if a reset time is known) schedule a single delayed wake
 * instead of an immediate retry loop.
 *
 * Exported for tests.
 */
export function isQuotaLimit(message: string | undefined): boolean {
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

/** Human-readable hint for a delay in ms ("in 62s", "in 4.0m", "in 3.5h"). */
function describeDelay(ms: number): string {
	if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
	if (ms < 60 * 60_000) return `${(ms / 60_000).toFixed(1)}m`;
	return `${(ms / (60 * 60_000)).toFixed(1)}h`;
}

export default function rateLimitRecovery(pi: ExtensionAPI): void {
	let ctx: ExtensionContext | null = null;
	// True while we are in a rate-limit episode (tab shows 🚓).
	let active = false;
	// Stage to restore when the storm clears. Captured once per episode.
	let priorStage: string | null = null;
	// True once this episode's self-continue timers are armed (so a repeated
	// failure inside the same episode doesn't re-arm and loop forever).
	let scheduled = false;
	// Latest captured provider error metadata for the active episode.
	let episodeProviderError: ProviderErrorMeta | undefined;
	let timers: ReturnType<typeof setTimeout>[] = [];

	const clearTimers = (): void => {
		for (const t of timers) clearTimeout(t);
		timers = [];
	};

	/** Current model id for hooman-facing Telegram messages (best-effort). */
	const modelName = (): string => ctx?.model?.id ?? "the model";

	/**
	 * Enter (or stay in) the rate-limited state and flip the tab icon to 🚓.
	 * Always refreshes the captured providerError for the episode; only notifies
	 * + captures the prior stage on first entry.
	 */
	const enterRateLimited = (providerError?: ProviderErrorMeta): void => {
		if (providerError) episodeProviderError = providerError;
		if (!active) {
			active = true;
			const cur = getActiveStage();
			priorStage = cur && cur !== RATE_LIMITED_STAGE ? cur : FALLBACK_STAGE;
			relayToHooman("🚓 rate-limited on " + modelName() + " — pi is retrying.");
		}
		requestStage(RATE_LIMITED_STAGE);
	};

	/** Arm the self-continue triggers for the active episode. Fires once per
	 *  episode (idempotent via `scheduled`). */
	const scheduleContinues = (
		providerError: ProviderErrorMeta | undefined,
		mode: "transient" | "quota",
	): void => {
		if (scheduled) return;
		scheduled = true;
		clearTimers();
		// Prefer the freshly-arrived metadata; fall back to whatever we captured
		// earlier in the episode (e.g. auto_retry_start) so a host that only emits
		// providerError on the start event still schedules from real headers.
		const effectiveProviderError = providerError ?? episodeProviderError;
		const delays = getRateLimitRecoveryDelaysMs(effectiveProviderError, { mode });

		if (delays.length === 0) {
			// No schedule to arm — either there is no reset metadata, or the
			// provider-stated reset exceeds the sane auto-wake horizon (declined
			// rather than undercut into an early retry that would 429). Do not loop;
			// surface a manual wake loudly for BOTH modes.
			try {
				ctx?.ui?.notify?.(
					"🚓 Quota / usage window reached and no provider reset time is known. This session needs a manual wake.",
					"warning",
				);
			} catch { /* stale ctx — non-fatal */ }
			fireNotification({
				title: "🚓 Manual wake needed",
				body: "Rate limit with no schedulable reset time (none known, or beyond the auto-wake horizon). Resume by hand.",
			});
			relayToHooman("🚓 " + modelName() + ": rate limit with no known reset time — needs a manual wake, or switch me to another model.");
			return;
		}

		const first = delays[0];
		fireNotification({
			title: mode === "quota" ? "🚓 Quota window — auto-resume scheduled" : "🚓 Rate limited",
			body:
				mode === "quota"
					? `Usage window hit. Auto-resuming in ${describeDelay(first)} (provider reset).`
					: `Provider TPM storm — auto-resuming in ${describeDelay(first)}${delays.length > 1 ? ` then ${describeDelay(delays[delays.length - 1] - first)} later` : ""}.`,
		});

		relayToHooman((mode === "quota" ? "🚓 quota/usage window on " : "🚓 rate-limited on ") + modelName() + " — auto-resuming in " + describeDelay(first) + ".");
		delays.forEach((delay, i) => {
			const t = setTimeout(() => {
				// Still throttled when this fires — nudge the agent to retry.
				if (!active) return;
				try {
					pi.sendUserMessage("continue", { deliverAs: "followUp" });
				} catch {
					/* idle send may race; non-fatal */
				}
				// After the last attempt, if we're still here the session is stuck.
				if (i === delays.length - 1) {
					const t2 = setTimeout(() => {
						if (!active) return;
						// ctx may be stale after a reload/session replacement during a long
						// quota window; guard the UI notify. Desktop notify always fires.
						try {
							ctx?.ui?.notify?.(
								`🚓 Still rate-limited after ${describeDelay(delay)} of auto-retries — this session may be stuck.`,
								"warning",
							);
						} catch { /* stale ctx — non-fatal, desktop notify still fires */ }
						fireNotification({
							title: "🚓 Session may be dead",
							body: `Still rate-limited after ${describeDelay(delay)} of auto-resumes. Needs attention.`,
						});
						relayToHooman("🚓 " + modelName() + ": still rate-limited after auto-resumes — may be stuck. Consider switching me to another model.");
					}, 5_000);
					timers.push(t2);
				}
			}, delay);
			timers.push(t);
		});
	};

	/** Clear the rate-limit episode and restore the prior tab stage. */
	const recover = (): void => {
		if (!active) return;
		active = false;
		relayToHooman("✅ recovered on " + modelName() + ".");
		scheduled = false;
		episodeProviderError = undefined;
		clearTimers();
		requestStage(priorStage ?? FALLBACK_STAGE);
		priorStage = null;
	};

	const onRetry = pi.on.bind(pi) as unknown as RetryAwareOn;

	pi.on("session_start", (_event, c) => {
		ctx = c;
	});

	// A retry began. If it's a rate limit, show 🚓 immediately (early signal) and
	// capture the provider error metadata, but don't schedule self-continues yet
	// — the built-in retries may still recover.
	onRetry("auto_retry_start", (event) => {
		if (isRateLimit(event.errorMessage)) enterRateLimited(event.providerError);
	});

	// A retry sequence ended.
	onRetry("auto_retry_end", (event) => {
		if (event.success) {
			// Built-in retry recovered the turn — clear 🚓.
			recover();
			return;
		}
		// Retries exhausted. If it was a rate limit, hold 🚓 and arm the
		// header-aware self-continue schedule to outlast the TPM window.
		if (isRateLimit(event.finalError)) {
			enterRateLimited(event.providerError);
			scheduleContinues(event.providerError, "transient");
		}
	});

	// A turn completed. Used both to detect recovery (a real assistant reply
	// clears any episode) AND to detect Case B: a NON-retryable quota / usage
	// window error that pi's built-in retry deliberately did not retry.
	onRetry("turn_end", (event) => {
		const message = event.message ?? {};
		if (message.stopReason !== "error") {
			// Non-error turn → the provider answered; any rate-limit episode is over.
			recover();
			return;
		}
		// Error turn.
		if (active) {
			// A Case A (transient) episode is in progress; auto_retry_end already
			// armed the schedule. Don't double-schedule.
			return;
		}
		// Not already in an episode. Only the QUOTA / usage-window case is handled
		// here: those are non-retryable, so pi emits no auto_retry_* for them —
		// turn_end is the only signal. A plain TRANSIENT rate limit is NOT handled
		// here even if it reaches turn_end un-retried: pi emits turn_end during
		// agent.prompt(), BEFORE _handlePostAgentRun decides to retry, so scheduling
		// transient here would arm self-continues while pi's built-in backoff is
		// still running (and for a small retry-after, fire a spurious continue
		// mid-retry). Transient recovery stays exclusively on the auto_retry path.
		if (isQuotaLimit(message.errorMessage)) {
			enterRateLimited(message.providerError);
			scheduleContinues(message.providerError, "quota");
		}
	});
}
