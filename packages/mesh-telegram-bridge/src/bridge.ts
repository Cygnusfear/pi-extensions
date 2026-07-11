import { Bot, InputFile, InlineKeyboard, type Context } from "grammy";
import { MeshClient, type InboundTell, type InboundChannel, type ReplyTarget } from "./mesh-client.ts";
import { type Config, persistChatId } from "./config.ts";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

/** When the group is a forum, broadcasts (agent channel-posts + your plain messages) land here. */
const BROADCAST_TOPIC_NAME = "📢 Broadcast";
/** Telegram hard cap is 4096; leave margin for headers. */
const TG_MAX = 4000;
const INBOX_DIR = join(homedir(), ".config", "mesh-telegram-bridge", "inbox");
const STATE_PATH = join(homedir(), ".config", "mesh-telegram-bridge", "state.json");
/** 🟢 live if a peer announced within the sidecar's eviction window (~90s). */
const LIVE_MS = 90_000;
/** Tappable agents per /agents roster page. */
const AGENTS_PER_PAGE = 8;
/** File extensions we send as photos (vs documents). */
const IMG_RE = /\.(png|jpe?g|gif|webp|bmp)$/i;
/** How long to wait for an image to finish being written before giving up. */
const IMG_STABLE_MS = 8000;

/**
 * Wires the mesh ↔ Telegram in both directions. Supports two modes:
 *   forum  — each agent gets its own topic; reply in an agent's topic → that agent;
 *            post in the Broadcast topic → everyone.
 *   single — (legacy) one chat; reply to a tagged message to reach its agent.
 * Accepts inbound text, voice notes (transcribed via OpenAI Whisper), photos and documents
 * (saved to the inbox dir so agents on this machine can open them). Outbound messages are
 * chunked to fit Telegram's limit. Handles group→supergroup migration.
 */
export class Bridge {
	private readonly bot: Bot;
	private readonly mesh: MeshClient;
	private chatId: number | null;
	private forumMode = false;
	private broadcastTopicId: number | null = null;
	private readonly agentTopic = new Map<string, number>();
	private readonly topicAgent = new Map<number, ReplyTarget & { nickname: string }>();
	private readonly creating = new Set<string>();
	private readonly replyTargets = new Map<number, ReplyTarget & { nickname: string }>();
	/** outbound msg_id → agent (so a hooman emoji reaction on it can be relayed back to the sender). */
	private readonly msgToAgent = new Map<number, { meshId?: string; clientId: string; nickname: string; preview: string }>();
	/** per topic, the hooman's most recent inbound message_id (so an agent emoji reaction lands on it). */
	private readonly lastHoomanInTopic = new Map<number, number>();
	/** AFK mode: hooman is away from pi-chat, on Telegram only. Agents get a reminder. */
	private afk: { on: boolean; message: string; since: number } = { on: false, message: "", since: 0 };
	/** agents already auto-acked during the current AFK stint (avoid spam). Cleared on toggle. */
	private readonly afkNotified = new Set<string>();

