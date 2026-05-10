import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
	resolve,
	markUnhealthy,
	markHealthy,
	getLiveness,
	clearLiveness,
	loadAllRoles,
	type ResolverContext,
} from "../src/router.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

const TMPDIR = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "model-router-test-")));
const TEMPLATES_PATH = path.join(TMPDIR, "team-templates.json");
const LIVENESS_PATH = path.join(TMPDIR, "model-liveness.json");

// Override paths by monkey-patching the module-level constants
// We do this by writing to the expected locations and setting HOME
const ORIG_HOME = process.env.HOME;

beforeEach(() => {
	// Create a fake home
	const fakeHome = path.join(TMPDIR, "home");
	fs.mkdirSync(path.join(fakeHome, ".pi", "agent"), { recursive: true });
	process.env.HOME = fakeHome;

	// Write a team-templates.json
	fs.writeFileSync(
		path.join(fakeHome, ".pi", "agent", "team-templates.json"),
		JSON.stringify({
			review: {
				model: [
					"anthropic/claude-opus-4-7",
					"openai-codex/gpt-5.5",
					"zai-coding/glm-5.1",
				],
				prompt: "review prompt",
			},
			fix: {
				model: [
					"zai-coding/glm-5.1",
					"openai-codex/gpt-5.4",
					"openai-codex/gpt-5.5",
					"anthropic/claude-opus-4-7",
				],
				prompt: "fix prompt",
			},
			scribe: {
				model: "openai-codex/gpt-5.4",
				prompt: "scribe prompt",
			},
			roleplay: {
				model: "anthropic/claude-sonnet-4-7",
				freeform: true,
			},
		}, null, 2),
	);
});

