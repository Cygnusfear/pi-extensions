import { describe, expect, test } from "bun:test";
import {
	Bridge,
	TranscriptionProviderError,
	transcriptionResponseError,
	transcribeWithFallback,
	type TranscriptionProvider,
} from "./bridge.ts";

const AUDIO = Buffer.from("voice-bytes");

function provider(name: string, transcribe: TranscriptionProvider["transcribe"]): TranscriptionProvider {
	return { name, transcribe };
}

describe("transcribeWithFallback", () => {
	test("uses the next provider after a 402 failure", async () => {
		const calls: string[] = [];
		const result = await transcribeWithFallback([
			provider("OpenRouter", async () => {
				calls.push("OpenRouter");
				throw new TranscriptionProviderError("request rejected", { status: 402, code: "credits_exhausted" });
			}),
			provider("OpenAI", async (audio) => {
				calls.push(`OpenAI:${audio.toString()}`);
				return "  hello from the fallback  ";
			}),
		], AUDIO);

		expect(result).toBe("hello from the fallback");
		expect(calls).toEqual(["OpenRouter", "OpenAI:voice-bytes"]);
	});

	test("aggregates provider names and status/code reasons when all providers fail", async () => {
		const result = await transcribeWithFallback([
			provider("OpenRouter", async () => {
				throw new TranscriptionProviderError("request rejected", { status: 402, code: "credits_exhausted" });
			}),
			provider("OpenAI", async () => {
				throw new Error("network unavailable");
			}),
		], AUDIO);

		expect(result).toContain("tried OpenRouter, OpenAI");
		expect(result).toContain("OpenRouter: status=402 code=credits_exhausted request rejected");
		expect(result).toContain("OpenAI: network unavailable");
	});
});

test("classifies provider quota/credit bodies without treating generic auth errors as exhaustion", async () => {
	const quota = await transcriptionResponseError(new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), { status: 429 }));
	const credits = await transcriptionResponseError(new Response("not enough credits", { status: 429 }));
	const auth = await transcriptionResponseError(new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 }));
	expect(quota.outOfCredits).toBeTrue();
	expect(credits.outOfCredits).toBeTrue();
	expect(auth.outOfCredits).toBeFalse();
});

describe("transcription credit notifications", () => {
	test("alerts once for a 402, persists the debounce, and ignores a generic 401", async () => {
		const alerts: string[] = [];
		let saves = 0;
		const bridge = Object.create(Bridge.prototype) as {
			chatId: number | null;
			transcriptionCreditNotifiedAt: Map<string, number>;
			stateStore: { saveNow: () => boolean };
			sendText: (chatId: number, text: string, thread: Record<string, unknown>) => Promise<{ message_id: number }>;
		};
		bridge.chatId = -100_1;
		bridge.transcriptionCreditNotifiedAt = new Map();
		bridge.stateStore = { saveNow: () => { saves++; return true; } };
		bridge.sendText = async (_chatId, text) => {
			alerts.push(text);
			return { message_id: alerts.length };
		};
		const notify = (Bridge.prototype as unknown as {
			notifyTranscriptionProviderOutOfCredits: (provider: TranscriptionProvider, thread: Record<string, unknown>) => void;
		}).notifyTranscriptionProviderOutOfCredits;
		const hooks = {
			onOutOfCredits: (provider: TranscriptionProvider) => notify.call(bridge, provider, {}),
		};
		const fallback = provider("OpenAI", async () => "fallback transcript");
		const outOfCredits = provider("OpenRouter", async () => {
			throw new TranscriptionProviderError("request rejected", { status: 402, code: "credits_exhausted" });
		});
		const result = await transcribeWithFallback([outOfCredits, fallback], AUDIO, hooks);
		expect(result).toBe("fallback transcript");
		expect(alerts).toEqual(["⚠️ OpenRouter is out of credits — refill to restore voice transcription."]);
		expect(saves).toBe(1);

		await transcribeWithFallback([outOfCredits, fallback], AUDIO, hooks);
		expect(alerts).toHaveLength(1);
		expect(saves).toBe(1);

		const unauthorized = provider("OpenAI", async () => {
			throw new TranscriptionProviderError("authentication failed", { status: 401, code: "invalid_api_key" });
		});
		await transcribeWithFallback([unauthorized], AUDIO, hooks);
		expect(alerts).toHaveLength(1);
		expect(saves).toBe(1);
	});
});
