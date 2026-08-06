import { describe, expect, test } from "bun:test";
import {
	canonicalAgentTopicTitle,
	desiredTopicTitle,
	TELEGRAM_TOPIC_NAME_MAX,
	TopicRouteController,
	type AgentTopicRoute,
	type TopicRoutePeer,
} from "./topic-routes.ts";

const peer: TopicRoutePeer = {
	key: "mesh-agent-1",
	clientId: "client-agent-1",
	meshId: "mesh-agent-1",
	nickname: "Lisa Nova",
	sessionName: "Build",
};

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void } {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	return { promise: new Promise<T>((res, rej) => { resolve = res; reject = rej; }), resolve, reject };
}

describe("canonicalAgentTopicTitle", () => {
	test("uses exact '<session> <agent>' order with one ASCII space", () => {
		expect(canonicalAgentTopicTitle("Build", "Lisa Nova")).toBe("Build Lisa Nova");
		expect(canonicalAgentTopicTitle("Build", "Lisa Nova")).not.toContain("·");
	});

	test("uses only the known agent name when session metadata is absent", () => {
		expect(canonicalAgentTopicTitle(undefined, "Lisa Nova")).toBe("Lisa Nova");
		expect(canonicalAgentTopicTitle(undefined, undefined)).toBe("agent");
	});

	test("caps at 128 code points without splitting a surrogate", () => {
		const title = canonicalAgentTopicTitle("😀".repeat(200), undefined);
		expect(Array.from(title)).toHaveLength(TELEGRAM_TOPIC_NAME_MAX);
		expect(title.endsWith("😀")).toBe(true);
	});

	test("returns a desired title only when reconciliation is needed", () => {
		expect(desiredTopicTitle("Build Lisa Nova", "Build", "Lisa Nova")).toBeUndefined();
		expect(desiredTopicTitle(undefined, "Build", "Lisa Nova")).toBe("Build Lisa Nova");
	});
});

describe("TopicRouteController bridge orchestration", () => {
	test("coalesces delayed concurrent tells into one Telegram topic with no orphan route", async () => {
		const routes = new Map<string, AgentTopicRoute>();
		const create = deferred<{ message_thread_id: number }>();
		const createCalls: Array<{ chatId: number; name: string }> = [];
		const ready: number[] = [];
		const controller = new TopicRouteController({
			api: {
				createForumTopic: (chatId, name) => { createCalls.push({ chatId, name }); return create.promise; },
				editForumTopic: async () => {},
			},
			routes,
			chatId: () => -100_123,
			onRoutesChanged: () => {},
			onTopicReady: (topicId) => ready.push(topicId),
		});

		const first = controller.ensure(peer);
		const second = controller.ensure(peer);
		expect(createCalls).toEqual([{ chatId: -100_123, name: "Build Lisa Nova" }]);
		create.resolve({ message_thread_id: 77 });
		expect(await Promise.all([first, second])).toEqual([77, 77]);
		expect(createCalls).toHaveLength(1);
		expect([...routes.entries()]).toEqual([[peer.key, { topicId: 77, title: "Build Lisa Nova" }]]);
		expect(ready).toEqual([77, 77]);
	});

	test("persists a successful rename and retries a failed rename on the next ensure", async () => {
		const routes = new Map<string, AgentTopicRoute>([[peer.key, { topicId: 77, title: "Lisa Nova · Build" }]]);
		const edits: string[] = [];
		let fail = true;
		let changes = 0;
		const controller = new TopicRouteController({
			api: {
				createForumTopic: async () => ({ message_thread_id: 99 }),
				editForumTopic: async (_chatId, _topicId, other) => {
					edits.push(other.name);
					if (fail) { fail = false; throw new Error("temporary Telegram error"); }
				},
			},
			routes,
			chatId: () => -100_123,
			onRoutesChanged: () => { changes++; },
		});

		expect(await controller.ensure(peer)).toBe(77);
		expect(routes.get(peer.key)).toEqual({ topicId: 77, title: "Lisa Nova · Build" });
		expect(changes).toBe(0);
		expect(await controller.ensure(peer)).toBe(77);
		expect(edits).toEqual(["Build Lisa Nova", "Build Lisa Nova"]);
		expect(routes.get(peer.key)).toEqual({ topicId: 77, title: "Build Lisa Nova" });
		expect(changes).toBe(1);
	});

	test("cleans failed create in-flight state so a later tell retries without retaining a phantom route", async () => {
		const routes = new Map<string, AgentTopicRoute>();
		let attempts = 0;
		const controller = new TopicRouteController({
			api: {
				createForumTopic: async () => {
					attempts++;
					if (attempts === 1) throw new Error("network down");
					return { message_thread_id: 88 };
				},
				editForumTopic: async () => {},
			},
			routes,
			chatId: () => -100_123,
			onRoutesChanged: () => {},
		});

		expect(await controller.ensure(peer)).toBeNull();
		expect(routes.size).toBe(0);
		expect(await controller.ensure(peer)).toBe(88);
		expect(attempts).toBe(2);
		expect(routes.get(peer.key)?.topicId).toBe(88);
	});

	test("peer announcements reconcile mapped topics but never create unmapped topics", async () => {
		let creates = 0;
		const controller = new TopicRouteController({
			api: {
				createForumTopic: async () => { creates++; return { message_thread_id: 1 }; },
				editForumTopic: async () => {},
			},
			routes: new Map(),
			chatId: () => -100_123,
			onRoutesChanged: () => {},
		});
		await controller.reconcileKnown(peer);
		expect(creates).toBe(0);
	});

	test("never creates a persistent route from an unannounced reconnect client id", async () => {
		const routes = new Map<string, AgentTopicRoute>();
		let creates = 0;
		const controller = new TopicRouteController({
			api: {
				createForumTopic: async () => ({ message_thread_id: ++creates }),
				editForumTopic: async () => {},
			},
			routes,
			chatId: () => -100_123,
			onRoutesChanged: () => {},
		});
		const reconnect: TopicRoutePeer = { key: "reconnect-client", clientId: "reconnect-client", nickname: "Nova" };
		expect(await controller.ensure(reconnect)).toBeNull();
		expect(creates).toBe(0);
		expect([...routes.keys()]).toEqual([]);

		const announced: TopicRoutePeer = { key: "durable-nova", clientId: "reconnect-client", meshId: "durable-nova", nickname: "Nova", sessionName: "Build" };
		expect(await controller.ensure(announced)).toBe(1);
		expect([...routes.keys()]).toEqual(["durable-nova"]);
	});

	test("an announcement safely adopts a legacy transient record without replacing a durable route", async () => {
		const routes = new Map<string, AgentTopicRoute>([["old-client", { topicId: 77, title: "Nova" }]]);
		let creates = 0;
		const edits: string[] = [];
		const controller = new TopicRouteController({
			api: {
				createForumTopic: async () => ({ message_thread_id: ++creates }),
				editForumTopic: async (_chatId, _topicId, update) => { edits.push(update.name); },
			},
			routes,
			chatId: () => -100_123,
			onRoutesChanged: () => {},
		});
		await controller.announce({ key: "durable-nova", clientId: "old-client", meshId: "durable-nova", nickname: "Nova", sessionName: "Build" });
		expect(creates).toBe(0);
		expect(edits).toEqual(["Build Nova"]);
		expect([...routes.entries()]).toEqual([["durable-nova", { topicId: 77, title: "Build Nova" }]]);
	});

	});
