/**
 * pi-rate-limit-recovery
 *
 * Anthropic (and other providers) enforce a tokens-per-minute (TPM) throttle
 * that is SEPARATE from the account quota: when several agents hammer the API
 * at once, calls come back with `rate_limit_error` / HTTP 429. pi's built-in
 * auto-retry burns its 3 attempts in a few seconds of exponential backoff —
 * far shorter than the ~60s TPM window — and then the turn dies with
 * "Retry failed after 3 attempts". A storm can silently kill an agent and the
 * hooman only notices an hour later.
 *
 * This extension makes a TPM storm survivable and visible:
 *
 *   1. VISIBLE — the moment a rate-limit retry begins, the tab-title stage flips
 *      to 🚓 (rate-limited). The hooman can scan a wall of panes and see which
 *      agents are throttled. The icon stays 🚓 until a turn actually succeeds.
 *
 *   2. SURVIVABLE — when the built-in retries are exhausted on a rate limit,
 *      we schedule three "continue" follow-up triggers at 30s, 60s and 120s.
 *      Each restarts the agent's turn, re-issuing the provider call once the
 *      TPM window has had time to clear. The first one that succeeds clears 🚓
 *      and cancels the rest.
 *
 *   3. DIAGNOSABLE — if all three self-continues still hit the limit (~2min of
 *      sustained throttling), we stop retrying and leave 🚓 on the tab plus a
 *      desktop notification, so the hooman knows that session is effectively
 *      dead and needs hands-on attention.
 *
 * The stage icon is owned by session-tab-title; we drive it through the shared
 * stage-control bus (no hard package dependency).
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { requestStage, getActiveStage } from "../../shared/src/stage-control.ts";
import { fireNotification } from "../../shared/src/desktop-notify.ts";

/** Fired per backoff attempt when the agent loop retries a retryable provider
 *  error. Mirrors the host's AutoRetryStartEvent. */
interface AutoRetryStartEvent {
	type: "auto_retry_start";
	attempt: number;
	maxAttempts: number;
	delayMs: number;
	errorMessage: string;
}

/** Fired when a retry sequence ends. Mirrors the host's AutoRetryEndEvent. */
interface AutoRetryEndEvent {
	type: "auto_retry_end";
	success: boolean;
	attempt: number;
	finalError?: string;
}

/**
 * The host runtime exposes `auto_retry_start` / `auto_retry_end` on the
 * extension bus (added in the pi-coding-agent build that bridged retry
 * lifecycle events). The installed @earendil-works/pi-coding-agent type
 * package predates them, so we narrow `pi.on` through this local signature —
 * same approach the reload extension uses for the newer `pi.reload()`. If the
 * host is too old, these handlers simply never fire (no runtime error).
 */
type RetryAwareOn = {
	(event: "auto_retry_start", handler: (e: AutoRetryStartEvent, ctx: ExtensionContext) => void): void;
	(event: "auto_retry_end", handler: (e: AutoRetryEndEvent, ctx: ExtensionContext) => void): void;
};

/** Self-continue schedule (ms from the moment retries are exhausted). Exported for tests. */
export const CONTINUE_DELAYS_MS = [30_000, 60_000, 120_000] as const;
const RATE_LIMITED_STAGE = "rate-limited";
/** Stage to fall back to if we somehow can't read the prior stage. */
const FALLBACK_STAGE = "implementing";

/** Match a provider rate-limit / throttle error message. Exported for tests. */
export function isRateLimit(message: string | undefined): boolean {
	if (!message) return false;
	return /rate.?limit|\b429\b|too many requests|tpm|throttl|quota.*exceeded.*per/i.test(message);
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
	let timers: ReturnType<typeof setTimeout>[] = [];

	const clearTimers = (): void => {
		for (const t of timers) clearTimeout(t);
		timers = [];
	};

	/** Enter (or stay in) the rate-limited state and flip the tab icon to 🚓. */
	const enterRateLimited = (): void => {
		if (!active) {
			active = true;
			// Capture the stage we were in so we can restore it on recovery.
			const cur = getActiveStage();
			priorStage = cur && cur !== RATE_LIMITED_STAGE ? cur : FALLBACK_STAGE;
			fireNotification({
				title: "🚓 Rate limited",
				body: "Provider TPM storm — auto-resuming at 30s / 60s / 120s.",
			});
		}
		requestStage(RATE_LIMITED_STAGE);
	};

	/** Arm the three self-continue triggers. Only fires once per episode. */
	const scheduleContinues = (): void => {
		if (scheduled) return;
		scheduled = true;
		clearTimers();
		CONTINUE_DELAYS_MS.forEach((delay, i) => {
			const t = setTimeout(() => {
				// Still throttled when this fires — nudge the agent to retry.
				if (!active) return;
				try {
					pi.sendUserMessage("continue", { deliverAs: "followUp" });
				} catch {
					/* idle send may race; non-fatal */
				}
				// After the last attempt, if we're still here the session is stuck.
				if (i === CONTINUE_DELAYS_MS.length - 1) {
					const t2 = setTimeout(() => {
						if (!active) return;
						// ctx is a long-lived module capture; if a reload/session
						// replacement happened during this 2-min window it is STALE and
						// ctx.ui.notify would throw the stale-ctx guard inside the timer.
						// Guard it — fireNotification (desktop) is the real signal and
						// doesn't touch ctx.
						try {
							ctx?.ui?.notify?.(
								"🚓 Still rate-limited after 2 min of auto-retries — this session may be stuck.",
								"warning",
							);
						} catch { /* stale ctx after reload — non-fatal, desktop notify still fires */ }
						fireNotification({
							title: "🚓 Session may be dead",
							body: "Still rate-limited after 2 min of auto-resumes. Needs attention.",
						});
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
		scheduled = false;
		clearTimers();
		requestStage(priorStage ?? FALLBACK_STAGE);
		priorStage = null;
	};

	const onRetry = pi.on.bind(pi) as unknown as RetryAwareOn;

	pi.on("session_start", (_event, c) => {
		ctx = c;
	});

	// A retry began. If it's a rate limit, show 🚓 immediately (early signal),
	// but don't schedule self-continues yet — the built-in retries may recover.
	onRetry("auto_retry_start", (event) => {
		if (isRateLimit(event.errorMessage)) enterRateLimited();
	});

	// A retry sequence ended.
	onRetry("auto_retry_end", (event) => {
		if (event.success) {
			// Built-in retry recovered the turn — clear 🚓.
			recover();
			return;
		}
		// Retries exhausted. If it was a rate limit, hold 🚓 and arm the longer
		// self-continue schedule to outlast the TPM window.
		if (isRateLimit(event.finalError)) {
			enterRateLimited();
			scheduleContinues();
		}
	});

	// A turn completed with a real (non-error) assistant message — the provider
	// answered, so any rate-limit episode is over.
	pi.on("turn_end", (event) => {
		if (!active) return;
		const stopReason = (event.message as { stopReason?: string })?.stopReason;
		if (stopReason !== "error") recover();
	});
}
