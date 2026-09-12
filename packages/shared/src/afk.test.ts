import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the flag at a temp file BEFORE importing the module: a test must never
// touch the real flag, because doing so would toggle the Hooman's banner for real.
const dir = mkdtempSync(join(tmpdir(), "afk-test-"));
process.env.PI_AFK_STATE_PATH = join(dir, "afk.json");
const { AFK_CONTACT_BANNER, readAfkState, withAfkContactBanner, writeAfkState } = await import("./afk.ts");

describe("afk contact flag", () => {
	test("a missing flag reads as not away and adds no banner", () => {
		expect(readAfkState().on).toBe(false);
		expect(withAfkContactBanner("output")).toBe("output");
	});

	test("an ON flag round-trips and appends the banner below the output", () => {
		writeAfkState({ on: true, message: "at lunch", since: 123 });
		expect(readAfkState()).toEqual({ on: true, message: "at lunch", since: 123 });
		expect(withAfkContactBanner("output")).toBe("output\n\n" + AFK_CONTACT_BANNER);
		expect(AFK_CONTACT_BANNER.startsWith("📞 afk | ")).toBe(true);
	});

	test("an OFF flag hides the banner", () => {
		writeAfkState({ on: false });
		expect(readAfkState().on).toBe(false);
		expect(withAfkContactBanner("output")).toBe("output");
	});

	test("a corrupt flag reads as not away instead of throwing", () => {
		writeFileSync(process.env.PI_AFK_STATE_PATH as string, "{ not json");
		expect(readAfkState().on).toBe(false);
		expect(withAfkContactBanner("output")).toBe("output");
	});
});