	constructor(private readonly cfg: Config) {
		this.chatId = cfg.chatId;
		this.bot = new Bot(cfg.botToken);
		this.mesh = new MeshClient({ meshId: cfg.hoomanMeshId, nickname: cfg.hoomanNickname, channel: cfg.channel });
		this.loadState();
	}
	/** Persist topic↔agent + broadcast-topic ids across restarts (the in-memory maps are wiped otherwise). */
	private loadState(): void {
		try {
			if (!existsSync(STATE_PATH)) return;
			const s = JSON.parse(readFileSync(STATE_PATH, "utf8")) as {
				broadcastTopicId?: number; agentTopic?: Record<string, number>;
				topicAgent?: Record<string, { clientId?: string; meshId?: string; nickname: string }>;
				afk?: { on?: boolean; message?: string; since?: number }; };
			if (typeof s.broadcastTopicId === "number") this.broadcastTopicId = s.broadcastTopicId;
			if (s.agentTopic) for (const [k, v] of Object.entries(s.agentTopic)) this.agentTopic.set(k, v);
			if (s.topicAgent) for (const [k, v] of Object.entries(s.topicAgent)) this.topicAgent.set(Number(k), { clientId: v.clientId ?? "", meshId: v.meshId, nickname: v.nickname });
			if (s.afk?.on) { this.afk = { on: true, message: s.afk.message ?? "away from pi-chat", since: s.afk.since ?? Date.now() }; console.log("[bridge] loaded AFK: on (" + this.afk.message + ")"); }
			console.log(`[bridge] loaded state: ${this.agentTopic.size} agent topics, broadcast=${this.broadcastTopicId}`);
		} catch (e) { console.warn("[bridge] state load failed:", (e as Error).message); }
	}
	private saveState(): void {
		try {
			mkdirSync(join(homedir(), ".config", "mesh-telegram-bridge"), { recursive: true });
			const obj: Record<string, unknown> = { agentTopic: Object.fromEntries(this.agentTopic), topicAgent: Object.fromEntries(this.topicAgent) };
			if (this.broadcastTopicId != null) obj.broadcastTopicId = this.broadcastTopicId;
			if (this.afk.on) obj.afk = this.afk;
			writeFileSync(STATE_PATH, JSON.stringify(obj, null, 2));
		} catch (e) { console.warn("[bridge] state save failed:", (e as Error).message); }
	}

	/** /afk [on|off|status] [msg] — toggle AFK mode. While on, agents are reminded to use Telegram. */
	private async handleAfkCommand(text: string, ctx: Context): Promise<void> {
		const parts = text.replace(/@ramdock_bot\b/gi, "").split(/\s+/).filter(Boolean);
		const sub = (parts[1] ?? "").toLowerCase();
		if (sub === "status") {
			void ctx.reply(this.afk.on ? ("AFK: on (" + this.afk.message + "), since " + new Date(this.afk.since).toLocaleString()) : "AFK: off").catch(() => {});
			return;
		}
		if (sub === "off") {
			this.afk = { on: false, message: "", since: 0 };
			this.afkNotified.clear();
			this.saveState();
			this.mesh.broadcast("📢 The Hooman is back.");
			void ctx.reply("✅ AFK off — agents notified you're back.").catch(() => {});
			console.log("[bridge] afk off");
			return;
		}
		// on (default). Message = words after "on", or after "/afk" if bare.
		const msgParts = sub === "on" ? parts.slice(2) : parts.slice(1);
		const message = msgParts.join(" ").trim() || "away from pi-chat";
		this.afk = { on: true, message, since: Date.now() };
		this.afkNotified.clear();
		this.saveState();
		this.mesh.broadcast("📢 The Hooman is AFK (" + message + "). They're on Telegram only — use mesh.tell or notify() to reach them; pi-chat / desktop pings may go unseen until they return.");
		void ctx.reply("✅ AFK on (" + message + "). Agents reminded to use Telegram.").catch(() => {});
		console.log("[bridge] afk on (" + message + ")");
	}

	async start(): Promise<void> {
		this.mesh.on("tell", (t: InboundTell) => void this.onMeshTell(t));
		this.mesh.on("channel", (c: InboundChannel) => void this.onMeshChannel(c));
		this.mesh.start();
		if (this.chatId != null) void this.detectForum();
		this.bot.on("message", (ctx) => void this.onTelegramMessage(ctx));
		this.bot.on("message_reaction", (ctx) => void this.onReaction(ctx));
		this.bot.on("callback_query", (ctx) => void this.onCallbackQuery(ctx));
		this.bot.on("inline_query", (ctx) => void this.onInlineQuery(ctx));
		this.bot.catch((err) => console.error("[tg] bot error:", err.message));
		void this.bot.start({
			allowed_updates: ["message", "message_reaction", "callback_query", "inline_query"],
			onStart: (bi) => console.log(`[tg] @${bi.username} polling; chat=${this.chatId ?? "(awaiting)"} forum=${this.forumMode}`),
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
				this.saveState();
				console.log("[bridge] broadcast topic:", this.broadcastTopicId);
			}
		} catch (e) {
			console.warn("[bridge] forum detect failed:", (e as Error).message, "(single-chat fallback)");
		}
	}

