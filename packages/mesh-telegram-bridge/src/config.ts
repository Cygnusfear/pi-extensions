import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

/** Config file lives OUTSIDE the repo (holds the bot token — never committed). */
export const CONFIG_PATH = join(homedir(), ".config", "mesh-telegram-bridge", "config.env");

export interface Config {
	botToken: string;
	chatId: number | null;
	channel: string;
	hoomanNickname: string;
	hoomanMeshId: string;
	/** fish.audio TTS credentials — optional; voice mode degrades to text-only when absent. */
	fishApiKey?: string;
	/** Fish Audio model used by every Telegram TTS response. */
	fishVoiceId?: string;
}

/** Env keys the bridge hot-swaps on the next voice note. Scoped deliberately:
 *  model choice and chain order are safe to change mid-run, while the bot
 *  token, chat id, and provider API keys stay startup-only. */
const HOT_TRANSCRIPTION_KEYS = ["OPENROUTER_TRANSCRIPTION_MODELS", "TRANSCRIPTION_PROVIDER_ORDER"] as const;

/** Values that existed BEFORE the config file was applied, so removing a hot
 *  key from the file restores the real environment (or the built-in defaults)
 *  instead of freezing the startup value. */
const envFileOriginals = new Map<string, string | undefined>();
let envFileStamp: string | undefined;

/** Load KEY=VALUE lines from the out-of-repo config file into process.env (without overriding real env). */
function loadEnvFile(): void {
	if (!existsSync(CONFIG_PATH)) return;
	for (const raw of readFileSync(CONFIG_PATH, "utf8").split("\n")) {
		const m = raw.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
		if (!m) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		// Hot keys: remember the pre-file value before this first assignment so a
		// later line removal can put the real environment back.
		if ((HOT_TRANSCRIPTION_KEYS as readonly string[]).includes(m[1]) && !envFileOriginals.has(m[1])) {
			envFileOriginals.set(m[1], process.env[m[1]]);
		}
		if (!(m[1] in process.env)) process.env[m[1]] = v;
	}
}

/** Re-read the hot-swappable transcription keys when the config file changes,
 *  so a model or order edit applies to the next voice note without a bridge
 *  restart. Unlike loadEnvFile (startup-only, never overriding), these keys
 *  are owned by the FILE while it declares them; removing a line restores the
 *  pre-file environment. Cheap: one stat per voice note. */
export function refreshTranscriptionEnv(path: string = CONFIG_PATH): void {
	let stamp: string;
	try {
		const stat = statSync(path);
		stamp = `${stat.mtimeMs}:${stat.size}`;
	} catch {
		return; // no config file to hot-swap from
	}
	if (stamp === envFileStamp) return;
	const declared = new Map<string, string>();
	try {
		for (const raw of readFileSync(path, "utf8").split("\n")) {
			const match = raw.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
			if (!match) continue;
			const key = match[1] as string;
			if (!(HOT_TRANSCRIPTION_KEYS as readonly string[]).includes(key)) continue;
			let value = match[2] as string;
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			declared.set(key, value);
		}
	} catch {
		return; // unreadable this round: keep the values we already have
	}
	for (const key of HOT_TRANSCRIPTION_KEYS) {
		if (!envFileOriginals.has(key)) envFileOriginals.set(key, process.env[key]);
		const value = declared.get(key);
		if (value !== undefined) process.env[key] = value;
		else {
			const original = envFileOriginals.get(key);
			if (original === undefined) delete process.env[key];
			else process.env[key] = original;
		}
	}
	envFileStamp = stamp;
}

/** Parse the transport configuration after its file has been loaded. Kept pure for configuration-contract tests. */
export function parseConfig(env: NodeJS.ProcessEnv): Config {
	const botToken = env.TELEGRAM_BOT_TOKEN;
	if (!botToken) throw new Error(`TELEGRAM_BOT_TOKEN missing (set it in ${CONFIG_PATH})`);
	const hoomanMeshId = env.HOOMAN_MESH_ID;
	if (!hoomanMeshId) throw new Error(`HOOMAN_MESH_ID missing (set it in ${CONFIG_PATH})`);
	const chatRaw = env.TELEGRAM_CHAT_ID;
	return {
		botToken,
		chatId: chatRaw && chatRaw.trim() ? Number(chatRaw) : null,
		channel: env.MESH_CHANNEL ?? "hooman",
		hoomanNickname: env.HOOMAN_NICKNAME ?? "The Hooman",
		hoomanMeshId,
		fishApiKey: env.FISH_AUDIO_API_KEY?.trim() || undefined,
		fishVoiceId: env.FISH_AUDIO_VOICE_ID?.trim() || undefined,
	};
}

export function loadConfig(): Config {
	loadEnvFile();
	return parseConfig(process.env);
}

/** Persist the captured chat id back into the config file so it survives restarts. */
export function persistChatId(chatId: number): void {
	try {
		persistChatIdOrThrow(chatId);
	} catch (error) {
		console.warn("[config] could not persist chat id:", (error as Error).message);
	}
}

/** Observable atomic config commit used by authority-changing transactions. */
export function persistChatIdOrThrow(chatId: number): void {
	const directory = dirname(CONFIG_PATH);
	mkdirSync(directory, { recursive: true });
	const lines = existsSync(CONFIG_PATH)
		? readFileSync(CONFIG_PATH, "utf8").split("\n").filter((line) => !/^\s*TELEGRAM_CHAT_ID\s*=/.test(line))
		: [];
	while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
	lines.push(`TELEGRAM_CHAT_ID=${chatId}`);
	const temporaryPath = join(directory, `.config.env.${process.pid}.${randomUUID()}.tmp`);
	try {
		writeFileSync(temporaryPath, lines.join("\n") + "\n", { mode: 0o600 });
		renameSync(temporaryPath, CONFIG_PATH);
	} catch (error) {
		try { rmSync(temporaryPath, { force: true }); } catch {}
		throw error;
	}
}
