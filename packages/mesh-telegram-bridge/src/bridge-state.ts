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
/** Telegram launched in 2013; older/far-future ledger times are not credible remote-delete input. */
export const EARLIEST_PLAUSIBLE_TELEGRAM_TIMESTAMP_MS = Date.UTC(2013, 0, 1);
const MAX_FUTURE_SENT_AT_MS = 7 * 24 * 60 * 60 * 1000;

export interface AgentRoute {
	clientId: string;
	meshId?: string;
	nickname: string;
}

/** A route created before exact Telegram message identity was stored; reaction-only, never remotely deleted. */
export interface LegacyReactionRoute extends AgentRoute {
	kind: "legacy-reaction-only";
	preview: string;
}

/** A bridge-created message whose trusted chat/id/timestamp make remote deletion safe. */
export interface DeleteEligibleSentMessageRoute extends AgentRoute {
	kind: "delete-eligible";
	preview: string;
	chatId: number;
	messageId: number;
	sentAtMs: number;
}

/** New delete-eligible and legacy reaction-only records are intentionally distinct states. */
export type SentMessageRoute = LegacyReactionRoute | DeleteEligibleSentMessageRoute;

/** The one persisted agent-topic record; title is absent only on migrated numeric records. */
export interface AgentTopicRoute {
	topicId: number;
	title?: string;
}

export interface TelegramContactState {
	on: boolean;
	message: string;
	since: number;
}

/** Bridge-side TTS voice mode: when on, agent tells are also spoken to the Hooman. */
export interface VoiceModeState {
	on: boolean;
	since: number;
}

export interface BridgeStateSnapshot {
	broadcastTopicId: number | null;
	agentTopics: Array<readonly [string, AgentTopicRoute]>;
	/** Solely inbound Telegram-topic → mesh-agent routing. */
	topicAgents: Array<readonly [number, AgentRoute]>;
	/** Keyed by `(chatId,messageId)`, never by message id alone. */
	sentMessages: Array<readonly [string, DeleteEligibleSentMessageRoute]>;
	/** Old numeric ids remain readable for reactions, but cannot become deletion records. */
	legacySentMessages: Array<readonly [number, LegacyReactionRoute]>;
	telegramContact: TelegramContactState;
	/** Voice-mode pref set by the Hooman ("speak to me" / "text only" / /voice). */
	voice: VoiceModeState;
	/** Last proactive credit alert timestamp for the TTS provider (null = never). */
	ttsCreditNotifiedAt: number | null;
	/** Last proactive credit alert timestamp per transcription provider. */
	transcriptionCreditNotifications: Array<readonly [string, number]>;
}

interface PersistedBridgeState {
	broadcastTopicId?: number;
	/** Numeric values are the legacy topic schema; object values are current. */
	agentTopic: Record<string, number | AgentTopicRoute>;
	topicAgent: Record<string, AgentRoute>;
	afk?: TelegramContactState;
	voice?: VoiceModeState;
	ttsCreditNotifiedAt?: unknown;
	/** Old records without a valid tuple stay legacy reaction-only during migration. */
	sentMessages?: unknown[];
	legacySentMessages?: unknown[];
	transcriptionCreditNotifications?: Record<string, unknown>;
}

