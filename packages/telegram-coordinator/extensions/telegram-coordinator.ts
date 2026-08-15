/**
 * telegram-coordinator — Valencia, the hooman's calling agent.
 *
 * This extension turns a DEDICATED pi session into a Telegram voice loop:
 *   inbound:  voice note → Whisper transcription (shared chain) → session input
 *             text      → session input
 *   outbound: agent_settled → reply text → Telegram (chunked) + female-voiced audio
 *
 * The ears and the mouth live here. The brain — session memory, mesh access,
 * session peeking, delegation — is the pi session itself. One hooman, one chat:
 * the first inbound chat becomes the durable reply target (persisted atomically).
 */
import { Bot, InputFile, type Context } from "grammy";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	availableTranscriptionProviders,
	transcribeWithFallback,
} from "@pi-extensions/shared/transcription";
import { createFishTtsProvider, voiceTextFor } from "@pi-extensions/shared/tts";
import { loadCoordinatorConfig, persistChatId, type CoordinatorConfig } from "../src/config.ts";
import { appendFileSync } from "node:fs";

/** Append-only service log — the TUI pane is not a reliable console surface. */
function valLog(line: string): void {
	try {
		appendFileSync("/tmp/valencia-extension.log", new Date().toISOString() + " " + line + "\n");
	} catch {}
}
valLog("module loaded");

const TG_MAX = 4000;

interface AgentSettledEvent {
	messages?: unknown;
}

/** Extract the final assistant reply from an agent_settled event, defensively. */
function lastAssistantText(event: AgentSettledEvent): string | null {
	const messages = event.messages;
	if (!Array.isArray(messages)) return null;
	for (let i = messages.length - 1; i >= 0; i--) {
		const entry = messages[i] as Record<string, unknown> | undefined;
		if (!entry || typeof entry !== "object") continue;
		const content = entry.content;
		if (typeof content === "string" && content.trim()) return content.trim();
	}
	return null;
}

/** Split a reply into Telegram-sized chunks. */
function chunkReply(text: string): string[] {
	if (text.length <= TG_MAX) return [text];
	const out: string[] = [];
	let rest = text;
	while (rest.length > 0) {
		out.push(rest.slice(0, TG_MAX));
		rest = rest.slice(TG_MAX);
	}
	return out;
}

export default async function telegramCoordinator(pi: ExtensionAPI): Promise<void> {
	valLog("factory start");
	const cfg = loadCoordinatorConfig();
	const bot = new Bot(cfg.botToken);
	const tts = cfg.fishApiKey ? createFishTtsProvider({ apiKey: cfg.fishApiKey }) : null;
	/** Only replies that answer a Telegram inbound are spoken back. */
	let pendingReply = false;

	bot.on("message", async (ctx: Context) => {
		const msg = ctx.message;
		if (!msg || msg.from?.is_bot) return;
		if (cfg.chatId === null) {
			cfg.chatId = msg.chat.id;
			persistChatId(msg.chat.id);
		}
		if (msg.chat.id !== cfg.chatId) return; // single-hooman bot

		if (typeof msg.text === "string" && msg.text.trim()) {
			pendingReply = true;
			await pi.sendUserMessage(msg.text);
			return;
		}
		if (msg.voice) {
			try {
				const file = await bot.api.getFile(msg.voice.file_id);
				const bytes = await fetch(
					"https://api.telegram.org/file/bot" + cfg.botToken + "/" + file.file_path,
				).then((r) => r.arrayBuffer());
				const transcript = await transcribeWithFallback(
					availableTranscriptionProviders(),
					Buffer.from(bytes),
				);
				void ctx.reply("🎤 transcribed: " + transcript).catch(() => {});
				pendingReply = true;
				await pi.sendUserMessage(transcript);
			} catch (error) {
				console.error("[valencia] inbound voice failed:", (error as Error).message);
			}
			return;
		}
	});

	pi.on("agent_settled", async (event: AgentSettledEvent) => {
		if (!pendingReply) return;
		pendingReply = false;
		const reply = lastAssistantText(event);
		if (!reply || cfg.chatId === null) return;
		try {
			for (const chunk of chunkReply(reply)) {
				await bot.api.sendMessage(cfg.chatId, chunk);
			}
		} catch (error) {
			console.error("[valencia] text reply failed:", (error as Error).message);
		}
		if (tts) {
			try {
				const speech = voiceTextFor(reply);
				if (speech && cfg.fishVoiceId) {
					const audio = await tts.synthesize(speech, cfg.fishVoiceId);
					await bot.api.sendAudio(
						cfg.chatId,
						new InputFile(Buffer.from(audio.bytes), "valencia-" + Date.now() + "." + audio.extension),
						{ title: "Valencia", performer: tts.name },
					);
				}
			} catch (error) {
				console.error("[valencia] voice reply failed:", (error as Error).message);
			}
		}
	});

	void bot
		.start({ allowed_updates: ["message"], onStart: (info) => { console.log("[valencia] @" + info.username + " polling"); valLog("polling as @" + info.username); } })
		.catch((error: unknown) => {
			console.error("[valencia] bot loop failed:", (error as Error).message); valLog("bot loop failed: " + (error as Error).message);
		});
}
