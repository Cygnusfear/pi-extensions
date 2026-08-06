import { describe, expect, test } from "bun:test";
import {
	MessageRetentionController,
	MIN_RETENTION_TIMER_DELAY_MS,
	planRetentionDeletion,
	RETENTION_RETRY_INITIAL_MS,
	RETENTION_WINDOW_MS,
	TELEGRAM_DELETE_BATCH_MAX,
	TELEGRAM_DELETE_HARD_DEADLINE_MS,
	retentionRetryDelayMs,
	type RetainedMessage,
	type RetentionClock,
	type RetentionTimer,
} from "./message-retention.ts";

const DAY = RETENTION_WINDOW_MS;
const NOW = 1_700_000_000_000;

type Timer = RetentionTimer & { callback: () => void; delayMs: number; cleared: boolean };

class FakeClock implements RetentionClock {
	nowMs = NOW;
	readonly timers: Timer[] = [];

	now(): number { return this.nowMs; }
	setTimeout(callback: () => void, delayMs: number): RetentionTimer {
		const timer: Timer = { callback, delayMs, cleared: false };
		this.timers.push(timer);
		return timer;
	}
	clearTimeout(timer: RetentionTimer): void { (timer as Timer).cleared = true; }
	pendingDelays(): number[] { return this.timers.filter((timer) => !timer.cleared).map((timer) => timer.delayMs); }
	async fireNext(): Promise<void> {
		const timer = this.timers.find((candidate) => !candidate.cleared);
		if (!timer) throw new Error("no pending timer");
		timer.cleared = true;
		this.nowMs += timer.delayMs;
		timer.callback();
		for (let i = 0; i < 8; i++) await Promise.resolve();
	}
}

function record(chatId: number, messageId: number, sentAtMs = NOW - DAY): RetainedMessage {
	return { chatId, messageId, sentAtMs };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	return { promise: new Promise<T>((res) => { resolve = res; }), resolve };
}

describe("retention planning", () => {
	test("groups only trusted eligible messages by chat and caps Telegram batches", () => {
		const messages = [record(1, 10), record(2, 10)];
		for (let id = 11; id <= 250; id++) messages.push(record(1, id));
		const batches = planRetentionDeletion(messages, NOW);
		expect(batches.filter((batch) => batch.chatId === 1).flatMap((batch) => batch.messageIds)).toHaveLength(241);
		expect(batches.filter((batch) => batch.chatId === 2).flatMap((batch) => batch.messageIds)).toEqual([10]);
		expect(batches.every((batch) => batch.messageIds.length <= TELEGRAM_DELETE_BATCH_MAX)).toBe(true);
	});

	test("never plans fractional IDs, zero chat IDs, or legacy-like invalid records for remote deletion", () => {
		expect(planRetentionDeletion([
			{ chatId: 1.5, messageId: 1, sentAtMs: NOW - DAY },
			{ chatId: 1, messageId: 1.5, sentAtMs: NOW - DAY },
			{ chatId: 0, messageId: 1, sentAtMs: NOW - DAY },
		] as RetainedMessage[], NOW)).toEqual([]);
	});

	test("marks 48-hour records for local retirement rather than Telegram deletion", () => {
		const batch = planRetentionDeletion([record(1, 9, NOW - TELEGRAM_DELETE_HARD_DEADLINE_MS)], NOW)[0];
		expect(batch).toEqual({ chatId: 1, messageIds: [], expiredMessageIds: [9] });
	});
});