	/** Resolve a mesh peer by nickname / session-name / id prefix or substring. */
	private resolvePeer(query: string): { meshId?: string; clientId: string; nickname: string; name?: string } | null {
		const q = query.trim().toLowerCase();
		if (!q) return null;
		const peers = [...this.mesh.peers.values()];
		let m = peers.find((p) => (p.nickname ?? "").toLowerCase() === q || (p.name ?? "").toLowerCase() === q);
		if (!m && q.length >= 3) m = peers.find((p) => (p.nickname ?? "").toLowerCase().startsWith(q) || (p.name ?? "").toLowerCase().startsWith(q) || (p.meshId ?? "").startsWith(q) || (p.id ?? "").startsWith(q));
		if (!m && q.length >= 3) m = peers.find((p) => (p.nickname ?? "").toLowerCase().includes(q) || (p.name ?? "").toLowerCase().includes(q));
		return m ? { meshId: m.meshId, clientId: m.id, nickname: m.nickname ?? m.id.slice(0, 8), name: m.name } : null;
	}

	/** Create (idempotently) a topic for an arbitrary peer — used by /dm. */
	private async ensureTopicForPeer(peer: { meshId?: string; clientId: string; nickname: string; name?: string }): Promise<number | null> {
		const key = peer.meshId ?? peer.clientId;
		if (this.chatId == null || !key) return null;
		if (this.agentTopic.has(key)) return this.agentTopic.get(key)!;
		try {
			const name = (peer.name ? peer.nickname + " · " + peer.name : peer.nickname).slice(0, 128);
			const topic = await this.bot.api.createForumTopic(this.chatId!, name);
			this.agentTopic.set(key, topic.message_thread_id);
			this.topicAgent.set(topic.message_thread_id, { clientId: peer.clientId, meshId: peer.meshId, nickname: peer.nickname });
			this.saveState();
			console.log("[bridge] created topic \"" + name + "\" (" + topic.message_thread_id + ") for " + peer.nickname + " (via /dm)");
			return topic.message_thread_id;
		} catch (e) { console.error("[bridge] /dm createForumTopic failed:", (e as Error).message); return null; }
	}

