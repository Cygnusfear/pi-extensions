import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const plist = readFileSync(
	join(import.meta.dir, "com.piextensions.mesh-telegram-bridge.plist"),
	"utf8",
);

describe("mesh Telegram launchd secret boundary", () => {
	test("injects only the dedicated Fleet OpenRouter RBW item", () => {
		const expected = [
			"/etc/profiles/per-user/alexander/bin/with-secret",
			"OPENROUTER_API_KEY=fleet-openrouter-key",
			"--",
			"/Users/alexander/.bun/bin/bun",
			"run",
			"src/index.ts",
		].map((value) => `<string>${value}</string>`);
		let cursor = -1;
		for (const value of expected) {
			cursor = plist.indexOf(value, cursor + 1);
			expect(cursor).toBeGreaterThan(-1);
		}
		expect(plist).not.toMatch(/sk-(?:or-)?/);
		expect(plist).not.toContain("<key>EnvironmentVariables</key>");
	});
});
