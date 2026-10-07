import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWaitReply, runCourier, saveCursor, loadCursor, type CourierLoopOptions, type CourierMessage } from "./courier-loop.ts";

function dir(): string {
	return mkdtempSync(join(tmpdir(), "m4-"));
}

function options(overrides: Partial<CourierLoopOptions> & { call: CourierLoopOptions["call"] }): CourierLoopOptions {
	return {
		deliver: () => undefined,
		stateDir: dir(),
		actor: "aomawa",
		signal: new AbortController().signal,
		log: () => undefined,
		...overrides,
	};
}

function message(id: string, from = "nadia"): CourierMessage {
	return { id, from, topic: "chat", body: "hello " + id };
}

describe("the session's courier loop", () => {
	test("first run walks past what is already in the mailbox and says how much", async () => {
		const calls: { verb: string; args: Record<string, unknown> }[] = [];
		let served = false;
		const controller = new AbortController();
		const call: CourierLoopOptions["call"] = async (verb, args) => {
			calls.push({ verb, args });
			if (served) {
				controller.abort();
				return { cursor: "9", messages: [] };
			}
			served = true;
			// Two pages of history, then nothing: the walk reads forward without delivering.
			if (args.after === "0") return { cursor: "2", messages: [message("1"), message("2")] };
			return { cursor: "2", messages: [] };
		};
		const delivered: string[] = [];
		const progress = await runCourier(
			options({
				call,
				deliver: (m) => delivered.push(m.id),
				signal: controller.signal,
			}),
		);
		// NOTHING FROM HISTORY IS DELIVERED, and the walk is visible in the calls.
		expect(delivered).toEqual([]);
		expect(progress.skipped).toBe(2);
		expect(calls[0]?.args).toEqual({ after: "0", timeoutMs: 1, limit: 500 });
		expect(calls[1]?.args.after).toBe("2");
	});

	test("a message is DELIVERED before the cursor moves, so a crash re-delivers rather than loses", async () => {
		const order: string[] = [];
		const controller = new AbortController();
		let wake = false;
		const call: CourierLoopOptions["call"] = async (verb, args) => {
			if (wake) {
				controller.abort();
				return { cursor: "1", messages: [] };
			}
			wake = true;
			if (verb === "tell") return {};
			return { cursor: "0", messages: [] }; // the backlog walk finds nothing
		};
		const stateDir = dir();
		await runCourier(
			options({
				call: async (verb, args) => {
					// The wait that follows the walk carries the message ONCE. A fake that answered with the same message forever
					// would spin this loop without end, because every call resolves in a microtask and no timer ever gets a turn.
					if (verb === "wait" && args.timeoutMs !== 1) {
						if (wake) {
							controller.abort();
							return { cursor: "7", messages: [] };
						}
						wake = true;
						return { cursor: "7", messages: [message("7")] };
					}
					return call(verb, args);
				},
				stateDir,
				deliver: (m) => order.push("deliver " + m.id),
			}),
		);
		expect(order).toEqual(["deliver 7"]);
		// The cursor names the message that was delivered, not the one after it.
		expect(readFileSync(join(stateDir, "aomawa.cursor"), "utf8")).toBe("7");
	});

	test("the sender is told a message surfaced, and a receipt that cannot be sent holds nothing", async () => {
		const tells: Record<string, unknown>[] = [];
		const controller = new AbortController();
		let wake = false;
		const call: CourierLoopOptions["call"] = async (verb, args) => {
			if (verb === "tell") {
				tells.push(args);
				throw new Error("the sender's mailbox is full"); // the failure must not stop anything
			}
			if (args.timeoutMs === 1) return { cursor: "0", messages: [] };
			if (wake) {
				controller.abort();
				return { cursor: "3", messages: [] };
			}
			wake = true;
			return { cursor: "3", messages: [message("3", "jackie")] };
		};
		const stateDir = dir();
		await runCourier(options({ call, stateDir, deliver: () => undefined }));
		expect(tells.length).toBe(1);
		expect(tells[0]?.to).toBe("jackie");
		expect(tells[0]?.topic).toBe("receipt");
		expect(JSON.parse(String(tells[0]?.body))).toEqual({ id: "3", state: "surfaced" });
		expect(tells[0]?.content).toBe("typed");
		// The cursor still advanced: a receipt is a courtesy, never a lock on the mailbox.
		expect(loadCursor(options({ call, stateDir }))).toBe("3");
	});

	test("a failing wait backs off and retries, and an abort ends the loop instead of the process", async () => {
		const controller = new AbortController();
		const slept: number[] = [];
		let attempts = 0;
		const call: CourierLoopOptions["call"] = async () => {
			attempts += 1;
			if (attempts === 1) throw new Error("the socket died");
			controller.abort();
			return { cursor: "1", messages: [] };
		};
		await runCourier(
			options({
				call: async (verb, args) => {
					if (args.timeoutMs === 1) return { cursor: "0", messages: [] };
					return call(verb, args);
				},
				signal: controller.signal,
				sleep: async (ms) => {
					slept.push(ms);
				},
			}),
		);
		expect(slept).toEqual([1000]);
		expect(attempts).toBe(2);
	});

	test("a torn cursor file is not a cursor: it reads as the beginning rather than as a wrong position", () => {
		const stateDir = dir();
		const base = options({ call: async () => ({}), stateDir });
		// A rename should prevent this, and a torn write that still happens must not be trusted.
		saveCursor(base, "12");
		expect(loadCursor(base)).toBe("12");
		saveCursor(base, "not-a-number");
		expect(loadCursor(base)).toBeUndefined();
		expect(loadCursor(options({ call: async () => ({}), actor: "someone-else", stateDir }))).toBeUndefined();
	});
});

describe("a malformed wait reply is a loud failure", () => {
	test("a reply without a cursor, without messages, or with a message missing its fields is refused", () => {
		expect(() => parseWaitReply({ messages: [] })).toThrow(/no cursor/);
		expect(() => parseWaitReply({ cursor: "1" })).toThrow(/no message list/);
		expect(() => parseWaitReply({ cursor: "1", messages: [{ id: "1", from: "x" }] })).toThrow(/missing its id, sender or body/);
		expect(() => parseWaitReply({ cursor: "12ab", messages: [] })).toThrow(/no cursor/);
		expect(parseWaitReply({ cursor: "4", messages: [{ id: "1", from: "x", body: "y", topic: "t" }] })).toEqual({
			cursor: "4",
			messages: [{ id: "1", from: "x", body: "y", topic: "t" }],
		});
	});
});
