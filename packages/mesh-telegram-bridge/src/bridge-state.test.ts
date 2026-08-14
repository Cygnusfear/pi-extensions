import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
	BridgeStateStore,
	MAX_SENT_MESSAGE_ROUTES,
	recordLegacyReactionRoute,
	recordSentMessageRoute,
	sentMessageRouteKey,
	stateTemporaryPath,
	type BridgeStateSnapshot,
	type DeleteEligibleSentMessageRoute,
	type LegacyReactionRoute,
} from "./bridge-state.ts";
import { Bridge } from "./bridge.ts";
import { TopicRouteController, type AgentTopicRoute } from "./topic-routes.ts";

const temporaryDirectories: string[] = [];
const SENT_AT = Date.now() - 60_000;

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

function temporaryStatePath(): string {
	const directory = mkdtempSync(join(tmpdir(), "mesh-telegram-state-"));
	temporaryDirectories.push(directory);
	return join(directory, "state.json");
}

function deleteEligible(messageId = 101, chatId = -100_1): DeleteEligibleSentMessageRoute {
	return {
		kind: "delete-eligible",
		messageId,
		chatId,
		sentAtMs: SENT_AT,
		clientId: "client-1",
		meshId: "mesh-1",
		nickname: "Agent One",
		preview: "hello",
	};
}

function snapshot(messageId = 101): BridgeStateSnapshot {
	const route = deleteEligible(messageId);
	return {
		broadcastTopicId: 7,
		agentTopics: [["mesh-1", { topicId: 11, title: "Build Agent One" }]],
		topicAgents: [[11, { clientId: "client-1", meshId: "mesh-1", nickname: "Agent One" }]],
		sentMessages: [[sentMessageRouteKey(route.chatId, route.messageId)!, route]],
		legacySentMessages: [],
		telegramContact: { on: true, message: "Telegram contact reminder", since: SENT_AT },
		voice: { on: false, since: 0 },
		ttsCreditNotifiedAt: null,
		transcriptionCreditNotifications: [],
	};
}

describe("BridgeStateStore migration and persistence", () => {
	test("loads legacy numeric topic + sent-message state as explicit reaction-only records", () => {
		const path = temporaryStatePath();
		writeFileSync(path, JSON.stringify({
			broadcastTopicId: 7,
			agentTopic: { "mesh-1": 11 },
			topicAgent: { "11": { clientId: "client-1", meshId: "mesh-1", nickname: "Agent One" } },
			topicTitle: { "11": "Build Agent One" },
			sentMessages: [{ messageId: 101, clientId: "client-1", nickname: "Agent One", preview: "old" }],
			afk: { on: true, message: "contact", since: SENT_AT },
		}));

		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.agentTopics).toEqual([["mesh-1", { topicId: 11, title: "Build Agent One" }]]);
		expect(loaded.sentMessages).toEqual([]);
		expect(loaded.legacySentMessages).toEqual([[101, {
			kind: "legacy-reaction-only", clientId: "client-1", nickname: "Agent One", preview: "old",
		}]]);
		expect(loaded.telegramContact).toEqual({ on: true, message: "contact", since: SENT_AT });
	});

	test("round-trips one route record with title and exact chat/message/timestamp identity", () => {
		const path = temporaryStatePath();
		const expected = snapshot();
		new BridgeStateStore(path, () => expected).saveNow();
		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded).toEqual(expected);
		expect(statSync(path).mode & 0o777).toBe(0o600);
		expect(readdirSync(dirname(path)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
		const persisted = JSON.parse(readFileSync(path, "utf8")) as { agentTopic: Record<string, unknown>; sentMessages: unknown[] };
		expect(persisted.agentTopic["mesh-1"]).toEqual({ topicId: 11, title: "Build Agent One" });
		expect(persisted.sentMessages).toHaveLength(1);
	});

	test("round-trips transcription credit notification timestamps by provider", () => {
		const path = temporaryStatePath();
		const expected = { ...snapshot(), transcriptionCreditNotifications: [["OpenRouter", SENT_AT] as const] };
		new BridgeStateStore(path, () => expected).saveNow();
		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.transcriptionCreditNotifications).toEqual([["OpenRouter", SENT_AT]]);
		const persisted = JSON.parse(readFileSync(path, "utf8")) as { transcriptionCreditNotifications: Record<string, number> };
		expect(persisted.transcriptionCreditNotifications).toEqual({ OpenRouter: SENT_AT });
	});

	test("preserves equal message IDs from separate chats instead of collapsing retention obligations", () => {
		const path = temporaryStatePath();
		const first = deleteEligible(55, -100_1);
		const second = deleteEligible(55, -100_2);
		writeFileSync(path, JSON.stringify({ agentTopic: {}, topicAgent: {}, sentMessages: [first, second] }));
		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.sentMessages).toEqual([
			["-1001:55", first],
			["-1002:55", second],
		]);
	});

	test("rejects hostile fractional identity and implausible time from delete eligibility without dropping reaction routing", () => {
		const path = temporaryStatePath();
		writeFileSync(path, JSON.stringify({
			agentTopic: {}, topicAgent: {},
			sentMessages: [
				{ messageId: 9, chatId: -100.5, sentAtMs: SENT_AT, clientId: "c", nickname: "A", preview: "fractional chat" },
				{ messageId: 10, chatId: -100, sentAtMs: 1, clientId: "c", nickname: "A", preview: "ancient" },
			],
		}));
		const loaded = new BridgeStateStore(path, () => snapshot()).load();
		expect(loaded.sentMessages).toEqual([]);
		expect(loaded.legacySentMessages.map(([messageId]) => messageId)).toEqual([9, 10]);
	});

	test("coalesces requested saves and flushes only the latest snapshot", () => {
		const path = temporaryStatePath();
		let current = snapshot(101);
		const store = new BridgeStateStore(path, () => current, { coalesceMs: 60_000 });
		store.requestSave();
		current = snapshot(102);
		store.requestSave();
		expect(existsSync(path)).toBeFalse();
		store.flush();
		const persisted = JSON.parse(readFileSync(path, "utf8")) as { sentMessages: Array<{ messageId: number }> };
		expect(persisted.sentMessages.map((route) => route.messageId)).toEqual([102]);
	});

	test("builds unique adjacent temporary paths and removes them after a failed atomic replacement", () => {
		const path = temporaryStatePath();
		expect(dirname(stateTemporaryPath(path))).toBe(dirname(path));
		expect(basename(stateTemporaryPath(path)).startsWith(`.state.json.${process.pid}.`)).toBeTrue();
		mkdirSync(path);
		const errors: Error[] = [];
		new BridgeStateStore(path, () => snapshot(), { onError: (_operation, error) => errors.push(error) }).saveNow();
		expect(errors).toHaveLength(1);
		expect(readdirSync(dirname(path)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
	});
});

