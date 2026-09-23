/**
 * Topic lifecycle — reap Telegram forum topics for agents that have been gone
 * long enough.
 *
 * The bridge can create and rename agent topics but, before this module, never
 * deleted them: every short-lived agent left an empty topic shell behind, and
 * the Hooman's group grew to 357 topics of which ~350 belonged to dead agents.
 * The mesh-side leak (short-lived bridges) is bounded elsewhere; this is the
 * containment policy that keeps the group finite no matter what the mesh
 * produces.
 *
 * A route is eligible only when BOTH hold:
 *   1. its recorded last contact is older than the TTL, and
 *   2. no live peer currently claims the route's key.
 * Pre-lifecycle routes carry no lastSeenAt; the bridge stamps them at load so
 * the first sweep grants a full TTL instead of deleting every legacy topic.
 */
import type { AgentTopicRoute } from "./topic-routes.ts";

/** Default: an agent unseen for this long loses its topic. It is recreated on next contact. */
export const TOPIC_TTL_DEFAULT_MS = 7 * 24 * 60 * 60_000;
/** Floor for MESH_TG_TOPIC_TTL_DAYS values below 1 day, so a typo cannot nuke live topics. */
export const TOPIC_TTL_MIN_MS = 24 * 60 * 60_000;
/** First sweep waits so forum detection and the first announces have settled. */
export const TOPIC_SWEEP_INITIAL_DELAY_MS = 60_000;
export const TOPIC_SWEEP_INTERVAL_MS = 6 * 60 * 60_000;
/** Bound per sweep so a mass cleanup cannot spam the Telegram API in one burst. */
export const TOPIC_SWEEP_DELETE_CAP = 25;
/** Telegram pacing between topic deletions (the Hooman's manual cleanup used 0.55s). */
export const TOPIC_DELETE_PACING_MS = 1_000;
/** Env name: days an unseen agent keeps its topic; 0 disables the sweep. */
export const TOPIC_TTL_ENV = "MESH_TG_TOPIC_TTL_DAYS";

/** Parse MESH_TG_TOPIC_TTL_DAYS. Unset/invalid → default; 0/negative → disabled (null). */
export function topicTtlMsFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
	const raw = env[TOPIC_TTL_ENV]?.trim();
	if (!raw) return TOPIC_TTL_DEFAULT_MS;
	const days = Number(raw);
	if (!Number.isFinite(days)) return TOPIC_TTL_DEFAULT_MS;
	if (days <= 0) return null;
	return Math.max(TOPIC_TTL_MIN_MS, Math.round(days * 24 * 60 * 60_000));
}

export interface TopicLifecycleTelegramApi {
	deleteForumTopic(chatId: number, topicId: number): Promise<unknown>;
}

export interface TopicSweepResult {
	/** Routes past the TTL with no live peer — the whole eligible set, before the cap. */
	considered: number;
	deleted: number;
	/** Telegram reports the topic no longer exists; the route was dropped without a delete. */
	alreadyGone: number;
	/** Deletes that failed for another reason; the route is kept for the next sweep. */
	failed: number;
	/** Eligible by age but a live peer claims the key right now. */
	skippedLive: number;
}

export interface TopicLifecycleOptions {
	api: TopicLifecycleTelegramApi;
	routes: Map<string, AgentTopicRoute>;
	chatId: () => number | null;
	/** Remove the route (and every controller-side reference) after it is gone. */
	forget: (key: string) => void;
	/** True while a peer currently claims this key (announced within the sidecar's liveness window). */
	isLive: (key: string) => boolean;
	/** TTL in ms; null disables the sweep entirely. */
	ttlMs: number | null;
	onReap?: (key: string, route: AgentTopicRoute, ageMs: number) => void;
	onAlreadyGone?: (key: string, route: AgentTopicRoute) => void;
	onError?: (key: string, route: AgentTopicRoute, error: Error) => void;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
	deleteCap?: number;
	initialDelayMs?: number;
	intervalMs?: number;
}

