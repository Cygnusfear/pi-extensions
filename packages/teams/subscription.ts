/**
 * teams.on — typed, thenable subscription over the TeamLeader PollEvent stream.
 *
 * Design goals:
 * - Ergonomic: `await teams.on("fixer", "completed")` for one-shot, `.each(cb)`
 *   for streams, `.wake()` to trigger a coordinator turn from a background promise.
 * - Safe: automatic unsubscribe on first match (unless .each is used), on timeout,
 *   and on abort. No listener leaks.
 * - Composable: thenable — works with `await`, `Promise.race`, `Promise.all`.
 * - No polling: rides the leader's existing PollEvent stream via subscribeToEvents.
 *
 * This file is host-side. The sandbox gets a wrapper function registered via
 * registerSandboxFn("teamsOn", ...) that constructs these objects.
 */

import type { TeamLeader } from "./leader.js";
import type { PollEvent, WorkerHandle } from "./types.js";

export type PollEventType = PollEvent["type"];

/**
 * DOM-style event wrapper dispatched to subscription listeners.
 *
 * Mirrors the browser Event API:
 *   - preventDefault()        — suppress the leader's default notifyLLM batch
 *                               (i.e. don't also wake the coordinator for this event)
 *   - stopPropagation()       — stop later subscription listeners from seeing it
 *   - stopImmediatePropagation() — alias (subscriptions run in a single pass, no
 *                                  capture/bubble distinction)
 *   - defaultPrevented        — read-only flag, true after any handler called preventDefault
 *   - propagationStopped      — read-only flag, true after any handler called stopPropagation
 *
 * Must be called SYNCHRONOUSLY inside a handler callback. Calling preventDefault()
 * on an awaited-value AFTER the dispatch loop has finished is a no-op.
 */
export type TeamsEvent = PollEvent & {
	preventDefault(): void;
	stopPropagation(): void;
	stopImmediatePropagation(): void;
	readonly defaultPrevented: boolean;
	readonly propagationStopped: boolean;
};

/** Mint a wrapped event that carries DOM-style flags + methods. */
export function wrapPollEvent(event: PollEvent): TeamsEvent {
	let defaultPrevented = false;
	let propagationStopped = false;
	return Object.assign({}, event, {
		preventDefault(): void {
			defaultPrevented = true;
		},
		stopPropagation(): void {
			propagationStopped = true;
		},
		stopImmediatePropagation(): void {
			propagationStopped = true;
		},
		get defaultPrevented() {
			return defaultPrevented;
		},
		get propagationStopped() {
			return propagationStopped;
		},
	}) as TeamsEvent;
}

/** Full filter object for teams.on({...}). */
export interface EventFilter {
	/** Match a specific worker by name. */
	name?: string;
	/** Match a specific PollEvent type. */
	type?: PollEventType;
	/** Match against event.comment (only meaningful when type omitted or "comment").
	 *  String → substring match. RegExp → regex test. */
	comment?: string | RegExp;
	/** Fully custom predicate. Runs after all other filters. */
	predicate?: (event: PollEvent) => boolean;
	/**
	 * If a worker is already in the requested terminal state at subscription time,
	 * synthesize an immediate "completed"/"failed"/"warning" event rather than
	 * hanging forever. Defaults to true.
	 */
	matchCurrent?: boolean;
}

/** Callback signature — receives the wrapped TeamsEvent (PollEvent + DOM methods). */
export type EventCallback = (event: TeamsEvent) => void;

/** Wake message builder — called when event fires. */
export type WakeMessage = string | ((event: TeamsEvent) => string);

/**
 * TeamsSubscription — returned by teams.on(...). Thenable + chainable helpers.
 *
 * Lifecycle:
 *   - Constructed → subscribed to leader immediately.
 *   - First match → promise resolves, "each" callbacks fire, wake sent (if set).
 *   - If .each() attached → keeps running until unsubscribe() / timeout / abort.
 *   - If .each() NOT attached → auto-unsubscribes after first match.
 */
export class TeamsSubscription implements PromiseLike<TeamsEvent> {
	private unsub: () => void;
	private settled = false;
	private settledValue: TeamsEvent | null = null;
	private settledError: Error | null = null;
	private resolvers: Array<(event: TeamsEvent) => void> = [];
	private rejecters: Array<(err: Error) => void> = [];
	private eachCallbacks: EventCallback[] = [];
	private wakeMessage: WakeMessage | null = null;
	private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	private disposed = false;
	/** Pre-registered: call preventDefault() on every matched event. */
	private autoPreventDefault = false;
	/** Pre-registered: call stopPropagation() on every matched event. */
	private autoStopPropagation = false;

