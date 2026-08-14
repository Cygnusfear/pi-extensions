import { Bot, InputFile, InlineKeyboard, type Context } from "grammy";
import { MeshClient, type InboundTell, type InboundChannel, type ReplyTarget } from "./mesh-client.ts";
import { markdownToTelegramHtml } from "./format.ts";
import { type Config, persistChatId, persistChatIdOrThrow } from "./config.ts";
import {
	BridgeStateStore,
	sentMessageRouteKey,
	type BridgeStateSnapshot,
	type DeleteEligibleSentMessageRoute,
	type LegacyReactionRoute,
} from "./bridge-state.ts";
import { blobBytes, telegramReactionEmoji } from "./telegram-values.ts";
import { isOutOfCreditsCode, isOutOfCreditsText, providerErrorDetails } from "./provider-errors.ts";
import { parseVoiceToggle, type VoiceToggleAction } from "./voice-toggle.ts";
import { createFishTtsProvider, voiceTextFor, TtsProviderError, type TtsProvider } from "./tts.ts";
import { TopicRouteController } from "./topic-routes.ts";
import { MessageRetentionController } from "./message-retention.ts";
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
/** Agent-facing routing guidance while the Telegram contact reminder is active. */
const TELEGRAM_CONTACT_NOTICE = "please contact The Hooman over mesh.tell for now, this way they receive your message on Telegram where they are available now";

const MAX_TRANSCRIPTION_ERROR_DETAIL = 160;
const TRANSCRIPTION_AUDIO_FILENAME = "voice.ogg";
const CREDIT_NOTIFICATION_WINDOW_MS = 12 * 60 * 60 * 1000;

type TranscriptionProviderFactory = (apiKey: string) => TranscriptionProvider;

export interface TranscriptionProvider {
	readonly name: string;
	readonly transcribe: (audio: Buffer) => Promise<string>;
}

export interface TranscriptionFallbackHooks {
	readonly onOutOfCredits?: (provider: TranscriptionProvider, error: unknown) => void | Promise<void>;
}

export class TranscriptionProviderError extends Error {
	readonly status: number | undefined;
	readonly code: string | undefined;
	readonly outOfCredits: boolean;

	constructor(message: string, metadata: { status?: number; code?: string; outOfCredits?: boolean } = {}) {
		super(message);
		this.name = "TranscriptionProviderError";
		this.status = metadata.status;
		this.code = metadata.code;
		this.outOfCredits = metadata.outOfCredits ?? (metadata.status === 402 || isOutOfCreditsCode(metadata.code) || isOutOfCreditsText(message));
	}
}

interface HttpTranscriptionProviderOptions {
	readonly name: string;
	readonly endpoint: string;
	readonly model: string;
	readonly apiKey: string;
	readonly stream?: boolean;
}

function boundedText(value: string): string {
	const compact = value.replace(/\s+/g, " ").trim();
	return compact.length > MAX_TRANSCRIPTION_ERROR_DETAIL ? compact.slice(0, MAX_TRANSCRIPTION_ERROR_DETAIL) + "…" : compact;
}

export async function transcriptionResponseError(response: Response): Promise<TranscriptionProviderError> {
	let body = "";
	try { body = await response.text(); } catch {}
	const details = providerErrorDetails(body);
	return new TranscriptionProviderError("request rejected", {
		status: response.status,
		code: details.code ?? `http_${response.status}`,
		outOfCredits: response.status === 402 || details.outOfCredits,
	});
}

function responseText(payload: unknown): string | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const text = (payload as { readonly text?: unknown }).text;
	return typeof text === "string" && text.trim() ? text.trim() : undefined;
}