afterEach(() => {
	process.env.HOME = ORIG_HOME;
	fs.rmSync(TMPDIR, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function ctxWith(models: Array<{ provider: string; id: string }>): ResolverContext {
	return {
		getAvailable: () => models,
	};
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("resolve", () => {
	test("picks the first available model for count=1", () => {
		const ctx = ctxWith([
			{ provider: "anthropic", id: "claude-opus-4-7" },
			{ provider: "openai-codex", id: "gpt-5.5" },
			{ provider: "zai-coding", id: "glm-5.1" },
		]);

		const result = resolve(ctx, { role: "review", count: 1 });
		expect(result.resolved).toHaveLength(1);
		expect(result.resolved[0].id).toBe("anthropic/claude-opus-4-7");
		expect(result.role).toBe("review");
	});

	test("picks 3 distinct providers for count=3 (DEI)", () => {
		const ctx = ctxWith([
			{ provider: "anthropic", id: "claude-opus-4-7" },
			{ provider: "openai-codex", id: "gpt-5.5" },
			{ provider: "zai-coding", id: "glm-5.1" },
		]);

		const result = resolve(ctx, { role: "review", count: 3 });
		expect(result.resolved).toHaveLength(3);
		expect(result.resolved.map(m => m.provider)).toEqual([
			"anthropic",
			"openai-codex",
			"zai-coding",
		]);
	});

	test("dedup skips same-provider models", () => {
		const ctx = ctxWith([
			{ provider: "zai-coding", id: "glm-5.1" },
			{ provider: "openai-codex", id: "gpt-5.4" },
			{ provider: "openai-codex", id: "gpt-5.5" },
			{ provider: "anthropic", id: "claude-opus-4-7" },
		]);

		const result = resolve(ctx, { role: "fix", count: 3 });
		// fix = [glm-5.1, gpt-5.4, gpt-5.5, claude-opus-4-7]
		// dedup picks: glm-5.1 (zai), gpt-5.4 (openai), claude-opus-4-7 (anthropic)
		// gpt-5.5 skipped: same provider as 5.4
		expect(result.resolved).toHaveLength(3);
		expect(result.resolved.map(m => m.id)).toEqual([
			"zai-coding/glm-5.1",
			"openai-codex/gpt-5.4",
			"anthropic/claude-opus-4-7",
		]);

		const dedupSkipped = result.skipped.find(s => s.id === "openai-codex/gpt-5.5");
		expect(dedupSkipped).toBeDefined();
		expect(dedupSkipped!.skipReason).toBe("dedup_provider");
	});

	test("dedupProviders=false allows same-provider duplicates", () => {
		const ctx = ctxWith([
			{ provider: "zai-coding", id: "glm-5.1" },
			{ provider: "openai-codex", id: "gpt-5.4" },
			{ provider: "openai-codex", id: "gpt-5.5" },
			{ provider: "anthropic", id: "claude-opus-4-7" },
		]);

		const result = resolve(ctx, { role: "fix", count: 3, dedupProviders: false });
		expect(result.resolved).toHaveLength(3);
		expect(result.resolved.map(m => m.id)).toEqual([
			"zai-coding/glm-5.1",
			"openai-codex/gpt-5.4",
			"openai-codex/gpt-5.5",
		]);
	});

	test("skips unavailable models (no API key)", () => {
		const ctx = ctxWith([
			{ provider: "anthropic", id: "claude-opus-4-7" },
			// gpt-5.5 and glm-5.1 not available
		]);

		const result = resolve(ctx, { role: "review", count: 3 });
		expect(result.resolved).toHaveLength(1);
		expect(result.resolved[0].id).toBe("anthropic/claude-opus-4-7");

		const noKey = result.skipped.filter(s => s.skipReason === "no_api_key");
		expect(noKey).toHaveLength(2);
	});

	test("returns empty for unknown role", () => {
		const ctx = ctxWith([]);
		const result = resolve(ctx, { role: "nonexistent", count: 1 });
		expect(result.resolved).toHaveLength(0);
	});

	test("string model in template works (scribe)", () => {
		const ctx = ctxWith([
			{ provider: "openai-codex", id: "gpt-5.4" },
		]);

		const result = resolve(ctx, { role: "scribe", count: 1 });
		expect(result.resolved).toHaveLength(1);
		expect(result.resolved[0].id).toBe("openai-codex/gpt-5.4");
	});

	test("case-insensitive matching", () => {
		const ctx = ctxWith([
			{ provider: "Anthropic", id: "Claude-Opus-4-7" },
		]);

		const result = resolve(ctx, { role: "review", count: 1 });
		expect(result.resolved).toHaveLength(1);
		// Returns the original casing from the template
		expect(result.resolved[0].id).toBe("anthropic/claude-opus-4-7");
	});
});

describe("liveness", () => {
	test("unhealthy model is skipped", () => {
		const ctx = ctxWith([
			{ provider: "anthropic", id: "claude-opus-4-7" },
			{ provider: "openai-codex", id: "gpt-5.5" },
			{ provider: "zai-coding", id: "glm-5.1" },
		]);

		markUnhealthy({ id: "anthropic/claude-opus-4-7", reason: "rate_limited", ttlSeconds: 300 });

		const result = resolve(ctx, { role: "review", count: 3 });
		expect(result.resolved).toHaveLength(2);
		expect(result.resolved.map(m => m.id)).toEqual([
			"openai-codex/gpt-5.5",
			"zai-coding/glm-5.1",
		]);

		const unhealthy = result.skipped.find(s => s.skipReason?.includes("unhealthy"));
		expect(unhealthy).toBeDefined();
	});

	test("markHealthy removes the entry", () => {
		markUnhealthy({ id: "anthropic/claude-opus-4-7", reason: "rate_limited", ttlSeconds: 3600 });
		expect(markHealthy("anthropic/claude-opus-4-7")).toBe(true);
		expect(getLiveness()).toHaveLength(0);
	});

	test("clearLiveness removes all entries", () => {
		markUnhealthy({ id: "a/b", reason: "test" });
		markUnhealthy({ id: "c/d", reason: "test" });
		clearLiveness();
		expect(getLiveness()).toHaveLength(0);
	});

	test("entries auto-expire after TTL", () => {
		// TTL of 0 seconds = already expired
		markUnhealthy({ id: "test/expired", reason: "old", ttlSeconds: 0 });
		expect(getLiveness()).toHaveLength(0);
	});
});

describe("loadAllRoles", () => {
	test("returns all roles with their model lists", () => {
		const roles = loadAllRoles();
		expect(Object.keys(roles).sort()).toEqual(["fix", "review", "roleplay", "scribe"]);
		expect(roles.review).toEqual([
			"anthropic/claude-opus-4-7",
			"openai-codex/gpt-5.5",
			"zai-coding/glm-5.1",
		]);
		expect(roles.scribe).toEqual(["openai-codex/gpt-5.4"]);
	});
});