import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	BridgeStateStore,
	MAX_SENT_MESSAGE_ROUTES,
	recordSentMessageRoute,
	type BridgeStateSnapshot,
	type SentMessageRoute,
} from "./bridge-state.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

function temporaryStatePath(): string {
	const directory = mkdtempSync(join(tmpdir(), "mesh-telegram-state-"));
	temporaryDirectories.push(directory);
	return join(directory, "state.json");
}

function snapshot(messageId = 101, nickname = "Agent One"): BridgeStateSnapshot {
	return {
		broadcastTopicId: 7,
		agentTopics: [["mesh-1", 11]],
		topicAgents: [[11, { clientId: "client-1", meshId: "mesh-1", nickname }]],
		telegramContact: { on: true, message: "Telegram contact reminder", since: 123 },
		sentMessages: [[messageId, {
			clientId: "client-1",
			meshId: "mesh-1",
			nickname,
			preview: "hello",
		}]],
	};
}

describe("BridgeStateStore", () => {
	test("loads the legacy topic and afk schema without sent-message state", () => {
		const path = temporaryStatePath();
		writeFileSync(path, JSON.stringify({
			broadcastTopicId: 7,
			agentTopic: { "mesh-1": 11 },
			topicAgent: { "11": { clientId: "client-1", meshId: "mesh-1", nickname: "Agent One" } },
			afk: { on: true, message: "contact", since: 123 },
		}));

		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.broadcastTopicId).toBe(7);
		expect(loaded.agentTopics).toEqual([["mesh-1", 11]]);
		expect(loaded.topicAgents[0]?.[1].nickname).toBe("Agent One");
		expect(loaded.telegramContact).toEqual({ on: true, message: "contact", since: 123 });
		expect(loaded.sentMessages).toEqual([]);
	});

	test("atomically round-trips restart-sensitive message routes with private permissions", () => {
		const path = temporaryStatePath();
		const expected = snapshot();
		const store = new BridgeStateStore(path, () => expected);
		store.saveNow();

		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded).toEqual(expected);
		expect(statSync(path).mode & 0o777).toBe(0o600);
		expect(existsSync(path + "." + process.pid + ".tmp")).toBeFalse();
	});

	test("coalesces hot-path requests and flushes only the latest live snapshot", () => {
		const path = temporaryStatePath();
		let current = snapshot(101, "First");
		const store = new BridgeStateStore(path, () => current, { coalesceMs: 60_000 });
		store.requestSave();
		current = snapshot(102, "Latest");
		store.requestSave();

		expect(existsSync(path)).toBeFalse();
		store.flush();
		const persisted = JSON.parse(readFileSync(path, "utf8")) as { sentMessages: Array<{ messageId: number; nickname: string }> };
		expect(persisted.sentMessages).toEqual([{ messageId: 102, clientId: "client-1", meshId: "mesh-1", nickname: "Latest", preview: "hello" }]);
	});

	test("writes a requested save when the coalescing window expires", async () => {
		const path = temporaryStatePath();
		const store = new BridgeStateStore(path, () => snapshot(), { coalesceMs: 5 });
		store.requestSave();
		await Bun.sleep(30);
		expect(existsSync(path)).toBeTrue();
	});

	test("bounds an oversized persisted route list during hydration", () => {
		const path = temporaryStatePath();
		const sentMessages = Array.from({ length: MAX_SENT_MESSAGE_ROUTES + 5 }, (_, index) => ({
			messageId: index + 1,
			clientId: "client",
			nickname: "Agent",
			preview: String(index + 1),
		}));
		writeFileSync(path, JSON.stringify({ agentTopic: {}, topicAgent: {}, sentMessages }));

		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.sentMessages).toHaveLength(MAX_SENT_MESSAGE_ROUTES);
		expect(loaded.sentMessages[0]?.[0]).toBe(6);
		expect(loaded.sentMessages.at(-1)?.[0]).toBe(MAX_SENT_MESSAGE_ROUTES + 5);
	});
});

describe("recordSentMessageRoute", () => {
	test("keeps the newest 2,000 routes and refreshes an existing route's recency", () => {
		const routes = new Map<number, SentMessageRoute>();
		for (let messageId = 1; messageId <= MAX_SENT_MESSAGE_ROUTES + 5; messageId++) {
			recordSentMessageRoute(routes, messageId, {
				clientId: "client",
				nickname: "Agent",
				preview: String(messageId),
			});
		}
		expect(routes.size).toBe(MAX_SENT_MESSAGE_ROUTES);
		expect(routes.has(1)).toBeFalse();
		expect(routes.has(5)).toBeFalse();
		expect(routes.has(6)).toBeTrue();

		recordSentMessageRoute(routes, 6, { clientId: "client", nickname: "Agent", preview: "updated" });
		recordSentMessageRoute(routes, MAX_SENT_MESSAGE_ROUTES + 6, { clientId: "client", nickname: "Agent", preview: "new" });
		expect(routes.has(6)).toBeTrue();
		expect(routes.has(7)).toBeFalse();
		expect(routes.get(6)?.preview).toBe("updated");
	});
});