/** Telegram says the topic no longer exists — drop it locally instead of retrying forever. */
export function isTopicAlreadyGoneError(error: Error): boolean {
	return /TOPIC_ID_INVALID|message thread not found|topic.*(not found|deleted)/i.test(
		error.message,
	);
}

const systemSleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Timer-driven owner of the reaping policy. Deletion is deliberately cautious:
 * one sweep can remove at most `deleteCap` topics, oldest first, paced, and a
 * non-"already gone" failure keeps the route so the next sweep can retry it.
 */
export class TopicLifecycleController {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private running = false;
	private stopped = true;

	constructor(private readonly options: TopicLifecycleOptions) {}

	get enabled(): boolean {
		return this.options.ttlMs !== null;
	}

	start(): void {
		if (!this.enabled || !this.stopped) return;
		this.stopped = false;
		this.schedule(this.options.initialDelayMs ?? TOPIC_SWEEP_INITIAL_DELAY_MS);
	}

	stop(): void {
		this.stopped = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
	}

	private schedule(delayMs: number): void {
		if (this.stopped) return;
		this.timer = setTimeout(() => {
			this.timer = undefined;
			void this.run();
		}, delayMs);
	}

	private async run(): Promise<void> {
		if (this.stopped) return;
		try {
			await this.sweep();
		} catch (error) {
			// A sweep must never kill the bridge; report and continue on the interval.
			console.warn(
				"[bridge] topic lifecycle sweep failed:",
				error instanceof Error ? error.message : String(error),
			);
		}
		this.schedule(this.options.intervalMs ?? TOPIC_SWEEP_INTERVAL_MS);
	}

	/** One pass. Production calls it on the timer; tests call it directly. */
	async sweep(): Promise<TopicSweepResult> {
		const empty: TopicSweepResult = {
			considered: 0,
			deleted: 0,
			alreadyGone: 0,
			failed: 0,
			skippedLive: 0,
		};
		const ttlMs = this.options.ttlMs;
		if (ttlMs === null || this.running) return empty;
		const chatId = this.options.chatId();
		if (chatId === null) return empty;
		this.running = true;
		try {
			const now = (this.options.now ?? Date.now)();
			const due: Array<{ key: string; route: AgentTopicRoute; ageMs: number }> = [];
			let skippedLive = 0;
			for (const [key, route] of this.options.routes) {
				// Pre-lifecycle records (no lastSeenAt) are stamped at bridge load; skip any stragglers.
				if (typeof route.lastSeenAt !== "number") continue;
				const ageMs = now - route.lastSeenAt;
				if (ageMs < ttlMs) continue;
				if (this.options.isLive(key)) {
					skippedLive++;
					continue;
				}
				due.push({ key, route, ageMs });
			}
			// Oldest first: the longest-dead topics are the safest to remove.
			due.sort((a, b) => b.ageMs - a.ageMs);
			const cap = Math.max(1, this.options.deleteCap ?? TOPIC_SWEEP_DELETE_CAP);
			const sleep = this.options.sleep ?? systemSleep;
			const result: TopicSweepResult = {
				considered: due.length,
				deleted: 0,
				alreadyGone: 0,
				failed: 0,
				skippedLive,
			};
			const batch = due.slice(0, cap);
			for (let i = 0; i < batch.length; i++) {
				const { key, route, ageMs } = batch[i];
				try {
					await this.options.api.deleteForumTopic(chatId, route.topicId);
					this.options.forget(key);
					result.deleted++;
					this.options.onReap?.(key, route, ageMs);
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					if (isTopicAlreadyGoneError(err)) {
						this.options.forget(key);
						result.alreadyGone++;
						this.options.onAlreadyGone?.(key, route);
					} else {
						result.failed++;
						this.options.onError?.(key, route, err);
					}
				}
				if (i < batch.length - 1) await sleep(TOPIC_DELETE_PACING_MS);
			}
			return result;
		} finally {
			this.running = false;
		}
	}
}
