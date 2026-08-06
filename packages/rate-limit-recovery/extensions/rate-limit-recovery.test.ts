import { describe, test, expect } from "bun:test";
import {
	isRateLimit,
	isQuotaLimit,
	CONTINUE_DELAYS_MS,
	parseRetryAfterMs,
	parseAnthropicResetDelayMs,
	getPrimaryRateLimitDelayMs,
	getRateLimitRecoveryDelaysMs,
} from "../extensions/rate-limit-recovery.ts";
import {
	registerStageController,
	requestStage,
	getActiveStage,
} from "../../shared/src/stage-control.ts";

const NOW = 1_700_000_000_000; // fixed epoch for deterministic parse tests

describe("isRateLimit", () => {
	test("matches Anthropic rate_limit_error payload shapes", () => {
		expect(isRateLimit("Rate limited")).toBe(true);
		expect(isRateLimit("rate_limit_error")).toBe(true);
		expect(isRateLimit('{"type":"error","error":{"type":"rate_limit_error","message":"Rate limited"}}')).toBe(true);
		expect(isRateLimit("Retry failed after 3 attempts: rate_limit_error")).toBe(true);
	});

	test("matches generic throttle / 429 / TPM phrasing", () => {
		expect(isRateLimit("HTTP 429 Too Many Requests")).toBe(true);
		expect(isRateLimit("request was throttled")).toBe(true);
		expect(isRateLimit("TPM limit exceeded")).toBe(true);
	});

	test("does NOT match unrelated errors", () => {
		expect(isRateLimit("connection reset by peer")).toBe(false);
		expect(isRateLimit("invalid api key")).toBe(false);
		expect(isRateLimit("500 internal server error")).toBe(false);
		expect(isRateLimit("context window exceeded")).toBe(false);
	});

	test("undefined / empty is not a rate limit", () => {
		expect(isRateLimit(undefined)).toBe(false);
		expect(isRateLimit("")).toBe(false);
	});
});

describe("isQuotaLimit", () => {
	test("matches Anthropic Claude-Code-OAuth 5-hour window + tier quota phrasing", () => {
		expect(isQuotaLimit("Error: 429 5-hour usage limit reached. Please try again later.")).toBe(true);
		expect(isQuotaLimit("5 hour usage limit reached")).toBe(true);
		expect(isQuotaLimit("usage limit reached for your subscription")).toBe(true);
		expect(isQuotaLimit("insufficient credit balance to complete this request")).toBe(true);
		expect(isQuotaLimit("insufficient credits remaining on your account")).toBe(true);
		expect(isQuotaLimit("plan limit reached for the free tier")).toBe(true);
		expect(isQuotaLimit("account limit reached, please upgrade")).toBe(true);
		expect(isQuotaLimit("usage cap exceeded for this billing period")).toBe(true);
	});

	test("matches other provider quota / billing markers", () => {
		expect(isQuotaLimit("GoUsageLimitError: limit reached")).toBe(true);
		expect(isQuotaLimit("FreeUsageLimitError")).toBe(true);
		expect(isQuotaLimit("insufficient_quota")).toBe(true);
		expect(isQuotaLimit("quota exceeded")).toBe(true);
	});

	test("does NOT match a transient TPM rate-limit error", () => {
		// A genuine retryable rate limit must stay transient, not be mis-classified
		// as a hard quota window.
		expect(isQuotaLimit("429 rate_limit_error: too many requests")).toBe(false);
		expect(isQuotaLimit("Number of request tokens has exceeded your per-minute rate limit")).toBe(false);
	});

	test("undefined / empty is not a quota limit", () => {
		expect(isQuotaLimit(undefined)).toBe(false);
		expect(isQuotaLimit("")).toBe(false);
	});
});

