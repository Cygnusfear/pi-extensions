import { describe, test, expect } from "bun:test";
import { isRateLimit, CONTINUE_DELAYS_MS } from "../extensions/rate-limit-recovery.ts";
import {
	registerStageController,
	requestStage,
	getActiveStage,
} from "../../shared/src/stage-control.ts";

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

describe("self-continue schedule", () => {
	test("fires at 30s / 60s / 120s per the hooman spec", () => {
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
