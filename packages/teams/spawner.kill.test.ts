import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { killWorker, isProcessAlive } from "./spawner.ts";

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("killWorker", () => {
	test("kills a stubborn worker process group after SIGTERM escalation", async () => {
		// Ignore SIGTERM so only the escalation path can finish the kill.
		const child = spawn("bash", ["-lc", 'trap "" TERM; sleep 30'], {
			stdio: "ignore",
			detached: true,
		});
		const pid = child.pid!;
		expect(isProcessAlive(pid)).toBe(true);

		killWorker(pid);
		await wait(6500);
		expect(isProcessAlive(pid)).toBe(false);
	}, 12000);
});
