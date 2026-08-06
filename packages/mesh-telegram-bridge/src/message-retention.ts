/** Telegram deletes a single batch of at most this many message ids per call. */
export const TELEGRAM_DELETE_BATCH_MAX = 100;
/** One day, in milliseconds — the verified forum auto-delete window. */
export const RETENTION_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Telegram refuses to delete messages older than this; retire only local state then. */
export const TELEGRAM_DELETE_HARD_DEADLINE_MS = 48 * 60 * 60 * 1000;
/** A retry must never re-arm a due sweep with a zero-delay loop. */
export const MIN_RETENTION_TIMER_DELAY_MS = 1;
export const RETENTION_RETRY_INITIAL_MS = 60_000;
export const RETENTION_RETRY_MAX_MS = 30 * 60_000;
export const RETENTION_RETRY_MAX_ATTEMPTS = 8;

export interface RetainedMessage {
	chatId: number;
	messageId: number;
	sentAtMs: number;
}

export interface RetentionDeleteBatch {
	chatId: number;
	messageIds: number[];
	/** Message ids past the 48h deadline; never passed to Telegram. */
	expiredMessageIds: number[];
}

export interface RetentionTimer {
	readonly __retentionTimerBrand?: never;
}

export interface RetentionClock {
	now(): number;
	setTimeout(callback: () => void, delayMs: number): RetentionTimer;
	clearTimeout(timer: RetentionTimer): void;
}

export interface RetentionDeleteApi {
	deleteMessages(chatId: number, messageIds: number[]): Promise<unknown>;
}

export interface RetentionControllerOptions<T extends RetainedMessage> {
	api: RetentionDeleteApi;
	records?: Iterable<readonly [string, T]>;
	clock?: RetentionClock;
	onChange?: () => void;
	onDelete?: (chatId: number, messageIds: readonly number[]) => void;
	onRetire?: (records: readonly T[], reason: "deadline" | "retry-exhausted") => void;
	onError?: (chatId: number, messageIds: readonly number[], error: Error) => void;
}

interface RetryState {
	attempt: number;
	retryAtMs: number;
}

const systemClock: RetentionClock = {
	now: () => Date.now(),
	setTimeout: (callback, delayMs) => setTimeout(callback, delayMs) as unknown as RetentionTimer,
	clearTimeout: (timer) => clearTimeout(timer as unknown as ReturnType<typeof setTimeout>),
};

/** Return a capped exponential backoff; every returned retry delay is positive. */
export function retentionRetryDelayMs(attempt: number): number {
	const safeAttempt = Math.max(1, Math.min(Math.trunc(attempt), RETENTION_RETRY_MAX_ATTEMPTS));
	return Math.max(
		MIN_RETENTION_TIMER_DELAY_MS,
		Math.min(RETENTION_RETRY_INITIAL_MS * 2 ** (safeAttempt - 1), RETENTION_RETRY_MAX_MS),
	);
}

/**
 * Pure batch planner retained for callers/tests. Invalid or legacy records are
 * deliberately ignored; they cannot be turned into a destructive API request.
 */
export function planRetentionDeletion(
	messages: readonly RetainedMessage[],
	now: number = Date.now(),
): RetentionDeleteBatch[] {
	const deletable = new Map<number, number[]>();
	const expired = new Map<number, number[]>();
	for (const message of messages) {
		if (!isTrustedRecord(message)) continue;
		const age = now - message.sentAtMs;
		if (age < RETENTION_WINDOW_MS) continue;
		const bucket = age >= TELEGRAM_DELETE_HARD_DEADLINE_MS ? expired : deletable;
		const ids = bucket.get(message.chatId) ?? [];
		ids.push(message.messageId);
		bucket.set(message.chatId, ids);
	}
	return batchesFor(deletable, expired);
}

/** Next meaningful deadline, including 48h local retirement for already-failed messages. */
export function nextRetentionDeadlineMs(messages: readonly RetainedMessage[], now = Date.now()): number | undefined {
	let earliest: number | undefined;
	for (const message of messages) {
		if (!isTrustedRecord(message)) continue;
		const dueAt = message.sentAtMs + RETENTION_WINDOW_MS;
		earliest = earliest === undefined ? dueAt : Math.min(earliest, dueAt);
	}
	return earliest === undefined ? undefined : Math.max(0, earliest - now);
}