describe("message route identities", () => {
	test("uses a durable tuple key and never accepts fractional/zero remote identity", () => {
		expect(sentMessageRouteKey(-100_1, 10)).toBe("-1001:10");
		expect(sentMessageRouteKey(-100.5, 10)).toBeUndefined();
		expect(sentMessageRouteKey(0, 10)).toBeUndefined();
		expect(sentMessageRouteKey(-100_1, 0)).toBeUndefined();
	});

	test("bounds new and legacy route maps while preserving their separate trust states", () => {
		const safe = new Map<string, DeleteEligibleSentMessageRoute>();
		const legacy = new Map<number, LegacyReactionRoute>();
		for (let id = 1; id <= MAX_SENT_MESSAGE_ROUTES + 2; id++) {
			const route = deleteEligible(id, -100_1);
			recordSentMessageRoute(safe, route);
			recordLegacyReactionRoute(legacy, id, { kind: "legacy-reaction-only", clientId: "c", nickname: "A", preview: String(id) });
		}
		expect(safe).toHaveLength(MAX_SENT_MESSAGE_ROUTES);
		expect(legacy).toHaveLength(MAX_SENT_MESSAGE_ROUTES);
		expect(safe.has("-1001:1")).toBeFalse();
		expect(legacy.has(1)).toBeFalse();
	});
	});


test("chat migration retires legacy same-message-id reactions before they can reach the old agent", async () => {
	const legacy = new Map<number, LegacyReactionRoute>([[42, {
		kind: "legacy-reaction-only",
		clientId: "old-agent-client",
		meshId: "old-agent-mesh",
		nickname: "Old Agent",
		preview: "old-chat message",
	}]]);
	const tells: Array<{ target: unknown; text: string }> = [];
	let commits = 0;
	const bridge = Object.create(Bridge.prototype) as {
		chatId: number;
		legacyMsgToAgent: Map<number, LegacyReactionRoute>;
		retention: { get: (key: string) => undefined };
		stateStore: { saveNowOrThrow: () => void };
		mesh: { tellAgent: (target: unknown, text: string) => void };
		retireLegacyReactionRoutesForMigration: () => boolean;
		onReaction: (ctx: unknown) => Promise<void>;
	};
	bridge.chatId = -100_200;
	bridge.legacyMsgToAgent = legacy;
	bridge.retention = { get: () => undefined };
	bridge.stateStore = { saveNowOrThrow: () => { commits++; } };
	bridge.mesh = { tellAgent: (target, text) => tells.push({ target, text }) };

	// This is the exact retirement operation invoked by the Telegram migration service-message path.
	expect(bridge.retireLegacyReactionRoutesForMigration()).toBe(true);
	expect(legacy.size).toBe(0);
	expect(commits).toBe(1);
	await bridge.onReaction({
		update: {
			message_reaction: {
				chat: { id: -100_200 },
				message_id: 42, // Same numeric id as the prior chat's reaction-only record.
				user: { first_name: "The Hooman" },
				old_reaction: [],
				new_reaction: [{ type: "emoji", emoji: "👍" }],
			},
		},
	});
	expect(tells).toEqual([]);
});


