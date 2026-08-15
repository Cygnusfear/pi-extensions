/** Transcription provider chain — shared by the bridge and the coordinator. */
import { isOutOfCreditsCode, isOutOfCreditsText, providerErrorDetails } from "./provider-errors.ts";

const MAX_TRANSCRIPTION_ERROR_DETAIL = 160;
const TRANSCRIPTION_AUDIO_FILENAME = "voice.ogg";

/** Copy a Node Buffer/view into ArrayBuffer-owned bytes accepted as a DOM BlobPart. */
function blobBytes(source: Uint8Array): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(new ArrayBuffer(source.byteLength));
	bytes.set(source);
	return bytes;
}

type TranscriptionProviderFactory = (apiKey: string) => TranscriptionProvider;

export interface TranscriptionProvider {
	readonly name: string;
	readonly transcribe: (audio: Buffer) => Promise<string>;
}

export interface TranscriptionFallbackHooks {
	readonly onOutOfCredits?: (provider: TranscriptionProvider, error: unknown) => void | Promise<void>;
}

export class TranscriptionProviderError extends Error {
	readonly status: number | undefined;
	readonly code: string | undefined;
	readonly outOfCredits: boolean;

	constructor(message: string, metadata: { status?: number; code?: string; outOfCredits?: boolean } = {}) {
		super(message);
		this.name = "TranscriptionProviderError";
		this.status = metadata.status;
		this.code = metadata.code;
		this.outOfCredits = metadata.outOfCredits ?? (metadata.status === 402 || isOutOfCreditsCode(metadata.code) || isOutOfCreditsText(message));
	}
}

interface HttpTranscriptionProviderOptions {
	readonly name: string;
	readonly endpoint: string;
	readonly model: string;
	readonly apiKey: string;
	readonly stream?: boolean;
}

function boundedText(value: string): string {
	const compact = value.replace(/\s+/g, " ").trim();
	return compact.length > MAX_TRANSCRIPTION_ERROR_DETAIL ? compact.slice(0, MAX_TRANSCRIPTION_ERROR_DETAIL) + "…" : compact;
}

export async function transcriptionResponseError(response: Response): Promise<TranscriptionProviderError> {
	let body = "";
	try { body = await response.text(); } catch {}
	const details = providerErrorDetails(body);
	return new TranscriptionProviderError("request rejected", {
		status: response.status,
		code: details.code ?? `http_${response.status}`,
		outOfCredits: response.status === 402 || details.outOfCredits,
	});
}

function responseText(payload: unknown): string | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const text = (payload as { readonly text?: unknown }).text;
	return typeof text === "string" && text.trim() ? text.trim() : undefined;
}

function createHttpTranscriptionProvider(options: HttpTranscriptionProviderOptions): TranscriptionProvider {
	return {
		name: options.name,
		transcribe: async (audio) => {
			const form = new FormData();
			form.append("file", new Blob([blobBytes(audio)]), TRANSCRIPTION_AUDIO_FILENAME);
			form.append("model", options.model);
			if (options.stream !== undefined) form.append("stream", String(options.stream));
			const response = await fetch(options.endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${options.apiKey}` },
				body: form,
			});
			if (!response.ok) throw await transcriptionResponseError(response);
			let payload: unknown;
			try { payload = await response.json(); } catch {
				throw new TranscriptionProviderError("response was not valid JSON", { code: "invalid_response" });
			}
			const text = responseText(payload);
			if (!text) throw new TranscriptionProviderError("response did not contain a transcription", { code: "empty_transcription" });
			return text;
		},
	};
}

function createOpenAiTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "OpenAI", endpoint: "https://api.openai.com/v1/audio/transcriptions", model: "whisper-1", apiKey });
}

function createGroqTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "Groq", endpoint: "https://api.groq.com/openai/v1/audio/transcriptions", model: "whisper-large-v3", apiKey });
}

function createZaiTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "Z.ai", endpoint: "https://api.z.ai/api/paas/v4/audio/transcriptions", model: "glm-asr-2512", stream: false, apiKey });
}

function createOpenRouterTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/audio/transcriptions", model: "whisper-1", apiKey });
}

const TRANSCRIPTION_PROVIDER_FACTORIES: ReadonlyArray<readonly [string, TranscriptionProviderFactory]> = [
	["OPENAI_API_KEY", createOpenAiTranscriptionProvider],
	["GROQ_API_KEY", createGroqTranscriptionProvider],
	["ZAI_API_KEY", createZaiTranscriptionProvider],
	["OPENROUTER_API_KEY", createOpenRouterTranscriptionProvider],
];

export function availableTranscriptionProviders(env: NodeJS.ProcessEnv = process.env): TranscriptionProvider[] {
	return TRANSCRIPTION_PROVIDER_FACTORIES.flatMap(([envName, create]) => {
		const apiKey = env[envName]?.trim();
		return apiKey ? [create(apiKey)] : [];
	});
}

function describeTranscriptionFailure(error: unknown): string {
	if (error instanceof TranscriptionProviderError) {
		const details = [
			error.status === undefined ? undefined : `status=${error.status}`,
			error.code ? `code=${error.code}` : undefined,
			error.message ? boundedText(error.message) : undefined,
		].filter((detail): detail is string => detail !== undefined);
		return details.join(" ") || "unknown error";
	}
	if (error instanceof Error) return boundedText(error.message || error.name) || "unknown error";
	return boundedText(String(error)) || "unknown error";
}

function isOutOfCreditsFailure(error: unknown): boolean {
	if (error instanceof TranscriptionProviderError) return error.outOfCredits;
	if (error instanceof Error) return isOutOfCreditsText(error.message);
	return isOutOfCreditsText(String(error));
}

/** Try each configured provider in order; all failures stay user-visible and actionable. */
export async function transcribeWithFallback(
	providers: readonly TranscriptionProvider[],
	audio: Buffer,
	hooks: TranscriptionFallbackHooks = {},
): Promise<string> {
	if (!providers.length) return "(voice transcription failed: no transcription providers configured)";
	const failures: string[] = [];
	for (const provider of providers) {
		try {
			const text = (await provider.transcribe(audio)).trim();
			if (text) return text;
			failures.push(provider.name + ": code=empty_transcription");
		} catch (error) {
			if (isOutOfCreditsFailure(error)) {
				try { await hooks.onOutOfCredits?.(provider, error); }
				catch (notificationError) { console.warn("[bridge] transcription credit notification failed:", describeTranscriptionFailure(notificationError)); }
			}
			failures.push(provider.name + ": " + describeTranscriptionFailure(error));
		}
	}
	const tried = providers.map((provider) => provider.name).join(", ");
	return `(voice transcription failed; tried ${tried}: ${failures.join("; ")})`;
}
