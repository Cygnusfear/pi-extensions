import { describe, expect, test } from "bun:test";
import { forumDetectRetryDelayMs } from "./bridge.ts";
import type { AgentTopicRoute } from "./topic-routes.ts";
import {
	isTopicAlreadyGoneError,
	TOPIC_TTL_DEFAULT_MS,
	TOPIC_TTL_MIN_MS,
	TopicLifecycleController,
	topicTtlMsFromEnv,
} from "./topic-lifecycle.ts";

const DAY = 24 * 60 * 60_000;

function route(topicId: number, lastSeenAt: number | undefined): AgentTopicRoute {
	return lastSeenAt === undefined ? { topicId } : { topicId, lastSeenAt };
}

interface Harness {
	routes: Map<string, AgentTopicRoute>;
	deletes: Array<{ chatId: number; topicId: number }>;
	slept: number[];
	reaped: string[];
	gone: string[];
	errors: Array<{ key: string; message: string }>;
}

function harness(
	routes: Map<string, AgentTopicRoute>,
	opts: {
		chatId?: number | null;
		ttlMs?: number | null;
		isLive?: (key: string) => boolean;
		fail?: (topicId: number) => Error | undefined;
		deleteCap?: number;
		nowMs?: number;
	} = {},
): { h: Harness; controller: TopicLifecycleController } {
	const h: Harness = { routes, deletes: [], slept: [], reaped: [], gone: [], errors: [] };
	const controller = new TopicLifecycleController({
		api: {
			deleteForumTopic: async (chatId, topicId) => {
				const failure = opts.fail?.(topicId);
				if (failure) throw failure;
				h.deletes.push({ chatId, topicId });
			},
		},
		routes,
		chatId: () => (opts.chatId === undefined ? -100 : opts.chatId),
		forget: (key) => {
			h.routes.delete(key);
		},
		isLive: opts.isLive ?? (() => false),
		ttlMs: opts.ttlMs === undefined ? 7 * DAY : opts.ttlMs,
		onReap: (key) => {
			h.reaped.push(key);
		},
		onAlreadyGone: (key) => {
			h.gone.push(key);
		},
		onError: (key, _route, error) => {
			h.errors.push({ key, message: error.message });
		},
		now: () => opts.nowMs ?? 100 * DAY,
		sleep: async (ms) => {
			h.slept.push(ms);
		},
		deleteCap: opts.deleteCap,
	});
	return { h, controller };
}

describe("topicTtlMsFromEnv", () => {
	test("defaults to 7 days when unset or invalid", () => {
		expect(topicTtlMsFromEnv({})).toBe(TOPIC_TTL_DEFAULT_MS);
		expect(topicTtlMsFromEnv({ MESH_TG_TOPIC_TTL_DAYS: "nonsense" })).toBe(TOPIC_TTL_DEFAULT_MS);
	});

	test("converts days and enforces the 1-day floor", () => {
		expect(topicTtlMsFromEnv({ MESH_TG_TOPIC_TTL_DAYS: "14" })).toBe(14 * DAY);
		expect(topicTtlMsFromEnv({ MESH_TG_TOPIC_TTL_DAYS: "0.1" })).toBe(TOPIC_TTL_MIN_MS);
	});

	test("0 or negative disables the sweep", () => {
		expect(topicTtlMsFromEnv({ MESH_TG_TOPIC_TTL_DAYS: "0" })).toBeNull();
		expect(topicTtlMsFromEnv({ MESH_TG_TOPIC_TTL_DAYS: "-3" })).toBeNull();
	});
});

describe("isTopicAlreadyGoneError", () => {
	test("recognizes Telegram's already-gone forms and rejects real failures", () => {
		expect(isTopicAlreadyGoneError(new Error("Bad Request: TOPIC_ID_INVALID"))).toBe(true);
		expect(isTopicAlreadyGoneError(new Error("Bad Request: message thread not found"))).toBe(true);
		expect(isTopicAlreadyGoneError(new Error("429: Too Many Requests"))).toBe(false);
	});
});