/**
 * Timer-driven owner for bridge-created messages. It owns retry state, timers,
 * and in-flight sweep lifecycle. `stop()` advances an epoch and awaits any
 * active delete so no stale continuation can mutate, persist, or reschedule.
 */
export class MessageRetentionController<T extends RetainedMessage> {
	private readonly records = new Map<string, T>();
	private readonly retries = new Map<string, RetryState>();
	private readonly clock: RetentionClock;
	private readonly onChange: () => void;
	private readonly onDelete: (chatId: number, messageIds: readonly number[]) => void;
	private readonly onRetire: (records: readonly T[], reason: "deadline" | "retry-exhausted") => void;
	private readonly onError: (chatId: number, messageIds: readonly number[], error: Error) => void;
	private timer: RetentionTimer | undefined;
	private inFlight: Promise<void> | undefined;
	private stopped = true;
	private epoch = 0;

	constructor(private readonly options: RetentionControllerOptions<T>) {
		for (const [key, record] of options.records ?? []) {
			if (isTrustedRecord(record)) this.records.set(key, record);
		}
		this.clock = options.clock ?? systemClock;
		this.onChange = options.onChange ?? (() => {});
		this.onDelete = options.onDelete ?? (() => {});
		this.onRetire = options.onRetire ?? (() => {});
		this.onError = options.onError ?? (() => {});
	}

	entries(): IterableIterator<[string, T]> {
		return this.records.entries();
	}

	get(key: string): T | undefined {
		return this.records.get(key);
	}

	size(): number {
		return this.records.size;
	}

	/** Remove the oldest retained record; used only to enforce the global 2,000-record state cap. */
	dropOldest(): T | undefined {
		const key = this.records.keys().next().value;
		if (key === undefined) return undefined;
		const record = this.records.get(key);
		this.records.delete(key);
		this.retries.delete(key);
		this.onChange();
		return record;
	}

	track(key: string, record: T): void {
		if (!isTrustedRecord(record)) return;
		this.records.delete(key);
		this.records.set(key, record);
		this.retries.delete(key);
		this.onChange();
		if (!this.stopped) {
			// A newly tracked route can be earlier than a restored/future record; always keep the nearest deadline armed.
			this.clearTimer();
			this.schedule();
		}
	}

	start(): void {
		if (!this.stopped) return;
		this.stopped = false;
		this.epoch++;
		this.schedule();
	}

	/** Stops new work and waits for an outstanding delete request to settle safely. */
	async stop(): Promise<void> {
		this.stopped = true;
		this.epoch++;
		this.clearTimer();
		await this.inFlight;
	}

	private isCurrent(epoch: number): boolean {
		return !this.stopped && this.epoch === epoch;
	}

	private clearTimer(): void {
		if (!this.timer) return;
		this.clock.clearTimeout(this.timer);
		this.timer = undefined;
	}

	private schedule(): void {
		if (this.stopped || this.timer || this.records.size === 0) return;
		const now = this.clock.now();
		const deadline = this.nextWakeAt(now);
		if (deadline === undefined) return;
		const delay = Math.max(MIN_RETENTION_TIMER_DELAY_MS, deadline - now);
		this.timer = this.clock.setTimeout(() => {
			this.timer = undefined;
			void this.run();
		}, delay);
	}

	private nextWakeAt(now: number): number | undefined {
		let earliest: number | undefined;
		for (const [key, record] of this.records) {
			const dueAt = record.sentAtMs + RETENTION_WINDOW_MS;
			const hardDeadline = record.sentAtMs + TELEGRAM_DELETE_HARD_DEADLINE_MS;
			let candidate: number;
			if (now >= hardDeadline) candidate = now;
			else if (now < dueAt) candidate = dueAt;
			else {
				const retry = this.retries.get(key);
				candidate = retry === undefined ? now : Math.min(retry.retryAtMs, hardDeadline);
			}
			earliest = earliest === undefined ? candidate : Math.min(earliest, candidate);
		}
		return earliest;
	}

	private run(): Promise<void> {
		if (this.inFlight) return this.inFlight;
		const epoch = this.epoch;
		const operation = this.runSweep(epoch);
		this.inFlight = operation;
		void operation.finally(() => {
			if (this.inFlight === operation) this.inFlight = undefined;
		});
		return operation;
	}

