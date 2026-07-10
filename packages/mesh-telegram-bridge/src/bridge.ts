import { Bot, InputFile, type Context } from "grammy";
import { MeshClient, type InboundTell, type InboundChannel, type ReplyTarget } from "./mesh-client.ts";
import { type Config, persistChatId } from "./config.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** When the group is a forum, broadcasts (agent channel-posts + your plain messages) land here. */
const BROADCAST_TOPIC_NAME = "📢 Broadcast";
/** Telegram hard cap is 4096; leave margin for headers. */
const TG_MAX = 4000;
const INBOX_DIR = join(homedir(), ".config", "mesh-telegram-bridge", "inbox");
const STATE_PATH = join(homedir(), ".config", "mesh-telegram-bridge", "state.json");

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
				topicAgent?: Record<string, { clientId?: string; meshId?: string; nickname: string }> };
			if (typeof s.broadcastTopicId === "number") this.broadcastTopicId = s.broadcastTopicId;
			if (s.agentTopic) for (const [k, v] of Object.entries(s.agentTopic)) this.agentTopic.set(k, v);
			if (s.topicAgent) for (const [k, v] of Object.entries(s.topicAgent)) this.topicAgent.set(Number(k), { clientId: v.clientId ?? "", meshId: v.meshId, nickname: v.nickname });
			console.log(`[bridge] loaded state: ${this.agentTopic.size} agent topics, broadcast=${this.broadcastTopicId}`);
		} catch (e) { console.warn("[bridge] state load failed:", (e as Error).message); }
	}
	private saveState(): void {
		try {
			mkdirSync(join(homedir(), ".config", "mesh-telegram-bridge"), { recursive: true });
			const obj: Record<string, unknown> = { agentTopic: Object.fromEntries(this.agentTopic), topicAgent: Object.fromEntries(this.topicAgent) };
			if (this.broadcastTopicId != null) obj.broadcastTopicId = this.broadcastTopicId;
			writeFileSync(STATE_PATH, JSON.stringify(obj, null, 2));
		} catch (e) { console.warn("[bridge] state save failed:", (e as Error).message); }
	}

	async start(): Promise<void> {
		this.mesh.on("tell", (t: InboundTell) => void this.onMeshTell(t));
		this.mesh.on("channel", (c: InboundChannel) => void this.onMeshChannel(c));
		this.mesh.start();
		if (this.chatId != null) void this.detectForum();
		this.bot.on("message", (ctx) => void this.onTelegramMessage(ctx));
		this.bot.catch((err) => console.error("[tg] bot error:", err.message));
		void this.bot.start({
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
		if (this.chatId == null) { console.warn(`[bridge] no chat id yet — dropping tell from ${t.nickname}: ${t.text.slice(0, 60)}`); return; }
		const topic = this.forumMode ? await this.ensureAgentTopic(t) : null;
		const thread = topic != null ? { message_thread_id: topic } : {};
		try {
			for (const chunk of this.chunkText(`👤 ${t.nickname}`, t.text)) {
				const sent = await this.bot.api.sendMessage(this.chatId, chunk, thread);
				if (!this.forumMode) { this.replyTargets.set(sent.message_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname }); this.trimTargets(); }
			}
			await this.uploadAttachment(t, topic);
		} catch (e) { console.error("[bridge] tg send failed:", (e as Error).message); }
	}

	private async onMeshChannel(c: InboundChannel): Promise<void> {
		if (this.chatId == null) return;
		const thread = this.forumMode && this.broadcastTopicId != null ? { message_thread_id: this.broadcastTopicId } : {};
		try {
			for (const chunk of this.chunkText(`📢 ${c.nickname} · #${c.channel}`, c.text)) {
				const sent = await this.bot.api.sendMessage(this.chatId, chunk, thread);
				if (!this.forumMode) { this.replyTargets.set(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname }); this.trimTargets(); }
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
			else if (msg.voice) text = `🎤 ${await this.transcribeVoice(msg.voice.file_id)}`;
			else if (msg.photo && msg.photo.length) text = await this.inboundFileText(msg.photo[msg.photo.length - 1].file_id, "photo", msg.caption);
			else if (msg.document) text = await this.inboundFileText(msg.document.file_id, "document", msg.caption, msg.document.file_name);
		} catch (e) { console.error("[bridge] inbound media failed:", (e as Error).message); return; }
		if (!text) return;

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

		if (this.forumMode) {
			const topicId = typeof m.message_thread_id === "number" ? m.message_thread_id : undefined;
			const agent = topicId != null ? this.topicAgent.get(topicId) : undefined;
			if (agent) { this.mesh.tellAgent(agent, text); console.log(`[bridge] topic → ${agent.nickname}: ${text.slice(0, 60)}`); void ctx.react("👍").catch(() => {}); }
			else { this.mesh.broadcast(text); console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`); }
			return;
		}
		const replyTo = msg.reply_to_message?.message_id;
		const target = replyTo != null ? this.replyTargets.get(replyTo) : undefined;
		if (target) { this.mesh.tellAgent(target, text); console.log(`[bridge] reply → ${target.nickname}: ${text.slice(0, 60)}`); void ctx.react("👍").catch(() => {}); }
		else { this.mesh.broadcast(text); console.log(`[bridge] broadcast → #${this.cfg.channel}: ${text.slice(0, 60)}`); }
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
		if (!t.attachment || !existsSync(t.attachment)) return;
		const thread = topic != null ? { message_thread_id: topic } : {};
		try {
			const isImg = /\.(png|jpe?g|gif|webp|bmp)$/i.test(t.attachment);
			const cap = `${isImg ? "🖼" : "📎"} ${t.nickname}`;
			if (isImg) await this.bot.api.sendPhoto(this.chatId, new InputFile(t.attachment), { ...thread, caption: cap });
			else await this.bot.api.sendDocument(this.chatId, new InputFile(t.attachment), { ...thread, caption: cap });
		} catch (e) { console.error("[bridge] attachment upload failed:", (e as Error).message); }
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