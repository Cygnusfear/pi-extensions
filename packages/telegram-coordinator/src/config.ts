import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

/** Config lives OUTSIDE the repo (holds the bot token — never committed). */
export const CONFIG_PATH = join(homedir(), ".config", "telegram-coordinator", "config.env");

export interface CoordinatorConfig {
	botToken: string;
	chatId: number | null;
	fishApiKey?: string;
	fishVoiceIdFemale?: string;
}

function loadEnvFile(): void {
	if (!existsSync(CONFIG_PATH)) return;
	for (const raw of readFileSync(CONFIG_PATH, "utf8").split("\n")) {
		const m = raw.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
		if (!m) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		if (!(m[1] in process.env)) process.env[m[1]] = v;
	}
}

export function loadCoordinatorConfig(): CoordinatorConfig {
	loadEnvFile();
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing (set it in " + CONFIG_PATH + ")");
	return {
		botToken,
		chatId: process.env.TELEGRAM_CHAT_ID?.trim() ? Number(process.env.TELEGRAM_CHAT_ID) : null,
		fishApiKey: process.env.FISH_AUDIO_API_KEY?.trim() || undefined,
		fishVoiceIdFemale: process.env.FISH_AUDIO_VOICE_ID_FEMALE?.trim() || undefined,
	};
}

/** Atomically persist the first inbound chat id (the hooman's). */
export function persistChatId(chatId: number): void {
	try {
		const directory = dirname(CONFIG_PATH);
		mkdirSync(directory, { recursive: true });
		const lines = existsSync(CONFIG_PATH)
			? readFileSync(CONFIG_PATH, "utf8").split("\n").filter((line) => !/^\s*TELEGRAM_CHAT_ID\s*=/.test(line))
			: [];
		while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
		lines.push("TELEGRAM_CHAT_ID=" + chatId);
		const temporaryPath = join(directory, ".config.env." + process.pid + "." + randomUUID() + ".tmp");
		try {
			writeFileSync(temporaryPath, lines.join("\n") + "\n", { mode: 0o600 });
			renameSync(temporaryPath, CONFIG_PATH);
		} catch (error) {
			try { rmSync(temporaryPath, { force: true }); } catch {}
			throw error;
		}
	} catch (error) {
		console.warn("[ada] could not persist chat id:", (error as Error).message);
	}
}