	constructor(
		private readonly leader: TeamLeader,
		private readonly filter: EventFilter,
		private readonly predicate: (event: PollEvent) => boolean,
		private readonly sendUserMessage: ((content: string) => void) | null,
		abortSignal?: AbortSignal,
	) {
		// Leader hands us pre-wrapped TeamsEvents so preventDefault/stopPropagation
		// calls from any listener affect the single shared wrapper.
		this.unsub = leader.subscribeToEvents((event) => this.handle(event as TeamsEvent));

		// Abort → reject + cleanup. Listener is leak-free because we unsubscribe.
		if (abortSignal) {
			const onAbort = () => {
				if (this.settled) return;
				this.rejectWith(new Error("teams.on aborted"));
			};
			if (abortSignal.aborted) onAbort();
			else abortSignal.addEventListener("abort", onAbort, { once: true });
		}

		// Matches-current check: if we're waiting for a specific worker + terminal
		// type and the worker is already in that state, synthesize an event.
		// Defaults on. Opt out with { matchCurrent: false }.
		if (filter.matchCurrent !== false && filter.name && filter.type) {
			this.checkCurrent(filter.name, filter.type);
		}
	}

	private checkCurrent(name: string, type: PollEventType): void {
		const worker = this.leader.getWorker(name);
		if (!worker) return;

		const synthetic = synthesizeFromWorker(worker, type);
		if (synthetic) {
			// Fire asynchronously so callers have a chance to attach .then/.each/.wake
			// before the event arrives. Synthetic events are freshly wrapped — since
			// they don't go through the leader's dispatch loop, preventDefault() on
			// them is purely informational (there's no default action to suppress).
			queueMicrotask(() => this.handle(wrapPollEvent(synthetic)));
		}
	}

	private handle(event: TeamsEvent): void {
		if (this.disposed) return;
		if (!this.predicate(event)) return;

		// Pre-registered DOM-style suppressions fire first so .each() callbacks
		// see defaultPrevented / propagationStopped already set.
		if (this.autoPreventDefault) event.preventDefault();
		if (this.autoStopPropagation) event.stopPropagation();

		// Fire each callbacks every match.
		for (const cb of this.eachCallbacks) {
			try {
				cb(event);
			} catch (err) {
				console.warn("[teams.on] each callback threw:", err instanceof Error ? err.message : String(err));
			}
		}

		// Resolve one-shot promise on first match.
		if (!this.settled) {
			this.settled = true;
			this.settledValue = event;
			for (const r of this.resolvers) {
				try { r(event); } catch { /* user handler */ }
			}
			this.resolvers = [];
			this.rejecters = [];
			if (this.timeoutHandle) {
				clearTimeout(this.timeoutHandle);
				this.timeoutHandle = null;
			}
		}

		// Wake coordinator turn if configured.
		if (this.wakeMessage !== null && this.sendUserMessage) {
			const msg =
				typeof this.wakeMessage === "function" ? this.wakeMessage(event) : this.wakeMessage;
			try {
				this.sendUserMessage(msg);
			} catch (err) {
				console.warn("[teams.on] wake send failed:", err instanceof Error ? err.message : String(err));
			}
		}

		// If nobody wants a stream, clean up.
		if (this.eachCallbacks.length === 0) {
			this.dispose();
		}
	}

	private rejectWith(err: Error): void {
		if (this.settled) return;
		this.settled = true;
		this.settledError = err;
		for (const r of this.rejecters) {
			try { r(err); } catch { /* user handler */ }
		}
		this.resolvers = [];
		this.rejecters = [];
		this.dispose();
	}

	// ─── Thenable protocol ───