describe("topic sweep", () => {
	test("deletes TTL-expired routes and forgets them", async () => {
		const routes = new Map([["dead", route(11, 100 * DAY - 8 * DAY)]]);
		const { h, controller } = harness(routes);
		const result = await controller.sweep();
		expect(result).toMatchObject({ considered: 1, deleted: 1, failed: 0 });
		expect(h.deletes).toEqual([{ chatId: -100, topicId: 11 }]);
		expect(routes.has("dead")).toBe(false);
		expect(h.reaped).toContain("dead");
	});

	test("keeps fresh routes and live-but-old routes", async () => {
		const routes = new Map([
			["fresh", route(12, 100 * DAY - DAY)],
			["live", route(13, 100 * DAY - 30 * DAY)],
		]);
		const { h, controller } = harness(routes, { isLive: (key) => key === "live" });
		const result = await controller.sweep();
		expect(result).toMatchObject({ considered: 0, deleted: 0, skippedLive: 1 });
		expect(h.deletes).toEqual([]);
		expect(routes.size).toBe(2);
	});

	test("skips pre-lifecycle routes with no lastSeenAt", async () => {
		const routes = new Map([["legacy", route(14, undefined)]]);
		const { h, controller } = harness(routes);
		const result = await controller.sweep();
		expect(result.deleted).toBe(0);
		expect(h.deletes).toEqual([]);
	});

	test("an already-gone topic drops the route without a retry", async () => {
		const routes = new Map([["gone", route(15, 0)]]);
		const { h, controller } = harness(routes, {
			fail: () => new Error("Bad Request: TOPIC_ID_INVALID"),
		});
		const result = await controller.sweep();
		expect(result).toMatchObject({ deleted: 0, alreadyGone: 1, failed: 0 });
		expect(routes.has("gone")).toBe(false);
		expect(h.gone).toContain("gone");
	});

	test("a real failure keeps the route and reports the error", async () => {
		const routes = new Map([["busy", route(16, 0)]]);
		const { h, controller } = harness(routes, { fail: () => new Error("429: Too Many Requests") });
		const result = await controller.sweep();
		expect(result).toMatchObject({ deleted: 0, alreadyGone: 0, failed: 1 });
		expect(routes.has("busy")).toBe(true);
		expect(h.errors[0]?.key).toBe("busy");
	});

	test("honours the per-sweep cap, oldest first, with pacing", async () => {
		const routes = new Map([
			["old", route(21, 1)],
			["mid", route(22, 50 * DAY)],
			["new", route(23, 80 * DAY)],
		]);
		const { h, controller } = harness(routes, { deleteCap: 2 });
		const result = await controller.sweep();
		expect(result.considered).toBe(3);
		expect(result.deleted).toBe(2);
		expect(h.deletes).toEqual([
			{ chatId: -100, topicId: 21 },
			{ chatId: -100, topicId: 22 },
		]);
		expect(h.slept).toEqual([1000]);
		expect(routes.has("new")).toBe(true);
	});

	test("disabled TTL and missing chat id are no-ops", async () => {
		const routes = new Map([["dead", route(31, 0)]]);
		const disabled = harness(routes, { ttlMs: null });
		await disabled.controller.sweep();
		expect(disabled.h.deletes).toEqual([]);
		const noChat = harness(routes, { chatId: null });
		await noChat.controller.sweep();
		expect(noChat.h.deletes).toEqual([]);
	});
});

describe("forumDetectRetryDelayMs", () => {
	test("backs off 5s, 10s, ... and caps at 60s", () => {
		expect(forumDetectRetryDelayMs(1)).toBe(5_000);
		expect(forumDetectRetryDelayMs(2)).toBe(10_000);
		expect(forumDetectRetryDelayMs(5)).toBe(60_000);
		expect(forumDetectRetryDelayMs(99)).toBe(60_000);
	});
});
