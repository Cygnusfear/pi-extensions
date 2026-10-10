import { describe, expect, test } from "bun:test";
import {
	askDecider,
	decideAboveThreshold,
	DECIDER_DESCRIPTOR,
	resolveDeciderHost,
} from "./decider.ts";

const questions = {
	q: { type: "bool" as const, instructions: "does it?", criteria: { true: "yes", false: "no" } },
};

describe("decider host", () => {
	test("is absent when the host cannot classify", () => {
		expect(resolveDeciderHost(undefined)).toBeNull();
		expect(resolveDeciderHost({})).toBeNull();
		expect(resolveDeciderHost({ classify: "nope" })).toBeNull();
	});

	test("resolves the catalog entry through the lookup the host has", async () => {
		const entry = { type: "classifier", provider: "openrouter", id: "x" };
		const host = resolveDeciderHost({ findOfType: () => entry, classify: () => Promise.resolve({}) });
		expect(await host?.resolveDecider?.("openrouter", "x")).toEqual({ model: entry, source: "findOfType" });
	});

	test("falls back to a complete descriptor when no lookup answers", async () => {
		const host = resolveDeciderHost({
			findOfType: () => undefined,
			getAvailableOfType: async () => [],
			classify: () => Promise.resolve({}),
		});
		const resolved = await host?.resolveDecider?.("openrouter", "x");
		expect(resolved?.source).toBe("descriptor");
		// classify asserts the model type, so the fallback must carry one.
		expect((resolved?.model as { type?: string }).type).toBe(DECIDER_DESCRIPTOR.type);
	});
});

describe("askDecider", () => {
	test("returns undefined without a host", async () => {
		expect(await askDecider(null, {}, questions)).toBeUndefined();
	});

	test("returns undefined on a provider error instead of throwing", async () => {
		const host = resolveDeciderHost({
			classify: () => Promise.resolve({ stopReason: "error", errorMessage: "nope" }),
		});
		expect(await askDecider(host, {}, questions)).toBeUndefined();
	});

	test("returns undefined when the host rejects", async () => {
		const host = resolveDeciderHost({ classify: () => Promise.reject(new Error("network")) });
		expect(await askDecider(host, {}, questions)).toBeUndefined();
	});

	test("passes the state and questions through and returns the answers", async () => {
		let seen: unknown;
		const host = resolveDeciderHost({
			classify: (_model: unknown, context: unknown) => {
				seen = context;
				return Promise.resolve({ answers: { q: { probability: 0.9 } }, stopReason: "stop" });
			},
		});
		const result = await askDecider(host, { command: "git status" }, questions);
		expect(result?.answers?.q?.probability).toBe(0.9);
		expect(JSON.stringify(seen)).toContain("git status");
	});
});

describe("threshold selection", () => {
	test("keeps answers at or above the bar, strongest first", () => {
		const result = { answers: { a: { probability: 0.4 }, b: { probability: 0.9 }, c: { probability: 0.7 } } };
		expect(decideAboveThreshold(result, 0.5, ["a", "b", "c"])).toEqual(["b", "c"]);
	});

	test("nothing above the bar means nothing to say", () => {
		expect(decideAboveThreshold({ answers: { a: { probability: 0.1 } } }, 0.5, ["a"])).toEqual([]);
		expect(decideAboveThreshold(undefined, 0.5, ["a"])).toEqual([]);
	});
});