describe("parseRetryAfterMs", () => {
	test("parses integer seconds", () => {
		expect(parseRetryAfterMs({ "retry-after": "60" }, NOW)).toBe(60_000);
		expect(parseRetryAfterMs({ "retry-after": "0" }, NOW)).toBe(0);
	});

	test("parses an HTTP-date (RFC 1123)", () => {
		const target = new Date(NOW + 30_000).toUTCString();
		expect(parseRetryAfterMs({ "retry-after": target }, NOW)).toBe(30_000);
	});

	test("parses retry-after-ms (integer milliseconds)", () => {
		expect(parseRetryAfterMs({ "retry-after-ms": "5000" }, NOW)).toBe(5_000);
	});

	test("retry-after takes precedence over retry-after-ms", () => {
		expect(parseRetryAfterMs({ "retry-after": "60", "retry-after-ms": "5000" }, NOW)).toBe(60_000);
	});

	test("a past HTTP-date clamps to 0", () => {
		const past = new Date(NOW - 10_000).toUTCString();
		expect(parseRetryAfterMs({ "retry-after": past }, NOW)).toBe(0);
	});

	test("missing / invalid / undefined headers return undefined", () => {
		expect(parseRetryAfterMs(undefined, NOW)).toBe(undefined);
		expect(parseRetryAfterMs({}, NOW)).toBe(undefined);
		expect(parseRetryAfterMs({ "retry-after": "soon" }, NOW)).toBe(undefined);
	});
});

describe("parseAnthropicResetDelayMs", () => {
	test("returns the latest (most restrictive) reset across buckets", () => {
		const headers = {
			"anthropic-ratelimit-requests-reset": new Date(NOW + 60_000).toISOString(),
			"anthropic-ratelimit-tokens-reset": new Date(NOW + 90_000).toISOString(),
			"anthropic-ratelimit-input-tokens-reset": new Date(NOW + 45_000).toISOString(),
		};
		expect(parseAnthropicResetDelayMs(headers, NOW)).toBe(90_000);
	});

	test("handles a single reset header", () => {
		const headers = { "anthropic-ratelimit-tokens-reset": new Date(NOW + 30_000).toISOString() };
		expect(parseAnthropicResetDelayMs(headers, NOW)).toBe(30_000);
	});

	test("clamps a reset in the past to 0", () => {
		const headers = { "anthropic-ratelimit-requests-reset": new Date(NOW - 5_000).toISOString() };
		expect(parseAnthropicResetDelayMs(headers, NOW)).toBe(0);
	});

	test("missing / invalid / undefined return undefined", () => {
		expect(parseAnthropicResetDelayMs(undefined, NOW)).toBe(undefined);
		expect(parseAnthropicResetDelayMs({}, NOW)).toBe(undefined);
		expect(parseAnthropicResetDelayMs({ "anthropic-ratelimit-tokens-reset": "not-a-date" }, NOW)).toBe(undefined);
	});
});

describe("getPrimaryRateLimitDelayMs", () => {
	test("retry-after wins over anthropic reset", () => {
		const providerError = {
			status: 429,
			headers: {
				"retry-after": "20",
				"anthropic-ratelimit-tokens-reset": new Date(NOW + 90_000).toISOString(),
			},
		};
		// retry-after (20s) is the earliest-safe-retry; reset (90s) is full replenish.
		// For an immediate built-in retry, retry-after wins.
		expect(getPrimaryRateLimitDelayMs(providerError, NOW)).toBe(20_000);
	});

	test("falls back to anthropic reset when no retry-after", () => {
		const providerError = {
			status: 429,
			headers: { "anthropic-ratelimit-tokens-reset": new Date(NOW + 90_000).toISOString() },
		};
		expect(getPrimaryRateLimitDelayMs(providerError, NOW)).toBe(90_000);
	});

	test("undefined when no headers / no providerError", () => {
		expect(getPrimaryRateLimitDelayMs(undefined, NOW)).toBe(undefined);
		expect(getPrimaryRateLimitDelayMs({ status: 429 }, NOW)).toBe(undefined);
		expect(getPrimaryRateLimitDelayMs({ status: 429, headers: {} }, NOW)).toBe(undefined);
	});
});

