import { describe, expect, test } from "bun:test";
import { blobBytes, telegramReactionEmoji } from "./telegram-values.ts";

describe("telegramReactionEmoji", () => {
	test("accepts standard and compound Telegram reactions", () => {
		expect(telegramReactionEmoji("👍")).toBe("👍");
		expect(telegramReactionEmoji("❤‍🔥")).toBe("❤‍🔥");
		expect(telegramReactionEmoji("🤷‍♀")).toBe("🤷‍♀");
	});

	test("rejects arbitrary text and unsupported emoji", () => {
		expect(telegramReactionEmoji("✅")).toBeNull();
		expect(telegramReactionEmoji("👍👍")).toBeNull();
		expect(telegramReactionEmoji("not-an-emoji")).toBeNull();
	});
});

describe("blobBytes", () => {
	test("returns ArrayBuffer-owned bytes without aliasing the source", async () => {
		const source = Buffer.from([1, 2, 3]);
		const bytes = blobBytes(source);
		source[0] = 9;

		expect([...bytes]).toEqual([1, 2, 3]);
		expect([...new Uint8Array(await new Blob([bytes]).arrayBuffer())]).toEqual([1, 2, 3]);
	});
});
