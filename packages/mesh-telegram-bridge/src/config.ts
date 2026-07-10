import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

/** Config file lives OUTSIDE the repo (holds the bot token — never committed). */
export const CONFIG_PATH = join(homedir(), ".config", "mesh-telegram-bridge", "config.env");

export interface Config {
	botToken: string;
	chatId: number | null;
	channel: string;
	hoomanNickname: string;
	hoomanMeshId: string;
}

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
		if (!(m[1] in process.env)) process.env[m[1]] = v;
	}
}

export function loadConfig(): Config {
	loadEnvFile();
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	if (!botToken) throw new Error(`TELEGRAM_BOT_TOKEN missing (set it in ${CONFIG_PATH})`);
	const hoomanMeshId = process.env.HOOMAN_MESH_ID;
	if (!hoomanMeshId) throw new Error(`HOOMAN_MESH_ID missing (set it in ${CONFIG_PATH})`);
	const chatRaw = process.env.TELEGRAM_CHAT_ID;
	return {
		botToken,
		chatId: chatRaw && chatRaw.trim() ? Number(chatRaw) : null,
		channel: process.env.MESH_CHANNEL ?? "hooman",
		hoomanNickname: process.env.HOOMAN_NICKNAME ?? "The Hooman",
		hoomanMeshId,
	};
}

/** Persist the captured chat id back into the config file so it survives restarts. */
export function persistChatId(chatId: number): void {
	try {
		mkdirSync(dirname(CONFIG_PATH), { recursive: true });
		const lines = existsSync(CONFIG_PATH)
			? readFileSync(CONFIG_PATH, "utf8").split("\n").filter((l) => !/^\s*TELEGRAM_CHAT_ID\s*=/.test(l))
			: [];
		while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
		lines.push(`TELEGRAM_CHAT_ID=${chatId}`);
		writeFileSync(CONFIG_PATH, lines.join("\n") + "\n", { mode: 0o600 });
	} catch (e) {
		console.warn("[config] could not persist chat id:", (e as Error).message);
	}
}