/**
 * Contract tests for the code-mode process-level guard.
 *
 * The guard's job is to prevent code-mode user code (background promises,
 * setTimeout callbacks, etc.) from terminating the host pi process when they
 * reject or throw with no handler. These tests assert that:
 *
 *   1. Installation registers handlers on the live `process` object.
 *   2. Re-installation is idempotent — no handler leak across hot-reloads.
 *   3. A rejection whose stack mentions `code-mode.js` is surfaced through
 *      `pi.sendMessage` with `customType: "code-mode-crash"`.
 *   4. A rejection from outside the sandbox is contained but NOT surfaced
 *      to the agent (host noise stays out of the conversation).
 *   5. Uninstall removes handlers cleanly.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	installCodeModeProcessGuard,
	uninstallCodeModeProcessGuard,
} from "./process-guard";

interface SentMessage {
	message: { customType: string; content: string; display?: boolean };
	options?: { deliverAs?: string; triggerTurn?: boolean };
}

function makeFakePi(): { sent: SentMessage[]; pi: any } {
	const sent: SentMessage[] = [];
	const pi = {
		sendMessage: (
			message: { customType: string; content: string; display?: boolean },
			options?: { deliverAs?: string; triggerTurn?: boolean },
		) => {
			sent.push({ message, options });
		},
	};
	return { sent, pi };
}

function countListeners(): { rej: number; exc: number } {
	return {
		rej: process.listenerCount("unhandledRejection"),
		exc: process.listenerCount("uncaughtException"),
	};
}

describe("code-mode process guard", () => {
	beforeEach(() => {
		uninstallCodeModeProcessGuard();
	});

	afterEach(() => {
		uninstallCodeModeProcessGuard();
	});

	test("install registers handlers on process", () => {
		const before = countListeners();
		const { pi } = makeFakePi();
		installCodeModeProcessGuard(pi);
		const after = countListeners();
		expect(after.rej).toBe(before.rej + 1);
		expect(after.exc).toBe(before.exc + 1);
	});

	test("re-install is idempotent — no handler leak", () => {
		const { pi } = makeFakePi();
		installCodeModeProcessGuard(pi);
		const onceCount = countListeners();
		installCodeModeProcessGuard(pi);
		installCodeModeProcessGuard(pi);
		const after = countListeners();
		expect(after.rej).toBe(onceCount.rej);
		expect(after.exc).toBe(onceCount.exc);
	});

	test("uninstall removes both handlers", () => {
		const before = countListeners();
		const { pi } = makeFakePi();
		installCodeModeProcessGuard(pi);
		uninstallCodeModeProcessGuard();
		const after = countListeners();
		expect(after.rej).toBe(before.rej);
		expect(after.exc).toBe(before.exc);
	});

	test("sandbox-origin rejection is surfaced via pi.sendMessage", async () => {
		const { sent, pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		// Synthesize an Error whose stack contains "code-mode.js" so the guard
		// classifies it as sandbox-origin without needing a real vm context.
		const fauxErr = new Error("logs.slice is not a function");
		fauxErr.stack = `TypeError: logs.slice is not a function\n    at <anonymous> (code-mode.js:9:90)`;

		// Emit synchronously via the listener — same shape Node hands to handlers.
		process.emit("unhandledRejection", fauxErr, Promise.resolve());

		expect(sent.length).toBe(1);
		expect(sent[0].message.customType).toBe("code-mode-crash");
		expect(sent[0].message.content).toContain("logs.slice is not a function");
		expect(sent[0].message.content).toContain("code-mode.js");
		expect(sent[0].options?.deliverAs).toBe("followUp");
		expect(sent[0].options?.triggerTurn).toBe(true);

		// Swallow the rejected promise we created above so the test runner
		// itself doesn't see an unhandled rejection.
		await Promise.resolve();
	});

	test("sandbox-origin rejection does not write to console.error", () => {
		const { sent, pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		const calls: unknown[][] = [];
		const originalConsoleError = console.error;
		console.error = (...args: unknown[]) => {
			calls.push(args);
		};
		try {
			const fauxErr = new Error("contained user-code failure");
			fauxErr.stack = `Error: contained user-code failure\n    at <anonymous> (code-mode.js:120:22)`;
			process.emit("unhandledRejection", fauxErr, Promise.resolve());
		} finally {
			console.error = originalConsoleError;
		}

		expect(sent.length).toBe(1);
		expect(calls.length).toBe(0);
	});

	test("failed sandbox crash surfacing still does not fall back to console.error", () => {
		installCodeModeProcessGuard({
			sendMessage() {
				throw new Error("sendMessage unavailable");
			},
		} as never);

		const calls: unknown[][] = [];
		const originalConsoleError = console.error;
		console.error = (...args: unknown[]) => {
			calls.push(args);
		};
		try {
			const fauxErr = new Error("contained user-code failure");
			fauxErr.stack = `Error: contained user-code failure\n    at <anonymous> (code-mode.js:120:22)`;
			expect(() =>
				process.emit("unhandledRejection", fauxErr, Promise.resolve()),
			).not.toThrow();
		} finally {
			console.error = originalConsoleError;
		}

		expect(calls.length).toBe(0);
	});

	test("runbook-origin rejection is also surfaced (filename: runbook:<name>)", () => {
		const { sent, pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		const fauxErr = new Error("nope");
		fauxErr.stack = `Error: nope\n    at <anonymous> (runbook:lint:3:5)`;
		process.emit("unhandledRejection", fauxErr, Promise.resolve());

		expect(sent.length).toBe(1);
		expect(sent[0].message.customType).toBe("code-mode-crash");
	});

	test("host-origin rejection is contained but NOT surfaced to agent", () => {
		const { sent, pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		const fauxErr = new Error("library bug");
		fauxErr.stack = `Error: library bug\n    at internal (node_modules/some-lib/index.js:42:1)`;
		process.emit("unhandledRejection", fauxErr, Promise.resolve());

		// No surface — host noise must not enter the conversation.
		expect(sent.length).toBe(0);
		// But the process did NOT crash — implicit by the test still running.
	});

	test("uncaughtException with code-mode stack is surfaced", () => {
		const { sent, pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		const fauxErr = new Error("boom");
		fauxErr.stack = `Error: boom\n    at timer (code-mode.js:42:1)`;
		process.emit("uncaughtException", fauxErr);

		expect(sent.length).toBe(1);
		expect(sent[0].message.customType).toBe("code-mode-crash");
		expect(sent[0].message.content).toContain("EXCEPTION");
	});

	test("non-Error rejection (string) is still contained", () => {
		const { pi } = makeFakePi();
		installCodeModeProcessGuard(pi);

		// Strings have no stack so they classify as host-origin → no surface,
		// but the guard must not throw.
		expect(() => process.emit("unhandledRejection", "raw string reason", Promise.resolve())).not.toThrow();
	});

	test("re-install rebinds to a new pi instance", () => {
		const { sent: sentA, pi: piA } = makeFakePi();
		installCodeModeProcessGuard(piA);

		const { sent: sentB, pi: piB } = makeFakePi();
		installCodeModeProcessGuard(piB);

		const fauxErr = new Error("rebind test");
		fauxErr.stack = `Error: rebind test\n    at x (code-mode.js:1:1)`;
		process.emit("unhandledRejection", fauxErr, Promise.resolve());

		// Only the latest pi receives the surface; the prior listener was removed.
		expect(sentA.length).toBe(0);
		expect(sentB.length).toBe(1);
	});
});