test("reconnecting pre-announcement tells queue until durable identity and retain an existing persisted topic without extra creates", async () => {
	const routes = new Map<string, AgentTopicRoute>([["durable-A", { topicId: 1, title: "Build Nova" }]]);
	let creates = 0;
	const controller = new TopicRouteController({
		api: {
			createForumTopic: async () => ({ message_thread_id: ++creates + 10 }),
			editForumTopic: async () => {},
		},
		routes,
		chatId: () => -100_1,
		onRoutesChanged: () => {},
	});
	const bridge = Object.create(Bridge.prototype) as {
		chatId: number;
		topicRoutes: TopicRouteController;
		pendingTopicPeers: Map<unknown, unknown>;
		ensureAgentTopic: (tell: { fromClientId: string; fromMeshId?: string; nickname: string; sessionName?: string }) => Promise<number | null>;
		onPeerAnnounce: (peer: { clientId: string; meshId?: string; nickname: string; name?: string }) => Promise<void>;
	};
	bridge.chatId = -100_1;
	bridge.topicRoutes = controller;
	bridge.pendingTopicPeers = new Map();

	const first = bridge.ensureAgentTopic({ fromClientId: "reconnect-client", nickname: "Nova" });
	const concurrent = bridge.ensureAgentTopic({ fromClientId: "reconnect-client", nickname: "Nova" });
	expect(creates).toBe(0); // Unstable client id is queue-only: no Telegram external side effect.
	await bridge.onPeerAnnounce({ clientId: "reconnect-client", meshId: "durable-A", nickname: "Nova", name: "Build" });
	expect(await Promise.all([first, concurrent])).toEqual([1, 1]);
	expect(creates).toBe(0);
	expect([...routes.entries()]).toEqual([["durable-A", { topicId: 1, title: "Build Nova" }]]);
});

test("queued pre-announcement create failure stays durable-only and a later durable tell retries", async () => {
	const routes = new Map<string, AgentTopicRoute>();
	let attempts = 0;
	const controller = new TopicRouteController({
		api: {
			createForumTopic: async () => {
				attempts++;
				if (attempts === 1) throw new Error("temporary Telegram failure");
				return { message_thread_id: 2 };
			},
			editForumTopic: async () => {},
		},
		routes,
		chatId: () => -100_1,
		onRoutesChanged: () => {},
	});
	const bridge = Object.create(Bridge.prototype) as {
		chatId: number;
		topicRoutes: TopicRouteController;
		pendingTopicPeers: Map<unknown, unknown>;
		ensureAgentTopic: (tell: { fromClientId: string; fromMeshId?: string; nickname: string; sessionName?: string }) => Promise<number | null>;
		onPeerAnnounce: (peer: { clientId: string; meshId?: string; nickname: string; name?: string }) => Promise<void>;
	};
	bridge.chatId = -100_1;
	bridge.topicRoutes = controller;
	bridge.pendingTopicPeers = new Map();

	const queued = bridge.ensureAgentTopic({ fromClientId: "client-B", nickname: "B" });
	await bridge.onPeerAnnounce({ clientId: "client-B", meshId: "durable-B", nickname: "B", name: "Build" });
	expect(await queued).toBeNull();
	expect([...routes.keys()]).toEqual([]);
	expect(await bridge.ensureAgentTopic({ fromClientId: "client-B", fromMeshId: "durable-B", nickname: "B", sessionName: "Build" })).toBe(2);
	expect(attempts).toBe(2);
	expect([...routes.keys()]).toEqual(["durable-B"]);
});


