/**
 * teams.on — typed, thenable subscription over the TeamLeader PollEvent stream.
 *
 * Design goals:
 * - Ergonomic: `await teams.on("fixer", "completed")` for one-shot, `.each(cb)`
 *   for streams, `.wake()` to trigger a coordinator turn from the host during dispatch.
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

// ─── TUI-safe rejection routing ──────────────────────────────────────────
// Set by index.ts on session_start. When a TeamsSubscription's .then() is
// called without an explicit onrejected handler and the subscription later
// rejects (typically from .timeout()), the safety-net handler routes the
// error here instead of letting it bubble to the host process as an
// `unhandledRejection` (which prints raw stderr output like
// "[host] unhandledRejection: teams.on timeout after 2700000ms").
//
// TUI extensions should NEVER let raw promise rejections reach the host's
// console. Always route through the user's notification surface.

type TeamsNotifyLevel = "info" | "warning" | "error";
let notifyFn: ((message: string, level?: TeamsNotifyLevel) => void) | null = null;

export function setTeamsNotifyFn(fn: ((message: string, level?: TeamsNotifyLevel) => void) | null): void {
  notifyFn = fn;
}

function routeRejectionToTui(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (notifyFn) {
    try { notifyFn(`teams.on: ${msg}`, "warning"); } catch {}
  }
  // If no TUI is wired (test contexts, headless), silently swallow. The
  // explicit goal here is "do not surface as host console output". Users
  // that need to observe the rejection should pass an explicit onrejected
  // handler to .then() or use .catch() / try-await.
}

export type PollEventType = PollEvent["type"];
/** "terminal" is a filter alias, not an emitted PollEvent type. */
export type PollEventFilterType = PollEventType | "terminal";
const TERMINAL_EVENT_TYPES = new Set<PollEventType>(["completed", "turn_finished", "warning", "failed"]);

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

/** Mint a wrapped event that carries DOM-style flags + methods.
 *
 * Implementation note: we MUST use Object.defineProperty for the flag getters.
 * A getter defined inline on an object literal passed to Object.assign gets
 * EVALUATED at copy time and stored as a static data property — the accessor
 * is lost. Use defineProperty so the getter actually runs on every read and
 * reflects the current closure state. */
export function wrapPollEvent(event: PollEvent): TeamsEvent {
	let defaultPrevented = false;
	let propagationStopped = false;

	// Shallow copy the PollEvent fields so the wrapper has type, worker, etc.
	const wrapper = { ...event } as TeamsEvent & Record<string, unknown>;

	wrapper.preventDefault = () => {
		defaultPrevented = true;
	};
	wrapper.stopPropagation = () => {
		propagationStopped = true;
	};
	wrapper.stopImmediatePropagation = () => {
		propagationStopped = true;
	};

	Object.defineProperty(wrapper, "defaultPrevented", {
		get: () => defaultPrevented,
		enumerable: true,
		configurable: false,
	});
	Object.defineProperty(wrapper, "propagationStopped", {
		get: () => propagationStopped,
		enumerable: true,
		configurable: false,
	});

	return wrapper;
}

/** Full filter object for teams.on({...}). */
export interface EventFilter {
	/** Match a specific worker by name. */
	name?: string;
	/** Bind to one exact process attempt. */
	attemptId?: string;
	/** Match a specific PollEvent type. */
	type?: PollEventFilterType;
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

/** Callback signature — receives the wrapped TeamsEvent (PollEvent + DOM methods).
 *
 * Prefer the host-owned `.wake()` chain when a callback only needs to wake the
 * coordinator. It runs synchronously during leader dispatch:
 *
 *   teams.on("fixer", "terminal")
 *     .wake(e => `fixer ${e.type}`); */
export type EventCallback = (event: TeamsEvent) => void;

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
	private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	private disposed = false;
	/** Pre-registered: call preventDefault() on every matched event. */
	private autoPreventDefault = false;
	/** Pre-registered: call stopPropagation() on every matched event. */
	private autoStopPropagation = false;
	/** A host-owned wake is dispatched synchronously, unlike a .then continuation. */
	private wakeMessage: string | ((event: TeamsEvent) => string) | undefined;
	private boundAttemptId?: string;

