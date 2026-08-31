import { describe, expect, test } from "bun:test";
import { classifyProviderKeyFailure, diagnoseProviderKeyFailure, KeyRingEpisode } from "./key-ring.ts";
import type { ResolvedKey } from "./types.ts";

const keys: ResolvedKey[] = [
	{ id: "a", source: "$A", secret: "secret-a" },
	{ id: "b", source: "$B", secret: "secret-b" },
	{ id: "c", source: "$C", secret: "secret-c" },
];

describe("KeyRingEpisode", () => {
	test("keeps the active key after success", () => {
		const ring = new KeyRingEpisode(keys, "b");
		ring.markSuccess();
		expect(ring.active?.id).toBe("b");
	});

	test("tries each key once, then stops", () => {
		const ring = new KeyRingEpisode(keys, "a");
		expect(ring.nextForFailure()?.id).toBe("b");
		expect(ring.nextForFailure()?.id).toBe("c");
		expect(ring.nextForFailure()).toBeUndefined();
		expect([...ring.attemptedKeyIds]).toEqual(["a", "b", "c"]);
	});

	test("keeps the episode across one queued recovery run", () => {
		const ring = new KeyRingEpisode(keys, "a");
		expect(ring.nextForFailure()?.id).toBe("b");
		ring.markRecoveryFollowUpQueued();
		ring.beginAgentRun();
		expect(ring.nextForFailure()?.id).toBe("c");
		ring.beginAgentRun();
		expect(ring.nextForFailure()?.id).toBe("a");
	});

	test("manual swap cycles independently of a recovery episode", () => {
		const ring = new KeyRingEpisode(keys, "c");
		expect(ring.manualNext()?.id).toBe("a");
		expect(ring.attemptedKeyIds.size).toBe(0);
	});
});

describe("classifyProviderKeyFailure", () => {
	test("classifies retryable provider throttles", () => {
		expect(classifyProviderKeyFailure("rate_limit_error", { status: 429 })).toBe("retryable-limit");
		expect(classifyProviderKeyFailure("TPM limit exceeded")).toBe("retryable-limit");
	});

	test("classifies per-key auth, billing, and allocation failures", () => {
		expect(classifyProviderKeyFailure("invalid API key", { status: 401 })).toBe("hard-key-limit");
		expect(classifyProviderKeyFailure("AllocationQuota.FreeTierOnly", { status: 403 })).toBe("hard-key-limit");
		expect(classifyProviderKeyFailure("usage limit reached")).toBe("hard-key-limit");
	});

	test("does not rotate for unrelated provider errors", () => {
		expect(classifyProviderKeyFailure("500 internal server error", { status: 500 })).toBe("none");
		expect(classifyProviderKeyFailure("context window exceeded", { status: 400 })).toBe("none");
	});
});

describe("quota-aware failure selection", () => {
	test("exposes ordered candidates so persisted-ineligible keys can be skipped", () => {
		const ring = new KeyRingEpisode(keys, "a");
		expect(ring.failureCandidateIds()).toEqual(["b", "c"]);
		expect(ring.selectForFailure("c")?.id).toBe("c");
		expect(ring.failureCandidateIds()).toEqual(["b"]);
		expect(ring.selectForFailure("c")).toBeUndefined();
	});

	test("distinguishes quota, weekly quota, auth, and transient cooldown", () => {
		expect(diagnoseProviderKeyFailure("weekly usage limit reached", { status: 429 })).toEqual({
			kind: "quota-exhausted", reason: "weekly-quota",
		});
		expect(diagnoseProviderKeyFailure("insufficient_quota", { status: 429 })).toEqual({
			kind: "quota-exhausted", reason: "quota",
		});
		expect(diagnoseProviderKeyFailure("invalid api key", { status: 401 })).toEqual({
			kind: "auth-invalid", reason: "auth",
		});
		expect(diagnoseProviderKeyFailure("too many requests", { status: 429 })).toEqual({
			kind: "cooldown", reason: "rate-limit",
		});
	});
	test("queue acknowledgment is reversible under reentrant agent_start", () => {
		const ring = new KeyRingEpisode(keys, "a");
		expect(ring.failureCandidateIds()).toEqual(["b", "c"]);
		ring.selectForFailure("b");
		ring.beginRecoveryFollowUpQueue();
		ring.beginAgentRun();
		ring.commitRecoveryFollowUpQueue();
		expect(ring.failureCandidateIds()).toEqual(["c"]);
		ring.beginAgentRun();
		expect(ring.failureCandidateIds()).toEqual(["c", "a"]);
	});

});