describe("MessageRetentionController bridge orchestration", () => {
	test("deletes due routes per originating chat, including equal message IDs in different chats", async () => {
		const clock = new FakeClock();
		const calls: Array<[number, number[]]> = [];
		const controller = new MessageRetentionController({
			clock,
			records: [["1:10", record(1, 10)], ["2:10", record(2, 10)]],
			api: { deleteMessages: async (chatId, ids) => { calls.push([chatId, ids]); } },
		});
		controller.start();
		expect(clock.pendingDelays()).toEqual([MIN_RETENTION_TIMER_DELAY_MS]);
		await clock.fireNext();
		expect(calls).toEqual([[1, [10]], [2, [10]]]);
		expect(controller.size()).toBe(0);
	});

	test("retains failed deletes with positive bounded backoff, then retries and persists success", async () => {
		const clock = new FakeClock();
		let attempts = 0;
		const changes: number[] = [];
		const controller = new MessageRetentionController({
			clock,
			records: [["1:10", record(1, 10)]],
			api: { deleteMessages: async () => { attempts++; if (attempts === 1) throw new Error("temporary"); } },
			onChange: () => changes.push(clock.now()),
		});
		controller.start();
		await clock.fireNext();
		expect(attempts).toBe(1);
		expect(controller.size()).toBe(1);
		expect(clock.pendingDelays()).toEqual([RETENTION_RETRY_INITIAL_MS]);
		expect(clock.pendingDelays()[0]).toBeGreaterThan(0);
		await clock.fireNext();
		expect(attempts).toBe(2);
		expect(controller.size()).toBe(0);
		expect(changes.length).toBeGreaterThan(0);
	});

	test("re-arms the nearest deadline after an outbound track instead of leaving a later restored timer", () => {
		const clock = new FakeClock();
		const controller = new MessageRetentionController({
			clock,
			// A malformed-but-safe future state models a restored clock skew; its deadline is later than a new send.
			records: [["1:1", record(1, 1, NOW + DAY)]],
			api: { deleteMessages: async () => {} },
		});
		controller.start();
		expect(clock.pendingDelays()).toEqual([2 * DAY]);
		controller.track("1:2", record(1, 2, NOW));
		expect(clock.pendingDelays()).toEqual([DAY]);
	});


	test("uses capped exponential retry delays and never exposes a zero-delay retry", () => {
		expect(retentionRetryDelayMs(1)).toBe(RETENTION_RETRY_INITIAL_MS);
		expect(retentionRetryDelayMs(2)).toBe(RETENTION_RETRY_INITIAL_MS * 2);
		expect(retentionRetryDelayMs(999)).toBeGreaterThan(0);
	});

	test("retires at the 48-hour local deadline without a blind Telegram delete", async () => {
		const clock = new FakeClock();
		const calls: number[][] = [];
		const retired: number[] = [];
		const controller = new MessageRetentionController({
			clock,
			records: [["1:10", record(1, 10, NOW - TELEGRAM_DELETE_HARD_DEADLINE_MS)]],
			api: { deleteMessages: async (_chatId, ids) => { calls.push(ids); } },
			onRetire: (records) => retired.push(...records.map((item) => item.messageId)),
		});
		controller.start();
		await clock.fireNext();
		expect(calls).toEqual([]);
		expect(retired).toEqual([10]);
		expect(controller.size()).toBe(0);
	});

	test("restart resumes persisted bridge-owned routes at their remaining retention deadline", async () => {
		const clock = new FakeClock();
		const calls: Array<[number, number[]]> = [];
		// These entries model the exact tuple ledger loaded by BridgeStateStore after a process restart.
		const controller = new MessageRetentionController({
			clock,
			records: [["-1001:44", record(-100_1, 44, NOW - DAY + 10_000)]],
			api: { deleteMessages: async (chatId, ids) => { calls.push([chatId, ids]); } },
		});
		controller.start();
		expect(clock.pendingDelays()).toEqual([10_000]);
		await clock.fireNext();
		expect(calls).toEqual([[-100_1, [44]]]);
		expect(controller.size()).toBe(0);
	});


	test("stop during a deferred delete awaits it and stale completion cannot reschedule or mutate records", async () => {
		const clock = new FakeClock();
		const pending = deferred<void>();
		const controller = new MessageRetentionController({
			clock,
			records: [["1:10", record(1, 10)]],
			api: { deleteMessages: async () => pending.promise },
		});
		controller.start();
		await clock.fireNext();
		expect(clock.pendingDelays()).toEqual([]);
		const stopping = controller.stop();
		pending.resolve();
		await stopping;
		expect(controller.size()).toBe(1);
		expect(clock.pendingDelays()).toEqual([]);
	});
	});
