import { Bot, type Context } from "grammy";
import { MeshClient, type InboundTell, type InboundChannel, type ReplyTarget } from "./mesh-client.ts";
import { type Config, persistChatId } from "./config.ts";

/** When the group is a forum, broadcasts (agent channel-posts + your plain messages) land here. */
const BROADCAST_TOPIC_NAME = "📢 Broadcast";

/**
 * Wires the mesh ↔ Telegram in both directions. Supports two modes:
 *   forum  — each agent gets its own topic (auto-created); you reply IN an agent's topic
 *            to route back to that agent, and post in the Broadcast topic to reach everyone.
 *   single — (legacy) one chat; reply to a tagged message to reach its agent.
 * Auto-detects via getChat().is_forum. Handles group→supergroup migration (chat-id changes).
 */
export class Bridge {
	private readonly bot: Bot;
	private readonly mesh: MeshClient;
	private chatId: number | null;
	private forumMode = false;
	private broadcastTopicId: number | null = null;
	/** agent durable meshId (or clientId fallback) → topic id */
	private readonly agentTopic = new Map<string, number>();
	/** topic id → agent route */
	private readonly topicAgent = new Map<number, ReplyTarget & { nickname: string }>();
	/** meshIds with a topic creation in flight (dedupe concurrent first messages) */
	private readonly creating = new Set<string>();
	/** single-chat fallback: tg message-id → agent */
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

		if (this.chatId != null) void this.detectForum();

		this.bot.on("message", (ctx) => this.onTelegramMessage(ctx));
		this.bot.catch((err) => console.error("[tg] bot error:", err.message));
		void this.bot.start({
			onStart: (bi) =>
				console.log(`[tg] @${bi.username} polling; chat=${this.chatId ?? "(awaiting)"} forum=${this.forumMode}`),
		});
	}

	private async detectForum(): Promise<void> {
		try {
			const chat = (await this.bot.api.getChat(this.chatId!)) as unknown as Record<string, unknown>;
			this.forumMode = !!chat.is_forum;
			console.log("[bridge] forum mode:", this.forumMode);
			if (this.forumMode && this.broadcastTopicId == null) {
				const t = await this.bot.api.createForumTopic(this.chatId!, BROADCAST_TOPIC_NAME);
				this.broadcastTopicId = t.message_thread_id;
				console.log("[bridge] broadcast topic:", this.broadcastTopicId);
			}
		} catch (e) {
			console.warn("[bridge] forum detect failed:", (e as Error).message, "(single-chat fallback)");
		}
	}

	private async ensureAgentTopic(t: InboundTell): Promise<number | null> {
		const key = t.fromMeshId ?? t.fromClientId;
		if (!key || this.chatId == null) return null;
		if (this.agentTopic.has(key)) return this.agentTopic.get(key)!;
		if (this.creating.has(key)) {
			for (let i = 0; i < 20; i++) {
				await sleep(50);
				if (this.agentTopic.has(key)) return this.agentTopic.get(key)!;
			}
		}
		this.creating.add(key);
		try {
			const name = t.nickname.slice(0, 128);
			const topic = await this.bot.api.createForumTopic(this.chatId!, name);
			this.agentTopic.set(key, topic.message_thread_id);
			this.topicAgent.set(topic.message_thread_id, {
				clientId: t.fromClientId,
				meshId: t.fromMeshId,
				nickname: t.nickname,
			});
			console.log(`[bridge] created topic "${name}" (${topic.message_thread_id}) for ${t.nickname}`);
			return topic.message_thread_id;
		} catch (e) {
			console.error("[bridge] createForumTopic failed:", (e as Error).message);
			return null;
		} finally {
			this.creating.delete(key);
		}
	}

	// ── mesh → telegram ────────────────────────────────────────────────
	private async onMeshTell(t: InboundTell): Promise<void> {
		if (this.chatId == null) {
			console.warn(`[bridge] no chat id yet — dropping tell from ${t.nickname}: ${t.text.slice(0, 60)}`);
			return;
		}
		const text = `👤 ${t.nickname}\n${t.text}`;
		try {
			if (this.forumMode) {
				const topic = await this.ensureAgentTopic(t);
				if (topic != null) await this.bot.api.sendMessage(this.chatId, text, { message_thread_id: topic });
				else await this.bot.api.sendMessage(this.chatId, text);
			} else {
				const sent = await this.bot.api.sendMessage(this.chatId, text);
				this.replyTargets.set(sent.message_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname });
				this.trimTargets();
			}
		} catch (e) {
			console.error("[bridge] tg send failed:", (e as Error).message);
		}
	}

	private async onMeshChannel(c: InboundChannel): Promise<void> {
		if (this.chatId == null) return;
		const text = `📢 ${c.nickname} · #${c.channel}\n${c.text}`;
		try {
			if (this.forumMode && this.broadcastTopicId != null) {
				await this.bot.api.sendMessage(this.chatId, text, { message_thread_id: this.broadcastTopicId });
			} else {
				const sent = await this.bot.api.sendMessage(this.chatId, text);
				this.replyTargets.set(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname });
				this.trimTargets();
			}
		} catch (e) {
			console.error("[bridge] tg send failed:", (e as Error).message);
		}
	}

	// ── telegram → mesh ────────────────────────────────────────────────
	private onTelegramMessage(ctx: Context): void {
		const msg = ctx.message;
		if (!msg) return;
		const m = msg as unknown as Record<string, unknown>;

		// Group → supergroup migration is a textless service message, so handle it BEFORE
		// the text guard: adopt the new chat id + re-detect forum mode.
		if (typeof m.migrate_to_chat_id === "number") {
			this.chatId = m.migrate_to_chat_id;
			console.log("[bridge] group migrated to supergroup; new chat id:", this.chatId);
			persistChatId(this.chatId);
			void this.detectForum();
			return;
		}

		if (typeof msg.text !== "string") return;
		if (msg.from?.is_bot) return;

		if (this.chatId == null) {
			this.chatId = msg.chat.id;
			console.log("[bridge] captured chat id:", this.chatId);
			persistChatId(this.chatId);
			void this.detectForum();
		}
		if (msg.chat.id !== this.chatId) return;

		const text = msg.text;

		if (this.forumMode) {
			// The topic you post in IS the routing: an agent's topic → that agent; else broadcast.
			const topicId = typeof m.message_thread_id === "number" ? m.message_thread_id : undefined;
			const agent = topicId != null ? this.topicAgent.get(topicId) : undefined;
			if (agent) {
				this.mesh.tellAgent(agent, text);
				console.log(`[bridge] topic → ${agent.nickname}: ${text.slice(0, 60)}`);
				void ctx.react("👍").catch(() => {});
			} else {
				this.mesh.broadcast(text);
				console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`);
			}
			return;
		}

		// single-chat fallback (reply-map)
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

	private trimTargets(): void {
		if (this.replyTargets.size <= 2000) return;
		let i = 0;
		const excess = this.replyTargets.size - 2000;
		for (const k of this.replyTargets.keys()) {
			if (i++ >= excess) break;
			this.replyTargets.delete(k);
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}