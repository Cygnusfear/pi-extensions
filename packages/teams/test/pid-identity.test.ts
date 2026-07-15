import { describe, expect, test } from "bun:test";
import {
	deriveWorkerProcessSnapshot,
	isReusedWorkerPid,
	type ProcessRow,
} from "../activity.ts";

const NOW = 10_000_000;

function row(pid: number, elapsedSeconds: number, state = "S"): ProcessRow {
	return { pid, ppid: 1, cpuPercent: 0, elapsedSeconds, state, command: "pi" };
}

describe("worker PID identity", () => {
	test("snapshot exposes root process age", () => {
		const snapshot = deriveWorkerProcessSnapshot([row(42, 123)], 42);
		expect(snapshot.rootAlive).toBe(true);
		expect(snapshot.rootElapsedSeconds).toBe(123);
	});

	test("detects a PID reused by a much newer process", () => {
		// Worker incarnation is 2 hours old; the process currently at its PID is
		// only 5 minutes old. PID existence is not proof the worker is alive.
		const snapshot = deriveWorkerProcessSnapshot([row(42, 5 * 60)], 42);
		expect(isReusedWorkerPid(snapshot, NOW - 2 * 60 * 60 * 1000, NOW)).toBe(true);
	});

	test("does not flag the original process (etime matches incarnation age)", () => {
		const snapshot = deriveWorkerProcessSnapshot([row(42, 2 * 60 * 60 - 2)], 42);
		expect(isReusedWorkerPid(snapshot, NOW - 2 * 60 * 60 * 1000, NOW)).toBe(false);
	});

	test("does not call a missing/zombie root PID reuse — it is simply dead", () => {
		const missing = deriveWorkerProcessSnapshot([], 42);
		const zombie = deriveWorkerProcessSnapshot([row(42, 120, "Z")], 42);
		expect(missing.rootAlive).toBe(false);
		expect(zombie.rootAlive).toBe(false);
		expect(isReusedWorkerPid(missing, NOW - 100_000, NOW)).toBe(false);
		expect(isReusedWorkerPid(zombie, NOW - 100_000, NOW)).toBe(false);
	});
});
