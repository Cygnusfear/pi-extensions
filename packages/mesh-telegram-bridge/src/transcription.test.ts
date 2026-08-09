import { describe, expect, test } from "bun:test";
import {
	TranscriptionProviderError,
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
