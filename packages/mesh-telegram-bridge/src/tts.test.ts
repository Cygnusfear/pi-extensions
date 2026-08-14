import { describe, expect, test } from "bun:test";
import { createFishTtsProvider, TTS_MAX_CHARS, TtsProviderError, voiceTextFor } from "./tts.ts";

describe("voiceTextFor", () => {
	test("strips markdown that would be read aloud literally", () => {
		expect(voiceTextFor("**bold** and *italic* and `code` and [link](https://x)\n# Header"))
			.toBe("bold and italic and code and link Header");
		// Inline # is prose, not a header — markdown headers start at a line boundary.
		expect(voiceTextFor("see # Header here")).toBe("see # Header here");
	});

	test("replaces code fences and caps length", () => {
		expect(voiceTextFor("```\nsecret\n``` end")).toBe("code omitted end");
		const long = "a".repeat(TTS_MAX_CHARS + 100);
		const capped = voiceTextFor(long);
		expect(capped.length).toBe(TTS_MAX_CHARS + 1); // truncation + ellipsis
		expect(capped.endsWith("…")).toBe(true);
	});

	test("collapses whitespace", () => {
		expect(voiceTextFor("  hello \n\n  world  ")).toBe("hello world");
	});

	test("strips list and quote markers", () => {
		expect(voiceTextFor("- item one\n- item two\n> quoted")).toBe("item one item two quoted");
	});
});

describe("createFishTtsProvider", () => {
	const ok = (body: BodyInit, status = 200): typeof fetch => ((async () => new Response(body, { status })) as unknown as typeof fetch);

	test("maps 402 to outOfCredits", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(JSON.stringify({ status: 402, message: "No payment" }), 402),
		});
		await expect(provider.synthesize("hi")).rejects.toMatchObject({ outOfCredits: true, status: 402 });
	});

	test("maps credit codes in error bodies to outOfCredits", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(JSON.stringify({ status: 503, message: "credits_exhausted" }), 503),
		});
		await expect(provider.synthesize("hi")).rejects.toMatchObject({ outOfCredits: true });
	});

	test("returns mp3 audio bytes on success", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(new Uint8Array([1, 2, 3])),
		});
		const audio = await provider.synthesize("hi");
		expect(audio.extension).toBe("mp3");
		expect(audio.bytes.length).toBe(3);
	});

	test("empty audio body throws", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(new Uint8Array(0)),
		});
		await expect(provider.synthesize("hi")).rejects.toBeInstanceOf(TtsProviderError);
	});
});
