import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PROVIDER_KEY_CHANGED_CHANNEL } from "../../shared/src/provider-limits.ts";
import modelRouterExtension from "../extensions/model-router.js";
import { observeAssistantMessage } from "../src/observe.js";
import {
	checkModelHealth,
	classifyRateLimitError,
	clearLiveness,
	getLiveness,
	livenessExpiry,
	markUnhealthy,
} from "../src/router.js";

const ORIG_HOME = process.env.HOME;
let TMPHOME: string;

beforeEach(() => {
	TMPHOME = fs.realpathSync(
		fs.mkdtempSync(path.join(os.tmpdir(), "liveness-test-")),
	);
	fs.mkdirSync(path.join(TMPHOME, ".pi", "agent"), { recursive: true });
	process.env.HOME = TMPHOME;
});

afterEach(() => {
	process.env.HOME = ORIG_HOME;
	fs.rmSync(TMPHOME, { recursive: true, force: true });
});

describe("markUnhealthy escalation", () => {
	test("doubles the TTL on repeat marks within the window, capped at 8h", () => {
		const first = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(first.ttlSeconds).toBe(1800);
		expect(first.markCount).toBe(1);

		const second = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(second.ttlSeconds).toBe(3600);
		expect(second.markCount).toBe(2);

		const third = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(third.ttlSeconds).toBe(7200);

		const fourth = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(fourth.ttlSeconds).toBe(14400);

		const fifth = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(fifth.ttlSeconds).toBe(28800);

		const sixth = markUnhealthy({
			id: "anthropic/claude-opus-5",
			reason: "rate_limited",
		});
		expect(sixth.ttlSeconds).toBe(28800);
		expect(sixth.markCount).toBe(6);
	});

	test("explicit ttlSeconds overrides escalation", () => {
		const entry = markUnhealthy({
			id: "zai-coding/glm-5.2",
			reason: "rate_limited",
			ttlSeconds: 60,
		});
		expect(entry.ttlSeconds).toBe(60);
	});
});

describe("classifyRateLimitError", () => {
	test.each([
		'429 {"error":"rate limited"}',
		"Rate limited",
		"rate_limit_error: slow down",
		"insufficient_quota: check your plan",
		"You exceeded your current quota, please check your plan and billing details.",
		"5-hour usage limit reached",
		"credit balance too low",
		"plan limit exceeded",
		"account limit reached",
		"429: too many requests",
	])("flags: %s", (message) => {
		expect(classifyRateLimitError(message)).toBe(true);
	});

	test.each([
		"prompt is too long: 213462 tokens > 200000 maximum",
		"request_too_large: serialized request body is 2622060 bytes",
		"server error: internal failure",
		"unknown error",
	])("does not flag: %s", (message) => {
		expect(classifyRateLimitError(message)).toBe(false);
	});
});

describe("checkModelHealth + livenessExpiry", () => {
	test("healthy by default, unhealthy after marking, expiry computed", () => {
		expect(checkModelHealth("openai-codex/gpt-5.5").healthy).toBe(true);
		const entry = markUnhealthy({
			id: "openai-codex/gpt-5.5",
			reason: "rate_limited",
			ttlSeconds: 120,
		});
		const health = checkModelHealth("OpenAI-Codex/GPT-5.5");
		expect(health.healthy).toBe(false);
		expect(health.entry?.reason).toBe("rate_limited");
		const expiry = livenessExpiry(entry);
		expect(expiry).toBeDefined();
		expect(Math.abs(expiry!.getTime() - (Date.now() + 120_000))).toBeLessThan(
			5_000,
		);
	});
});

describe("observeAssistantMessage", () => {
	test("flags a rate-limited model on assistant error", () => {
		const result = observeAssistantMessage({
			role: "assistant",
			provider: "anthropic",
			model: "claude-opus-5",
			stopReason: "error",
			errorMessage: "429: rate limit exceeded",
		});

		expect(result.action).toBe("flagged");
		expect(result.id).toBe("anthropic/claude-opus-5");
		expect(checkModelHealth("anthropic/claude-opus-5").healthy).toBe(false);
	});

	test("ignores non-rate-limit errors", () => {
		const result = observeAssistantMessage({
			role: "assistant",
			provider: "anthropic",
			model: "claude-opus-5",
			stopReason: "error",
			errorMessage: "prompt is too long",
		});

		expect(result.action).toBe("none");
		expect(getLiveness()).toHaveLength(0);
	});

	test("heals a flagged model on a successful stop", () => {
		observeAssistantMessage({
			role: "assistant",
			provider: "kimi-coding",
			model: "k3",
			stopReason: "error",
			errorMessage: "429 too many requests",
		});
		expect(checkModelHealth("kimi-coding/k3").healthy).toBe(false);

		const healed = observeAssistantMessage({
			role: "assistant",
			provider: "kimi-coding",
			model: "k3",
			stopReason: "stop",
		});

		expect(healed.action).toBe("healed");
		expect(checkModelHealth("kimi-coding/k3").healthy).toBe(true);
	});

	test("does not heal on abort", () => {
		observeAssistantMessage({
			role: "assistant",
			provider: "kimi-coding",
			model: "k3",
			stopReason: "error",
			errorMessage: "rate limited",
		});

		const result = observeAssistantMessage({
			role: "assistant",
			provider: "kimi-coding",
			model: "k3",
			stopReason: "aborted",
		});

		expect(result.action).toBe("none");
		expect(checkModelHealth("kimi-coding/k3").healthy).toBe(false);
	});

	test("ignores non-assistant and incomplete messages", () => {
		expect(observeAssistantMessage({ role: "user" }).action).toBe("none");
		expect(
			observeAssistantMessage({ role: "assistant", provider: "anthropic" })
				.action,
		).toBe("none");
	});
});

describe("model-router extension lifecycle", () => {
	test("session shutdown disposes the provider-key listener", () => {
		const lifecycleHandlers = new Map<string, Array<() => void>>();
		const eventListeners = new Map<string, Array<(data: unknown) => void>>();
		const pi = {
			on: (event: string, handler: () => void) => {
				const handlers = lifecycleHandlers.get(event) ?? [];
				handlers.push(handler);
				lifecycleHandlers.set(event, handlers);
			},
			events: {
				on: (channel: string, listener: (data: unknown) => void) => {
					const listeners = eventListeners.get(channel) ?? [];
					listeners.push(listener);
					eventListeners.set(channel, listeners);
					return () =>
						eventListeners.set(
							channel,
							(eventListeners.get(channel) ?? []).filter(
								(candidate) => candidate !== listener,
							),
						);
				},
			},
		};
		modelRouterExtension(pi as never);
		const emitKeyChanged = () => {
			for (const listener of eventListeners.get(PROVIDER_KEY_CHANGED_CHANNEL) ??
				[]) {
				listener({ providerIds: ["qwencloud"] });
			}
		};

		markUnhealthy({ id: "qwencloud/qwen-test", reason: "rate_limited" });
		emitKeyChanged();
		expect(checkModelHealth("qwencloud/qwen-test").healthy).toBe(true);

		markUnhealthy({ id: "qwencloud/qwen-test", reason: "rate_limited" });
		expect(() => {
			for (const handler of lifecycleHandlers.get("session_shutdown") ?? [])
				handler();
		}).not.toThrow();
		emitKeyChanged();
		expect(checkModelHealth("qwencloud/qwen-test").healthy).toBe(false);
	});
});
