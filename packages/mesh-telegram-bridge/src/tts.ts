/** Text-to-speech: fish.audio REST provider + voice-text preparation. Pure helpers are unit-tested. */
import { isOutOfCreditsCode, isOutOfCreditsText, providerErrorDetails } from "./provider-errors.ts";

export interface TtsAudio {
	/** Complete synthesized audio bytes. */
	readonly bytes: Uint8Array;
	/** File extension for the Telegram upload (e.g. "mp3"). */
	readonly extension: string;
}

export interface TtsProvider {
	readonly name: string;
	readonly synthesize: (text: string) => Promise<TtsAudio>;
}

export interface TtsProviderOptions {
	readonly name?: string;
	readonly apiKey: string;
	readonly voiceId: string;
	readonly model?: string;
	readonly fetchFn?: typeof fetch;
}

export class TtsProviderError extends Error {
	readonly status: number | undefined;
	readonly code: string | undefined;
	readonly outOfCredits: boolean;

	constructor(message: string, metadata: { status?: number; code?: string; outOfCredits?: boolean } = {}) {
		super(message);
		this.name = "TtsProviderError";
		this.status = metadata.status;
		this.code = metadata.code;
		this.outOfCredits = metadata.outOfCredits ?? (metadata.status === 402 || isOutOfCreditsCode(metadata.code) || isOutOfCreditsText(message));
	}
}

/** Cap for synthesized speech — above ~3 minutes of audio a voice message stops being useful. */
export const TTS_MAX_CHARS = 600;

/**
 * Prepare agent text for synthesis: strip markdown the TTS model would read
 * aloud literally (headers, bold/italic markers, code fences, link URLs),
 * collapse whitespace, cap length at TTS_MAX_CHARS.
 */
export function voiceTextFor(raw: string): string {
	let text = raw
		.replace(/```[\s\S]*?```/g, " code omitted ")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^\s*>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		.replace(/(\*|_)(.*?)\1/g, "$2")
		.replace(/~~(.*?)~~/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length > TTS_MAX_CHARS) text = text.slice(0, TTS_MAX_CHARS).trimEnd() + "…";
	return text;
}

const FISH_TTS_ENDPOINT = "https://api.fish.audio/v1/tts";

/**
 * fish.audio REST TTS (model header s2.1-pro). Returns MP3 — Telegram
 * sendAudio. Voice notes (sendVoice) would need OGG-wrapped opus plus a
 * transcode step; MP3 audio is the zero-dependency correct default for an
 * always-on launchd bridge. The extension field keeps that divergence explicit.
 */
export function createFishTtsProvider(options: TtsProviderOptions): TtsProvider {
	const apiKey = options.apiKey;
	const voiceId = options.voiceId;
	const model = options.model ?? "s2.1-pro";
	const fetchFn = options.fetchFn ?? fetch;
	return {
		name: options.name ?? "Fish Audio",
		synthesize: async (text) => {
			const response = await fetchFn(FISH_TTS_ENDPOINT, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					model,
				},
				body: JSON.stringify({
					text,
					reference_id: voiceId,
					format: "mp3",
					normalize: true,
					prosody: { speed: 1, volume: 0, normalize_loudness: true },
				}),
			});
			if (!response.ok) {
				let body = "";
				try { body = await response.text(); } catch {}
				const details = providerErrorDetails(body);
				throw new TtsProviderError("request rejected", {
					status: response.status,
					code: details.code ?? `http_${response.status}`,
					outOfCredits: response.status === 402 || details.outOfCredits,
				});
			}
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (bytes.length === 0) throw new TtsProviderError("response contained no audio", { code: "empty_audio" });
			return { bytes, extension: "mp3" };
		},
	};
}
