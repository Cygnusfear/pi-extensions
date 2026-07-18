import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";

export const MAX_SENT_MESSAGE_ROUTES = 2_000;

export interface AgentRoute {
	clientId: string;
	meshId?: string;
	nickname: string;
}

export interface SentMessageRoute extends AgentRoute {
	preview: string;
}

export interface TelegramContactState {
	on: boolean;
	message: string;
	since: number;
}

export interface BridgeStateSnapshot {
	broadcastTopicId: number | null;
	agentTopics: Array<readonly [string, number]>;
	topicAgents: Array<readonly [number, AgentRoute]>;
	telegramContact: TelegramContactState;
	sentMessages: Array<readonly [number, SentMessageRoute]>;
}

interface PersistedSentMessage extends SentMessageRoute {
	messageId: number;
}

interface PersistedBridgeState {
	broadcastTopicId?: number;
	agentTopic: Record<string, number>;
	topicAgent: Record<string, AgentRoute>;
	afk?: TelegramContactState;
	sentMessages?: PersistedSentMessage[];
}

function emptyState(): BridgeStateSnapshot {
	return {
		broadcastTopicId: null,
		agentTopics: [],
		topicAgents: [],
		telegramContact: { on: false, message: "", since: 0 },
		sentMessages: [],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseAgentRoute(value: unknown): AgentRoute | null {
	if (!isRecord(value) || typeof value.nickname !== "string") return null;
	if (value.clientId !== undefined && typeof value.clientId !== "string") return null;
	if (value.meshId !== undefined && typeof value.meshId !== "string") return null;
	return {
		clientId: value.clientId ?? "",
		meshId: value.meshId,
		nickname: value.nickname,
	};
}

/** Upsert a route while retaining only the newest message ids in insertion order. */
export function recordSentMessageRoute(
	routes: Map<number, SentMessageRoute>,
	messageId: number,
	route: SentMessageRoute,
	limit = MAX_SENT_MESSAGE_ROUTES,
): void {
	if (!Number.isSafeInteger(messageId) || messageId <= 0 || limit <= 0) return;
	routes.delete(messageId);
	routes.set(messageId, route);
	while (routes.size > limit) {
		const oldest = routes.keys().next().value;
		if (oldest === undefined) break;
		routes.delete(oldest);
	}
}

function parseState(value: unknown): BridgeStateSnapshot {
	if (!isRecord(value)) return emptyState();
	const state = emptyState();

	if (typeof value.broadcastTopicId === "number" && Number.isSafeInteger(value.broadcastTopicId)) {
		state.broadcastTopicId = value.broadcastTopicId;
	}
	if (isRecord(value.agentTopic)) {
		for (const [agentId, topicId] of Object.entries(value.agentTopic)) {
			if (typeof topicId === "number" && Number.isSafeInteger(topicId)) {
				state.agentTopics.push([agentId, topicId]);
			}
		}
	}
	if (isRecord(value.topicAgent)) {
		for (const [rawTopicId, rawRoute] of Object.entries(value.topicAgent)) {
			const topicId = Number(rawTopicId);
			const route = parseAgentRoute(rawRoute);
			if (Number.isSafeInteger(topicId) && route) state.topicAgents.push([topicId, route]);
		}
	}
	if (isRecord(value.afk) && value.afk.on === true) {
		state.telegramContact = {
			on: true,
			message: typeof value.afk.message === "string" ? value.afk.message : "Telegram contact reminder",
			since: typeof value.afk.since === "number" && Number.isFinite(value.afk.since)
				? value.afk.since
				: Date.now(),
		};
	}
	if (Array.isArray(value.sentMessages)) {
		const routes = new Map<number, SentMessageRoute>();
		for (const raw of value.sentMessages) {
			if (!isRecord(raw) || typeof raw.messageId !== "number" || typeof raw.preview !== "string") continue;
			const route = parseAgentRoute(raw);
			if (!route) continue;
			recordSentMessageRoute(routes, raw.messageId, { ...route, preview: raw.preview });
		}
		state.sentMessages = [...routes.entries()];
	}
	return state;
}

function serializeState(state: BridgeStateSnapshot): PersistedBridgeState {
	const persisted: PersistedBridgeState = {
		agentTopic: Object.fromEntries(state.agentTopics),
		topicAgent: Object.fromEntries(state.topicAgents),
		sentMessages: state.sentMessages.map(([messageId, route]) => ({ messageId, ...route })),
	};
	if (state.broadcastTopicId !== null) persisted.broadcastTopicId = state.broadcastTopicId;
	if (state.telegramContact.on) persisted.afk = state.telegramContact;
	return persisted;
}

export interface BridgeStateStoreOptions {
	coalesceMs?: number;
	onError?: (operation: "load" | "save", error: Error) => void;
}

/** Build a unique temp path beside its destination so rename remains atomic. */
export function stateTemporaryPath(destination: string): string {
	return join(
		dirname(destination),
		`.${basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
	);
}

/**
 * Owns the bridge's state-file I/O. Hot-path saves are dirty-bit coalesced and
 * snapshot the live maps only when a write actually occurs.
 */
export class BridgeStateStore {
	private readonly coalesceMs: number;
	private readonly onError: (operation: "load" | "save", error: Error) => void;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private dirty = false;

	constructor(
		private readonly path: string,
		private readonly snapshot: () => BridgeStateSnapshot,
		options: BridgeStateStoreOptions = {},
	) {
		this.coalesceMs = options.coalesceMs ?? 100;
		this.onError = options.onError ?? (() => {});
	}

	load(): BridgeStateSnapshot {
		try {
			if (!existsSync(this.path)) return emptyState();
			const parsed: unknown = JSON.parse(readFileSync(this.path, "utf8"));
			return parseState(parsed);
		} catch (error) {
			this.onError("load", error instanceof Error ? error : new Error(String(error)));
			return emptyState();
		}
	}

	requestSave(): void {
		this.dirty = true;
		if (this.timer !== undefined) return;
		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.commit();
		}, this.coalesceMs);
	}

	saveNow(): void {
		this.dirty = true;
		this.cancelTimer();
		this.commit();
	}

	flush(): void {
		this.cancelTimer();
		this.commit();
	}

	private cancelTimer(): void {
		if (this.timer === undefined) return;
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	private commit(): void {
		if (!this.dirty) return;
		const temporaryPath = stateTemporaryPath(this.path);
		try {
			mkdirSync(dirname(this.path), { recursive: true });
			writeFileSync(temporaryPath, JSON.stringify(serializeState(this.snapshot()), null, 2), {
				encoding: "utf8",
				mode: 0o600,
			});
			renameSync(temporaryPath, this.path);
			this.dirty = false;
		} catch (error) {
			try { rmSync(temporaryPath, { force: true }); } catch {}
			this.onError("save", error instanceof Error ? error : new Error(String(error)));
		}
	}
}
