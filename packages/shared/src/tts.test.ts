import { describe, expect, test } from "bun:test";
import { createFishTtsProvider, fallbackVoiceTextFor, TTS_MAX_CHARS, TtsProviderError, voiceTextFor } from "./tts.ts";

describe("voiceTextFor", () => {
	test("strips display markdown from an authored voice script without disturbing Fish tags", () => {
		expect(voiceTextFor("[calm] **bold** and *italic* and `code` and [link](https://x)\n# Header"))
			.toBe("[calm] bold and italic and code and link Header");
		// Inline # is prose, not a header — markdown headers start at a line boundary.
		expect(voiceTextFor("see # Header here")).toBe("see # Header here");
		expect(voiceTextFor("[confident] Landed 26d5ce57. (break) Details are in the text."))
			.toBe("[confident] Landed 26d5ce57. (break) Details are in the text.");
	});

	test("replaces authored code fences and caps length", () => {
		expect(voiceTextFor("```\nsecret\n``` end")).toBe("code omitted end");
		const long = "a".repeat(TTS_MAX_CHARS + 100);
		const capped = voiceTextFor(long);
		expect(capped.length).toBe(TTS_MAX_CHARS + 1); // truncation + ellipsis
		expect(capped.endsWith("…")).toBe(true);
	});

	test("collapses whitespace and strips list/quote markers", () => {
		expect(voiceTextFor("  hello \n\n  world  ")).toBe("hello world");
		expect(voiceTextFor("- item one\n- item two\n> quoted")).toBe("item one item two quoted");
	});
});

describe("fallbackVoiceTextFor", () => {
	test("replaces visible technical tokens with spoken roles", () => {
		const visible = "Landed 26d5ce57 for 0d10973c-6ac7-4849-bace-25c682d17f28. Set FISH_AUDIO_VOICE_ID; see https://fish.audio/app/m/demo; run bun test; path /tmp/bridge.log; version v1.2.3; IP 127.0.0.1.\n| key | value |";
		const speech = fallbackVoiceTextFor(visible);
		for (const hostile of ["26d5ce57", "0d10973c-6ac7-4849-bace-25c682d17f28", "FISH_AUDIO_VOICE_ID", "https://fish.audio", "bun test", "/tmp/bridge.log", "v1.2.3", "127.0.0.1", "|"]) {
			expect(speech).not.toContain(hostile);
		}
		expect(speech).toContain("revision identifier is in the text");
		expect(speech).toContain("configuration setting is in the text");
		expect(speech).toContain("link is in the text");
		expect(speech).toContain("command is in the text");
		expect(speech).toContain("file path is in the text");
		expect(speech).toContain("version is in the text");
		expect(speech).toContain("network address is in the text");
		expect(speech).toContain("table details are in the text");
	});

	test("replaces timestamps, phone-like values, machine IDs, and credentials", () => {
		const visible = "At 2026-08-15T19:38:51Z call +1 555 123 4567. PID=24985, MAC aa:bb:cc:dd:ee:ff, JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepayload.";
		const speech = fallbackVoiceTextFor(visible);
		for (const hostile of ["2026-08-15T19:38:51Z", "+1 555 123 4567", "24985", "aa:bb:cc:dd:ee:ff", "eyJhbGciOiJIUzI1NiJ9"]) {
			expect(speech).not.toContain(hostile);
		}
		expect(speech).toContain("date or time is in the text");
		expect(speech).toContain("phone number is in the text");
		expect(speech).toContain("machine identifier is in the text");
		expect(speech).toContain("hardware identifier is in the text");
		expect(speech).toContain("encoded credential is in the text");
	});
});

describe("createFishTtsProvider", () => {
	const ok = (body: BodyInit, status = 200): typeof fetch => ((async () => new Response(body, { status })) as unknown as typeof fetch);

	function capturingFetch(record: { body?: string }, body: BodyInit, status = 200): typeof fetch {
		return ((async (_input: RequestInfo | URL, init?: RequestInit) => {
			record.body = init?.body as string | undefined;
			return new Response(body, { status });
		}) as unknown as typeof fetch);
	}

	test("maps 402 to outOfCredits", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(JSON.stringify({ status: 402, message: "No payment" }), 402),
		});
		await expect(provider.synthesize("hi", "v")).rejects.toMatchObject({ outOfCredits: true, status: 402 });
	});

	test("maps credit codes in error bodies to outOfCredits", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(JSON.stringify({ status: 503, message: "credits_exhausted" }), 503),
		});
		await expect(provider.synthesize("hi", "v")).rejects.toMatchObject({ outOfCredits: true });
	});

	test("returns mp3 audio bytes on success", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(new Uint8Array([1, 2, 3])),
		});
		const audio = await provider.synthesize("hi", "v");
		expect(audio.extension).toBe("mp3");
		expect(audio.bytes.length).toBe(3);
	});

	test("sends the per-call voiceId as reference_id", async () => {
		const record: { body?: string } = {};
		const provider = createFishTtsProvider({
			apiKey: "k",
			fetchFn: capturingFetch(record, new Uint8Array([1])),
		});
		await provider.synthesize("hi", "voice-male-1");
		expect(JSON.parse(record.body ?? "{}").reference_id).toBe("voice-male-1");
	});

	test("empty audio body throws", async () => {
		const provider = createFishTtsProvider({
			apiKey: "k",
			voiceId: "v",
			fetchFn: ok(new Uint8Array(0)),
		});
		await expect(provider.synthesize("hi", "v")).rejects.toBeInstanceOf(TtsProviderError);
	});
});