	then<TResult1 = TeamsEvent, TResult2 = never>(
		onfulfilled?: ((value: TeamsEvent) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		const p = new Promise<TeamsEvent>((resolve, reject) => {
			if (this.settled) {
				// Already settled — replay the resolved/rejected state.
				if (this.settledError) reject(this.settledError);
				else if (this.settledValue) resolve(this.settledValue);
				else reject(new Error("teams.on subscription settled with no value"));
				return;
			}
			this.resolvers.push(resolve);
			this.rejecters.push(reject);
		});
		return p.then(onfulfilled ?? undefined, onrejected ?? undefined);
	}

	// ─── Chainable helpers ───

	/** Register a streaming callback. Fires on every matching event until unsubscribed. */
	each(callback: EventCallback): this {
		this.eachCallbacks.push(callback);
		return this;
	}

	/**
	 * When an event matches, also trigger a coordinator turn with the given
	 * message (or a default). Works even after the enclosing execute_code block
	 * has returned — this is the "background-wake" pattern.
	 */
	wake(message?: WakeMessage): this {
		this.wakeMessage = message ?? defaultWakeMessage(this.filter);
		return this;
	}

	/** Auto-reject if no matching event arrives within ms. */
	timeout(ms: number): this {
		if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
		this.timeoutHandle = setTimeout(() => {
			this.rejectWith(new Error(`teams.on timeout after ${ms}ms`));
		}, ms);
		return this;
	}

	/**
	 * DOM-style: pre-register preventDefault() on every matched event.
	 * Suppresses the leader's default notifyLLM batch wake for this event,
	 * so the coordinator is NOT triggered again from the leader side.
	 *
	 * Ergonomic for: "I'm handling this event via .wake() / .each() and I
	 * don't want a duplicate turn from the leader's batch queue".
	 *
	 * Equivalent to:
	 *   teams.on(...).each(e => e.preventDefault())
	 */
	preventDefault(): this {
		this.autoPreventDefault = true;
		return this;
	}

	/**
	 * DOM-style: pre-register stopPropagation() on every matched event.
	 * Prevents later subscription listeners from seeing the event.
	 *
	 * Equivalent to:
	 *   teams.on(...).each(e => e.stopPropagation())
	 */
	stopPropagation(): this {
		this.autoStopPropagation = true;
		return this;
	}

	/** Manually stop receiving events. Idempotent. */
	unsubscribe(): void {
		this.dispose();
	}

	/** Alias for unsubscribe. */
	cancel(): void {
		this.dispose();
	}

	private dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		try { this.unsub(); } catch { /* already gone */ }
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
	}
}

// ─── Helpers ───

function defaultWakeMessage(filter: EventFilter): string {
	const who = filter.name ? `worker "${filter.name}"` : "a worker";
	const what = filter.type ? `fired "${filter.type}"` : "produced an event";
	return `[teams.on] ${who} ${what} — resuming.`;
}

/**
 * Build a predicate from the overloaded teams.on() arguments.
 * Accepts:
 *   buildPredicate("fixer")                  → match worker name only
 *   buildPredicate("fixer", "completed")     → match worker + event type
 *   buildPredicate({ ...filter })            → full filter object
 */
export function buildPredicate(
	target: string | EventFilter,
	eventType?: PollEventType,
): { filter: EventFilter; predicate: (event: PollEvent) => boolean } {
	const filter: EventFilter =
		typeof target === "string"
			? eventType
				? { name: target, type: eventType }
				: { name: target }
			: { ...target };

	const predicate = (event: PollEvent): boolean => {
		if (filter.name !== undefined && event.worker.name !== filter.name) return false;
		if (filter.type !== undefined && event.type !== filter.type) return false;
		if (filter.comment !== undefined) {
			if (event.type !== "comment") return false;
			const body = (event as { comment: string }).comment;
			if (filter.comment instanceof RegExp) {
				if (!filter.comment.test(body)) return false;
			} else if (typeof filter.comment === "string") {
				if (!body.includes(filter.comment)) return false;
			}
		}
		if (filter.predicate && !filter.predicate(event)) return false;
		return true;
	};

	return { filter, predicate };
}

/**
 * When teams.on is called for a worker that's ALREADY in a terminal state,
 * synthesize a PollEvent from the current WorkerHandle so the caller resolves
 * immediately instead of hanging forever.
 */
function synthesizeFromWorker(worker: WorkerHandle, type: PollEventType): PollEvent | null {
	switch (type) {
		case "completed":
			if (worker.status === "done") {
				return { type: "completed", worker: { ...worker }, result: worker.lastNote ?? "" };
			}
			return null;
		case "failed":
			if (worker.status === "failed") {
				return { type: "failed", worker: { ...worker }, reason: worker.spawnError ?? "failed" };
			}
			return null;
		case "warning":
			if (worker.status === "warning") {
				return { type: "warning", worker: { ...worker }, reason: "already in warning state" };
			}
			return null;
		default:
			return null;
	}
}
