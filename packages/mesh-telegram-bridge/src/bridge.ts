import { Bot, type Context } from "grammy";
import { MeshClient, type InboundTell, type InboundChannel, type ReplyTarget } from "./mesh-client.ts";
import { type Config, persistChatId } from "./config.ts";

/**
 * Wires the mesh ↔ Telegram in both directions:
 *   mesh → TG : an agent's tell/channel-post is posted into the group tagged with the
 *               agent's nickname; the posted message-id is mapped back to the sender.
 *   TG → mesh : a REPLY to a tagged message → direct mesh_tell to THAT agent;
 *               a plain (non-reply) message → broadcast to the shared channel.
 */
export class Bridge {
	private readonly bot: Bot;
	private readonly mesh: MeshClient;
	private chatId: number | null;
	/** tg message-id (of a posted agent message) → who to route a reply back to */
	private readonly replyTargets = new Map<number, ReplyTarget & { nickname: string }>();

	constructor(private readonly cfg: Config) {
		this.chatId = cfg.chatId;
		this.bot = new Bot(cfg.botToken);
		this.mesh = new MeshClient({
			meshId: cfg.hoomanMeshId,
			nickname: cfg.hoomanNickname,
			channel: cfg.channel,
		});
	}

	async start(): Promise<void> {
		this.mesh.on("tell", (t: InboundTell) => void this.onMeshTell(t));
		this.mesh.on("channel", (c: InboundChannel) => void this.onMeshChannel(c));
		this.mesh.start();

		this.bot.on("message", (ctx) => this.onTelegramMessage(ctx));
		this.bot.catch((err) => console.error("[tg] bot error:", err.message));
		// start() resolves only when the bot stops; run it detached.
		void this.bot.start({
			onStart: (bi) => console.log(`[tg] @${bi.username} polling; chat=${this.chatId ?? "(awaiting first message)"}`),
		});
	}

	// ── mesh → telegram ────────────────────────────────────────────────
	private async onMeshTell(t: InboundTell): Promise<void> {
		if (!this.chatId) {
			console.warn(`[bridge] no chat id yet — dropping tell from ${t.nickname}: ${t.text.slice(0, 60)}`);
			return;
		}
		try {
			const sent = await this.bot.api.sendMessage(this.chatId, `👤 ${t.nickname}\n${t.text}`);
			this.replyTargets.set(sent.message_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname });
			this.trimTargets();
		} catch (e) {
			console.error("[bridge] tg send failed:", (e as Error).message);
		}
	}

	private async onMeshChannel(c: InboundChannel): Promise<void> {
		if (!this.chatId) return;
		try {
			const sent = await this.bot.api.sendMessage(this.chatId, `📢 ${c.nickname} · #${c.channel}\n${c.text}`);
			this.replyTargets.set(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname });
			this.trimTargets();
		} catch (e) {
			console.error("[bridge] tg send failed:", (e as Error).message);
		}
	}

	// ── telegram → mesh ────────────────────────────────────────────────
	private onTelegramMessage(ctx: Context): void {
		const msg = ctx.message;
		if (!msg || typeof msg.text !== "string") return;
		if (msg.from?.is_bot) return; // never echo our own posts

		// Capture + persist the chat id on first sight.
		if (this.chatId == null) {
			this.chatId = msg.chat.id;
			console.log("[bridge] captured chat id:", this.chatId);
			persistChatId(this.chatId);
		}
		if (msg.chat.id !== this.chatId) return; // only the configured group

		const text = msg.text;
		const replyTo = msg.reply_to_message?.message_id;
		const target = replyTo != null ? this.replyTargets.get(replyTo) : undefined;

		if (target) {
			this.mesh.tellAgent(target, text);
			console.log(`[bridge] reply → ${target.nickname}: ${text.slice(0, 60)}`);
			void ctx.react("👍").catch(() => {});
		} else {
			this.mesh.broadcast(text);
			console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`);
		}
	}

	/** Bound the reply map so a long-running bridge doesn't grow unbounded. */
	private trimTargets(): void {
		if (this.replyTargets.size <= 2000) return;
		const excess = this.replyTargets.size - 2000;
		let i = 0;
		for (const k of this.replyTargets.keys()) {
			if (i++ >= excess) break;
			this.replyTargets.delete(k);
		}
	}
}