	constructor(
		private readonly leader: TeamLeader,
		private readonly filter: EventFilter,
		private readonly predicate: (event: PollEvent) => boolean,
		abortSignal?: AbortSignal,
	) {
		this.boundAttemptId = filter.attemptId ?? (filter.name ? leader.getCurrentAttemptId(filter.name) : undefined);
		// Leader hands us pre-wrapped TeamsEvents so preventDefault/stopPropagation
		// calls from any listener affect the single shared wrapper.
		this.unsub = leader.subscribeToEvents((event) => this.handle(event as TeamsEvent));

		// If targeting a specific worker, register a disposal callback so the
		// subscription silently self-destructs when the worker is killed —
		// prevents stale timeouts from firing spammy console.wake rejections.
		if (filter.name && typeof leader.subscribeToWorkerDisposal === "function") {
			const disposeUnsub = leader.subscribeToWorkerDisposal(filter.name, () => this.dispose());
			const origUnsub = this.unsub;
			this.unsub = () => { disposeUnsub(); origUnsub(); };
		}

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
		} else if (filter.matchCurrent !== false && filter.attemptId && filter.type) {
			const attempt = leader.getAttemptHistory({ attemptId: filter.attemptId })[0];
			if (attempt) this.checkCurrent(attempt.name, filter.type);
		}
	}

	private checkCurrent(name: string, type: PollEventFilterType): void {
		// A name with no current attempt is a future binding. Do not replay an
		// older same-name attempt; bind atomically to the first matching event.
		if (this.filter.name && !this.boundAttemptId) return;
		const retained = this.leader.getCurrentTerminalEvent?.(name, type, this.boundAttemptId);
		if (retained) {
			queueMicrotask(() => this.handle(wrapPollEvent(retained)));
			return;
		}
		const worker = this.leader.getWorker(name);
		if (!worker) return;

		const synthetic = type === "terminal"
			? synthesizeAnyTerminalFromWorker(worker)
			: synthesizeFromWorker(worker, type);
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
		if (!this.boundAttemptId && this.filter.name && event.worker.name === this.filter.name) {
			this.boundAttemptId = event.attemptId ?? event.worker.workerInstanceId;
		}
		if (this.boundAttemptId && (event.attemptId ?? event.worker.workerInstanceId) !== this.boundAttemptId) return;
		if (!this.predicate(event)) return;

		// Pre-registered DOM-style suppressions fire first so .each() callbacks
		// see defaultPrevented / propagationStopped already set.
		if (this.autoPreventDefault) event.preventDefault();
		if (this.autoStopPropagation) event.stopPropagation();
		if (this.wakeMessage !== undefined) {
			try {
				const content = typeof this.wakeMessage === "function" ? this.wakeMessage(event) : this.wakeMessage;
				this.leader.wakeFromSubscription?.(event, content);
			} catch (err) {
				console.warn("[teams.on] wake handler threw:", err instanceof Error ? err.message : String(err));
			}
		}

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

		// If nobody wants a stream, clean up after first match.
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
		// Safety net: if the caller did NOT pass an explicit onrejected handler,
		// inject one that routes the rejection to the TUI notify surface instead
		// of letting it bubble up as an unhandledRejection on the host process.
		// Without this, `sub.then(e => ...)` (no second arg) on a subscription
		// that times out crashes the host's stderr with raw error text.
		//
		// Users that want to observe the rejection MUST either pass an explicit
		// onrejected (`sub.then(onfulfilled, onrejected)`), call `.catch(...)`,
		// or use `try/await`. The await pattern translates internally to
		// .then(resolve, reject) — onrejected IS provided — so the safety net
		// does not interfere.
		const safeOnRejected = onrejected ?? ((err: unknown) => {
			routeRejectionToTui(err);
			return undefined as unknown as TResult2;
		});
		return p.then(onfulfilled ?? undefined, safeOnRejected);
	}

	/** Catch rejection. Returns a native Promise so it integrates with await/try-catch. */
	catch<TResult = never>(onrejected: (reason: unknown) => TResult | PromiseLike<TResult>): Promise<TeamsEvent | TResult> {
		return this.then(undefined, onrejected);
	}

	// ─── Chainable helpers ───

	/** Register a streaming callback. Fires on every matching event until unsubscribed. */
	each(callback: EventCallback): this {
		this.eachCallbacks.push(callback);
		return this;
	}

	/** Auto-reject if no matching event arrives within ms. */
	timeout(ms: number): this {
		if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
		this.timeoutHandle = setTimeout(() => {
			this.rejectWith(new Error(`teams.on timeout after ${ms}ms`));
		}, ms);
		// Prevent unhandled rejection crash — attach a silent no-op catch.
		// The caller's await will still see the rejection, but if they don't
		// catch it (e.g. in a background promise), the process won't crash.
		this.catch(() => {});
		return this;
	}

	/**
	 * DOM-style: pre-register preventDefault() on every matched event.
	 * Suppresses the leader's default notifyLLM batch wake for this event,
	 * so the coordinator is NOT triggered again from the leader side.
	 *
	 * Use this only when the current turn is handling the event synchronously
	 * (for example, an awaited subscription) or when a custom event handler owns
	 * the replacement action. For a background worker wake, use .wake() instead;
	 * .preventDefault() plus a later console.wake() is unsafe because the later
	 * sandbox continuation can be lost after the terminal event.
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

	/**
	 * Send a coordinator wake from the host during the matching dispatch pass.
	 * Unlike `.then(e => console.wake(...))`, this does not depend on a later
	 * sandbox promise microtask. It automatically replaces the leader's normal
	 * batched wake rather than adding a duplicate. Use this for every background
	 * Teams worker wake.
	 */
	wake(message?: string | ((event: TeamsEvent) => string)): this {
		// A host wake is an explicit replacement for the leader's default batched
		// wake. Make the safe path the default: callers can no longer accidentally
		// create two coordinator turns by omitting a separate preventDefault().
		this.autoPreventDefault = true;
		this.wakeMessage = message ?? ((event) => `[teams] ${event.worker.name}: ${event.type}`);
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

/**
 * Build a predicate from the overloaded teams.on() arguments.
 * Accepts:
 *   buildPredicate("fixer")                  → match worker name only
 *   buildPredicate("fixer", "completed")     → match worker + event type
 *   buildPredicate({ ...filter })            → full filter object
 */
export function buildPredicate(
	target: string | EventFilter,
	eventType?: PollEventFilterType,
): { filter: EventFilter; predicate: (event: PollEvent) => boolean } {
	const filter: EventFilter =
		typeof target === "string"
			? eventType
				? { name: target, type: eventType }
				: { name: target }
			: { ...target };

	const predicate = (event: PollEvent): boolean => {
		if (filter.name !== undefined && event.worker.name !== filter.name) return false;
		if (filter.attemptId !== undefined && (event.attemptId ?? event.worker.workerInstanceId) !== filter.attemptId) return false;
		if (filter.type !== undefined) {
			if (filter.type === "terminal") {
				if (!TERMINAL_EVENT_TYPES.has(event.type)) return false;
			} else if (event.type !== filter.type) return false;
		}
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
			if (worker.status === "killed") {
				return { type: "failed", worker: { ...worker }, reason: "worker killed" };
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

/** Compatibility fallback for terminal workers restored from snapshots written
 * before the terminal-event ledger existed. New terminal transitions replay
 * from the ledger above, preserving their original event payload. */
function synthesizeAnyTerminalFromWorker(worker: WorkerHandle): PollEvent | null {
	if (worker.status === "warning") {
		return { type: "warning", worker: { ...worker }, reason: worker.terminalSummary ?? worker.lastNote ?? "already in warning state" };
	}
	if (worker.status === "failed" || worker.status === "killed") {
		return { type: "failed", worker: { ...worker }, reason: worker.spawnError ?? (worker.status === "killed" ? "worker killed" : "failed") };
	}
	if (worker.status === "done" || worker.status === "grace") {
		if (worker.freeform && worker.terminalStatus !== "done") {
			return { type: "turn_finished", worker: { ...worker }, result: worker.lastNote ?? "" };
		}
		return { type: "completed", worker: { ...worker }, result: worker.lastNote ?? "" };
	}
	return null;
}