test("migration durably retires legacy routes before a reload can admit a same-id new-chat reaction", async () => {
	const path = temporaryStatePath();
	const legacy = new Map<number, LegacyReactionRoute>([[42, {
		kind: "legacy-reaction-only", clientId: "old", meshId: "old-mesh", nickname: "Old", preview: "old",
	}]]);
	const store = new BridgeStateStore(path, () => ({ ...snapshot(), legacySentMessages: [...legacy.entries()] }));
	store.saveNowOrThrow();
	expect(new BridgeStateStore(path, () => snapshot()).load().legacySentMessages.map(([id]) => id)).toEqual([42]);
	const tells: unknown[] = [];
	const bridge = Object.create(Bridge.prototype) as {
		chatId: number;
		legacyMsgToAgent: Map<number, LegacyReactionRoute>;
		retention: { get: () => undefined };
		stateStore: BridgeStateStore;
		mesh: { tellAgent: (target: unknown) => void };
		retireLegacyReactionRoutesForMigration: () => boolean;
		onReaction: (ctx: unknown) => Promise<void>;
	};
	bridge.chatId = -100_300;
	bridge.legacyMsgToAgent = legacy;
	bridge.retention = { get: () => undefined };
	bridge.stateStore = store;
	bridge.mesh = { tellAgent: (target) => tells.push(target) };
	// This is the first half of the detected migration transaction; `saveNowOrThrow` writes and renames synchronously.
	expect(bridge.retireLegacyReactionRoutesForMigration()).toBe(true);
	expect(new BridgeStateStore(path, () => snapshot()).load().legacySentMessages).toEqual([]);
	await bridge.onReaction({ update: { message_reaction: {
		chat: { id: -100_300 }, message_id: 42, old_reaction: [], new_reaction: [{ type: "emoji", emoji: "👍" }],
	} } });
	expect(tells).toEqual([]);
});

test("state commit failure rejects migration retirement and the migration handler keeps the old chat authoritative", async () => {
	const path = temporaryStatePath();
	mkdirSync(path); // Rename over a directory fails after the real temporary write path.
	const legacy = new Map<number, LegacyReactionRoute>([[42, {
		kind: "legacy-reaction-only", clientId: "old", nickname: "Old", preview: "old",
	}]]);
	const store = new BridgeStateStore(path, () => ({ ...snapshot(), legacySentMessages: [...legacy.entries()] }));
	expect(() => store.saveNowOrThrow()).toThrow();
	const bridge = Object.create(Bridge.prototype) as {
		legacyMsgToAgent: Map<number, LegacyReactionRoute>;
		stateStore: BridgeStateStore;
		retireLegacyReactionRoutesForMigration: () => boolean;
	};
	bridge.legacyMsgToAgent = legacy;
	bridge.stateStore = store;
	expect(bridge.retireLegacyReactionRoutesForMigration()).toBe(false);
	expect([...legacy.keys()]).toEqual([42]); // The failed transaction keeps the old authoritative chat fully usable.

	const blocked = Object.create(Bridge.prototype) as {
		chatId: number;
		retireLegacyReactionRoutesForMigration: () => boolean;
		onTelegramMessage: (ctx: unknown) => Promise<void>;
	};
	blocked.chatId = -100_400;
	blocked.retireLegacyReactionRoutesForMigration = () => false;
	await blocked.onTelegramMessage({ message: { migrate_to_chat_id: -100_401 } });
	expect(blocked.chatId).toBe(-100_400);
});


test("a forum tell without an established durable topic never falls back to the general thread", async () => {
	let sent = 0;
	const bridge = Object.create(Bridge.prototype) as {
		chatId: number;
		forumMode: boolean;
		ensureAgentTopic: () => Promise<number | null>;
		sendText: () => Promise<{ message_id: number }>;
		onMeshTell: (tell: { fromClientId: string; nickname: string; text: string }) => Promise<void>;
	};
	bridge.chatId = -100_1;
	bridge.forumMode = true;
	bridge.ensureAgentTopic = async () => null;
	bridge.sendText = async () => ({ message_id: ++sent });
	await bridge.onMeshTell({ fromClientId: "unannounced", nickname: "Nova", text: "queued until durable identity" });
	expect(sent).toBe(0);
});


test("stopping the bridge resolves and clears pending unannounced topic waits", async () => {
	const bridge = Object.create(Bridge.prototype) as {
		pendingTopicPeers: Map<unknown, unknown>;
		waitForDurableTopicPeer: (tell: { fromClientId: string; nickname: string }) => Promise<number | null>;
		clearPendingTopicPeers: () => void;
	};
	bridge.pendingTopicPeers = new Map();
	const queued = bridge.waitForDurableTopicPeer({ fromClientId: "stopping-client", nickname: "Nova" });
	expect(bridge.pendingTopicPeers.size).toBe(1);
	bridge.clearPendingTopicPeers();
	expect(await queued).toBeNull();
	expect(bridge.pendingTopicPeers.size).toBe(0);

	
});

test("voice mode defaults on and an explicit off survives reload", () => {
	const path = temporaryStatePath();
	const store = () => new BridgeStateStore(path, () => snapshot());
	expect(store().load().voice.on).toBe(true); // no record → default on
	writeFileSync(path, JSON.stringify({ voice: { on: false, since: 0 } }));
	expect(store().load().voice.on).toBe(false); // explicit off sticks
});
