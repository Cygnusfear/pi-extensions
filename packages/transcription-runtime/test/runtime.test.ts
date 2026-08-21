import { describe, expect, test } from "bun:test";
import {
	createTranscriptionProviders,
	type TranscriptionProvider,
	TranscriptionProviderError,
	transcribeWithFallback,
} from "../src/index.ts";

describe("transcription runtime", () => {
	test("builds a bounded provider request from runtime-neutral bytes and forwards cancellation", async () => {
		const controller = new AbortController();
		let request: { url: string; init: RequestInit } | undefined;
		const fetcher: typeof fetch = async (input, init) => {
			request = { url: String(input), init: init ?? {} };
			return Response.json({ text: "  spoken words  " });
		};
		const provider = createTranscriptionProviders(
			{ OPENAI_API_KEY: "secret" },
			fetcher,
		)[0];
		if (!provider) throw new Error("provider_missing");
		const text = await provider.transcribe({
			bytes: Uint8Array.from([1, 2, 3]),
			filename: "voice.ogg",
			mimeType: "audio/ogg",
			signal: controller.signal,
		});
		expect(text).toBe("spoken words");
		expect(request?.url).toBe("https://api.openai.com/v1/audio/transcriptions");
		expect(request?.init.signal).toBe(controller.signal);
		expect(request?.init.headers).toEqual({ authorization: "Bearer secret" });
		expect(request?.init.body).toBeInstanceOf(FormData);
	});

	test("rejects oversized inputs, responses, and transcripts before publication", async () => {
		const oversizedResponse = createTranscriptionProviders(
			{ OPENAI_API_KEY: "secret" },
			async () => Response.json({ text: "x".repeat(1024 * 1024) }),
		)[0];
		if (!oversizedResponse) throw new Error("provider_missing");
		await expect(
			oversizedResponse.transcribe(Uint8Array.of(1)),
		).rejects.toMatchObject({ metadata: { code: "response_too_large" } });
		await expect(
			oversizedResponse.transcribe(new Uint8Array(20 * 1024 * 1024 + 1)),
		).rejects.toMatchObject({ metadata: { code: "invalid_audio" } });
		await expect(
			oversizedResponse.transcribe({
				bytes: Uint8Array.of(1),
				filename: "../voice.ogg",
			}),
		).rejects.toMatchObject({ metadata: { code: "invalid_filename" } });
		const result = await transcribeWithFallback(
			[{ name: "large", transcribe: async () => "🐉".repeat(65_537) }],
			Uint8Array.of(1),
		);
		expect(result).toContain("code=transcription_too_large");
		expect(result.length).toBeLessThan(300);
	});

	test("falls back after a provider failure and reports credit exhaustion", async () => {
		const notices: string[] = [];
		const providers: TranscriptionProvider[] = [
			{
				name: "first",
				transcribe: async () => {
					throw new TranscriptionProviderError("request rejected", {
						status: 402,
						code: "payment_required",
					});
				},
			},
			{ name: "second", transcribe: async () => "recovered" },
		];
		expect(
			await transcribeWithFallback(providers, Uint8Array.of(1), {
				onOutOfCredits: (provider) => {
					notices.push(provider.name);
				},
			}),
		).toBe("recovered");
		expect(notices).toEqual(["first"]);
		expect(
			await transcribeWithFallback(providers, Uint8Array.of(1), {
				onOutOfCredits: () => {
					throw new Error("observer failed");
				},
			}),
		).toBe("recovered");
	});

	test("bounds provider metadata and total multibyte fallback output", async () => {
		const invalidName = `secret-${"x".repeat(1_024)}`;
		const invalid = await transcribeWithFallback(
			[{ name: invalidName, transcribe: async () => "never" }],
			Uint8Array.of(1),
		);
		expect(invalid).toBe(
			"(voice transcription failed: invalid transcription provider configuration)",
		);
		expect(invalid).not.toContain(invalidName);
		const providers = Array.from({ length: 16 }, (_, index) => ({
			name: `provider-${index.toString().padStart(2, "0")}-${"x".repeat(50)}`,
			transcribe: async () => {
				throw new TranscriptionProviderError("🐉".repeat(1_000), {
					code: "private/".repeat(100),
				});
			},
		}));
		const result = await transcribeWithFallback(providers, Uint8Array.of(1));
		expect(new TextEncoder().encode(result).byteLength).toBeLessThanOrEqual(
			4 * 1024,
		);
		expect(result).not.toContain("private/");
		expect(result).toEndWith("…)");
		const first = providers[0];
		if (!first) throw new Error("provider_fixture_missing");
		const tooMany = await transcribeWithFallback(
			[...providers, first],
			Uint8Array.of(1),
		);
		expect(tooMany).toContain("invalid transcription provider configuration");
	});

	test("returns a bounded user-visible failure without leaking response bodies", async () => {
		const provider = createTranscriptionProviders(
			{ GROQ_API_KEY: "secret" },
			async () =>
				new Response(
					JSON.stringify({
						error: {
							code: "insufficient_quota",
							message: "private ".repeat(100),
						},
					}),
					{ status: 429 },
				),
		)[0];
		if (!provider) throw new Error("provider_missing");
		const result = await transcribeWithFallback([provider], Uint8Array.of(1));
		expect(result).toContain("code=insufficient_quota");
		expect(result).not.toContain("private");
		expect(result.length).toBeLessThan(300);
	});
});