describe("getRateLimitRecoveryDelaysMs (transient)", () => {
	// Deterministic: no jitter (rng always 0), fixed clock.
	const opts = { now: NOW, jitterMs: 0, rng: () => 0 } as const;

	test("retry-after 60 -> grace-padded primary + two escalating backstops", () => {
		// primary 60s + 2s grace = 62s; then +60s, +120s.
		const delays = getRateLimitRecoveryDelaysMs(
			{ status: 429, headers: { "retry-after": "60" } },
			opts,
		);
		expect(delays).toEqual([62_000, 122_000, 182_000]);
	});

	test("retry-after HTTP date -> parsed delay", () => {
		const delays = getRateLimitRecoveryDelaysMs(
			{
				status: 429,
				headers: { "retry-after": new Date(NOW + 30_000).toUTCString() },
			},
			opts,
		);
		expect(delays).toEqual([32_000, 92_000, 152_000]);
	});

	test("anthropic reset headers -> selected reset delay", () => {
		const delays = getRateLimitRecoveryDelaysMs(
			{
				status: 429,
				headers: {
					"anthropic-ratelimit-requests-reset": new Date(NOW + 60_000).toISOString(),
					"anthropic-ratelimit-tokens-reset": new Date(NOW + 90_000).toISOString(),
				},
			},
			opts,
		);
		// max reset 90s + 2s grace.
		expect(delays).toEqual([92_000, 152_000, 212_000]);
	});

	test("missing / invalid headers -> legacy fixed fallback schedule", () => {
		expect(getRateLimitRecoveryDelaysMs(undefined, opts)).toEqual([30_000, 60_000, 120_000]);
		expect(getRateLimitRecoveryDelaysMs({ status: 429, headers: {} }, opts)).toEqual([
			30_000, 60_000, 120_000,
		]);
	});

	test("transient retry-after is honored exactly — never undercut (spec)", () => {
		// retry-after 600s (10min) must schedule at ~602s first, NOT clamped down.
		// Clamping below the provider's reset would make every scheduled resume 429
		// again and stick the session in a dead loop.
		const delays = getRateLimitRecoveryDelaysMs(
			{ status: 429, headers: { "retry-after": "600" } },
			opts,
		);
		expect(delays).toEqual([602_000, 662_000, 722_000]);
	});

	test("transient retry-after above the ceiling DECLINES to manual (never undercuts the reset)", () => {
		// A 2h retry-after exceeds the 1h transient horizon. Clamping it down would
		// retry early and 429; instead we decline to auto-continue (manual wake).
		const delays = getRateLimitRecoveryDelaysMs(
			{ status: 429, headers: { "retry-after": "7200" } },
			opts,
		);
		expect(delays).toEqual([]);
	});

	test("transient: the first resume is NEVER earlier than primary + grace (spec guarantee)", () => {
		// Across the whole honored range (up to the 1h ceiling), the first delay is
		// always >= primary + grace. Jitter stubbed to 0.
		for (const retryAfter of ["5", "30", "60", "600", "3000", "3599"]) {
			const primary = Number(retryAfter) * 1000;
			const delays = getRateLimitRecoveryDelaysMs(
				{ status: 429, headers: { "retry-after": retryAfter } },
				opts,
			);
			expect(delays.length).toBeGreaterThan(0);
			expect(delays[0]).toBeGreaterThanOrEqual(primary + 2000);
		}
	});

	test("jitter is applied per delay via the injected rng", () => {
		const delays = getRateLimitRecoveryDelaysMs(
			{ status: 429, headers: { "retry-after": "60" } },
			{ now: NOW, jitterMs: 5_000, rng: () => 0.5 },
		);
		// jitter = floor(0.5 * (5000 + 1)) = 2500, added to each delay.
		expect(delays).toEqual([62_000 + 2_500, 122_000 + 2_500, 182_000 + 2_500]);
	});
});

describe("getRateLimitRecoveryDelaysMs (quota)", () => {
	const opts = { now: NOW, jitterMs: 0, rng: () => 0, mode: "quota" as const };

	test("a known reset -> a SINGLE wake at reset + grace", () => {
		const delays = getRateLimitRecoveryDelaysMs(
			{
				status: 429,
				headers: { "retry-after": "300" },
			},
			opts,
		);
		expect(delays).toEqual([300_000 + 2_000]);
	});

	test("a large window (5h) is honored up to the quota cap", () => {
		const fiveHours = 5 * 60 * 60_000;
		const delays = getRateLimitRecoveryDelaysMs(
			{
				status: 429,
				headers: { "anthropic-ratelimit-tokens-reset": new Date(NOW + fiveHours).toISOString() },
			},
			opts,
		);
		expect(delays).toEqual([fiveHours + 2_000]);
	});

	test("a window beyond the ceiling DECLINES to manual (never clamps the reset down)", () => {
		const tenHours = 10 * 60 * 60_000;
		const delays = getRateLimitRecoveryDelaysMs(
			{
				status: 429,
				headers: { "anthropic-ratelimit-tokens-reset": new Date(NOW + tenHours).toISOString() },
			},
			opts,
		);
		// Exceeds MAX_QUOTA_DELAY_MS -> decline (manual), NOT clamped to 6h (that would undercut).
		expect(delays).toEqual([]);
	});

	test("no reset metadata -> empty schedule (manual wake, no loop)", () => {
		expect(getRateLimitRecoveryDelaysMs(undefined, opts)).toEqual([]);
		expect(getRateLimitRecoveryDelaysMs({ status: 429, headers: {} }, opts)).toEqual([]);
	});
});

