import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOuijaExecutor } from "./ouija-core.js";

function writeSession(entries: unknown[]): string {
	const dir = mkdtempSync(join(tmpdir(), "ouija-core-"));
	const file = join(dir, "session.jsonl");
	writeFileSync(file, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
	return file;
}

describe("createOuijaExecutor", () => {
	let sessionFile: string;

	beforeEach(() => {
		sessionFile = writeSession([
			{ type: "message", timestamp: "2026-04-08T00:00:00.000Z", message: { role: "user", content: "alpha ouija beta" } },
			{ type: "message", timestamp: "2026-04-08T00:00:01.000Z", message: { role: "assistant", content: "gamma delta" } },
		]);
	});

	test("uses the injected current session file for self queries", async () => {
		const execute = createOuijaExecutor({ getCurrentSessionFile: () => sessionFile });
		const result = await execute({ action: "self", query: "ouija", limit: 5 });
		expect(result).toContain("Found 1 matching entries");
		expect(result).toContain("alpha ouija beta");
	});

	test("uses the injected current session file for implicit view", async () => {
		const execute = createOuijaExecutor({ getCurrentSessionFile: () => sessionFile });
		const result = await execute({ action: "view", start: -2, end: 0 });
		expect(result).toContain("File: session.jsonl");
		expect(result).toContain("alpha ouija beta");
	});
});