function createHttpTranscriptionProvider(options: HttpTranscriptionProviderOptions): TranscriptionProvider {
	return {
		name: options.name,
		transcribe: async (audio) => {
			const form = new FormData();
			form.append("file", new Blob([blobBytes(audio)]), TRANSCRIPTION_AUDIO_FILENAME);
			form.append("model", options.model);
			if (options.stream !== undefined) form.append("stream", String(options.stream));
			const response = await fetch(options.endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${options.apiKey}` },
				body: form,
			});
			if (!response.ok) throw await transcriptionResponseError(response);
			let payload: unknown;
			try { payload = await response.json(); } catch {
				throw new TranscriptionProviderError("response was not valid JSON", { code: "invalid_response" });
			}
			const text = responseText(payload);
			if (!text) throw new TranscriptionProviderError("response did not contain a transcription", { code: "empty_transcription" });
			return text;
		},
	};
}

function createOpenAiTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "OpenAI", endpoint: "https://api.openai.com/v1/audio/transcriptions", model: "whisper-1", apiKey });
}

function createGroqTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "Groq", endpoint: "https://api.groq.com/openai/v1/audio/transcriptions", model: "whisper-large-v3", apiKey });
}

function createZaiTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "Z.ai", endpoint: "https://api.z.ai/api/paas/v4/audio/transcriptions", model: "glm-asr-2512", stream: false, apiKey });
}

function createOpenRouterTranscriptionProvider(apiKey: string): TranscriptionProvider {
	return createHttpTranscriptionProvider({ name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/audio/transcriptions", model: "whisper-1", apiKey });
}

const TRANSCRIPTION_PROVIDER_FACTORIES: ReadonlyArray<readonly [string, TranscriptionProviderFactory]> = [
	["OPENAI_API_KEY", createOpenAiTranscriptionProvider],
	["GROQ_API_KEY", createGroqTranscriptionProvider],
	["ZAI_API_KEY", createZaiTranscriptionProvider],
	["OPENROUTER_API_KEY", createOpenRouterTranscriptionProvider],
];

function availableTranscriptionProviders(env: NodeJS.ProcessEnv = process.env): TranscriptionProvider[] {
	return TRANSCRIPTION_PROVIDER_FACTORIES.flatMap(([envName, create]) => {
		const apiKey = env[envName]?.trim();
		return apiKey ? [create(apiKey)] : [];
	});
}

function describeTranscriptionFailure(error: unknown): string {
	if (error instanceof TranscriptionProviderError) {
		const details = [
			error.status === undefined ? undefined : `status=${error.status}`,
			error.code ? `code=${error.code}` : undefined,
			error.message ? boundedText(error.message) : undefined,
		].filter((detail): detail is string => detail !== undefined);
		return details.join(" ") || "unknown error";
	}
	if (error instanceof Error) return boundedText(error.message || error.name) || "unknown error";
	return boundedText(String(error)) || "unknown error";
}

function isOutOfCreditsFailure(error: unknown): boolean {
	if (error instanceof TranscriptionProviderError) return error.outOfCredits;
	if (error instanceof Error) return isOutOfCreditsText(error.message);
	return isOutOfCreditsText(String(error));
}

/** Try each configured provider in order; all failures stay user-visible and actionable. */
export async function transcribeWithFallback(
	providers: readonly TranscriptionProvider[],
	audio: Buffer,
	hooks: TranscriptionFallbackHooks = {},
): Promise<string> {
	if (!providers.length) return "(voice transcription failed: no transcription providers configured)";
	const failures: string[] = [];
	for (const provider of providers) {
		try {
			const text = (await provider.transcribe(audio)).trim();
			if (text) return text;
			failures.push(provider.name + ": code=empty_transcription");
		} catch (error) {
			if (isOutOfCreditsFailure(error)) {
				try { await hooks.onOutOfCredits?.(provider, error); }
				catch (notificationError) { console.warn("[bridge] transcription credit notification failed:", describeTranscriptionFailure(notificationError)); }
			}
			failures.push(provider.name + ": " + describeTranscriptionFailure(error));
		}
	}
	const tried = providers.map((provider) => provider.name).join(", ");
	return `(voice transcription failed; tried ${tried}: ${failures.join("; ")})`;
}

/** Bound pre-announcement tells; a transient connection id must never create a persistent forum topic. */
const MAX_PENDING_TOPIC_PEERS = 256;
const PENDING_TOPIC_ANNOUNCEMENT_MS = 10_000;

interface PendingTopicPeer {
	readonly clientId: string;
	readonly nickname: string;
	readonly sessionName?: string;
	/** Every tell waiting on this unstable connection; set membership prevents an announcement race from stranding one. */
	readonly resolvers: Set<(topicId: number | null) => void>;
	readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Wires the mesh ↔ Telegram in both directions. Supports two modes:
 *   forum  — each agent gets its own topic; reply in an agent's topic → that agent;
 *            post in the Broadcast topic → everyone.
 *   single — (legacy) one chat; reply to a tagged message to reach its agent.
 * Accepts inbound text, voice notes (transcribed through a configured provider chain), photos and documents
 * (saved to the inbox dir so agents on this machine can open them). Outbound messages are
 * chunked to fit Telegram's limit. Handles group→supergroup migration.
 */
export class Bridge {
	private readonly bot: Bot;
	private readonly mesh: MeshClient;
	private chatId: number | null;
	private forumMode = false;
	private broadcastTopicId: number | null = null;
	/** Inbound Telegram topic → mesh routing is deliberately separate from topic-route ownership. */
	private readonly topicAgent = new Map<number, ReplyTarget & { nickname: string }>();
	private readonly replyTargets = new Map<number, ReplyTarget & { nickname: string }>();
	/** Legacy numeric records remain reaction-only and are never passed to Telegram delete APIs. */
	private readonly legacyMsgToAgent = new Map<number, LegacyReactionRoute>();
	private readonly topicRoutes: TopicRouteController;
	/** One bounded wait per unstable connection; resolved only by its durable peer announcement or stop/timeout. */
	private readonly pendingTopicPeers = new Map<string, PendingTopicPeer>();
	private readonly retention: MessageRetentionController<DeleteEligibleSentMessageRoute>;
	/** Per topic, the Hooman's most recent inbound message id (agent reactions target this). */
	private readonly lastHoomanInTopic = new Map<number, number>();
	/** Telegram contact reminder state, persisted under the legacy `afk` key for compatibility. */
	private afk: { on: boolean; message: string; since: number } = { on: false, message: "", since: 0 };
	/** Agents already reminded during the current activation (avoid spam). Cleared on toggle. */
	private readonly afkNotified = new Set<string>();
	private readonly transcriptionCreditNotifiedAt = new Map<string, number>();
	/** Voice mode (bridge-side TTS): when on, agent tells are also spoken. Persisted like the contact reminder. */
	private voice: { on: boolean; since: number } = { on: false, since: 0 };
	private readonly tts: TtsProvider | null;
	private ttsCreditNotifiedAt: number | null = null;
	private readonly stateStore: BridgeStateStore;

	constructor(private readonly cfg: Config) {
		this.chatId = cfg.chatId;
		this.bot = new Bot(cfg.botToken);
		this.mesh = new MeshClient({ meshId: cfg.hoomanMeshId, nickname: cfg.hoomanNickname, channel: cfg.channel });
		this.stateStore = new BridgeStateStore(STATE_PATH, () => this.stateSnapshot(), {
			onError: (operation, error) => console.warn(`[bridge] state ${operation} failed:`, error.message),
		});
		const state = this.stateStore.load();
		this.broadcastTopicId = state.broadcastTopicId;
		for (const [topicId, route] of state.topicAgents) this.topicAgent.set(topicId, route);
		for (const [messageId, route] of state.legacySentMessages) this.legacyMsgToAgent.set(messageId, route);
		this.afk = state.telegramContact;
		this.voice = state.voice;
		this.ttsCreditNotifiedAt = state.ttsCreditNotifiedAt;
		this.tts = cfg.fishApiKey && cfg.fishVoiceId
			? createFishTtsProvider({ apiKey: cfg.fishApiKey, voiceId: cfg.fishVoiceId })
			: null;
		for (const [provider, timestamp] of state.transcriptionCreditNotifications) this.transcriptionCreditNotifiedAt.set(provider, timestamp);
		this.topicRoutes = new TopicRouteController({
			api: {
				createForumTopic: (chatId, name) => this.bot.api.createForumTopic(chatId, name),
				editForumTopic: (chatId, topicId, other) => this.bot.api.editForumTopic(chatId, topicId, other),
			},
			routes: new Map(state.agentTopics),
			chatId: () => this.chatId,
			onRoutesChanged: () => this.stateStore.requestSave(),
			onTopicReady: (topicId, peer) => {
				this.topicAgent.set(topicId, { clientId: peer.clientId, meshId: peer.meshId, nickname: peer.nickname });
				this.stateStore.requestSave();
			},
			onError: (operation, error, peer) => console.warn(`[bridge] topic ${operation} failed for ${peer.nickname}:`, error.message),
		});
		this.retention = new MessageRetentionController({
			api: { deleteMessages: (chatId, messageIds) => this.bot.api.deleteMessages(chatId, messageIds) },
			records: state.sentMessages,
			onChange: () => this.stateStore.requestSave(),
			onDelete: (chatId, messageIds) => console.log(`[bridge] retention: deleted ${messageIds.length} message(s) in chat ${chatId}`),
			onRetire: (records) => {
				for (const record of records) console.warn(`[bridge] retention: msg ${record.messageId} in chat ${record.chatId} past 48h Telegram deadline — retired ledger only`);
			},
			onError: (chatId, messageIds, error) => console.warn(`[bridge] retention deleteMessages failed in chat ${chatId} for ${messageIds.length} message(s):`, error.message),
		});
		if (this.afk.on) console.log("[bridge] loaded Telegram contact reminder: on (" + this.afk.message + ")");
		if (this.voice.on) console.log("[bridge] loaded voice mode: on" + (this.tts ? "" : " (TTS not configured)"));
		console.log(`[bridge] loaded state: ${state.agentTopics.length} agent topics, ${this.retention.size() + this.legacyMsgToAgent.size} reaction routes, broadcast=${this.broadcastTopicId}`);
	}

	private stateSnapshot(): BridgeStateSnapshot {
		return {
			broadcastTopicId: this.broadcastTopicId,
			agentTopics: [...this.topicRoutes.entries()],
			topicAgents: [...this.topicAgent.entries()],
			sentMessages: [...this.retention.entries()],
			legacySentMessages: [...this.legacyMsgToAgent.entries()],
			telegramContact: this.afk,
			voice: this.voice,
			ttsCreditNotifiedAt: this.ttsCreditNotifiedAt,
			transcriptionCreditNotifications: [...this.transcriptionCreditNotifiedAt.entries()],
		};
	}

	private saveState(): void {
		this.stateStore.saveNow();
	}

	/** Notify the Hooman once per provider per 12 hours when a provider's credit pool is depleted. */
	private notifyTranscriptionProviderOutOfCredits(provider: TranscriptionProvider, thread: Record<string, unknown>): void {
		const chatId = this.chatId;
		if (chatId == null) return;
		const now = Date.now();
		const lastNotifiedAt = this.transcriptionCreditNotifiedAt.get(provider.name);
		if (lastNotifiedAt !== undefined && now - lastNotifiedAt < CREDIT_NOTIFICATION_WINDOW_MS) return;
		this.transcriptionCreditNotifiedAt.set(provider.name, now);
		this.saveState();
		const alert = `⚠️ ${provider.name} is out of credits — refill to restore voice transcription.`;
		void this.sendText(chatId, alert, thread).catch((error: unknown) => {
			console.warn("[bridge] transcription credit alert failed:", (error as Error).message);
		});
	}

	/** /afk [on|off|status] [note] — legacy command name for the Telegram contact reminder. */
	private async handleAfkCommand(text: string, ctx: Context): Promise<void> {
		const parts = text.replace(/@ramdock_bot\b/gi, "").split(/\s+/).filter(Boolean);
		const sub = (parts[1] ?? "").toLowerCase();
		if (sub === "status") {
			void ctx.reply(this.afk.on ? ("Telegram contact reminder: on (" + this.afk.message + "), since " + new Date(this.afk.since).toLocaleString()) : "Telegram contact reminder: off").catch(() => {});
			return;
		}
		if (sub === "off") {
			this.afk = { on: false, message: "", since: 0 };
			this.afkNotified.clear();
			this.saveState();
			void ctx.reply("✅ Telegram contact reminder off.").catch(() => {});
			console.log("[bridge] Telegram contact reminder off");
			return;
		}
		// Enable by default. A custom note follows "on", or follows "/afk" when bare.
		const msgParts = sub === "on" ? parts.slice(2) : parts.slice(1);
		const message = msgParts.join(" ").trim() || "Telegram contact reminder";
		this.afk = { on: true, message, since: Date.now() };
		this.afkNotified.clear();
		this.saveState();
		this.mesh.broadcast(TELEGRAM_CONTACT_NOTICE);
		void ctx.reply("✅ Telegram contact reminder on. Agents directed to mesh.tell.").catch(() => {});
		console.log("[bridge] Telegram contact reminder on (" + message + ")");
	}

	/** Voice-mode toggle from a typed or transcribed hooman message. Global pref, persisted like the contact reminder. */
	private async handleVoiceToggle(action: VoiceToggleAction, ctx: Context): Promise<void> {
		if (action === "status") {
			const status = this.voice.on
				? "🎙️ Voice mode on since " + new Date(this.voice.since).toLocaleString() + ". Agent messages arrive as text first, then a spoken version."
				: "🔇 Voice mode off — text only.";
			void ctx.reply(status).catch(() => {});
			return;
		}
		if (action === "on") {
			this.voice = { on: true, since: Date.now() };
			this.saveState();
			const warning = this.tts ? "" : "\n⚠️ TTS not configured yet — set FISH_AUDIO_API_KEY and FISH_AUDIO_VOICE_ID in the bridge config.";
			void ctx.reply("✅ Voice mode on — agents will speak. Text still arrives first, voice follows." + warning).catch(() => {});
			console.log("[bridge] voice mode on");
			return;
		}
		this.voice = { on: false, since: 0 };
		this.saveState();
		void ctx.reply("✅ Text only.").catch(() => {});
		console.log("[bridge] voice mode off");
	}

	async start(): Promise<void> {
		this.mesh.on("tell", (t: InboundTell) => void this.onMeshTell(t));
		this.mesh.on("channel", (c: InboundChannel) => void this.onMeshChannel(c));
		this.mesh.on("peer", (p: { meshId?: string; clientId: string; nickname: string; name?: string }) => void this.onPeerAnnounce(p));
		this.mesh.start();
		this.retention.start();
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

	/** Stop owns the retention epoch and awaits a deferred Telegram delete before flushing state. */
	async stop(): Promise<void> {
		this.clearPendingTopicPeers();
		await this.retention.stop();
		this.stateStore.flush();
		this.mesh.stop();
		await this.bot.stop();
	}

	private async detectForum(): Promise<void> {
		try {
			const chat = (await this.bot.api.getChat(this.chatId!)) as unknown as Record<string, unknown>;
			this.forumMode = !!chat.is_forum;
			console.log("[bridge] forum mode:", this.forumMode);
			const autoDelete = typeof chat.message_auto_delete_time === "number" ? chat.message_auto_delete_time : undefined;
			if (autoDelete !== 86_400) {
				console.warn(`[bridge] forum auto-delete is ${autoDelete === undefined ? "absent" : `${autoDelete}s`}, expected 86400 (1 day). The Bot API cannot set this timer. Telegram's setting applies only to new traffic; old unledgered traffic requires native Telegram cleanup.`);
			}
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

	/** Create or reconcile a `/dm` topic through the single route owner. */
	private async ensureTopicForPeer(peer: { meshId?: string; clientId: string; nickname: string; name?: string }): Promise<number | null> {
		const key = peer.meshId ?? peer.clientId;
		return this.topicRoutes.ensure({ key, clientId: peer.clientId, meshId: peer.meshId, nickname: peer.nickname, sessionName: peer.name });
	}

	/** A tell without a durable mesh identity waits; transient connection ids never create persistent forum topics. */
	private async ensureAgentTopic(t: InboundTell): Promise<number | null> {
		if (t.fromMeshId) {
			return this.topicRoutes.ensure({ key: t.fromMeshId, clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname, sessionName: t.sessionName });
		}
		// A just-announced peer can still carry an old inbound client id briefly. The controller's alias is durable-only.
		const established = await this.topicRoutes.ensure({ key: t.fromClientId, clientId: t.fromClientId, nickname: t.nickname, sessionName: t.sessionName });
		return established ?? this.waitForDurableTopicPeer(t);
	}

	private waitForDurableTopicPeer(t: InboundTell): Promise<number | null> {
		const existing = this.pendingTopicPeers.get(t.fromClientId);
		if (existing) return new Promise((resolve) => existing.resolvers.add(resolve));
		if (this.pendingTopicPeers.size >= MAX_PENDING_TOPIC_PEERS) {
			console.warn(`[bridge] dropping topic wait for ${t.nickname}: pending peer queue is full`);
			return Promise.resolve(null);
		}
		return new Promise((resolve) => {
			let timer!: ReturnType<typeof setTimeout>;
			const resolvers = new Set<(topicId: number | null) => void>([resolve]);
			timer = setTimeout(() => {
				const pending = this.pendingTopicPeers.get(t.fromClientId);
				if (!pending || pending.timer !== timer) return;
				this.pendingTopicPeers.delete(t.fromClientId);
				console.warn(`[bridge] topic wait timed out for unannounced client ${t.fromClientId}; no forum topic was created`);
				this.resolvePendingTopicPeer(pending, null);
			}, PENDING_TOPIC_ANNOUNCEMENT_MS);
			this.pendingTopicPeers.set(t.fromClientId, {
				clientId: t.fromClientId,
				nickname: t.nickname,
				sessionName: t.sessionName,
				resolvers,
				timer,
			});
		});
	}

	private resolvePendingTopicPeer(pending: PendingTopicPeer, topicId: number | null): void {
		for (const resolve of pending.resolvers) resolve(topicId);
		pending.resolvers.clear();
	}

	private clearPendingTopicPeers(): void {
		for (const pending of this.pendingTopicPeers.values()) {
			clearTimeout(pending.timer);
			this.resolvePendingTopicPeer(pending, null);
		}
		this.pendingTopicPeers.clear();
	}

	/** Bind a pending connection to durable identity, then create/reconcile only under that durable key. */
	private async onPeerAnnounce(p: { meshId?: string; clientId: string; nickname: string; name?: string }): Promise<void> {
		const key = p.meshId ?? p.clientId;
		const peer = { key, clientId: p.clientId, meshId: p.meshId, nickname: p.nickname, sessionName: p.name };
		try {
			await this.topicRoutes.announce(peer);
			if (!p.meshId) return;
			const pending = this.pendingTopicPeers.get(p.clientId);
			if (!pending) return;
			clearTimeout(pending.timer);
			this.pendingTopicPeers.delete(p.clientId);
			this.resolvePendingTopicPeer(pending, await this.topicRoutes.ensure(peer));
		} catch (error) {
			const pending = this.pendingTopicPeers.get(p.clientId);
			if (pending) {
				clearTimeout(pending.timer);
				this.pendingTopicPeers.delete(p.clientId);
				this.resolvePendingTopicPeer(pending, null);
			}
			console.warn(`[bridge] peer announcement topic bind failed for ${p.nickname}:`, (error as Error).message);
		}
	}

	// ── mesh → telegram ────────────────────────────────────────────────
	private async onMeshTell(t: InboundTell): Promise<void> {
		if (this.chatId == null) { console.warn(`[bridge] no chat id yet — dropping tell from ${t.nickname}: ${(t.text ?? "").slice(0, 60)}`); return; }
		const topic = this.forumMode ? await this.ensureAgentTopic(t) : null;
		if (this.forumMode && topic === null) {
			console.warn(`[bridge] dropping tell from ${t.nickname}: no durable forum route was established`);
			return;
		}
		const chatId = this.chatId;
		if (chatId == null) return;
		if (t.reaction) await this.setHoomanReaction(t.reaction, topic);
		const thread = topic != null ? { message_thread_id: topic } : {};
		try {
			if (t.text && t.text.trim()) {
				for (const chunk of this.chunkText(`👤 ${t.nickname}`, t.text)) {
					const sent = await this.sendText(chatId, chunk, thread);
					this.trackSent(sent.message_id, chatId, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, t.text);
					if (!this.forumMode) { this.replyTargets.set(sent.message_id, { clientId: t.fromClientId, meshId: t.fromMeshId, nickname: t.nickname }); this.trimTargets(); }
				}
			}
			if (this.voice.on && t.text && t.text.trim()) await this.sendVoiceFor(chatId, t.text, thread, t);
			await this.uploadAttachment(chatId, t, topic);
		} catch (e) { console.error("[bridge] tg send failed:", (e as Error).message); }
		// Send the same routing guidance once per agent during each activation.
		if (this.afk.on && t.fromClientId && !this.afkNotified.has(t.fromClientId)) {
			this.afkNotified.add(t.fromClientId);
			this.mesh.tellAgent({ clientId: t.fromClientId, meshId: t.fromMeshId }, TELEGRAM_CONTACT_NOTICE);
		}
	}

	private async onMeshChannel(c: InboundChannel): Promise<void> {
		const chatId = this.chatId;
		if (chatId == null) return;
		const thread = this.forumMode && this.broadcastTopicId != null ? { message_thread_id: this.broadcastTopicId } : {};
		try {
			for (const chunk of this.chunkText(`📢 ${c.nickname} · #${c.channel}`, c.text)) {
				const sent = await this.sendText(chatId, chunk, thread);
				this.trackSent(sent.message_id, chatId, { clientId: c.fromClientId, nickname: c.nickname }, c.text);
				if (!this.forumMode) { this.replyTargets.set(sent.message_id, { clientId: c.fromClientId, nickname: c.nickname }); this.trimTargets(); }
			}
		} catch (e) { console.error("[bridge] tg send failed:", (e as Error).message); }
	}


	/** Synthesize and send a spoken version of an agent tell. Runs after the text path; never blocks it. */
	private async sendVoiceFor(chatId: number, rawText: string, thread: Record<string, unknown>, t: InboundTell): Promise<void> {
		if (!this.tts) {
			console.warn("[bridge] voice mode on but TTS not configured — skipping voice");
			return;
		}
		const text = voiceTextFor(rawText);
		if (!text) return;
		try {
			const audio = await this.tts.synthesize(text);
			const sent = await this.bot.api.sendAudio(chatId, new InputFile(Buffer.from(audio.bytes), `voice-${Date.now()}.${audio.extension}`), {
				...thread,
				title: t.nickname + " · voice",
				performer: this.tts.name,
			});
			this.trackSent(sent.message_id, chatId, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, rawText);
		} catch (error) {
			if (error instanceof TtsProviderError && error.outOfCredits) void this.notifyTtsOutOfCredits(chatId, thread);
			console.error("[bridge] voice send failed:", (error as Error).message);
		}
	}

	/** One proactive alert per credit window when the TTS provider runs out of credits. */
	private async notifyTtsOutOfCredits(chatId: number, thread: Record<string, unknown>): Promise<void> {
		const now = Date.now();
		if (this.ttsCreditNotifiedAt !== null && now - this.ttsCreditNotifiedAt < CREDIT_NOTIFICATION_WINDOW_MS) return;
		this.ttsCreditNotifiedAt = now;
		this.saveState();
		await this.sendText(chatId, "⚠️ " + (this.tts?.name ?? "TTS provider") + " is out of credits — voice messages paused until refilled. Text delivery is unaffected.", thread).catch((error: unknown) => {
			console.error("[bridge] TTS credit notification failed:", (error as Error).message);
		});
	}

	/**
	 * Legacy ids have no chat authority. Their retirement is durably committed
	 * before any new chat can become authoritative; failure leaves the old chat
	 * active and refuses the unsafe transition.
	 */
	private retireLegacyReactionRoutesForMigration(): boolean {
		const legacyRoutes = [...this.legacyMsgToAgent.entries()];
		if (legacyRoutes.length === 0) return true;
		this.legacyMsgToAgent.clear();
		try {
			this.stateStore.saveNowOrThrow();
		} catch (error) {
			// The old chat remains authoritative, so restore its in-memory reaction-only routing as well.
			for (const [messageId, route] of legacyRoutes) this.legacyMsgToAgent.set(messageId, route);
			console.error(`[bridge] legacy reaction retirement could not be committed; refusing chat migration: ${(error as Error).message}`);
			return false;
		}
		console.warn(`[bridge] retired ${legacyRoutes.length} legacy reaction route(s) before chat migration; legacy message ids are not cross-chat identities`);
		return true;
	}

	// ── telegram → mesh ────────────────────────────────────────────────
	private async onTelegramMessage(ctx: Context): Promise<void> {
		const msg = ctx.message;
		if (!msg) return;
		const m = msg as unknown as Record<string, unknown>;

		// Group → supergroup migration is a textless service message — retire unsafe legacy state before changing authority.
		if (typeof m.migrate_to_chat_id === "number") {
			const nextChatId = m.migrate_to_chat_id;
			if (!this.retireLegacyReactionRoutesForMigration()) return;
			try {
				persistChatIdOrThrow(nextChatId);
			} catch (error) {
				console.error(`[bridge] could not persist new chat id; refusing chat migration: ${(error as Error).message}`);
				return;
			}
			this.chatId = nextChatId;
			console.log("[bridge] group migrated to supergroup; new chat id:", this.chatId);
			void this.detectForum();
			return;
		}
		if (msg.from?.is_bot) return;

		if (this.chatId == null) { this.chatId = msg.chat.id; console.log("[bridge] captured chat id:", this.chatId); persistChatId(this.chatId); void this.detectForum(); }
		if (msg.chat.id !== this.chatId) return;

		// Turn whatever the hooman sent (text / voice / photo / document) into the outbound text.
		let text: string | null = null;
		let wasVoice = false;
		try {
			if (typeof msg.text === "string") text = msg.text;
			else if (msg.voice) {
				const thread = this.forumMode && typeof m.message_thread_id === "number" ? { message_thread_id: m.message_thread_id } : {};
				const t = await this.transcribeVoice(msg.voice.file_id, thread);
				wasVoice = true;
				text = t;
			}
			else if (msg.photo && msg.photo.length) text = await this.inboundFileText(msg.photo[msg.photo.length - 1].file_id, "photo", msg.caption);
			else if (msg.document) text = await this.inboundFileText(msg.document.file_id, "document", msg.caption, msg.document.file_name);
		} catch (e) { console.error("[bridge] inbound media failed:", (e as Error).message); return; }
		if (!text) return;

		// Voice-mode toggle — typed or SPOKEN ("speak to me" / "text only" voice notes transcribe into these).
		const toggle = parseVoiceToggle(text);
		if (toggle) { await this.handleVoiceToggle(toggle, ctx); return; }
		if (wasVoice) void ctx.reply("🎤 transcribed: " + text).catch(() => {});

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

		// /afk [on|off|status] [note] — legacy command for the Telegram contact reminder.
		if (this.forumMode && text.startsWith("/afk") && (text.length === 4 || text[4] === " " || text[4] === "@")) {
			await this.handleAfkCommand(text, ctx);
			return;
		}
		// Unknown slash command — reply with the menu instead of routing "/foo" to an agent.
		// /model <name> — switch THIS agent's model (topic-scoped). Sends a
		// mesh:control tell that pi-mesh routes to the harness (never the LLM).
		if (this.forumMode && text.startsWith("/model") && (text.length === 6 || text[6] === " " || text[6] === "@")) {
			const topicId = typeof m.message_thread_id === "number" ? m.message_thread_id : undefined;
			const agent = topicId != null ? this.topicAgent.get(topicId) : undefined;
			let rest = text.slice(6).trim();
			if (rest.startsWith("@")) { const parts = rest.split(" ").filter(Boolean); parts.shift(); rest = parts.join(" "); }
			const name = rest.trim();
			if (!agent) { void ctx.reply("Use /model <name> inside an agent's topic — it switches THAT agent's model.").catch(() => {}); return; }
			if (!name) { void ctx.reply("Usage: /model <name> — e.g. /model opus, /model glm-5.2, /model kimi").catch(() => {}); return; }
			this.mesh.tellAgentControl(agent, { kind: "mesh:control", op: "setModel", model: name });
			console.log("[bridge] /model " + name + " -> " + agent.nickname);
			void ctx.reply("switching " + agent.nickname + " to " + name + "… they'll confirm here.").catch(() => {});
			void ctx.react("👍").catch(() => {});
			return;
		}

		if (text.startsWith("/") && text.trim().length > 1) {
			void ctx.reply("Unknown command. Try:\n/agents — live agent roster\n/dm <agent> — open an agent's topic\n/afk [on|off] [note] — Telegram contact reminder\n/model <name> — switch this agent's model (in its topic)").catch(() => {});
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

	/** Record an outbound bridge message with its durable Telegram identity before scheduling retention. */
	private trackSent(msgId: number, chatId: number, target: { meshId?: string; clientId: string; nickname: string }, preview: string): void {
		const key = sentMessageRouteKey(chatId, msgId);
		if (!key) {
			console.warn(`[bridge] refusing to retain invalid Telegram identity chat=${chatId} message=${msgId}`);
			return;
		}
		// Preserve the total 2,000-route cap, preferring newly-safe deletion records over old reaction-only data.
		while (this.retention.size() + this.legacyMsgToAgent.size >= 2_000) {
			const legacyKey = this.legacyMsgToAgent.keys().next().value;
			if (legacyKey !== undefined) this.legacyMsgToAgent.delete(legacyKey);
			else if (this.retention.dropOldest() === undefined) break;
		}
		this.retention.track(key, {
			kind: "delete-eligible",
			meshId: target.meshId,
			clientId: target.clientId,
			nickname: target.nickname,
			preview: (preview ?? "").slice(0, 40),
			chatId,
			messageId: msgId,
			sentAtMs: Date.now(),
		});
	}


	/** Agent → Hooman: set an emoji reaction on the hooman's last message in the topic. */
	private async setHoomanReaction(emoji: string, topic: number | null): Promise<void> {
		if (this.chatId == null || topic == null) return;
		const reaction = telegramReactionEmoji(emoji);
		if (reaction === null) {
			console.warn(`[bridge] unsupported Telegram reaction ignored: ${emoji}`);
			return;
		}
		const target = this.lastHoomanInTopic.get(topic);
		if (target == null) { console.warn(`[bridge] agent reaction ${emoji} but no inbound msg to react to (topic ${topic})`); return; }
		try {
			await this.bot.api.setMessageReaction(this.chatId, target, [{ type: "emoji", emoji: reaction }]);
			console.log(`[bridge] set reaction ${emoji} on msg ${target} (topic ${topic})`);
		} catch (e) { console.warn(`[bridge] setMessageReaction failed (${emoji}):`, (e as Error).message); }
	}

	/** Hooman → Agent: resolve reactions by exact `(chatId,messageId)`; old numeric records remain current-chat-only. */
	private async onReaction(ctx: Context): Promise<void> {
		const ur = ctx.update.message_reaction as { chat?: { id?: number }; message_id: number; user?: { first_name?: string; username?: string }; old_reaction?: Array<{ type: string; emoji?: string }>; new_reaction?: Array<{ type: string; emoji?: string }> } | undefined;
		const chatId = ur?.chat?.id;
		if (!ur || chatId !== this.chatId || chatId === undefined) return;
		const key = sentMessageRouteKey(chatId, ur.message_id);
		const target = (key === undefined ? undefined : this.retention.get(key)) ?? this.legacyMsgToAgent.get(ur.message_id);
		console.log("[bridge] reaction EVENT msg=" + ur.message_id + " new=" + JSON.stringify(ur.new_reaction ?? []) + " old=" + JSON.stringify(ur.old_reaction ?? []) + " tracked=" + (target ? target.nickname : "NO"));
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

	private async transcribeVoice(fileId: string, thread: Record<string, unknown> = {}): Promise<string> {
		const providers = availableTranscriptionProviders();
		if (!providers.length) return "(voice transcription failed: no transcription providers configured)";
		const buf = await this.tgDownload(fileId);
		return transcribeWithFallback(providers, buf, {
			onOutOfCredits: (provider) => this.notifyTranscriptionProviderOutOfCredits(provider, thread),
		});
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
	private async uploadAttachment(chatId: number, t: InboundTell, topic: number | null): Promise<void> {
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
					await this.bot.api.sendMessage(chatId, `⚠️ ${t.nickname} sent an image that hadn't finished rendering — skipped. Ask them to resend once it's done.`, thread).catch(() => {});
					return;
				}
				const sent = await this.bot.api.sendPhoto(chatId, new InputFile(buf, fname), { ...thread, caption: cap });
				this.trackSent(sent.message_id, chatId, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, t.text ?? "photo");
				console.log(`[bridge] sent photo: ${t.attachment} (${buf.length}b) → topic ${topic ?? "(main)"}`);
			} else {
				const sent = await this.bot.api.sendDocument(chatId, new InputFile(t.attachment), { ...thread, caption: cap });
				this.trackSent(sent.message_id, chatId, { meshId: t.fromMeshId, clientId: t.fromClientId, nickname: t.nickname }, t.text ?? fname);
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

	/** Send agent/channel text as Telegram HTML, falling back to plain text if parsing fails. */
	private async sendText(chatId: number, text: string, thread: Record<string, unknown>): Promise<{ message_id: number }> {
		const html = markdownToTelegramHtml(text);
		if (html.length <= TG_MAX) {
			try {
				return await this.bot.api.sendMessage(chatId, html, { ...thread, parse_mode: "HTML" });
			} catch (e) {
				console.warn("[bridge] Telegram HTML formatting failed; sending plain text:", (e as Error).message);
			}
		}
		return this.bot.api.sendMessage(chatId, text, thread);
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