describe("self-continue schedule (legacy fallback export)", () => {
	test("CONTINUE_DELAYS_MS is the documented 30s / 60s / 120s", () => {
		expect(CONTINUE_DELAYS_MS).toEqual([30_000, 60_000, 120_000]);
	});
});

describe("stage-control bus", () => {
	test("requestStage routes through the registered controller; getActiveStage reads it", () => {
		let stage = "implementing";
		registerStageController({ setStage: (s) => { stage = s; }, getStage: () => stage });
		expect(getActiveStage()).toBe("implementing");
		requestStage("rate-limited");
		expect(stage).toBe("rate-limited");
		expect(getActiveStage()).toBe("rate-limited");
	});
});


// Stubbed-timer integration tests for the episode state machine. These drive the
// default export end-to-end and validate the scheduling DECISION (Didier's
// "non-rate-limit error -> no schedule" requirement), not just the pure parsers.
describe("episode state machine", () => {
	type Handler = (event: unknown, ctx: unknown) => void;
	function makeHarness() {
		const handlers: Record<string, Handler> = {};
		const sent: string[] = [];
		// Capture scheduled delays without actually waiting (so no continue is sent,
		// no trailing notifies fire during the test).
		const scheduled: number[] = [];
		const realSetTimeout = globalThis.setTimeout;
		const realRandom = Math.random;
		const pi = {
			on: (event: string, handler: Handler) => {
				handlers[event] = handler;
			},
			sendUserMessage: (msg: string) => {
				sent.push(msg);
			},
		};
		return {
			pi,
			start(ext: { default: (pi: unknown) => void }): void {
				ext.default(pi);
			},
			fire(event: string, payload: unknown): void {
				handlers[event]?.(payload, {});
			},
			sent,
			installStubs(): void {
				globalThis.setTimeout = ((fn: () => void, ms: number) => {
					scheduled.push(ms);
					return 0 as unknown as ReturnType<typeof setTimeout>;
				}) as unknown as typeof setTimeout;
				Math.random = () => 0; // deterministic jitter (0)
			},
			restore(): void {
				globalThis.setTimeout = realSetTimeout;
				Math.random = realRandom;
			},
			scheduled,
		};
	}

	test("emits exactly one structured Telegram relay across auto_retry_start -> turn_end(error) -> auto_retry_end(false)", () => {
		const h = makeHarness();
		const relays: Array<{ sessionId: string; text: string }> = [];
		const priorMesh = (globalThis as { __piMesh?: unknown }).__piMesh;
		process.env.HOOMAN_MESH_ID = "rate-limit-episode-test-hooman";
		(globalThis as { __piMesh?: { tell: (sessionId: string, text: string) => void } }).__piMesh = {
			tell: (sessionId, text) => relays.push({ sessionId, text }),
		};
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("auto_retry_start", {
				type: "auto_retry_start", attempt: 1, maxAttempts: 3, delayMs: 2_000,
				errorMessage: "429 rate_limit_error", providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			h.fire("turn_end", {
				type: "turn_end",
				message: { stopReason: "error", errorMessage: "429 rate_limit_error", providerError: { status: 429, headers: { "retry-after": "60" } } },
			});
			h.fire("auto_retry_end", {
				type: "auto_retry_end", success: false, attempt: 3,
				finalError: "429 rate_limit_error", providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			expect(relays).toHaveLength(1);
			expect(relays[0]?.sessionId).toBe("rate-limit-episode-test-hooman");
			expect(relays[0]?.text).toContain("rate-limited");
			expect(h.scheduled).toEqual([62_000, 122_000, 182_000]);
		} finally {
			h.restore();
			(globalThis as { __piMesh?: unknown }).__piMesh = priorMesh;
		}
	});


	test("transient rate-limit exhaustion schedules header-derived continues", () => {
		const h = makeHarness();
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("auto_retry_start", {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 2000,
				errorMessage: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			h.fire("auto_retry_end", {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			// retry-after 60 + 2s grace, then +60s, +120s (jitter stubbed to 0).
			expect(h.scheduled).toEqual([62_000, 122_000, 182_000]);
		} finally {
			h.restore();
		}
	});

	test("non-rate-limit error schedules NOTHING", () => {
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("auto_retry_start", {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 2000,
				errorMessage: "connection reset by peer",
			});
			h.fire("auto_retry_end", {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "connection reset by peer",
			});
			expect(h.scheduled.length).toBe(0);
			expect(h.sent.length).toBe(0);
		} finally {
			h.restore();
		}
	});

	test("quota window with no reset metadata schedules NOTHING (no loop)", () => {
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			// A 5-hour usage limit with no headers surfaces on turn_end (pi did not retry it).
			h.fire("turn_end", {
				type: "turn_end",
				message: {
					stopReason: "error",
					errorMessage: "Error: 429 5-hour usage limit reached. Please try again later.",
					// No providerError.headers -> no reset time known.
				},
			});
			expect(h.scheduled.length).toBe(0);
			expect(h.sent.length).toBe(0);
		} finally {
			h.restore();
		}
	});

	test("quota window WITH a reset schedules a single delayed wake", () => {
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("turn_end", {
				type: "turn_end",
				message: {
					stopReason: "error",
					errorMessage: "Error: 429 5-hour usage limit reached.",
					providerError: { status: 429, headers: { "retry-after": "300" } },
				},
			});
			// Single wake at retry-after 300 + 2s grace (quota mode, jitter stubbed to 0).
			expect(h.scheduled).toEqual([302_000]);
		} finally {
			h.restore();
		}
	});

	test("transient rate limit on turn_end ALONE does NOT schedule (handled by auto_retry)", () => {
		// pi emits turn_end DURING agent.prompt(), BEFORE _handlePostAgentRun emits
		// auto_retry. A transient rate limit reaching turn_end must not arm
		// self-continues here — that would fire premature/spurious continues while
		// pi's built-in backoff is still running. Transient recovery is the
		// auto_retry path's job.
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("turn_end", {
				type: "turn_end",
				message: {
					stopReason: "error",
					errorMessage: "429 rate_limit_error: too many requests",
					providerError: { status: 429, headers: { "retry-after": "60" } },
				},
			});
			expect(h.scheduled.length).toBe(0);
			expect(h.sent.length).toBe(0);
		} finally {
			h.restore();
		}
	});

	test("real event ordering: auto_retry_start -> turn_end(error) -> auto_retry_end(false) schedules ONCE", () => {
		// The host fires turn_end before the exhausted auto_retry_end. The episode
		// must schedule exactly once (at auto_retry_end), not twice and not zero times.
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("auto_retry_start", {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 2000,
				errorMessage: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			// turn_end for the failed turn fires while active (set by auto_retry_start).
			h.fire("turn_end", {
				type: "turn_end",
				message: {
					stopReason: "error",
					errorMessage: "429 rate_limit_error: too many requests",
					providerError: { status: 429, headers: { "retry-after": "60" } },
				},
			});
			expect(h.scheduled.length).toBe(0); // not yet — auto_retry_end hasn't fired
			h.fire("auto_retry_end", {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "60" } },
			});
			// Exactly one schedule, header-derived.
			expect(h.scheduled).toEqual([62_000, 122_000, 182_000]);
		} finally {
			h.restore();
		}
	});

	test("transient retry-after above the ceiling DECLINES (manual wake, no early retry)", () => {
		// A retry-after that exceeds the auto-wake horizon must not be clamped into an
		// early retry. The episode enters 🚓 but arms no self-continues.
		const h = makeHarness();
		const ext = require("../extensions/rate-limit-recovery.ts");
		h.start(ext);
		h.installStubs();
		try {
			h.fire("auto_retry_start", {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 2000,
				errorMessage: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "7200" } },
			});
			h.fire("auto_retry_end", {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "429 rate_limit_error: too many requests",
				providerError: { status: 429, headers: { "retry-after": "7200" } },
			});
			expect(h.scheduled.length).toBe(0);
			expect(h.sent.length).toBe(0);
		} finally {
			h.restore();
		}
	});
});