	private async runSweep(epoch: number): Promise<void> {
		if (!this.isCurrent(epoch)) return;
		const now = this.clock.now();
		const expired: Array<[string, T]> = [];
		const due = new Map<number, Array<[string, T]>>();
		for (const [key, record] of this.records) {
			const hardDeadline = record.sentAtMs + TELEGRAM_DELETE_HARD_DEADLINE_MS;
			if (now >= hardDeadline) {
				expired.push([key, record]);
				continue;
			}
			if (now < record.sentAtMs + RETENTION_WINDOW_MS) continue;
			const retry = this.retries.get(key);
			if (retry && now < retry.retryAtMs) continue;
			const records = due.get(record.chatId) ?? [];
			records.push([key, record]);
			due.set(record.chatId, records);
		}
		if (expired.length > 0) {
			this.retire(expired, "deadline", epoch);
			if (!this.isCurrent(epoch)) return;
		}
		for (const [chatId, records] of due) {
			for (let index = 0; index < records.length; index += TELEGRAM_DELETE_BATCH_MAX) {
				if (!this.isCurrent(epoch)) return;
				const batch = records.slice(index, index + TELEGRAM_DELETE_BATCH_MAX);
				const ids = batch.map(([, record]) => record.messageId);
				try {
					await this.options.api.deleteMessages(chatId, ids);
					if (!this.isCurrent(epoch)) return;
					for (const [key] of batch) {
						this.records.delete(key);
						this.retries.delete(key);
					}
					this.onDelete(chatId, ids);
					this.onChange();
				} catch (error) {
					if (!this.isCurrent(epoch)) return;
					this.onError(chatId, ids, asError(error));
					this.recordFailure(batch, epoch);
					if (!this.isCurrent(epoch)) return;
				}
			}
		}
		if (this.isCurrent(epoch)) this.schedule();
	}

	private recordFailure(batch: readonly (readonly [string, T])[], epoch: number): void {
		const now = this.clock.now();
		const retired: Array<[string, T]> = [];
		for (const [key, record] of batch) {
			if (!this.isCurrent(epoch)) return;
			const hardDeadline = record.sentAtMs + TELEGRAM_DELETE_HARD_DEADLINE_MS;
			if (now >= hardDeadline) {
				retired.push([key, record]);
				continue;
			}
			const previous = this.retries.get(key);
			const attempt = Math.min((previous?.attempt ?? 0) + 1, RETENTION_RETRY_MAX_ATTEMPTS);
			const retryAtMs = attempt >= RETENTION_RETRY_MAX_ATTEMPTS
				? hardDeadline
				: Math.min(hardDeadline, now + retentionRetryDelayMs(attempt));
			this.retries.set(key, { attempt, retryAtMs });
		}
		if (retired.length > 0) this.retire(retired, "deadline", epoch);
		this.onChange();
	}

	private retire(records: readonly (readonly [string, T])[], reason: "deadline" | "retry-exhausted", epoch: number): void {
		if (!this.isCurrent(epoch)) return;
		for (const [key] of records) {
			this.records.delete(key);
			this.retries.delete(key);
		}
		this.onRetire(records.map(([, record]) => record), reason);
		this.onChange();
	}
}

function batchesFor(deletable: ReadonlyMap<number, number[]>, expired: ReadonlyMap<number, number[]>): RetentionDeleteBatch[] {
	const chatIds = new Set<number>([...deletable.keys(), ...expired.keys()]);
	const result: RetentionDeleteBatch[] = [];
	for (const chatId of chatIds) {
		const messageIds = deletable.get(chatId) ?? [];
		for (let index = 0; index < messageIds.length; index += TELEGRAM_DELETE_BATCH_MAX) {
			result.push({ chatId, messageIds: messageIds.slice(index, index + TELEGRAM_DELETE_BATCH_MAX), expiredMessageIds: [] });
		}
		const expiredIds = expired.get(chatId) ?? [];
		if (expiredIds.length > 0) result.push({ chatId, messageIds: [], expiredMessageIds: expiredIds });
	}
	return result;
}

function isTrustedRecord(record: RetainedMessage): boolean {
	return Number.isSafeInteger(record.chatId)
		&& record.chatId !== 0
		&& Number.isSafeInteger(record.messageId)
		&& record.messageId > 0
		&& Number.isSafeInteger(record.sentAtMs)
		&& record.sentAtMs >= 0;
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