	private async ensureAgentTopic(t: InboundTell): Promise<number | null> {
		const key = t.fromMeshId ?? t.fromClientId;
		if (!key || this.chatId == null) return null;
		if (this.agentTopic.has(key)) return this.agentTopic.get(key)!;
		if (this.creating.has(key)) {
			for (let i = 0; i < 20; i++) { await sleep(50); if (this.agentTopic.has(key)) return this.agentTopic.get(key)!; }
		}
		this.creating.add(key);
		try {
			const name = (t.sessionName ? t.nickname + " · " + t.sessionName : t.nickname).slice(0, 128);
			const topic = await this.bot.api.createForumTopic(this.chatId!, name);
			this.agentTopic.set(key, topic.message_thread_id);
			this.topicAgent.set(topic.message_thread_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname });
			this.saveState();
			console.log(`[bridge] created topic "${name}" (${topic.message_thread_id}) for ${t.nickname}`);
			return topic.message_thread_id;
		} catch (e) { console.error("[bridge] createForumTopic failed:", (e as Error).message); return null; }
		finally { this.creating.delete(key); }
	}

	// ── mesh → telegram ────────────────────────────────────────────────
	private async onMeshTell(t: InboundTell): Promise<void> {
		if (this.chatId == null) { console.warn(`[bridge] no chat id yet — dropping tell from ${t.nickname}: ${(t.text ?? "").slice(0, 60)}`); return; }
		const topic = this.forumMode ? await this.ensureAgentTopic(t) : null;
		if (t.reaction) await this.setHoomanReaction(t.reaction, topic);
		const thread = topic != null ? { message_thread_id: topic } : {};
		try {
			if (t.text && t.text.trim()) {
				for (const chunk of this.chunkText(`👤 ${t.nickname}`, t.text)) {
					const sent = await this.bot.api.sendMessage(this.chatId, chunk, thread);
					if (this.forumMode) this.trackSent(sent.message_id, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, t.text);
					else { this.replyTargets.set(sent.message_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname }); this.trimTargets(); }
				}
			}
			await this.uploadAttachment(t, topic);
		} catch (e) { console.error("[bridge] tg send failed:", (e as Error).message); }
		// AFK auto-ack: tell the agent (once per AFK stint) the hooman won't reply immediately.
		if (this.afk.on && t.fromClientId && !this.afkNotified.has(t.fromClientId)) {
			this.afkNotified.add(t.fromClientId);
			const since = new Date(this.afk.since).toLocaleTimeString();
			this.mesh.tellAgent({ clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname },
				"📢 The Hooman is AFK (" + this.afk.message + ", since " + since + "). They'll see your message on Telegram but may not reply immediately.");
		}
	}

	private async onMeshChannel(c: InboundChannel): Promise<void> {
		if (this.chatId == null) return;
		const thread = this.forumMode && this.broadcastTopicId != null ? { message_thread_id: this.broadcastTopicId } : {};
		try {
			for (const chunk of this.chunkText(`📢 ${c.nickname} · #${c.channel}`, c.text)) {
				const sent = await this.bot.api.sendMessage(this.chatId, chunk, thread);
				if (this.forumMode) this.trackSent(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname }, c.text);
				else { this.replyTargets.set(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname }); this.trimTargets(); }
			}
		} catch (e) { console.error("[bridge] tg send failed:", (e as Error).message); }
	}

	// ── telegram → mesh ────────────────────────────────────────────────
	private async onTelegramMessage(ctx: Context): Promise<void> {
		const msg = ctx.message;
		if (!msg) return;
		const m = msg as unknown as Record<string, unknown>;

		// Group → supergroup migration is a textless service message — handle BEFORE everything.
		if (typeof m.migrate_to_chat_id === "number") {
			this.chatId = m.migrate_to_chat_id;
			console.log("[bridge] group migrated to supergroup; new chat id:", this.chatId);
			persistChatId(this.chatId);
			void this.detectForum();
			return;
		}
		if (msg.from?.is_bot) return;

		if (this.chatId == null) { this.chatId = msg.chat.id; console.log("[bridge] captured chat id:", this.chatId); persistChatId(this.chatId); void this.detectForum(); }
		if (msg.chat.id !== this.chatId) return;

		// Turn whatever the hooman sent (text / voice / photo / document) into the outbound text.
		let text: string | null = null;
		try {
			if (typeof msg.text === "string") text = msg.text;
			else if (msg.voice) {
				const t = await this.transcribeVoice(msg.voice.file_id);
				void ctx.reply("🎤 transcribed: " + t).catch(() => {});
				text = t;
			}
			else if (msg.photo && msg.photo.length) text = await this.inboundFileText(msg.photo[msg.photo.length - 1].file_id, "photo", msg.caption);
			else if (msg.document) text = await this.inboundFileText(msg.document.file_id, "document", msg.caption, msg.document.file_name);
		} catch (e) { console.error("[bridge] inbound media failed:", (e as Error).message); return; }
		if (!text) return;

		// /agents — post a tappable live roster (tap a button → opens that agent's topic).
		if (text.startsWith("/agents") && (text.length === 7 || text[7] === " " || text[7] === "@")) {
			if (!this.forumMode || this.chatId == null) { void ctx.reply("Forum mode required for /agents."); return; }
			const r = this.buildAgentsRoster(1);
			void ctx.reply(r.text, { reply_markup: r.keyboard }).catch((e) => console.error("[bridge] /agents send:", (e as Error).message));
			return;
		}

		// /dm <agent> — create a topic for any mesh peer on demand (forum mode only).
		if (this.forumMode && text.startsWith("/dm") && (text.length === 3 || text[3] === " " || text[3] === "@")) {
			let q = text.slice(3).trim();
			if (q.startsWith("@")) { const sp = q.indexOf(" "); q = sp >= 0 ? q.slice(sp + 1).trim() : ""; }
			if (!q) { void ctx.reply("Usage: /dm <agent nickname, name, or id>"); return; }
			const peer = this.resolvePeer(q);
			if (!peer) { void ctx.reply("No mesh peer matching '" + q + "'."); return; }
			const topic = await this.ensureTopicForPeer(peer);
			void ctx.reply(topic != null ? ("✉️ Topic ready for " + peer.nickname + (peer.name ? " · " + peer.name : "") + " — message me there.") : ("Couldn't create a topic for " + peer.nickname + "."));
			return;
		}

		// /afk [on|off|status] [msg] — AFK mode: reminds agents to reach you on Telegram.
		if (this.forumMode && text.startsWith("/afk") && (text.length === 4 || text[4] === " " || text[4] === "@")) {
			await this.handleAfkCommand(text, ctx);
			return;
		}
		// Unknown slash command — reply with the menu instead of routing "/foo" to an agent.
		if (text.startsWith("/") && text.trim().length > 1) {
			void ctx.reply("Unknown command. Try:\n/agents — live agent roster\n/dm <agent> — open an agent's topic\n/afk [on|off] [msg] — AFK mode").catch(() => {});
			return;
		}

		if (this.forumMode) {
			const topicId = typeof m.message_thread_id === "number" ? m.message_thread_id : undefined;
			const agent = topicId != null ? this.topicAgent.get(topicId) : undefined;
			if (agent) {
				if (topicId != null) this.lastHoomanInTopic.set(topicId, msg.message_id);
				this.mesh.tellAgent(agent, text); console.log(`[bridge] topic → ${agent.nickname}: ${text.slice(0, 60)}`); void ctx.react("👍").catch(() => {});
			}
			else { this.mesh.broadcast(text); console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`); }
			return;
		}
		const replyTo = msg.reply_to_message?.message_id;
		const target = replyTo != null ? this.replyTargets.get(replyTo) : undefined;
		if (target) { this.mesh.tellAgent(target, text); console.log(`[bridge] reply → ${target.nickname}: ${text.slice(0, 60)}`); void ctx.react("👍").catch(() => {}); }
		else { this.mesh.broadcast(text); console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`); }
	}

	// ── agent roster (Tier 1) + inline autocomplete (Tier 2) ───────────
	/** All known peers except the bridge itself, freshest first. */
	private livePeersSorted() {
		return [...this.mesh.peers.values()]
			.filter((p) => p.meshId !== this.cfg.hoomanMeshId)
			.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
	}

	/** Build a tappable roster message + inline keyboard for the given page. */
	private buildAgentsRoster(page: number): { text: string; keyboard: InlineKeyboard } {
		const now = Date.now();
		const peers = this.livePeersSorted();
		const total = peers.length;
		const live = peers.filter((p) => now - (p.lastSeen ?? 0) < LIVE_MS).length;
		const totalPages = Math.max(1, Math.ceil(total / AGENTS_PER_PAGE));
		const p = Math.min(Math.max(1, page), totalPages);
		const slice = peers.slice((p - 1) * AGENTS_PER_PAGE, p * AGENTS_PER_PAGE);
		const kb = new InlineKeyboard();
		for (const peer of slice) {
			const dot = now - (peer.lastSeen ?? 0) < LIVE_MS ? "🟢" : "⚪";
			const label = `${dot} ${peer.nickname ?? peer.id.slice(0, 8)}${peer.name ? " · " + peer.name : ""}`.slice(0, 60);
			const key = (peer.meshId ?? peer.id).slice(0, 60);
			kb.text(label, `a:${key}`).row();
		}
		if (totalPages > 1) {
			if (p > 1) kb.text("◀", `ap:${p - 1}`);
			kb.text(`${p}/${totalPages}`, "noop");
			if (p < totalPages) kb.text("▶", `ap:${p + 1}`);
		}
		const text = `🤖 Mesh agents — ${live}🟢 / ${total} total${totalPages > 1 ? ` · page ${p}/${totalPages}` : ""}\nTap an agent to open their topic.`;
		return { text, keyboard: kb };
	}

	/** Look up a peer by the callback key (meshId or clientId). */
	private findPeerByKey(key: string): { meshId?: string; clientId: string; nickname: string; name?: string } | null {
		for (const p of this.mesh.peers.values()) {
			if ((p.meshId ?? "") === key || p.id === key) return { meshId: p.meshId, clientId: p.id, nickname: p.nickname ?? p.id.slice(0, 8), name: p.name };
		}
		return null;
	}

	/** Inline-keyboard tap — open an agent's topic, or paginate the roster. */
	private async onCallbackQuery(ctx: Context): Promise<void> {
		const data = ctx.callbackQuery?.data ?? "";
		try {
			if (data === "noop") { await ctx.answerCallbackQuery(); return; }
			if (data.startsWith("ap:")) {
				const page = Number(data.slice(3)) || 1;
				const r = this.buildAgentsRoster(page);
				await ctx.editMessageText(r.text, { reply_markup: r.keyboard });
			await ctx.answerCallbackQuery();
			return;
			}
			if (data.startsWith("a:")) {
				const key = data.slice(2);
				const peer = this.findPeerByKey(key);
				if (!peer) { await ctx.answerCallbackQuery({ text: "That agent went offline.", show_alert: true }); return; }
				if (this.chatId == null) { await ctx.answerCallbackQuery({ text: "No chat yet.", show_alert: true }); return; }
				const topic = await this.ensureTopicForPeer(peer);
				if (topic == null) { await ctx.answerCallbackQuery({ text: "Couldn't create a topic.", show_alert: true }); return; }
				await this.bot.api.sendMessage(this.chatId, `✉️ Topic for ${peer.nickname}${peer.name ? " · " + peer.name : ""} — message me here.`, { message_thread_id: topic });
				await ctx.answerCallbackQuery({ text: `✅ Opened ${peer.nickname}` });
				return;
			}
			await ctx.answerCallbackQuery();
		} catch (e) {
			console.error("[bridge] callback err:", (e as Error).message);
			try { await ctx.answerCallbackQuery(); } catch {}
		}
	}

	/** Tier 2 — "@ramdock_bot <query>" autocomplete; tap inserts "/dm <agent>". */
	private async onInlineQuery(ctx: Context): Promise<void> {
		const q = (ctx.inlineQuery?.query ?? "").trim().toLowerCase();
		const peers = this.livePeersSorted();
		const matches = q
			? peers.filter((p) => (p.nickname ?? "").toLowerCase().includes(q) || (p.name ?? "").toLowerCase().includes(q) || (p.meshId ?? "").includes(q))
			: peers.slice(0, 8);
		const now = Date.now();
		const results = matches.slice(0, 20).map((p) => {
			const dot = now - (p.lastSeen ?? 0) < LIVE_MS ? "🟢" : "⚪";
			const nick = p.nickname ?? p.id.slice(0, 8);
			return {
				type: "article" as const,
				id: (p.meshId ?? p.id).slice(0, 64),
				title: `${dot} ${nick}${p.name ? " · " + p.name : ""}`.slice(0, 128),
				description: p.name ? `@ ${p.name}` : "mesh agent",
				input_message_content: { message_text: `/dm ${nick}` },
			};
		});
		await ctx.answerInlineQuery(results, { cache_time: 5 });
	}

	/** Record an outbound message so a hooman emoji reaction on it can be relayed back. */
	private trackSent(msgId: number, target: { meshId?: string; clientId: string; nickname: string }, preview: string): void {
		this.msgToAgent.set(msgId, { meshId: target.meshId, clientId: target.clientId, nickname: target.nickname, preview: (preview ?? "").slice(0, 40) });
		if (this.msgToAgent.size > 2000) {
			let i = 0; const excess = this.msgToAgent.size - 2000;
			for (const k of this.msgToAgent.keys()) { if (i++ >= excess) break; this.msgToAgent.delete(k); }
		}
	}

	/** Agent → Hooman: set an emoji reaction on the hooman's last message in the topic. */
	private async setHoomanReaction(emoji: string, topic: number | null): Promise<void> {
		if (this.chatId == null || topic == null) return;
		const target = this.lastHoomanInTopic.get(topic);
		if (target == null) { console.warn(`[bridge] agent reaction ${emoji} but no inbound msg to react to (topic ${topic})`); return; }
		try {
			await this.bot.api.setMessageReaction(this.chatId, target, [{ type: "emoji", emoji }]);
			console.log(`[bridge] set reaction ${emoji} on msg ${target} (topic ${topic})`);
		} catch (e) { console.warn(`[bridge] setMessageReaction failed (${emoji}):`, (e as Error).message); }
	}

	/** Hooman → Agent: relay an emoji reaction on a bridge-sent message back to its sender. */
	private async onReaction(ctx: Context): Promise<void> {
		const ur = ctx.update.message_reaction as { chat?: { id?: number }; message_id: number; user?: { first_name?: string; username?: string }; old_reaction?: Array<{ type: string; emoji?: string }>; new_reaction?: Array<{ type: string; emoji?: string }> } | undefined;
		if (!ur || ur.chat?.id !== this.chatId) return;
		let target = this.msgToAgent.get(ur.message_id);
		console.log("[bridge] reaction EVENT msg=" + ur.message_id + " new=" + JSON.stringify(ur.new_reaction ?? []) + " old=" + JSON.stringify(ur.old_reaction ?? []) + " tracked=" + (target ? target.nickname : "NO"));
		if (!target) {
			// Fallback: derive the agent from the reacted message's topic (persists across restarts).
			try {
				const m = await this.bot.api.getMessage(this.chatId, ur.message_id) as { message_thread_id?: number };
				const topicId = m.message_thread_id;
				const a = topicId != null ? this.topicAgent.get(topicId) : undefined;
				if (a) { target = { meshId: a.meshId, clientId: a.clientId, nickname: a.nickname, preview: "" }; console.log("[bridge] reaction fallback: derived " + a.nickname + " from topic " + topicId); }
			} catch (e) { console.warn("[bridge] reaction getMessage fallback failed: " + (e as Error).message); }
		}
		if (!target) return;
		const oldE = new Set((ur.old_reaction ?? []).filter((x) => x.type === "emoji" && x.emoji).map((x) => x.emoji!));
		const added = (ur.new_reaction ?? []).filter((x) => x.type === "emoji" && x.emoji).map((x) => x.emoji!).filter((e) => !oldE.has(e));
		if (!added.length) return;
		const who = ur.user?.first_name ?? ur.user?.username ?? "The Hooman";
		const preview = target.preview ? ` ("${target.preview}")` : "";
		this.mesh.tellAgent(target, `${added.join("")} ${who} reacted to your message${preview}`);
		console.log(`[bridge] reaction ${added.join("")} on msg ${ur.message_id} → ${target.nickname}`);
	}

	// ── media helpers ──────────────────────────────────────────────────
	private async tgDownload(fileId: string): Promise<Buffer> {
		const f = await this.bot.api.getFile(fileId);
		const url = `https://api.telegram.org/file/bot${this.cfg.botToken}/${f.file_path}`;
		const r = await fetch(url);
		if (!r.ok) throw new Error(`file download failed: ${r.status}`);
		return Buffer.from(await r.arrayBuffer());
	}

	private async transcribeVoice(fileId: string): Promise<string> {
		const buf = await this.tgDownload(fileId);
		const key = process.env.OPENROUTER_API_KEY;
		if (!key) return "(voice note — OPENROUTER_API_KEY not set, can't transcribe)";
		const form = new FormData();
		form.append("file", new Blob([buf]), "voice.ogg");
		form.append("model", "whisper-1");
		const r = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
		if (!r.ok) return `(voice transcription failed: ${r.status})`;
		const j = (await r.json()) as { text?: string };
		return j.text?.trim() || "(empty voice transcription)";
	}

	private async inboundFileText(fileId: string, kind: "photo" | "document", caption: string | undefined, filename?: string): Promise<string> {
		const buf = await this.tgDownload(fileId);
		mkdirSync(INBOX_DIR, { recursive: true });
		const name = `${Date.now()}-${filename ?? (kind === "photo" ? "photo.jpg" : "file")}`;
		const p = join(INBOX_DIR, name);
		writeFileSync(p, buf);
		const icon = kind === "photo" ? "📸" : "📎";
		return `${icon} ${kind} saved: ${p}${caption ? `\n${caption}` : ""}`;
	}

	/** Upload an agent's file/image attachment (if any) into its topic. */
	private async uploadAttachment(t: InboundTell, topic: number | null): Promise<void> {
		if (!t.attachment) return;
		if (!existsSync(t.attachment)) { console.warn(`[bridge] attachment not found: ${t.attachment} (from ${t.nickname})`); return; }
		const thread = topic != null ? { message_thread_id: topic } : {};
		const cap = `${IMG_RE.test(t.attachment) ? "🖼" : "📎"} ${t.nickname}`;
		const fname = basename(t.attachment);
		try {
			if (IMG_RE.test(t.attachment)) {
				// Wait for the render to finish writing, then verify the file is complete
				// (has its end marker) before sending — never ship a truncated photo.
				const buf = await this.readStableImage(t.attachment);
				if (!buf) {
					console.warn(`[bridge] image never finished writing — skipped: ${t.attachment}`);
					await this.bot.api.sendMessage(this.chatId, `⚠️ ${t.nickname} sent an image that hadn't finished rendering — skipped. Ask them to resend once it's done.`, thread).catch(() => {});
					return;
				}
				const sent = await this.bot.api.sendPhoto(this.chatId, new InputFile(buf, fname), { ...thread, caption: cap });
				this.trackSent(sent.message_id, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, t.text ?? "photo");
				console.log(`[bridge] sent photo: ${t.attachment} (${buf.length}b) → topic ${topic ?? "(main)"}`);
			} else {
				await this.bot.api.sendDocument(this.chatId, new InputFile(t.attachment), { ...thread, caption: cap });
				console.log(`[bridge] sent document: ${t.attachment} → topic ${topic ?? "(main)"}`);
			}
		} catch (e) { console.error(`[bridge] attachment upload failed (${t.attachment}):`, (e as Error).message); }
	}

	/**
	 * Read an image only once its size has stopped changing (render-write safe)
	 * and confirm it carries its format's end marker. Returns null if it never
	 * completes within IMG_STABLE_MS — so we never ship a truncated photo.
	 */
	private async readStableImage(path: string): Promise<Buffer | null> {
		const step = 300;
		let lastSize = -1;
		const deadline = Date.now() + IMG_STABLE_MS;
		while (Date.now() < deadline) {
			let size: number;
			try { size = statSync(path).size; } catch { return null; }
			if (size > 0 && size === lastSize) {
				const buf = readFileSync(path);
				if (this.imageComplete(buf, path)) return buf;
			}
			lastSize = size;
			await sleep(step);
		}
		return null;
	}

	/** A stable image buffer is "complete" if it has its format's end marker. */
	private imageComplete(buf: Buffer, path: string): boolean {
		if (buf.length < 12) return false;
		const low = path.toLowerCase();
		if (low.endsWith(".png")) return buf.subarray(buf.length - 8, buf.length - 4).toString("latin1") === "IEND";
		if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
		if (low.endsWith(".gif")) return buf[buf.length - 1] === 0x3b;
		if (low.endsWith(".webp")) return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
		if (low.endsWith(".bmp")) return buf.subarray(0, 2).toString("latin1") === "BM";
		return true;
	}

	/** Split a header+body into Telegram-sized chunks (char-based; rare for short tells). */
	private chunkText(header: string, body: string): string[] {
		const full = `${header}\n${body}`;
		if (full.length <= TG_MAX) return [full];
		const out: string[] = [];
		const firstCap = TG_MAX - header.length - 1;
		out.push(`${header}\n${body.slice(0, firstCap)}`);
		let rest = body.slice(firstCap);
		while (rest.length > 0) {
			const piece = rest.slice(0, TG_MAX - header.length - 9);
			out.push(`${header} (cont.)\n${piece}`);
			rest = rest.slice(piece.length);
		}
		return out;
	}

	private trimTargets(): void {
		if (this.replyTargets.size <= 2000) return;
		let i = 0; const excess = this.replyTargets.size - 2000;
		for (const k of this.replyTargets.keys()) { if (i++ >= excess) break; this.replyTargets.delete(k); }
	}
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }