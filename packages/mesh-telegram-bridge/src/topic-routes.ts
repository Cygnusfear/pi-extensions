/** Telegram forum topic cap for topic name length. */
export const TELEGRAM_TOPIC_NAME_MAX = 128;

/** Contact refreshes lastSeenAt in memory always; state.json is written at this cadence. */
const TOUCH_PERSIST_MIN_MS = 5 * 60_000;

/** The persisted route state for a single mesh agent's Telegram topic. */
export interface AgentTopicRoute {
	topicId: number;
	/** Missing only on a legacy numeric `agentTopic` record awaiting first reconciliation. */
	title?: string;
	/** Last contact (announce/tell) for the topic-lifecycle TTL. Absent on pre-lifecycle records. */
	lastSeenAt?: number;
}

export interface TopicRoutePeer {
	/** Supplied identity: durable mesh id when known, otherwise transient client id. */
	key: string;
	clientId: string;
	meshId?: string;
	nickname: string;
	sessionName?: string;
}

/** Narrow Telegram surface so routing orchestration is independently testable. */
export interface TopicRouteTelegramApi {
	createForumTopic(chatId: number, name: string): Promise<{ message_thread_id: number }>;
	editForumTopic(chatId: number, messageThreadId: number, other: { name: string }): Promise<unknown>;
}

export interface TopicRouteControllerOptions {
	api: TopicRouteTelegramApi;
	/** The live map is the controller's single persisted route owner. */
	routes: Map<string, AgentTopicRoute>;
	chatId: () => number | null;
	onRoutesChanged: () => void;
	/** Inbound topic routing remains Bridge-owned, but receives atomically rekeyed durable metadata. */
	onTopicReady?: (topicId: number, peer: TopicRoutePeer) => void;
	onError?: (operation: "create" | "rename", error: Error, peer: TopicRoutePeer) => void;
}

/**
 * Canonical agent-topic title: exactly `<session name> <agent name>` joined by a
 * single ASCII space. If the session is unavailable, retain only the known agent
 * name rather than manufacturing an untrusted session title.
 */
export function canonicalAgentTopicTitle(sessionName: string | undefined, agentName: string | undefined): string {
	const session = (sessionName ?? "").trim();
	const agent = (agentName ?? "").trim();
	const title = session && agent ? `${session} ${agent}` : session || agent || "agent";
	const chars = Array.from(title);
	return chars.length <= TELEGRAM_TOPIC_NAME_MAX ? chars.join("") : chars.slice(0, TELEGRAM_TOPIC_NAME_MAX).join("");
}

/** Return the desired canonical title when a persisted title must be reconciled. */
export function desiredTopicTitle(
	recordedTitle: string | undefined,
	sessionName: string | undefined,
	agentName: string | undefined,
): string | undefined {
	const desired = canonicalAgentTopicTitle(sessionName, agentName);
	return recordedTitle === desired ? undefined : desired;
}

/**
 * Owns persisted agent-topic routes, transient-client → durable-mesh aliases,
 * and keyed Telegram operations. A tell can arrive before a peer announcement;
 * `announce()` atomically rekeys that transient route and its in-flight promise
 * before any later durable tell can create another topic.
 */
export class TopicRouteController {
	private readonly inFlight = new Map<string, Promise<number | null>>();
	private readonly aliases = new Map<string, string>();
	/** Latest metadata for a canonical key; lets a delayed create publish the durable inbound route. */
	private readonly peers = new Map<string, TopicRoutePeer>();
	private readonly onError: NonNullable<TopicRouteControllerOptions["onError"]>;

	constructor(private readonly options: TopicRouteControllerOptions) {
		this.onError = options.onError ?? (() => {});
	}

	entries(): IterableIterator<[string, AgentTopicRoute]> {
		return this.options.routes.entries();
	}

	has(key: string): boolean {
		return this.options.routes.has(key);
	}

	/** Drop every controller-side reference after a topic is deleted (or already gone). */
	forget(key: string): void {
		if (!this.options.routes.has(key)) return;
		this.options.routes.delete(key);
		for (const [clientId, durableKey] of [...this.aliases]) {
			if (durableKey === key) this.aliases.delete(clientId);
		}
		this.peers.delete(key);
		this.inFlight.delete(key);
		this.options.onRoutesChanged();
	}

	/** Record contact for the lifecycle TTL; persists at most every TOUCH_PERSIST_MIN_MS. */
	private touch(key: string, now = Date.now()): void {
		const route = this.options.routes.get(key);
		if (!route) return;
		const previous = route.lastSeenAt;
		route.lastSeenAt = now;
		if (previous !== undefined && now - previous >= TOUCH_PERSIST_MIN_MS) this.options.onRoutesChanged();
	}

	/** Create or reconcile a route only once its peer has durable identity. */
	async ensure(peer: TopicRoutePeer): Promise<number | null> {
		if (!peer.key || this.options.chatId() === null) return null;
		// A reconnect client id is process-local. It may only use a route after an announcement bound it to mesh identity.
		if (!peer.meshId && !this.aliases.has(peer.clientId)) return null;
		const canonical = this.remember(peer);
		const topicId = await this.coalesce(canonical);
		if (topicId !== null) this.options.onTopicReady?.(topicId, this.peers.get(this.routeKey(canonical)) ?? canonical);
		return topicId;
	}

