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
	readonly synthesize: (text: string, voiceId: string) => Promise<TtsAudio>;
}

export interface TtsProviderOptions {
	readonly name?: string;
	readonly apiKey: string;
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

/** Bound bridge fallback input before token passes; a raw diagnostic dump must not create unbounded TTS work. */
const TTS_INPUT_MAX_CHARS = TTS_MAX_CHARS * 8;

const COMMAND_LINE = /^\s*(?:[$>]\s*)?(?:bun|git|npm|pnpm|yarn|curl|launchctl|tmux|cd|ls|cat|grep|rg|sed|awk|chmod|mkdir|rm|cp|mv)\b.*$/gim;
const INLINE_COMMAND = /\b(?:run\s+)?(?:bun|git|npm|pnpm|yarn|curl|launchctl|tmux|cd|ls|cat|grep|rg|sed|awk|chmod|mkdir|rm|cp|mv)\s+(?:[A-Za-z0-9_./:@%+=,-]+\s*){1,8}/gi;

function boundedFallbackInput(raw: string): string {
	return raw.length > TTS_INPUT_MAX_CHARS ? raw.slice(0, TTS_INPUT_MAX_CHARS) + "…" : raw;
}

function finishVoiceText(text: string): string {
	text = text.replace(/\s+/g, " ").trim();
	if (text.length > TTS_MAX_CHARS) text = text.slice(0, TTS_MAX_CHARS).trimEnd() + "…";
	return text;
}

/**
 * Prepare an intentionally authored spoken script. This is the long-standing
 * Valencia contract: Fish tags and deliberate wording survive display-markdown
 * cleanup; no technical-token fallback is applied here.
 */
export function voiceTextFor(raw: string): string {
	return finishVoiceText(raw
		.replace(/```[\s\S]*?```/g, " code omitted ")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^\s*>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		.replace(/(\*|_)(.*?)\1/g, "$2")
		.replace(/~~(.*?)~~/g, "$1"));
}

function fallbackMarkdownForVoice(raw: string): string {
	return raw
		.replace(/```[\s\S]*?(?:```|$)/g, " technical details are in the text ")
		.replace(/`([^`]*)`/g, " technical detail is in the text ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^\s*>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		.replace(/(\*|_)(.*?)\1/g, "$2")
		.replace(/~~(.*?)~~/g, "$1");
}

/** Mechanical safety net for visible technical text sent through the mesh bridge. */
function readableFallback(text: string): string {
	return text
		.replace(/^\s*\|.*\|\s*$/gm, " table details are in the text ")
		.replace(COMMAND_LINE, " command is in the text ")
		.replace(INLINE_COMMAND, " command is in the text ")
		.replace(/(?:https?|wss?|ftp|file):\/\/[^\s<>()]+|www\.[^\s<>()]+/gi, " link is in the text ")
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " email address is in the text ")
		.replace(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, " encoded credential is in the text ")
		.replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, " identifier is in the text ")
		.replace(/\b(?:mac|fingerprint|checksum)\s+(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, " hardware identifier is in the text ")
		.replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, " hardware identifier is in the text ")
		.replace(/\b(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}\b/g, " encoded value is in the text ")
		.replace(/\b0x[0-9a-f]+\b/gi, " hexadecimal value is in the text ")
		.replace(/\b(?=[0-9a-f]{7,64}\b)(?=[0-9a-f]*[a-f])[0-9a-f]{7,64}\b/gi, " revision identifier is in the text ")
		.replace(/\b\d{4}-\d{2}-\d{2}(?:[T ](?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, " date or time is in the text ")
		.replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?\b/g, " time is in the text ")
		.replace(/\b(?:ip|address)\s+(?:\d{1,3}\.){3}\d{1,3}\b/gi, " network address is in the text ")
		.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, " network address is in the text ")
		.replace(/(?:\+?\d[\d(). -]{6,}\d)/g, " phone number is in the text ")
		.replace(/\b(?:pid|port|line|issue|ticket|attempt|message)[\s:=#-]*\d+\b/gi, " machine identifier is in the text ")
		.replace(/\b(?:version|release)\s+v?\d+(?:\.\d+){2,}\b/gi, " version is in the text ")
		.replace(/\bv?\d+(?:\.\d+){2,}\b/gi, " version is in the text ")
		.replace(/\b\d{5,}\b/g, " number is in the text ")
		.replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, " configuration setting is in the text ")
		.replace(/\b(?:path|file)\s+(?:(?:~|\.\.?)\/|\/)[^\s<>()]+/gi, " file path is in the text ")
		.replace(/(?:~\/|(?:^|[\s(])\/)[^\s<>()]+/g, " file path is in the text ")
		.replace(/\b(?:src|lib|app|packages|docs|tests?|scripts|config)\/[A-Za-z0-9._/@%+=:,~-]+/gi, " file path is in the text ")
		.replace(/\b(?=[A-Za-z0-9_-]*\d)[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)+\b/g, " identifier is in the text ")
		.replace(/@[A-Za-z0-9_]{3,}/g, " contact is in the text ")
		.replace(/[|{}[\]<>\\]/g, " ")
		.replace(/=/g, " ")
		.replace(/[-_]{2,}/g, " ")
		.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, " ");
}

/**
 * Prepare lossless visible mesh text for automatic Telegram speech. The caller
 * keeps the original message on screen; this produces only its oral fallback.
 */
export function fallbackVoiceTextFor(raw: string): string {
	const text = readableFallback(fallbackMarkdownForVoice(boundedFallbackInput(raw)))
		.replace(/\s+([,.;:!?])/g, "$1");
	return finishVoiceText(text);
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
	const model = options.model ?? "s2.1-pro";
	const fetchFn = options.fetchFn ?? fetch;
	return {
		name: options.name ?? "Fish Audio",
		synthesize: async (text, voiceId) => {
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