function emptyState(): BridgeStateSnapshot {
	return {
		broadcastTopicId: null,
		agentTopics: [],
		topicAgents: [],
		sentMessages: [],
		legacySentMessages: [],
		telegramContact: { on: false, message: "", since: 0 },
		/** Voice mode is ON by default — the Hooman opted in by wiring fish.audio; "text only" turns it off. */
		voice: { on: true, since: 0 },
		ttsCreditNotifiedAt: null,
		transcriptionCreditNotifications: [],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeTelegramChatId(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value !== 0;
}

function isSafeTelegramMessageId(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Reject malformed, fractional, stale-century, and implausibly future persisted timestamps. */
export function isPlausibleSentAtMs(value: unknown, now = Date.now()): value is number {
	return typeof value === "number"
		&& Number.isSafeInteger(value)
		&& value >= EARLIEST_PLAUSIBLE_TELEGRAM_TIMESTAMP_MS
		&& value <= now + MAX_FUTURE_SENT_AT_MS;
}

/** Durable identity used by both retention and live reaction lookup. */
export function sentMessageRouteKey(chatId: number, messageId: number): string | undefined {
	return isSafeTelegramChatId(chatId) && isSafeTelegramMessageId(messageId) ? `${chatId}:${messageId}` : undefined;
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

function parseLegacyReactionRoute(value: unknown): LegacyReactionRoute | null {
	if (!isRecord(value) || typeof value.preview !== "string") return null;
	const route = parseAgentRoute(value);
	return route ? { ...route, kind: "legacy-reaction-only", preview: value.preview } : null;
}

function parseDeleteEligibleRoute(value: unknown, now = Date.now()): DeleteEligibleSentMessageRoute | null {
	if (!isRecord(value) || typeof value.preview !== "string") return null;
	const route = parseAgentRoute(value);
	if (!route || !isSafeTelegramChatId(value.chatId) || !isSafeTelegramMessageId(value.messageId) || !isPlausibleSentAtMs(value.sentAtMs, now)) return null;
	return {
		...route,
		kind: "delete-eligible",
		preview: value.preview,
		chatId: value.chatId,
		messageId: value.messageId,
		sentAtMs: value.sentAtMs,
	};
}

function parseAgentTopicRoute(value: unknown): AgentTopicRoute | null {
	if (isSafeTelegramMessageId(value)) return { topicId: value };
	if (!isRecord(value) || !isSafeTelegramMessageId(value.topicId)) return null;
	return {
		topicId: value.topicId,
		...(typeof value.title === "string" && value.title.trim() ? { title: value.title } : {}),
	};
}

/** Upsert a delete-eligible route while retaining insertion ordering. */
export function recordSentMessageRoute(
	routes: Map<string, DeleteEligibleSentMessageRoute>,
	route: DeleteEligibleSentMessageRoute,
	limit = MAX_SENT_MESSAGE_ROUTES,
): void {
	const key = sentMessageRouteKey(route.chatId, route.messageId);
	if (!key || !isPlausibleSentAtMs(route.sentAtMs) || limit <= 0) return;
	routes.delete(key);
	routes.set(key, route);
	while (routes.size > limit) {
		const oldest = routes.keys().next().value;
		if (oldest === undefined) break;
		routes.delete(oldest);
	}
}

/** Upsert a legacy route without ever upgrading it to deletion eligibility. */
export function recordLegacyReactionRoute(
	routes: Map<number, LegacyReactionRoute>,
	messageId: number,
	route: LegacyReactionRoute,
	limit = MAX_SENT_MESSAGE_ROUTES,
): void {
	if (!isSafeTelegramMessageId(messageId) || limit <= 0) return;
	routes.delete(messageId);
	routes.set(messageId, route);
	while (routes.size > limit) {
		const oldest = routes.keys().next().value;
		if (oldest === undefined) break;
		routes.delete(oldest);
	}
}

/** Preserve the historical 2,000-record cap across both safe and legacy ledgers. */
export function enforceSentMessageRouteCap(
	routes: Map<string, DeleteEligibleSentMessageRoute>,
	legacyRoutes: Map<number, LegacyReactionRoute>,
	limit = MAX_SENT_MESSAGE_ROUTES,
): void {
	while (routes.size + legacyRoutes.size > limit) {
		const oldestLegacy = legacyRoutes.keys().next().value;
		if (oldestLegacy !== undefined) {
			legacyRoutes.delete(oldestLegacy);
			continue;
		}
		const oldest = routes.keys().next().value;
		if (oldest === undefined) return;
		routes.delete(oldest);
	}
}

function parseState(value: unknown): BridgeStateSnapshot {
	if (!isRecord(value)) return emptyState();
	const state = emptyState();

	if (isSafeTelegramMessageId(value.broadcastTopicId)) state.broadcastTopicId = value.broadcastTopicId;
	const legacyTitles = new Map<number, string>();
	if (isRecord(value.topicTitle)) {
		for (const [rawTopicId, rawTitle] of Object.entries(value.topicTitle)) {
			const topicId = Number(rawTopicId);
			if (isSafeTelegramMessageId(topicId) && typeof rawTitle === "string" && rawTitle.trim()) legacyTitles.set(topicId, rawTitle);
		}
	}
	if (isRecord(value.agentTopic)) {
		for (const [agentId, rawRoute] of Object.entries(value.agentTopic)) {
			const route = parseAgentTopicRoute(rawRoute);
			if (!route) continue;
			state.agentTopics.push([agentId, route.title === undefined && legacyTitles.has(route.topicId)
				? { ...route, title: legacyTitles.get(route.topicId) }
				: route]);
		}
	}
	if (isRecord(value.topicAgent)) {
		for (const [rawTopicId, rawRoute] of Object.entries(value.topicAgent)) {
			const topicId = Number(rawTopicId);
			const route = parseAgentRoute(rawRoute);
			if (isSafeTelegramMessageId(topicId) && route) state.topicAgents.push([topicId, route]);
		}
	}
	if (isRecord(value.afk) && value.afk.on === true) {
		state.telegramContact = {
			on: true,
			message: typeof value.afk.message === "string" ? value.afk.message : "Telegram contact reminder",
			since: isPlausibleSentAtMs(value.afk.since) ? value.afk.since : Date.now(),
		};
	}
	if (isRecord(value.voice) && (value.voice.on === true || value.voice.on === false)) {
		state.voice = value.voice.on
			? { on: true, since: isPlausibleSentAtMs(value.voice.since) ? value.voice.since : Date.now() }
			: { on: false, since: 0 };
	}
	if (isPlausibleSentAtMs(value.ttsCreditNotifiedAt)) state.ttsCreditNotifiedAt = value.ttsCreditNotifiedAt;
	if (isRecord(value.transcriptionCreditNotifications)) {
		for (const [provider, rawTimestamp] of Object.entries(value.transcriptionCreditNotifications)) {
			if (!provider.trim() || !isPlausibleSentAtMs(rawTimestamp)) continue;
			state.transcriptionCreditNotifications.push([provider, rawTimestamp]);
		}
	}

	const routes = new Map<string, DeleteEligibleSentMessageRoute>();
	const legacyRoutes = new Map<number, LegacyReactionRoute>();
	if (Array.isArray(value.sentMessages)) {
		for (const raw of value.sentMessages) {
			// Only a complete valid tuple becomes destructive. A legacy numeric id is never coerced.
			const eligible = parseDeleteEligibleRoute(raw);
			if (eligible) {
				recordSentMessageRoute(routes, eligible);
				continue;
			}
			if (!isRecord(raw) || !isSafeTelegramMessageId(raw.messageId)) continue;
			const legacy = parseLegacyReactionRoute(raw);
			if (legacy) recordLegacyReactionRoute(legacyRoutes, raw.messageId, legacy);
		}
	}
	if (Array.isArray(value.legacySentMessages)) {
		for (const raw of value.legacySentMessages) {
			if (!isRecord(raw) || !isSafeTelegramMessageId(raw.messageId)) continue;
			const legacy = parseLegacyReactionRoute(raw);
			if (legacy) recordLegacyReactionRoute(legacyRoutes, raw.messageId, legacy);
		}
	}
	enforceSentMessageRouteCap(routes, legacyRoutes);
	state.sentMessages = [...routes.entries()];
	state.legacySentMessages = [...legacyRoutes.entries()];
	return state;
}

function serializeState(state: BridgeStateSnapshot): PersistedBridgeState {
	const persisted: PersistedBridgeState = {
		agentTopic: Object.fromEntries(state.agentTopics),
		topicAgent: Object.fromEntries(state.topicAgents),
		sentMessages: state.sentMessages.map(([, route]) => route),
		legacySentMessages: state.legacySentMessages.map(([messageId, route]) => ({ messageId, ...route })),
		transcriptionCreditNotifications: Object.fromEntries(state.transcriptionCreditNotifications),
	};
	if (state.broadcastTopicId !== null) persisted.broadcastTopicId = state.broadcastTopicId;
	if (state.telegramContact.on) persisted.afk = state.telegramContact;
	persisted.voice = state.voice;
	if (state.ttsCreditNotifiedAt !== null) persisted.ttsCreditNotifiedAt = state.ttsCreditNotifiedAt;
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

/** Owns bridge state-file I/O; hot-path saves are dirty-bit coalesced. */
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

	/** Best-effort synchronous save for ordinary bridge state updates; errors remain reported via onError. */
	saveNow(): boolean {
		this.dirty = true;
		this.cancelTimer();
		return this.commit();
	}

	/**
	 * Transactional synchronous persistence boundary. Callers that change an
	 * external authority (such as the configured Telegram chat) must use this
	 * method and refuse that authority transition when the atomic state write fails.
	 */
	saveNowOrThrow(): void {
		this.dirty = true;
		this.cancelTimer();
		this.commitOrThrow();
	}

	flush(): boolean {
		this.cancelTimer();
		return this.commit();
	}

	private cancelTimer(): void {
		if (this.timer === undefined) return;
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	private commit(): boolean {
		if (!this.dirty) return true;
		try {
			this.commitOrThrow();
			return true;
		} catch (error) {
			this.onError("save", error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	}

	private commitOrThrow(): void {
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
			throw error;
		}
	}
}