	/**
	 * Bind an announcement's transient client id to its durable mesh id. This is
	 * the only identity transition: route map, in-flight work, remembered peer,
	 * inbound callback, and persistence all move as one controller operation.
	 * Announcements never create unknown topics; a failed in-flight create waits
	 * for a later tell to retry.
	 */
	async announce(peer: TopicRoutePeer): Promise<void> {
		if (!peer.meshId || !peer.clientId || this.options.chatId() === null) {
			await this.reconcileKnown(peer);
			return;
		}
		const durableKey = peer.meshId;
		const transientKey = this.aliases.get(peer.clientId) ?? peer.clientId;
		const durablePeer: TopicRoutePeer = { ...peer, key: durableKey, meshId: durableKey };
		this.aliases.set(peer.clientId, durableKey);
		this.peers.delete(transientKey);
		this.peers.set(durableKey, durablePeer);

		let changed = false;
		const transientRoute = this.options.routes.get(transientKey);
		const durableRoute = this.options.routes.get(durableKey);
		if (transientKey !== durableKey && transientRoute) {
			this.options.routes.delete(transientKey);
			if (!durableRoute) this.options.routes.set(durableKey, transientRoute);
			changed = true;
		}
		const transientOperation = this.inFlight.get(transientKey);
		if (transientKey !== durableKey && transientOperation) {
			if (!this.inFlight.has(durableKey)) this.inFlight.set(durableKey, transientOperation);
			this.inFlight.delete(transientKey);
		}

		const currentRoute = this.options.routes.get(durableKey);
		// The Bridge receives the durable inbound association before this move is persisted.
		if (currentRoute) {
			this.touch(durableKey);
			this.options.onTopicReady?.(currentRoute.topicId, durablePeer);
		}
		if (changed) this.options.onRoutesChanged();

		const operation = this.inFlight.get(durableKey);
		if (operation) await operation;
		const createdOrMoved = this.options.routes.get(durableKey);
		if (!createdOrMoved) return; // Announcement is not a create retry after failure.
		if (createdOrMoved.title !== canonicalAgentTopicTitle(durablePeer.sessionName, durablePeer.nickname)) {
			await this.coalesce(durablePeer);
		}
		const finalRoute = this.options.routes.get(durableKey);
		if (finalRoute) {
			this.touch(durableKey);
			this.options.onTopicReady?.(finalRoute.topicId, durablePeer);
		}
	}

	/** Reconcile only an already-known route; peer announcements never create topics. */
	async reconcileKnown(peer: TopicRoutePeer): Promise<void> {
		const canonical = this.remember(peer);
		if (!canonical.key || !this.options.routes.has(canonical.key) || this.options.chatId() === null) return;
		await this.coalesce(canonical);
		const route = this.options.routes.get(canonical.key);
		if (route) this.options.onTopicReady?.(route.topicId, canonical);
	}

	private remember(peer: TopicRoutePeer): TopicRoutePeer {
		const key = this.routeKey(peer);
		const canonical: TopicRoutePeer = { ...peer, key, ...(key === peer.meshId ? { meshId: key } : {}) };
		this.peers.set(key, canonical);
		return canonical;
	}

	private routeKey(peer: TopicRoutePeer): string {
		return this.aliases.get(peer.clientId) ?? peer.meshId ?? peer.key;
	}

	private coalesce(peer: TopicRoutePeer): Promise<number | null> {
		const key = this.routeKey(peer);
		const existing = this.inFlight.get(key);
		if (existing) return existing;
		const operation = this.ensureRoute({ ...peer, key });
		this.inFlight.set(key, operation);
		void operation.then(
			() => this.clearOperation(operation),
			() => this.clearOperation(operation),
		);
		return operation;
	}

	private clearOperation(operation: Promise<number | null>): void {
		for (const [key, current] of this.inFlight) {
			if (current === operation) this.inFlight.delete(key);
		}
	}

	private async ensureRoute(peer: TopicRoutePeer): Promise<number | null> {
		const chatId = this.options.chatId();
		if (chatId === null) return null;
		const desired = canonicalAgentTopicTitle(peer.sessionName, peer.nickname);
		const key = this.routeKey(peer);
		const persisted = this.options.routes.get(key);
		if (persisted) {
			if (persisted.title === desired) {
				this.touch(key);
				return persisted.topicId;
			}
			try {
				await this.options.api.editForumTopic(chatId, persisted.topicId, { name: desired });
				const finalKey = this.routeKey(peer);
				this.options.routes.delete(key);
				this.options.routes.set(finalKey, { topicId: persisted.topicId, title: desired });
				this.options.onRoutesChanged();
			} catch (error) {
				this.onError("rename", asError(error), this.peers.get(this.routeKey(peer)) ?? peer);
			}
			this.touch(this.routeKey(peer));
			return persisted.topicId;
		}
		try {
			const created = await this.options.api.createForumTopic(chatId, desired);
			if (!Number.isSafeInteger(created.message_thread_id) || created.message_thread_id <= 0) {
				throw new Error("Telegram returned an invalid forum topic id");
			}
			const finalKey = this.routeKey(peer);
			const established = this.options.routes.get(finalKey);
			// Compatibility guard for an old transient operation: a pre-existing durable route always wins.
			if (established) {
				this.touch(finalKey);
				return established.topicId;
			}
			this.options.routes.set(finalKey, { topicId: created.message_thread_id, title: desired });
			this.options.onRoutesChanged();
			this.touch(finalKey);
			return created.message_thread_id;
		} catch (error) {
			this.onError("create", asError(error), this.peers.get(this.routeKey(peer)) ?? peer);
			return null;
		}
	}
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
