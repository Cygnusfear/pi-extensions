/**
 * pi-mesh extension — singleton sidecar architecture
 *
 * One sidecar per machine, shared by all pi sessions.
 * Sessions connect via unix socket (~/.pi/mesh.sock).
 * If the sidecar isn't running, we spawn it on demand.
 */

import { hostname } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createConnection, type Socket } from "node:net";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI, ExtensionCommandContext, AgentToolResult } from "@mariozechner/pi-coding-agent";
import { renderToolResult } from "@pi-extensions/shared/tool-ui-utils";
import {
	formatSessionViewEntries,
	projectMeaningfulSessionEntries,
	sliceSessionViewEntries,
} from "../../shared/src/session-view.ts";
import type {
	AnnouncePayload,
	ChannelMessage,
	MeshConfig,
	MeshMessage,
	MeshAskReceiptEnvelope,
	MeshAskReceiptWaitForPhase,
	MeshTellAckEnvelope,
	MeshTellEnvelope,
	MeshTellReceiptPhase,
	PeerInfo,
	RequestEvent,
} from "./types.js";
import { getSessionNicknameText, setStableId, claimNickname, deriveTripleName } from "@pi-extensions/shared/session-nickname";
import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import { randomUUID } from "node:crypto";
import {
	buildTellReceiptAck,
	createDeliveryId,
	isMeshTellAckEnvelope,
	isMeshTellEnvelope,
	unwrapInboundTell,
} from "./tell-protocol.ts";
import {
	appendMeshAskReceipt,
	buildMeshAskEnvelope,
	buildMeshAskReceipt,
	createAskId,
	formatMeshAskReceiptTrail,
	isMeshAskEnvelope,
	isMeshAskReceiptEnvelope,
} from "./ask-protocol.ts";
import { buildPendingAskBatchContent, splitExpiredPendingAsks } from "./ask-queue.ts";

const ambientChatBatchMsRaw = Number(process.env.PI_MESH_AMBIENT_CHAT_BATCH_MS ?? "750");
const AMBIENT_CHAT_BATCH_MS = Number.isFinite(ambientChatBatchMsRaw) && ambientChatBatchMsRaw >= 0
	? Math.floor(ambientChatBatchMsRaw)
	: 750;


// ── Mesh icons ────────────────────────────────────────────────────────────────

function _hasNerdFonts(): boolean {
	if (process.env.POWERLINE_NERD_FONTS === "1") return true;
	if (process.env.POWERLINE_NERD_FONTS === "0") return false;
	if (process.env.GHOSTTY_RESOURCES_DIR) return true;
	const term = (process.env.TERM_PROGRAM || "").toLowerCase();
	return ["iterm", "wezterm", "kitty", "ghostty", "alacritty"].some((t) => term.includes(t));
}

const _nerd = _hasNerdFonts();

/** Nerd-font icons with unicode fallbacks for mesh message styling. */
const MI = {
	chat:      _nerd ? "\uF086" : "#",   // nf-fa-comments
	tell:      _nerd ? "\uF0E0" : ">",   // nf-fa-envelope
	ask:       _nerd ? "\uF059" : "?",   // nf-fa-question_circle
	broadcast: _nerd ? "\uF1D8" : "*",   // nf-fa-paper_plane
	sep:       " \u00b7 ",                     // middle dot separator (padded)
};
// ── Path resolution ──────────────────────────────────────────────────────────

function resolveBinPath(): string | null {
	const extensionDir = dirname(fileURLToPath(import.meta.url));
	const binName = process.platform === "win32" ? "pi-mesh.exe" : "pi-mesh";
	const primary = resolve(extensionDir, "..", "native", binName);
	const fallback = resolve(extensionDir, "..", "native", "target", "release", binName);
	if (existsSync(primary)) return primary;
	if (existsSync(fallback)) return fallback;
	return null;
}

// ── Sidecar process wrapper ──────────────────────────────────────────────────

type MeshEventType = "ready" | "message" | "peer-join" | "peer-leave" | "request" | "channel";
type MeshEventCallback<T = unknown> = (data: T) => void;

export class PiMesh {
	private sock: Socket | null = null;
	private peerMap: Map<string, PeerInfo> = new Map();
	private listeners: Map<MeshEventType, Set<MeshEventCallback>> = new Map();
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private stalePeerTimer: ReturnType<typeof setInterval> | null = null;
	private myZid = "";          // Zenoh peer ID — shared across clients on same machine, metadata only
	private myClientId = "";    // unique per connection — the routing identity
	private mySessionId = "";   // pi session ID — metadata, can change on resume
	private myName: string | undefined;
	private myIdentity: MeshIdentity | null = null; // stable mesh identity (persisted in session file)
	private announceIntervalMs = 30_000;
	private lineBuf = "";
	private pendingGets: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();
	private pendingAskReceipts: Map<string, { noteReceipt: (v: MeshAskReceiptEnvelope) => void; reject: (e: Error) => void }> = new Map();
	private pendingTellReceipts: Map<string, { phase: MeshTellReceiptPhase; resolve: (v: MeshTellAckEnvelope) => void; reject: (e: Error) => void }> = new Map();
	private nextInboundAskRequestId = 1;
	private channelSubs: Set<string> = new Set();
	private channelWildcardSubbed = false;
	private isSocketReady = false;

	start(binPath: string, sessionId: string, cwd: string, config?: MeshConfig, name?: string): void {
		if (!sessionId) {
			console.warn("[pi-mesh] No session ID available — skipping mesh start");
			return;
		}
		this.mySessionId = sessionId;
		this.myName = name;
		this.announceIntervalMs = config?.announceIntervalMs ?? 30_000;

		const sockPath = join(process.env.HOME ?? "/tmp", ".pi", "mesh.sock");

		// Ensure sidecar is running, then connect
		this._ensureSidecar(binPath, config, sockPath, () => {
			this._connectSocket(sockPath, cwd);
		});
	}

	private _ensureSidecar(binPath: string, config: MeshConfig | undefined, sockPath: string, onReady: () => void): void {
		const pidPath = join(process.env.HOME ?? "/tmp", ".pi", "mesh.pid");

		// Check if sidecar is already running
		if (existsSync(pidPath) && existsSync(sockPath)) {
			try {
				const pid = parseInt(readFileSync(pidPath, "utf8").trim(), 10);
				if (pid > 0) {
					try { process.kill(pid, 0); onReady(); return; } catch {}
				}
			} catch {}
		}

		// Spawn sidecar (detached — survives pi exit)
		const zenohConfig: Record<string, unknown> = {};
		if (config?.mode) zenohConfig.mode = config.mode;
		if (config?.endpoints) zenohConfig.connect = { endpoints: config.endpoints };
		if (config?.scouting !== undefined) {
			zenohConfig.scouting = { multicast: { enabled: config.scouting } };
		}
		const configArg = JSON.stringify(zenohConfig);

		const child = spawn(binPath, [configArg], {
			detached: true,
			stdio: "ignore",
		});
		child.unref(); // Don't keep pi alive for the sidecar

		// Wait for socket to appear
		let attempts = 0;
		const waitForSocket = setInterval(() => {
			attempts++;
			if (existsSync(sockPath)) {
				clearInterval(waitForSocket);
				onReady();
			} else if (attempts > 50) { // 5 seconds
				clearInterval(waitForSocket);
				console.warn("[pi-mesh] sidecar socket not ready after 5s");
			}
		}, 100);
	}

	private _connectSocket(sockPath: string, cwd: string): void {
		this.sock = createConnection(sockPath);
		this.sock.on("data", (chunk: Buffer) => this._onData(chunk));
		this.sock.on("error", (err) => {
			console.warn(`[pi-mesh] socket error: ${err.message}`);
			this.isSocketReady = false;
			this.channelWildcardSubbed = false;
			this.sock = null;
		});
		this.sock.on("close", () => {
			this.isSocketReady = false;
			this.channelWildcardSubbed = false;
			this.sock = null;
		});

		this._startStalePeerEviction();
	}

	stop(): void {
		if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
		if (this.stalePeerTimer) { clearInterval(this.stalePeerTimer); this.stalePeerTimer = null; }
		this._send({ cmd: "close" });
		// Don't kill sidecar — other sessions may be connected
		if (this.sock) { try { this.sock.destroy(); } catch {} }
		this.sock = null;
		this.isSocketReady = false;
		this.channelWildcardSubbed = false;
		this.myClientId = "";
		this.pendingGets.clear();
		for (const pending of this.pendingAskReceipts.values()) {
			pending.reject(new Error("mesh stopped before ask receipt arrived"));
		}
		this.pendingAskReceipts.clear();
		for (const pending of this.pendingTellReceipts.values()) {
			pending.reject(new Error("mesh stopped before delivery receipt arrived"));
		}
		this.pendingTellReceipts.clear();
	}

	setName(name: string | undefined): void {
		this.myName = name;
	}

	tell(sessionId: string, message: unknown): { deliveryId: string } {
		const deliveryId = createDeliveryId();
		const tellEnvelope: MeshTellEnvelope = {
			kind: "mesh:tell",
			deliveryId,
			from: this.myClientId,
			payload: message,
			timestamp: Date.now(),
		};
		const envelope: MeshMessage = {
			from: this.myClientId,
			topic: `session/${sessionId}`,
			payload: tellEnvelope,
			timestamp: Date.now(),
		};
		this._send({ cmd: "publish", topic: `pi/mesh/session/${sessionId}`, payload: JSON.stringify(envelope) });
		return { deliveryId };
	}

	tellAndWaitForReceipt(
		sessionId: string,
		message: unknown,
		phase: MeshTellReceiptPhase,
		timeoutMs = 10_000,
	): Promise<MeshTellAckEnvelope> {
		return new Promise((resolve, reject) => {
			const deliveryId = createDeliveryId();
			const timer = setTimeout(() => {
				this.pendingTellReceipts.delete(deliveryId);
				reject(new Error(`mesh_tell: timeout waiting for ${phase} receipt after ${timeoutMs}ms`));
			}, timeoutMs);

			this.pendingTellReceipts.set(deliveryId, {
				phase,
				resolve: (ack) => {
					clearTimeout(timer);
					resolve(ack);
				},
				reject: (error) => {
					clearTimeout(timer);
					reject(error);
				},
			});

			const tellEnvelope: MeshTellEnvelope = {
				kind: "mesh:tell",
				deliveryId,
				from: this.myClientId,
				ackRequested: phase,
				payload: message,
				timestamp: Date.now(),
			};
			const envelope: MeshMessage = {
				from: this.myClientId,
				topic: `session/${sessionId}`,
				payload: tellEnvelope,
				timestamp: Date.now(),
			};
			this._send({ cmd: "publish", topic: `pi/mesh/session/${sessionId}`, payload: JSON.stringify(envelope) });
		});
	}

	sendTellReceipt(sessionId: string, ack: MeshTellAckEnvelope | MeshAskReceiptEnvelope): void {
		const envelope: MeshMessage = {
			from: this.myClientId,
			topic: `session/${sessionId}`,
			payload: ack,
			timestamp: Date.now(),
		};
		this._send({ cmd: "publish", topic: `pi/mesh/session/${sessionId}`, payload: JSON.stringify(envelope) });
	}

	ask(sessionId: string, message: unknown, timeoutMs = 30_000): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const askId = createAskId();
			const timer = setTimeout(() => {
				this.pendingGets.delete(askId);
				reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			this.pendingGets.set(askId, {
				resolve: (v) => { clearTimeout(timer); resolve(v); },
				reject: (e) => { clearTimeout(timer); reject(e); },
			});

			this.tell(sessionId, buildMeshAskEnvelope(this.myClientId, message, askId, undefined, timeoutMs));
		});
	}

	askWithReceipt(
		sessionId: string,
		message: unknown,
		timeoutMs = 30_000,
		receiptPhase: MeshAskReceiptWaitForPhase = "delivered",
	): Promise<{ reply: unknown; receipt?: MeshAskReceiptEnvelope; receipts: MeshAskReceiptEnvelope[] }> {
		return new Promise((resolve, reject) => {
			const askId = createAskId();
			let receipt: MeshAskReceiptEnvelope | undefined;
			let receipts: MeshAskReceiptEnvelope[] = [];
			let settled = false;
			const finish = (fn: () => void) => {
				if (settled) return;
				settled = true;
				this.pendingGets.delete(askId);
				this.pendingAskReceipts.delete(askId);
				fn();
			};

			const timer = setTimeout(() => {
				finish(() => {
					const receiptNote = receipts.length > 0
						? ` receipts: ${formatMeshAskReceiptTrail(receipts)}; no final reply arrived`
						: " no delivery receipt arrived";
					reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms;${receiptNote}`));
				});
			}, timeoutMs);

			this.pendingAskReceipts.set(askId, {
				noteReceipt: (ack) => {
					receipts = appendMeshAskReceipt(receipts, ack);
					receipt = ack;
				},
				reject: (error) => {
					clearTimeout(timer);
					finish(() => reject(error));
				},
			});

			this.pendingGets.set(askId, {
				resolve: (reply) => {
					clearTimeout(timer);
					finish(() => resolve({ reply, receipt, receipts }));
				},
				reject: (error) => {
					clearTimeout(timer);
					finish(() => reject(error));
				},
			});

			this.tell(sessionId, buildMeshAskEnvelope(this.myClientId, message, askId, receiptPhase, timeoutMs));
		});
	}

	broadcast(topic: string, message: unknown): void {
		const envelope: MeshMessage = {
			from: this.myClientId,
			topic,
			payload: message,
			timestamp: Date.now(),
		};
		this._send({ cmd: "publish", topic: `pi/mesh/broadcast/${topic}`, payload: JSON.stringify(envelope) });
	}

	/** Join a named channel. Inbound messages fire the "channel" event (no turn trigger). */
	joinChannel(channelId: string): void {
		if (this.channelSubs.has(channelId)) return;
		this.channelSubs.add(channelId);
		this._ensureChannelSubscription();
	}

	/** Leave a channel — stops emitting "channel" events for this ID. */
	leaveChannel(channelId: string): void {
		this.channelSubs.delete(channelId);
	}

	/** Post a message to a channel. Does not trigger a turn on receivers. */
	chat(channelId: string, message: unknown): void {
		const envelope: ChannelMessage = {
			from: this.myClientId,
			channel: channelId,
			payload: message,
			timestamp: Date.now(),
		};
		this._send({ cmd: "publish", topic: `pi/mesh/channel/${channelId}`, payload: JSON.stringify(envelope) });
	}

	/** Info about this session, using stable mesh identity when available. */
	self(): PeerInfo {
		return {
			id: this.myIdentity?.id ?? this.myClientId,
			sessionId: this.mySessionId,
			name: this.myName,
			nickname: this.myIdentity?.nickname ?? getLiveNickname(this.myClientId) ?? getLiveNickname(this.mySessionId),
			hostname: hostname(),
			cwd: process.cwd(),
			lastSeen: Date.now(),
			claimedAt: this.myIdentity?.claimedAt,
		};
	}

	/**
	 * Returns true if `id` refers to this session.
	 *
	 * Outbound envelopes stamp `from: this.myClientId` (the routing identity),
	 * but `self().id` prefers `this.myIdentity.id` (the stable identity) once
	 * resolved. Any echo guard that compares a wire `from` field against this
	 * session MUST use this helper — comparing against `self().id` alone misses
	 * the routing-identity case and lets self-messages through.
	 */
	isSelf(id: string | undefined | null): boolean {
		if (!id) return false;
		if (id === this.myClientId) return true;
		if (this.myIdentity && id === this.myIdentity.id) return true;
		return false;
	}

	/** Set the stable mesh identity (called by the identity resolution logic). */
	setIdentity(identity: MeshIdentity): void {
		this.myIdentity = identity;
	}

	/** Get the current stable mesh identity (if resolved). */
	getIdentity(): MeshIdentity | null {
		return this.myIdentity;
	}

	peers(): PeerInfo[] {
		return Array.from(this.peerMap.values());
	}

	on<T = unknown>(event: MeshEventType, cb: MeshEventCallback<T>): void {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set());
		this.listeners.get(event)!.add(cb as MeshEventCallback);
	}

	off<T = unknown>(event: MeshEventType, cb: MeshEventCallback<T>): void {
		this.listeners.get(event)?.delete(cb as MeshEventCallback);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private _emit(event: MeshEventType, data: unknown): void {
		for (const cb of this.listeners.get(event) ?? []) {
			try { cb(data); } catch {}
		}
	}

	private _send(obj: Record<string, unknown>): void {
		if (!this.sock?.writable) return;
		try {
			this.sock.write(JSON.stringify(obj) + "\n");
		} catch {
			// socket broken — sidecar died
		}
	}

	private _onData(chunk: Buffer): void {
		this.lineBuf += chunk.toString();
		let nl: number;
		while ((nl = this.lineBuf.indexOf("\n")) !== -1) {
			const line = this.lineBuf.slice(0, nl).trim();
			this.lineBuf = this.lineBuf.slice(nl + 1);
			if (!line) continue;
			try {
				this._handleEvent(JSON.parse(line));
			} catch {}
		}
	}

	private _handleEvent(ev: Record<string, unknown>): void {
		switch (ev.ev) {
			case "ready":
				// Sidecar ready — extract unique client identity (routing only, NOT identity)
				this.myZid = (ev.zid as string) ?? "";
				this.myClientId = (ev.client_id as string) ?? "";
				this.isSocketReady = true;
				// NOTE: setStableId is now called from identity resolution, not from sidecar ready.
				// The sidecar's client_id stays as routing address only.
				if (!this.myClientId) {
					console.warn("[pi-mesh] sidecar reported empty client_id — subscriptions deferred");
					break;
				}
				this._setupSubscriptions(this.myClientId, process.cwd());
				this._ensureChannelSubscription();
				this._announce(this.myClientId, process.cwd());
				this._startHeartbeat(this.myClientId, process.cwd());
				this._emit("ready", this.self());
				break;
			case "msg":
				this._handleMsg(ev.topic as string, ev.payload as string);
				break;
			case "error":
				console.warn(`[pi-mesh sidecar] ${ev.msg}`);
				break;
		}
	}

	private _handleMsg(topic: string, payload: string): void {
		if (topic.startsWith("pi/mesh/announce/")) {
			try {
				const ann: AnnouncePayload = JSON.parse(payload);
				this._handleAnnounce(ann);
			} catch {}
		} else if (topic.startsWith("pi/mesh/channel/")) {
			const channelId = topic.slice("pi/mesh/channel/".length);
			if (this.channelSubs.has(channelId)) {
				try {
					const msg: ChannelMessage = JSON.parse(payload);
					this._emit("channel", msg);
				} catch {}
			}
		} else if (topic.startsWith("pi/mesh/session/") || topic.startsWith("pi/mesh/broadcast/")) {
			try {
				const msg: MeshMessage = JSON.parse(payload);
				if (isMeshAskReceiptEnvelope(msg.payload)) {
					const pending = this.pendingAskReceipts.get(msg.payload.askId);
					if (pending) {
						pending.noteReceipt(msg.payload);
					}
					return;
				}
				if (isMeshTellAckEnvelope(msg.payload)) {
					const pending = this.pendingTellReceipts.get(msg.payload.deliveryId);
					if (pending && pending.phase === msg.payload.phase) {
						this.pendingTellReceipts.delete(msg.payload.deliveryId);
						pending.resolve(msg.payload);
					}
					return;
				}
				const unwrapped = unwrapInboundTell(msg);
				// Check if this inbound tell is a reply to a pending ask (contains askId)
				const innerPayload = unwrapped.message.payload;
				if (innerPayload && typeof innerPayload === "object" && "askId" in (innerPayload as Record<string, unknown>)) {
					const askId = (innerPayload as Record<string, unknown>).askId;
					if (typeof askId === "string") {
						const pending = this.pendingGets.get(askId);
						if (pending) {
							this.pendingGets.delete(askId);
							// If the reply wraps { askId, response }, unwrap to just the response
							const resolved = "response" in (innerPayload as Record<string, unknown>)
								? (innerPayload as Record<string, unknown>).response
								: innerPayload;
							pending.resolve(resolved);
							return;
						}
					}
				}
				if (isMeshAskEnvelope(innerPayload)) {
					const ask = innerPayload as import("./ask-protocol.ts").MeshAskEnvelope;
					if (ask.receiptRequested) {
						this.sendTellReceipt(ask.from, buildMeshAskReceipt(ask.askId, this.myClientId, "delivered"));
					}
					const senderPeer = this.peerMap.get(ask.from) ?? { id: ask.from, lastSeen: Date.now() };
					const event: RequestEvent = {
						requestId: this.nextInboundAskRequestId++,
						from: senderPeer,
						payload: ask.payload,
						askId: ask.askId,
						askReceiptRequested: ask.receiptRequested,
						timeoutMs: ask.timeoutMs,
					};
					this._emit("request", event);
					return;
				}
				this._emit("message", msg);
			} catch {}
		}
	}

	private _handleAnnounce(ann: AnnouncePayload): void {
		if (ann.clientId === this.myClientId) return;
		const key = ann.clientId || ann.sessionId;
		const existing = this.peerMap.get(key);
		const peer: PeerInfo = {
			id: key,
			sessionId: ann.sessionId,
			name: ann.name,
			hostname: ann.hostname,
			nickname: ann.nickname,
			cwd: ann.cwd,
			lastSeen: Date.now(),
			claimedAt: ann.claimedAt,
			meshId: ann.meshId,
		};
		this.peerMap.set(key, peer);
		if (!existing) this._emit("peer-join", peer);

		// ── Nickname conflict detection ──────────────────────────────────────
		if (this.myIdentity && ann.nickname && ann.nickname === this.myIdentity.nickname) {
			const peerMeshId = ann.meshId ?? ann.clientId;
			if (peerMeshId !== this.myIdentity.id) {
				// Same nickname, different identity → collision. Deterministic tie-break.
				const peerClaimedAt = ann.claimedAt ?? Date.now();
				const iLose =
					peerClaimedAt < this.myIdentity.claimedAt ||
					(peerClaimedAt === this.myIdentity.claimedAt && peerMeshId < this.myIdentity.id);
				if (iLose) {
					// We yield — re-claim nickname and notify via _onNicknameConflict callback
					const liveNicknames = new Set(this.peers().map(p => p.nickname).filter(Boolean) as string[]);
					liveNicknames.add(ann.nickname); // peer keeps it
					const newNickname = claimNickname(this.myIdentity.id, liveNicknames);
					this.myIdentity = { ...this.myIdentity, nickname: newNickname };
					setStableId(this.myIdentity.id); // re-trigger listeners
					// Re-announce with updated nickname
					this._announce(this.myClientId, process.cwd());
					// Emit conflict event so the extension can persist the updated identity
					this._emit("peer-join", this.self()); // trigger listeners for self-update
					if (this._onNicknameConflict) this._onNicknameConflict(this.myIdentity);
				}
				// else: they lose — they'll handle it on their side
			}
		}
	}

	/** Callback invoked when this peer yields on a nickname conflict. Set by the extension. */
	private _onNicknameConflict: ((updatedIdentity: MeshIdentity) => void) | null = null;

	onNicknameConflict(cb: (updatedIdentity: MeshIdentity) => void): void {
		this._onNicknameConflict = cb;
	}

	private _setupSubscriptions(clientId: string, _cwd: string): void {
		this._send({ cmd: "subscribe", topic: `pi/mesh/session/${clientId}` });
		this._send({ cmd: "subscribe", topic: "pi/mesh/announce/**" });
		this._send({ cmd: "subscribe", topic: "pi/mesh/broadcast/**" });
	}

	private _ensureChannelSubscription(): void {
		if (!this.isSocketReady || !this.sock?.writable) return;
		if (this.channelWildcardSubbed || this.channelSubs.size === 0) return;
		this._send({ cmd: "subscribe", topic: "pi/mesh/channel/**" });
		this.channelWildcardSubbed = true;
	}

	private _announce(clientId: string, cwd: string): void {
		const ann: AnnouncePayload = {
			clientId,
			zid: this.myZid,
			sessionId: this.mySessionId,
			name: this.myName,
			nickname: this.myIdentity?.nickname ?? getLiveNickname(clientId) ?? getLiveNickname(this.mySessionId),
			hostname: hostname(),
			pid: process.pid,
			cwd,
			claimedAt: this.myIdentity?.claimedAt,
			meshId: this.myIdentity?.id,
		};
		this._send({ cmd: "publish", topic: `pi/mesh/announce/${clientId}`, payload: JSON.stringify(ann) });
	}

	private _startHeartbeat(clientId: string, cwd: string): void {
		this.heartbeatTimer = setInterval(() => this._announce(clientId, cwd), this.announceIntervalMs);
	}

	updateSessionId(newId: string): void {
		if (newId === this.mySessionId) return;
		this.mySessionId = newId;
		this._announce(this.myClientId, process.cwd());
	}

	private _startStalePeerEviction(): void {
		this.stalePeerTimer = setInterval(() => {
			const cutoff = Date.now() - 90_000;
			for (const [id, peer] of this.peerMap) {
				if (peer.lastSeen < cutoff) {
					this.peerMap.delete(id);
					this._emit("peer-leave", peer);
				}
			}
		}, 30_000);
	}
}

// ── Identity resolution ──────────────────────────────────────────────────────

const MESH_IDENTITY_TYPE = "mesh_identity";
const MESH_CHANNELS_TYPE = "mesh_channels";
const MESH_BROADCAST_ALLOWED_TYPE = "mesh_broadcast_allowed";
const MESH_REBIRTH_TYPE = "mesh_rebirth";

/**
 * Scan session entries for the most recent mesh_identity custom entry.
 * Returns the identity data, or null if none found.
 */
function resolveIdentityFromSession(
	ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> } },
): MeshIdentity | null {
	let latest: MeshIdentity | null = null;
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === MESH_IDENTITY_TYPE && entry.data) {
			latest = entry.data as MeshIdentity;
		}
	}
	return latest;
}

/**
 * Scan session entries for the most recent mesh_channels custom entry.
 * Returns the persisted channel ID list, or an empty array if none found.
 *
 * Channel subscriptions live on the PiMesh instance, which gets recreated
 * on every /reload. Without persistence, users would silently drop out of
 * every channel they joined after a reload. We persist the current channel
 * set on every join/leave and rejoin them on session_start.
 */
function resolveChannelsFromSession(
	ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> } },
): string[] {
	let latest: string[] = [];
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === MESH_CHANNELS_TYPE && entry.data) {
			const data = entry.data as { channels?: unknown };
			if (Array.isArray(data.channels)) {
				latest = data.channels.filter((c): c is string => typeof c === "string");
			}
		}
	}
	return latest;
}

/**
 * Scan session entries for the most recent mesh_broadcast_allowed custom entry.
 *
 * Broadcasts are globally-visible screams to every peer on the mesh, and by
 * policy agents are NOT allowed to emit them by default — too easy to spam
 * every other session on the network with a single publish. The hooman must
 * explicitly opt-in per session via `/mesh allow-broadcast on`. We persist
 * the decision so /reload and resume keep the setting.
 */
// Check whether the session contains a rebirth marker (set by /rebirth)
// to signal that this "new" session should inherit the old mesh identity.
function hasRebirthMarker(
	ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> } },
): boolean {
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === MESH_REBIRTH_TYPE) return true;
	}
	return false;
}

function resolveBroadcastAllowedFromSession(
	ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> } },
): boolean {
	let latest = false;
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === MESH_BROADCAST_ALLOWED_TYPE && entry.data) {
			const data = entry.data as { allowed?: unknown };
			if (typeof data.allowed === "boolean") latest = data.allowed;
		}
	}
	return latest;
}

/**
 * Resolve and set the mesh identity based on session_start reason.
 * - reload: reuse existing identity from session file
 * - resume: reuse if id not live on mesh; fork if id already live (double-resume)
 * - new/fork: generate fresh identity
 * - startup: delegates to resume/new based on whether mesh_identity entry exists
 */
function resolveAndSetIdentity(
	reason: string,
	ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }>; getSessionId: () => string } },
	mesh: PiMesh,
	pi: ExtensionAPI,
): void {
	const existing = resolveIdentityFromSession(ctx);

	// reload / resume / startup with existing identity → reuse (tentatively)
	if ((reason === "reload" || reason === "resume" || reason === "startup") && existing) {
		if (reason !== "reload") {
			// For resume/startup: check if this id is already live on the mesh (double-resume detection)
			const idAlreadyLive = mesh.peers().some(
				p => p.id === existing.id || p.meshId === existing.id,
			);
			if (idAlreadyLive) {
				// DOUBLE-RESUME: session is already live in another pi process
				pi.sendMessage({
					customType: "mesh-identity-fork",
					content: "[pi-mesh] Session already open in another pi. Generating new identity for this instance.",
					display: true,
				});
				// NOTE: ctx in session_start is ExtensionContext (read-only sessionManager),
				// not ExtensionCommandContext. We cannot call ctx.newSession() here.
				// Fall through to generate new identity below.
			} else {
				// Safe — reuse identity. Verify nickname against current peers.
				mesh.setIdentity(existing);
				setStableId(existing.id);
				const liveNicknames = new Set(mesh.peers().map(p => p.nickname).filter(Boolean) as string[]);
				if (liveNicknames.has(existing.nickname)) {
					const newNickname = claimNickname(existing.id, liveNicknames);
					const updated: MeshIdentity = { ...existing, nickname: newNickname };
					mesh.setIdentity(updated);
					pi.appendEntry(MESH_IDENTITY_TYPE, updated);
				}
				return;
			}
		} else {
			// reload: always reuse identity from session file (no double-resume check needed)
			mesh.setIdentity(existing);
			setStableId(existing.id);
			return;
		}
	} else if (reason === "new" && hasRebirthMarker(ctx) && existing) {
		// REBIRTH: new session created by /rebirth — reuse old identity
		// so peers on the mesh still recognise this agent.
		mesh.setIdentity(existing);
		setStableId(existing.id);
		return;
	} else if (reason !== "fork" && reason !== "new" && existing) {
		// Unknown reason with existing identity — reuse
		mesh.setIdentity(existing);
		setStableId(existing.id);
		return;
	}
	// fork, new (non-rebirth), missing identity, or double-resume → generate fresh identity below

	// Generate fresh identity
	const id = randomUUID();
	const liveNicknames = new Set(mesh.peers().map(p => p.nickname).filter(Boolean) as string[]);
	const nickname = claimNickname(id, liveNicknames);
	const identity: MeshIdentity = {
		id,
		nickname,
		claimedAt: Date.now(),
		host: hostname(),
	};
	mesh.setIdentity(identity);
	setStableId(identity.id);
	try {
		pi.appendEntry(MESH_IDENTITY_TYPE, identity);
	} catch (e) {
		console.warn("[pi-mesh] Failed to persist mesh identity:", e);
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable string from any message payload. */
function extractPayloadText(payload: unknown): string {
	if (typeof payload === "string") return payload;
	if (payload && typeof payload === "object") {
		const p = payload as Record<string, unknown>;
		if (typeof p.question === "string") return p.question;
		if (typeof p.message === "string") return p.message;
		if (typeof p.text === "string") return p.text;
		if (typeof p.content === "string") return p.content;
	}
	return JSON.stringify(payload);
}

/** Pretty-print a structured object/array as a fenced JSON code block. */
function prettyPrintJsonValue(value: unknown): string {
	return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
}

/** Try to parse a string as a JSON object or array. Returns undefined on any other shape. */
function tryParseJsonStructured(s: string): unknown | undefined {
	const trimmed = s.trim();
	if (trimmed.length < 2) return undefined;
	const first = trimmed[0];
	if (first !== "{" && first !== "[") return undefined;
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed === "object") return parsed;
	} catch { /* not JSON — fall through */ }
	return undefined;
}

/**
 * Try to render a structured object as readable prose.
 *
 * Agents commonly send payloads like `{from, type, subject, body}` or
 * `{from, topic, text}`. When we detect these shapes, render them as
 * a human-readable message instead of a raw JSON block.
 *
 * Returns undefined if the object doesn't match a known prose pattern.
 */
function tryRenderAsMessage(obj: Record<string, unknown>): string | undefined {
	// Resolve the main body text from common field names.
	const body = (typeof obj.body === "string" ? obj.body
		: typeof obj.text === "string" ? obj.text
		: typeof obj.message === "string" ? obj.message
		: typeof obj.content === "string" ? obj.content
		: undefined);
	if (!body) return undefined;

	const parts: string[] = [];

	// Header: subject or topic line (bold via markdown)
	const headline = typeof obj.subject === "string" ? obj.subject : typeof obj.topic === "string" ? obj.topic : undefined;
	if (headline) parts.push(`**${headline}**`);

	// Body text — unescape literal \n that LLMs bake into JSON string values.
	parts.push(body.replace(/\\n/g, "\n"));

	return parts.join("\n");
}

/**
 * Format a message payload for human display.
 *
 * 1. Strings pass through unless they contain a JSON object/array — those are
 *    parsed and re-formatted.
 * 2. Objects with a recognisable message shape (subject/body, topic/text, etc.)
 *    render as readable prose with a bold headline.
 * 3. Single-field text wrappers (`{text: "hi"}`) unwrap cleanly.
 * 4. Everything else pretty-prints as a ```json fenced code block.
 */
function formatPayloadForDisplay(payload: unknown): string {
	if (typeof payload === "string") {
		const parsed = tryParseJsonStructured(payload);
		if (parsed !== undefined) return formatPayloadForDisplay(parsed);
		return payload;
	}
	if (payload === null || payload === undefined) return String(payload);
	if (typeof payload !== "object") return String(payload);
	if (Array.isArray(payload)) return prettyPrintJsonValue(payload);

	const obj = payload as Record<string, unknown>;
	const keys = Object.keys(obj);

	// Unwrap single-field text carriers so `{text: "hi"}` still renders as "hi".
	if (keys.length === 1) {
		const k = keys[0];
		const v = obj[k];
		if ((k === "text" || k === "message" || k === "content" || k === "question") && typeof v === "string") {
			return formatPayloadForDisplay(v);
		}
	}

	// Try to render as human-readable prose (subject/body, topic/text, etc.).
	const prose = tryRenderAsMessage(obj);
	if (prose) return prose;

	// Fallback: fenced JSON block.
	return prettyPrintJsonValue(obj);
}

/** Returns true for teams lifecycle events that should NOT show as generic chat.
 *  teams:comment is allowed through — it's the only user-facing content. */
function isTeamsLifecyclePayload(payload: unknown): boolean {
	if (!payload || typeof payload !== "object") return false;
	const p = payload as Record<string, unknown>;
	if (p.version === 1 && typeof p.teamId === "string" && typeof p.type === "string" && (p.from === "worker" || p.from === "leader")) {
		return true;
	}
	const kind = p.kind;
	if (typeof kind !== "string" || !kind.startsWith("teams:")) return false;
	return kind !== "teams:comment"; // comments are user content — show them
}

function getPeerLabel(peer: PeerInfo): string {
	return peer.nickname?.trim() || peer.name?.trim() || peer.id.slice(0, 8);
}

function getPeerExtraParts(peer: PeerInfo): string[] {
	const parts: string[] = [];
	if (!peer.nickname && peer.name?.trim()) parts.push(peer.name.trim());
	if (peer.hostname?.trim()) parts.push(peer.hostname.trim());
	if (peer.cwd?.trim()) parts.push(peer.cwd.trim());
	return parts;
}

function getLiveNickname(id?: string | null): string | undefined {
	return getSessionNicknameText(id ?? undefined) ?? undefined;
}

function isMeshViewRequest(payload: unknown): payload is { kind: "mesh:view"; start?: number; end?: number } {
	return !!payload && typeof payload === "object" && (payload as Record<string, unknown>).kind === "mesh:view";
}

function getInboundDeliveryOptions(
	agentBusy: boolean,
	requestVisible: boolean,
): { triggerTurn?: boolean; deliverAs?: "followUp" | "steer" | "nextTurn" } {
	if (agentBusy) {
		return { deliverAs: "followUp", triggerTurn: false };
	}
	if (requestVisible) {
		return {};
	}
	return { deliverAs: "followUp", triggerTurn: true };
}

// ── Extension entry point ─────────────────────────────────────────────────────

export default function piMeshExtension(pi: ExtensionAPI) {
	let binPath = resolveBinPath();
	if (!binPath) {
		// Binary missing — kick off a background build and notify the user.
		const extensionDir = dirname(fileURLToPath(import.meta.url));
		const nativeDir = resolve(extensionDir, "..", "native");
		const buildScript = resolve(nativeDir, "build.sh");
		pi.sendMessage({
			customType: "mesh-build",
			content: "[pi-mesh] Binary not found — building now (~2 min). Restart pi when done.\n\nRun manually: cd packages/pi-mesh/native && ./build.sh",
			display: true,
		});
		const proc = spawn("bash", [buildScript], { cwd: nativeDir, stdio: "inherit" });
		proc.on("exit", (code) => {
			if (code === 0) {
				console.warn("[pi-mesh] Build complete. Restart pi to activate mesh tools.");
			} else {
				console.warn(`[pi-mesh] Build failed (exit ${code}). Run: cd packages/pi-mesh/native && ./build.sh`);
			}
		});
		return;
	}

	const mesh = new PiMesh();
	let started = false;
	let currentCtx: { sessionManager: { getBranch: () => unknown[]; getSessionId: () => string } } | null = null;
	let rebirthStash: {
		ctx: ExtensionCommandContext;
		sessionId: string;
		sessionName: string | null;
		sessionFile: string | undefined;
		cwd: string;
		identity: MeshIdentity;
		channels: string[];
		broadcastAllowed: boolean;
	} | null = null;
	let agentBusy = false;
	// Deafen silences incoming mesh messages (both direct tells and channel chat)
	// so the TUI stays quiet while you're focused. Toggled via /mesh deafen.
	// Mute blocks outbound mesh tell/chat/ask from your session so accidental
	// slash commands don't broadcast anything. Toggled via /mesh mute.
	// broadcastAllowed gates outbound mesh.broadcast from both the code-mode
	// sandbox fn and the mesh_broadcast tool. Default OFF — agents must get
	// explicit hooman approval via /mesh allow-broadcast on before they can
	// scream at every peer on the network. Persisted per session.
	let deafened = false;
	let muted = false;
	let broadcastAllowed = false;
	const persistBroadcastAllowed = (): void => {
		try { pi.appendEntry(MESH_BROADCAST_ALLOWED_TYPE, { allowed: broadcastAllowed }); } catch {}
	};
	let ambientChatFlushTimer: ReturnType<typeof setTimeout> | null = null;
	const pendingAmbientChat: Array<{ channelId: string; senderLabel: string; text: string }> = [];
	// User-initiated channel subscriptions. Mirrored into session entries so a
	// /reload or session resume can rejoin them — the PiMesh instance itself is
	// recreated on every reload and its channelSubs set starts empty.
	const subscribedChannels = new Set<string>();
	const persistChannels = (): void => {
		try { pi.appendEntry(MESH_CHANNELS_TYPE, { channels: [...subscribedChannels] }); } catch {}
	};
	const joinAndPersist = (channelId: string): void => {
		mesh.joinChannel(channelId);
		if (!subscribedChannels.has(channelId)) {
			subscribedChannels.add(channelId);
			persistChannels();
		}
	};
	const leaveAndPersist = (channelId: string): void => {
		mesh.leaveChannel(channelId);
		if (subscribedChannels.has(channelId)) {
			subscribedChannels.delete(channelId);
			persistChannels();
		}
	};
	const pendingTells: Array<{
		senderLabel: string;
		fromId: string;
		topic: string | undefined;
		payloadText: string;
		deliveryId: string | undefined;
		originalFrom: string | undefined;
		ackRequested: MeshTellReceiptPhase | undefined;
	}> = [];
	const pendingAsks: Array<{
		requestId: number;
		senderLabel: string;
		fromId: string;
		payloadText: string;
		askId: string;
		askReceiptRequested: MeshAskReceiptWaitForPhase | undefined;
		expiresAt: number;
	}> = [];

	// Expose mesh instance for other extensions (e.g. teams) — avoids duplicate connections
	(globalThis as any).__piMesh = mesh;
	const resolveTargetSessionId = (rawSessionId: string): string => {
		const needle = rawSessionId.trim();
		const needleLower = needle.toLowerCase();
		const peers = mesh.peers();

		// 1. Exact ID / sessionId match
		const byExactMatch = peers.find((peer) => peer.id === needle || peer.sessionId === needle);
		if (byExactMatch) return byExactMatch.id;

		// 2. Case-insensitive exact name/nickname match
		const byExactLabel = peers.filter((peer) => {
			const nickname = peer.nickname?.trim().toLowerCase();
			const name = peer.name?.trim().toLowerCase();
			return nickname === needleLower || name === needleLower;
		});
		if (byExactLabel.length === 1) return byExactLabel[0].id;
		if (byExactLabel.length > 1) {
			const matched = byExactLabel.map((peer) => `${getPeerLabel(peer)} (${peer.id.slice(0, 8)})`).join(", ");
			throw new Error(`Peer name '${needle}' is ambiguous: ${matched}`);
		}

		// 3. ID prefix match
		if (needle.length >= 6) {
			const byPrefix = peers.filter((peer) => {
				const peerId = peer.id ?? "";
				const peerSessionId = peer.sessionId ?? "";
				return peerId.startsWith(needle) || peerSessionId.startsWith(needle);
			});
			if (byPrefix.length === 1) return byPrefix[0].id;
			if (byPrefix.length > 1) {
				const matched = byPrefix.map((peer) => `${getPeerLabel(peer)} (${peer.id.slice(0, 8)})`).join(", ");
				throw new Error(`Session id '${needle}' is ambiguous: ${matched}`);
			}
		}

		const available = peers.map((p) => `${getPeerLabel(p)} (${p.id.slice(0, 8)})`).join(", ");
		throw new Error(`No peer matching '${needle}'. Online: ${available || "none"}`);
	};

	const flushAmbientChat = () => {
		ambientChatFlushTimer = null;
		if (agentBusy || pendingAmbientChat.length === 0) return;
		const batch = pendingAmbientChat.splice(0, pendingAmbientChat.length);
		const blob = [
			"Ambient mesh chat arrived while you were idle.",
			"This is background context, not necessarily a direct request.",
			"Read it and decide whether to act, reply, or ignore it.",
			"",
			...batch.map(({ channelId, senderLabel, text }, idx) => `${idx + 1}. ${MI.chat} ${MI.sep} #${channelId} ${MI.sep} ${senderLabel}: ${text}`),
		].join("\n");
		pi.sendMessage(
			{
				customType: "mesh-chat-batch",
				content: blob,
				display: false,
			},
			{ deliverAs: "followUp", triggerTurn: true },
		);
	};

	const scheduleAmbientChatFlush = () => {
		if (agentBusy || pendingAmbientChat.length === 0) return;
		if (ambientChatFlushTimer) clearTimeout(ambientChatFlushTimer);
		ambientChatFlushTimer = setTimeout(flushAmbientChat, AMBIENT_CHAT_BATCH_MS);
	};

	const flushPendingAsks = () => {
		if (agentBusy || pendingAsks.length === 0) return;
		const { active, expired } = splitExpiredPendingAsks(pendingAsks);
		pendingAsks.length = 0;
		pendingAsks.push(...active);
		if (pendingAsks.length === 0) return;
		const batch = pendingAsks.splice(0, pendingAsks.length);
		const blob = buildPendingAskBatchContent(batch.map((ask) => ({
			requestId: ask.requestId,
			senderLabel: ask.senderLabel,
			payloadText: ask.payloadText,
		})));
		pi.sendMessage(
			{
				customType: "mesh-inbound-ask-batch",
				content: blob,
				display: true,
				details: {
					count: batch.length,
					asks: batch.map((ask) => ({
						requestId: ask.requestId,
						from: ask.fromId,
						senderLabel: ask.senderLabel,
						askId: ask.askId,
						askReceiptRequested: ask.askReceiptRequested,
					})),
				},
			},
			{ deliverAs: "followUp", triggerTurn: true },
		);
		for (const ask of batch) {
			if (ask.askId && ask.askReceiptRequested === "visible" && ask.fromId !== "unknown") {
				mesh.sendTellReceipt(ask.fromId, buildMeshAskReceipt(ask.askId, mesh.self().id, "visible"));
			}
		}
	};

	const flushPendingTells = () => {
		if (agentBusy || pendingTells.length === 0) return;
		const batch = pendingTells.splice(0, pendingTells.length);
		const header = batch.length === 1
			? "1 direct mesh-tell arrived while you were busy."
			: `${batch.length} direct mesh-tells arrived while you were busy.`;
		const blob = [
			header,
			"These are direct messages targeted at this session — read, decide, act.",
			"",
			...batch.map(({ senderLabel, payloadText }, idx) => `${idx + 1}. ${MI.tell} ${MI.sep} ${senderLabel}:\n${payloadText}`),
		].join("\n");
		pi.sendMessage(
			{
				customType: "mesh-inbound-batch",
				content: blob,
				display: true,
				details: {
					count: batch.length,
					tells: batch.map((t) => ({
						from: t.fromId,
						senderLabel: t.senderLabel,
						topic: t.topic,
						deliveryId: t.deliveryId,
						ackRequested: t.ackRequested,
					})),
				},
			},
			{ deliverAs: "followUp", triggerTurn: true },
		);
		// Send 'visible' acks for queued tells that requested them — the agent is now seeing them.
		for (const t of batch) {
			if (t.deliveryId && t.originalFrom && t.ackRequested === "visible") {
				mesh.sendTellReceipt(t.originalFrom, buildTellReceiptAck(t.deliveryId, mesh.self().id, "visible"));
			}
		}
	};

	pi.on("agent_start", () => {
		agentBusy = true;
		if (ambientChatFlushTimer) {
			clearTimeout(ambientChatFlushTimer);
			ambientChatFlushTimer = null;
		}
	});

	pi.on("agent_end", () => {
		agentBusy = false;
		flushPendingAsks();
		flushPendingTells();
		scheduleAmbientChatFlush();
	});

	pi.on("session_start", async (event, ctx) => {
		currentCtx = ctx;
		const sessionId = ctx.sessionManager.getSessionId();
		const reason = (event as { reason?: string }).reason ?? "startup";

		// Load persisted channel subscriptions from the session and rejoin them.
		// Without this, /reload silently drops every channel the user joined.
		const persistedChannels = resolveChannelsFromSession(ctx);
		for (const ch of persistedChannels) {
			subscribedChannels.add(ch);
			mesh.joinChannel(ch);
		}

		// Load persisted broadcast-allowed flag. Default off (see declaration).
		broadcastAllowed = resolveBroadcastAllowedFromSession(ctx);

		if (started) {
			// Already running — handle identity for reload/resume/fork/new transitions
			mesh.updateSessionId(sessionId);
			resolveAndSetIdentity(reason, ctx, mesh, pi);
			return;
		}
		started = true;

		// Register sandbox-callable functions for code-mode (ESM import to share module instance)
		try {
			const { registerSandboxFn } = await import("../../shared/src/sandbox-registry");

			// mesh namespace — callable (peers) + tell/view/broadcast/chat/joinChannel/leaveChannel
			const meshPeers = async () => JSON.stringify(mesh.peers());
			(meshPeers as any).tell = async (params: { sessionId: string; message: unknown; waitFor?: string; timeoutMs?: number }) => {
				const resolved = resolveTargetSessionId(params.sessionId);
				const mode = (params.waitFor ?? "delivered") as "none" | MeshTellReceiptPhase;
				if (mode === "none") {
					mesh.tell(resolved, params.message);
					return JSON.stringify({ sent: true, sessionId: resolved });
				}
				const ack = await mesh.tellAndWaitForReceipt(resolved, params.message, mode, params.timeoutMs ?? 10_000);
				return JSON.stringify({ sent: true, sessionId: resolved, ack });
			};
			(meshPeers as any).view = async (params: { sessionId: string; start?: number; end?: number; timeoutMs?: number }) => {
				const resolved = resolveTargetSessionId(params.sessionId);
				const reply = await mesh.ask(resolved, { kind: "mesh:view", start: params.start ?? -20, end: params.end ?? 0 }, params.timeoutMs ?? 10_000);
				return JSON.stringify(reply);
			};
			(meshPeers as any).broadcast = async (params: { topic: string; message: unknown }) => {
				if (!broadcastAllowed) {
					throw new Error(
						"mesh.broadcast is disabled for this session. Broadcasts reach every peer on the mesh and are off by default. " +
						"Ask the hooman to run '/mesh allow-broadcast on' if a broadcast is actually warranted — prefer mesh.tell or mesh.chat.",
					);
				}
				mesh.broadcast(params.topic, params.message);
				return JSON.stringify({ broadcast: true, topic: params.topic });
			};
			(meshPeers as any).chat = async (params: { channelId: string; message: unknown }) => {
				mesh.chat(params.channelId, params.message);
				return JSON.stringify({ sent: true, channelId: params.channelId });
			};
			(meshPeers as any).joinChannel = async (params: { channelId: string }) => {
				joinAndPersist(params.channelId);
				return JSON.stringify({ joined: params.channelId });
			};
			(meshPeers as any).leaveChannel = async (params: { channelId: string }) => {
				leaveAndPersist(params.channelId);
				return JSON.stringify({ left: params.channelId });
			};

			// Register namespace + backward-compat aliases
			registerSandboxFn("mesh", meshPeers);
			registerSandboxFn("meshPeers", meshPeers);
			registerSandboxFn("meshTell", (meshPeers as any).tell);
			registerSandboxFn("meshView", (meshPeers as any).view);
			registerSandboxFn("meshBroadcast", (meshPeers as any).broadcast);
			registerSandboxFn("meshChat", (meshPeers as any).chat);
			registerSandboxFn("meshJoinChannel", (meshPeers as any).joinChannel);
			registerSandboxFn("meshLeaveChannel", (meshPeers as any).leaveChannel);

			// rebirth: creates a fresh session with the agent-written TPV handoff.
			// Called from execute_code after the agent writes a TPV into $ vars.
			registerSandboxFn("rebirth", async (params: { tpv: string }) => {
				if (!rebirthStash) {
					throw new Error("rebirth() called without /rebirth — run /rebirth first.");
				}
				const stash = rebirthStash;
				rebirthStash = null; // one-shot

				const tpvText = params.tpv;
				if (!tpvText || typeof tpvText !== "string" || tpvText.trim().length === 0) {
					throw new Error("rebirth() requires a non-empty tpv string — write the TPV first.");
				}

				const result = await stash.ctx.newSession({
					parentSession: stash.sessionFile ?? undefined,
					setup: async (sm) => {
						// Inject the agent-written TPV as a custom_message entry (participates in LLM context)
						sm.appendCustomMessageEntry("rebirth-handoff", tpvText, false, {
							parentSessionId: stash.sessionId,
							parentSessionName: stash.sessionName,
							transferedAt: new Date().toISOString(),
						});

						// Rebirth marker so session_start knows to reuse identity
						sm.appendCustomEntry(MESH_REBIRTH_TYPE, {
							fromSession: stash.sessionId,
							transferedAt: new Date().toISOString(),
						});

						// Transfer mesh identity
						sm.appendCustomEntry(MESH_IDENTITY_TYPE, stash.identity);

						// Transfer channel subscriptions
						if (stash.channels.length > 0) {
							sm.appendCustomEntry(MESH_CHANNELS_TYPE, { channels: stash.channels });
						}

						// Transfer broadcast setting
						if (stash.broadcastAllowed) {
							sm.appendCustomEntry(MESH_BROADCAST_ALLOWED_TYPE, { allowed: true });
						}
					},
				});

				return JSON.stringify({ ok: !result.cancelled, cancelled: result.cancelled });
			});
		} catch (err) {
			console.warn("[pi-mesh] Failed to register sandbox functions:", err);
		}

		try {
			const name = pi.getSessionName?.() ?? undefined;
			mesh.start(binPath, sessionId, ctx.cwd, { mode: "peer", scouting: true }, name);

			// Resolve identity once sidecar is ready (tentatively — peer list may be empty)
			mesh.on("ready", () => {
				resolveAndSetIdentity(reason, ctx, mesh, pi);
			});

			// Re-check on first peer-join: if the joining peer carries our mesh id,
			// that means double-resume was missed at ready time (empty peer list).
			let peerJoinReChecked = false;
			mesh.on<PeerInfo>("peer-join", (joinedPeer) => {
				if (peerJoinReChecked) return;
				const identity = mesh.getIdentity();
				if (!identity) return;
				// Only re-check for resume/startup (reload never needs double-resume detection)
				if (reason !== "resume" && reason !== "startup") return;
				// Check if the joining peer has our mesh id → double-resume
				if (joinedPeer.meshId === identity.id || joinedPeer.id === identity.id) {
					peerJoinReChecked = true; // only trigger once
					// DOUBLE-RESUME detected via peer-join: another pi has this session open
					pi.sendMessage({
						customType: "mesh-identity-fork",
						content: "[pi-mesh] Session already open in another pi (detected on peer join). Generating new identity.",
						display: true,
					});
					// Generate fresh identity
					const newId = randomUUID();
					const liveNicknames = new Set(mesh.peers().map(p => p.nickname).filter(Boolean) as string[]);
					const nickname = claimNickname(newId, liveNicknames);
					const newIdentity: MeshIdentity = {
						id: newId,
						nickname,
						claimedAt: Date.now(),
						host: hostname(),
					};
					mesh.setIdentity(newIdentity);
					setStableId(newIdentity.id);
					try {
						pi.appendEntry(MESH_IDENTITY_TYPE, newIdentity);
					} catch (e) {
						console.warn("[pi-mesh] Failed to persist identity after peer-join re-check:", e);
					}
				}
			});

			// Persist identity updates on nickname conflicts
			mesh.onNicknameConflict((updatedIdentity) => {
				try {
					pi.appendEntry("mesh_identity", updatedIdentity);
				} catch (e) {
					console.warn("[pi-mesh] Failed to persist identity update after conflict:", e);
				}
			});

			// Wire inbound tells into the conversation.
			// Busy → queue and flush on agent_end so the agent actually wakes up to see it.
			// Idle → deliver immediately.
			mesh.on<MeshMessage>("message", (rawMsg) => {
				const { message: msg, deliveryId, ackRequested, originalFrom } = unwrapInboundTell(rawMsg);
				if (isTeamsLifecyclePayload(msg.payload)) return;
				const senderPeer = mesh.peers().find((p) => p.id === msg.from);
				const senderLabel = senderPeer ? getPeerLabel(senderPeer) : msg.from?.slice(0, 8) ?? "unknown";
				const payloadText = formatPayloadForDisplay(msg.payload);

				if (deafened) {
					// Drop the message silently — still send delivered ack so the sender
					// knows it arrived at the process, but never surface it to the agent.
					if (deliveryId && originalFrom && ackRequested) {
						mesh.sendTellReceipt(originalFrom, buildTellReceiptAck(deliveryId, mesh.self().id, "delivered"));
					}
					return;
				}

				if (agentBusy) {
					pendingTells.push({
						senderLabel,
						fromId: msg.from ?? "unknown",
						topic: msg.topic,
						payloadText,
						deliveryId,
						originalFrom,
						ackRequested,
					});
					// We have the message — ack 'delivered' now. 'visible' ack fires on flush.
					if (deliveryId && originalFrom && ackRequested) {
						mesh.sendTellReceipt(originalFrom, buildTellReceiptAck(deliveryId, mesh.self().id, "delivered"));
					}
					return;
				}

				const requestVisible = ackRequested === "visible";
				const deliveryOptions = getInboundDeliveryOptions(agentBusy, requestVisible);
				pi.sendMessage(
					{
						customType: "mesh-inbound",
						content: `${MI.tell} ${MI.sep} ${senderLabel}\n${payloadText}`,
						display: true,
						details: { from: msg.from, senderLabel, topic: msg.topic, deliveryId, ackRequested },
					},
					deliveryOptions,
				);
				if (deliveryId && originalFrom && ackRequested) {
					const phase: MeshTellReceiptPhase = requestVisible ? "visible" : "delivered";
					mesh.sendTellReceipt(originalFrom, buildTellReceiptAck(deliveryId, mesh.self().id, phase));
				}
			});

			// Wire inbound channel messages — ambient context, visible immediately.
			// If the session is idle, batch them and wake the agent once with a hidden blob.
			mesh.on<ChannelMessage>("channel", (msg) => {
				if (mesh.isSelf(msg.from)) return; // don't echo own messages (checks both routing + stable identity)
				if (isTeamsLifecyclePayload(msg.payload)) return; // teams lifecycle events rendered by teams extension
				if (deafened) return; // /mesh deafen — drop channel chatter silently

				const senderPeer = mesh.peers().find((p) => p.id === msg.from || p.sessionId === msg.from);
				const senderLabel = senderPeer ? getPeerLabel(senderPeer) : msg.from?.slice(0, 8) ?? "unknown";
				const text = formatPayloadForDisplay(msg.payload);
				pi.sendMessage({
					customType: "mesh-chat",
					content: `${MI.chat} ${MI.sep} #${msg.channel} ${MI.sep} ${senderLabel}\n${text}`,
					display: true,
				});
				pendingAmbientChat.push({ channelId: msg.channel, senderLabel, text });
				scheduleAmbientChatFlush();
			});

			// Wire inbound asks — agent sees the question and can reply
			mesh.on<RequestEvent>("request", (req) => {
				if (isMeshViewRequest(req.payload)) {
					if (!currentCtx) {
						mesh.tell(req.from.id, { askId: req.askId, error: "mesh_view unavailable: session context missing" });
						return;
					}
					const entries = projectMeaningfulSessionEntries(currentCtx.sessionManager.getBranch());
					const windowed = sliceSessionViewEntries(entries, req.payload.start ?? -20, req.payload.end ?? 0);
					mesh.tell(req.from.id, {
						askId: req.askId,
						sessionId: currentCtx.sessionManager.getSessionId(),
						start: req.payload.start ?? -20,
						end: req.payload.end ?? 0,
						total: entries.length,
						entries: windowed,
						text: formatSessionViewEntries(windowed),
					});
					return;
				}

				const reqId = req.requestId;
				const senderLabel = req.from.id !== "unknown" ? getPeerLabel(req.from) : "unknown";
				const payloadText = extractPayloadText(req.payload);

				if (agentBusy) {
					pendingAsks.push({
						requestId: reqId,
						senderLabel,
						fromId: req.from.id,
						payloadText,
						askId: req.askId,
						askReceiptRequested: req.askReceiptRequested,
						expiresAt: Date.now() + Math.max(35_000, (req.timeoutMs ?? 30_000) + 5_000),
					});
					if (req.from.id !== "unknown") {
						mesh.sendTellReceipt(req.from.id, buildMeshAskReceipt(req.askId, mesh.self().id, "busy"));
					}
					return;
				}

				const requestVisible = req.askReceiptRequested === "visible";
				const deliveryOptions = getInboundDeliveryOptions(agentBusy, requestVisible);
				const replyHint = req.from.id !== "unknown"
					? `Reply with: mesh_tell("${req.from.id}", { askId: "${req.askId}", response: "your reply" })`
					: "Reply with: mesh_tell";
				pi.sendMessage(
					{
						customType: "mesh-inbound-ask",
						content: `${MI.ask} ${MI.sep} ${senderLabel} asks\n${payloadText}\n\n${replyHint}`,
						display: true,
					},
					deliveryOptions,
				);
				if (requestVisible && req.from.id !== "unknown") {
					mesh.sendTellReceipt(req.from.id, buildMeshAskReceipt(req.askId, mesh.self().id, "visible"));
				}
			});
		} catch (e) {
			console.warn(`[pi-mesh] Failed to start: ${e}`);
		}
	});

	pi.on("session_shutdown", async () => {
		currentCtx = null;
		if (ambientChatFlushTimer) {
			clearTimeout(ambientChatFlushTimer);
			ambientChatFlushTimer = null;
		}
		pendingAmbientChat.length = 0;
		pendingTells.length = 0;
		pendingAsks.length = 0;
		if (!started) return;
		try { mesh.stop(); } catch {}
	});

	// ── MCP Tools ─────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "mesh_tell",
		label: "Mesh Tell",
		description: "Send a direct message to another pi session. By default waits for a target-session delivery receipt so direct tells are diagnosable instead of silently vanishing.",
		parameters: Type.Object({
			sessionId: Type.String({ description: "Peer ID, short ID prefix, or full name (case-insensitive). e.g. 'Galileo Accretion Rubin' or '7e9bb362'" }),
			message: Type.Unknown({ description: "Plain text preferred. For structured messages use {subject: '...', body: '...'} fields for readable rendering." }),
			waitFor: Type.Optional(Type.String({ description: "Receipt to wait for: 'none', 'delivered', or 'visible'. Default: 'delivered'" })),
			timeoutMs: Type.Optional(Type.Number({ description: "Timeout in ms when waiting for receipt (default: 10000)", minimum: 100 })),
		}),
		async execute(_toolCallId, params) {
			const { sessionId, message, waitFor, timeoutMs } = params as {
				sessionId: string;
				message: unknown;
				waitFor?: "none" | MeshTellReceiptPhase;
				timeoutMs?: number;
			};
			let resolved: string;
			try {
				resolved = resolveTargetSessionId(sessionId);
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, error: String(e), resolvedSessionId: undefined as string | undefined, sent: undefined as boolean | undefined, deliveryId: undefined as string | undefined, waitFor: undefined as string | undefined, ack: undefined },
					isError: true,
				};
			}

			const receiptMode = waitFor ?? "delivered";
			const rendered = formatPayloadForDisplay(message);
			const peerLabel = (() => {
				const peer = mesh.peers().find((p) => p.id === resolved);
				return peer ? getPeerLabel(peer) : resolved.slice(0, 8);
			})();
			if (receiptMode === "none") {
				const { deliveryId } = mesh.tell(resolved, message);
				return {
					content: [{ type: "text", text: `${MI.tell} ${MI.sep} ${peerLabel}\n${rendered}` }],
					details: { sessionId, resolvedSessionId: resolved, sent: true, deliveryId, waitFor: "none", error: undefined, ack: undefined as any },
				};
			}

			try {
				const ack = await mesh.tellAndWaitForReceipt(resolved, message, receiptMode, timeoutMs ?? 10_000);
				return {
					content: [{ type: "text", text: `${MI.tell} ${MI.sep} ${peerLabel} (${ack.phase})\n${rendered}` }],
					details: { sessionId, resolvedSessionId: resolved, sent: true, ack, waitFor: receiptMode, error: undefined, deliveryId: undefined as string | undefined },
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, resolvedSessionId: resolved, error: String(e), waitFor: receiptMode, sent: undefined as boolean | undefined, deliveryId: undefined as string | undefined, ack: undefined as any },
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "mesh_view",
		label: "Mesh View",
		description: "Read recent meaningful entries from another live pi session. Offsets are relative to the end by default: 0 is newest, -1 is one before that.",
		parameters: Type.Object({
			sessionId: Type.String({ description: "Peer ID, short ID prefix, or full name (case-insensitive). e.g. 'Galileo Accretion Rubin' or '7e9bb362'" }),
			start: Type.Optional(Type.Number({ description: "Window start offset. Defaults to -20." })),
			end: Type.Optional(Type.Number({ description: "Window end offset. Defaults to 0 (newest entry)." })),
			timeoutMs: Type.Optional(Type.Number({ description: "Timeout in ms (default: 10000)", minimum: 100 })),
		}),
		async execute(_toolCallId, params) {
			const { sessionId, start, end, timeoutMs } = params as { sessionId: string; start?: number; end?: number; timeoutMs?: number };
			let resolved: string;
			try {
				resolved = resolveTargetSessionId(sessionId);
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, error: String(e), resolvedSessionId: undefined as string | undefined, reply: undefined as Record<string, unknown> | undefined },
					isError: true,
				};
			}

			try {
				const reply = await mesh.ask(resolved, { kind: "mesh:view", start, end }, timeoutMs ?? 10_000) as Record<string, unknown>;
				if (reply?.error) throw new Error(String(reply.error));
				const replyText = typeof reply?.text === "string" ? reply.text : formatPayloadForDisplay(reply);
				return {
					content: [{ type: "text", text: replyText }],
					details: { sessionId, resolvedSessionId: resolved, reply, error: undefined as string | undefined },
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, resolvedSessionId: resolved, error: String(e), reply: undefined as Record<string, unknown> | undefined },
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "mesh_broadcast",
		label: "Mesh Broadcast",
		description: "Broadcast a message to all peers on a topic.",
		parameters: Type.Object({
			topic: Type.String({ description: "Broadcast topic (e.g. 'status', 'shutdown')" }),
			message: Type.Unknown({ description: "Plain text preferred. For structured messages use {subject: '...', body: '...'} fields for readable rendering." }),
		}),
		async execute(_toolCallId, params) {
			const { topic, message } = params as { topic: string; message: unknown };
			if (!broadcastAllowed) {
				const text =
					"mesh_broadcast is disabled for this session. Broadcasts reach every peer on the mesh and " +
					"are off by default. Ask the hooman to run '/mesh allow-broadcast on' if a broadcast is " +
					"actually warranted — otherwise prefer mesh_tell or mesh_chat.";
				return {
					content: [{ type: "text", text }],
					details: { topic, sent: false, reason: "broadcast_disabled" },
					isError: true,
				};
			}
			mesh.broadcast(topic, message);
			return {
				content: [{ type: "text", text: `${MI.broadcast} ${MI.sep} ${topic}\n${formatPayloadForDisplay(message)}` }],
				details: { topic, sent: true, reason: undefined as string | undefined },
			};
		},
	});

	pi.registerTool({
		name: "mesh_peers",
		label: "Mesh Peers",
		description: "List all pi sessions currently visible on the mesh network.",
		parameters: Type.Object({}),
		async execute() {
			const me = mesh.self();
			const peerList = mesh.peers();
			const fmtPeer = (p: PeerInfo, tag?: string) => {
				const label = getPeerLabel(p);
				const short = p.id.slice(0, 8);
				const extra = getPeerExtraParts(p).join(" · ");
				const seen = new Date(p.lastSeen).toLocaleTimeString();
				const parts = [`${label} (${short})${tag ? ` ${tag}` : ""}`];
				if (extra) parts.push(extra);
				parts.push(seen);
				return parts.join("  ");
			};
			const lines = [fmtPeer(me, "← you"), ...peerList.map((p) => fmtPeer(p))];
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: { self: me, peers: peerList },
			};
		},
	});

	pi.registerTool({
		name: "mesh_join_channel",
		label: "Mesh Join Channel",
		description: "Join a named mesh channel. Inbound messages appear in context without triggering a turn.",
		parameters: Type.Object({
			channelId: Type.String({ description: "Channel ID to join (e.g. 'teams-abc123', 'project-collab')" }),
		}),
		async execute(_toolCallId, params) {
			const { channelId } = params as { channelId: string };
			joinAndPersist(channelId);
			return {
				content: [{ type: "text", text: `Joined channel #${channelId}` }],
				details: { channelId },
			};
		},
	});

	pi.registerTool({
		name: "mesh_leave_channel",
		label: "Mesh Leave Channel",
		description: "Leave a mesh channel. No longer receive messages from it.",
		parameters: Type.Object({
			channelId: Type.String({ description: "Channel ID to leave" }),
		}),
		async execute(_toolCallId, params) {
			const { channelId } = params as { channelId: string };
			leaveAndPersist(channelId);
			return {
				content: [{ type: "text", text: `Left channel #${channelId}` }],
				details: { channelId },
			};
		},
	});

	pi.registerTool({
		name: "mesh_chat",
		label: "Mesh Chat",
		description: "Post a message to a mesh channel. Receivers see it immediately. Busy sessions do not get interrupted; idle sessions batch ambient chat and wake once with a single blob. Use mesh_tell for direct urgent messages.",
		parameters: Type.Object({
			channelId: Type.String({ description: "Channel ID to post to" }),
			message: Type.Unknown({ description: "Plain text preferred. For structured messages use {subject: '...', body: '...'} — these render as a bold headline + body. Raw JSON objects without a body/text field render as a code block." }),
		}),
		async execute(_toolCallId, params) {
			const { channelId, message } = params as { channelId: string; message: unknown };
			mesh.chat(channelId, message);
			const rendered = formatPayloadForDisplay(message);
			return {
				content: [{ type: "text", text: `${MI.chat} ${MI.sep} #${channelId}\n${rendered}` }],
				details: { channelId, sent: true },
			};
		},
	});

	// ── Register sandbox-callable functions for code-mode ──────────────
	// Done in session_start (async context) to use dynamic ESM import
	// and capture live mesh/socket state. See session_start handler.

	pi.registerMessageRenderer("mesh-list", (msg, options, theme) =>
		renderToolResult(msg, options.expanded, theme),
	);

	// ── /mesh command ─────────────────────────────────────────────────────────

	pi.registerCommand("mesh", {
		description:
			"Mesh. Usage: /mesh [list] | /mesh tell <peer> <msg> [--visible|--no-wait] | /mesh view <peer> [start] [end] | /mesh join <channel> | /mesh leave <channel> | /mesh chat <channel> <msg> | /mesh mute [on|off] | /mesh deafen [on|off] | /mesh allow-broadcast [on|off] | /mesh status",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const sub = parts[0] ?? "list";
			const parseToggle = (current: boolean, arg: string | undefined): boolean => {
				if (!arg) return !current;
				const v = arg.toLowerCase();
				if (v === "on" || v === "true" || v === "1" || v === "yes") return true;
				if (v === "off" || v === "false" || v === "0" || v === "no") return false;
				return !current;
			};
			if (sub === "mute") {
				muted = parseToggle(muted, parts[1]);
				ctx.ui.notify(`mesh mute: ${muted ? "ON (outbound blocked)" : "off"}`, "info");
				return;
			} else if (sub === "deafen" || sub === "deafened") {
				deafened = parseToggle(deafened, parts[1]);
				ctx.ui.notify(`mesh deafen: ${deafened ? "ON (inbound chat/tells silenced)" : "off"}`, "info");
				return;
			} else if (sub === "allow-broadcast" || sub === "allow_broadcast" || sub === "broadcast") {
				broadcastAllowed = parseToggle(broadcastAllowed, parts[1]);
				persistBroadcastAllowed();
				ctx.ui.notify(
					`mesh broadcast: ${broadcastAllowed ? "ALLOWED (agent may publish to all peers)" : "blocked (default — agent cannot broadcast)"}`,
					broadcastAllowed ? "warning" : "info",
				);
				return;
			} else if (sub === "status") {
				ctx.ui.notify(
					`mute=${muted ? "ON" : "off"} | deafen=${deafened ? "ON" : "off"} | broadcast=${broadcastAllowed ? "ALLOWED" : "blocked"}`,
					"info",
				);
				return;
			} else if (sub === "join") {
				const channelId = parts[1];
				if (!channelId) { ctx.ui.notify("Usage: /mesh join <channel>", "warning"); return; }
				joinAndPersist(channelId);
				ctx.ui.notify(`Joined #${channelId}`, "info");
			} else if (sub === "leave") {
				const channelId = parts[1];
				if (!channelId) { ctx.ui.notify("Usage: /mesh leave <channel>", "warning"); return; }
				leaveAndPersist(channelId);
				ctx.ui.notify(`Left #${channelId}`, "info");
			} else if (sub === "chat") {
				const channelId = parts[1];
				const message = parts.slice(2).join(" ");
				if (!channelId || !message) { ctx.ui.notify("Usage: /mesh chat <channel> <message>", "warning"); return; }
				if (muted) { ctx.ui.notify("mesh is muted — /mesh mute off to send", "warning"); return; }
				mesh.chat(channelId, message);
				const rendered = formatPayloadForDisplay(message);
				ctx.ui.notify(`${MI.chat} ${MI.sep} #${channelId}\n${rendered}`, "info");
			} else if (sub === "list" || sub === "peers" || sub === "" || sub === "me" || sub === "status") {
				const me = mesh.self();
				const peerList = mesh.peers();
				const formatPeer = (p: PeerInfo, tag?: string) => {
					const label = getPeerLabel(p);
					const short = p.id.slice(0, 8);
					const lines = [`${label}  (${short})${tag ? `  ${tag}` : ""}`];
					if (!p.nickname && p.name) lines.push(`  title: ${p.name}`);
					if (p.hostname) lines.push(`  hostname: ${p.hostname}`);
					if (p.cwd) lines.push(`  cwd: ${p.cwd}`);
					lines.push(`  lastSeen: ${new Date(p.lastSeen).toLocaleTimeString()}`);
					return lines.join("\n");
				};
				const output = [formatPeer(me, "← you"), ...peerList.map((p) => formatPeer(p))];
				ctx.ui.notify(output.join("\n\n"), "info");
			} else if (sub === "tell") {
				const targetId = parts[1];
				const tellFlags = new Set<"--visible" | "--no-wait">(parts.filter((part): part is "--visible" | "--no-wait" => part === "--visible" || part === "--no-wait"));
				const message = parts.slice(2).filter((part) => !tellFlags.has(part as "--visible" | "--no-wait")).join(" ");
				if (!targetId || !message) { ctx.ui.notify("Usage: /mesh tell <sessionId> <message>", "warning"); return; }
				if (muted) { ctx.ui.notify("mesh is muted — /mesh mute off to send", "warning"); return; }
				let resolved: string;
				try {
					resolved = resolveTargetSessionId(targetId);
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
					return;
				}
				const tellPeer = mesh.peers().find((p) => p.id === resolved);
				const tellLabel = tellPeer ? getPeerLabel(tellPeer) : resolved.slice(0, 8);
				try {
					if (tellFlags.has("--no-wait")) {
						const { deliveryId } = mesh.tell(resolved, message);
						ctx.ui.notify(`${MI.tell} ${MI.sep} ${tellLabel}\n${message}`, "info");
					} else {
						const phase: MeshTellReceiptPhase = tellFlags.has("--visible") ? "visible" : "delivered";
						await mesh.tellAndWaitForReceipt(resolved, message, phase, 10_000);
						ctx.ui.notify(`${MI.tell} ${MI.sep} ${tellLabel} (${phase})\n${message}`, "info");
					}
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
				}
			} else if (sub === "view") {
				const targetId = parts[1];
				if (!targetId) { ctx.ui.notify("Usage: /mesh view <sessionId> [start] [end]", "warning"); return; }
				const start = parts[2] ? Number(parts[2]) : -20;
				const end = parts[3] ? Number(parts[3]) : 0;
				let resolved: string;
				try {
					resolved = resolveTargetSessionId(targetId);
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
					return;
				}
				try {
					const reply = await mesh.ask(resolved, { kind: "mesh:view", start, end }, 10_000) as Record<string, unknown>;
					if (reply?.error) throw new Error(String(reply.error));
					const viewText = typeof reply?.text === "string" ? reply.text : formatPayloadForDisplay(reply);
					ctx.ui.notify(viewText, "info");
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
				}
			} else {
				ctx.ui.notify("Unknown. Use: /mesh list | /mesh tell <id> <msg> | /mesh view <id> [start] [end] | /mesh join/leave/chat <channel>", "warning");
			}
		},
	});


	// ── /rebirth command ──────────────────────────────────────────────────────────────
	// Phase 1: stash session metadata, then steer the agent to write a TPV.
	// The agent calls rebirth() from execute_code with the synthesized TPV text.
	// Phase 2 is the rebirth sandbox fn (registered in session_start).

	pi.registerCommand("rebirth", {
		description: "Rebirth: steer the agent to write a TPV, then rebirth into a fresh session with identity preserved.",
		handler: async (args, ctx) => {
			const sessionId = ctx.sessionManager.getSessionId();
			const sessionName = ctx.sessionManager.getSessionName();
			const sessionFile = ctx.sessionManager.getSessionFile();
			const cwd = ctx.sessionManager.getCwd();

			const identity = resolveIdentityFromSession(ctx);
			const channels = resolveChannelsFromSession(ctx);
			const broadcastSetting = resolveBroadcastAllowedFromSession(ctx);

			if (!identity) {
				ctx.ui.notify("Cannot rebirth: no mesh identity found in current session.", "warning");
				return;
			}

			// Stash everything the sandbox fn needs
			rebirthStash = {
				ctx,
				sessionId,
				sessionName,
				sessionFile,
				cwd,
				identity,
				channels,
				broadcastAllowed: broadcastSetting,
			};

			ctx.ui.notify("Rebirth initiated — writing TPV handoff...", "info");

			// Steer the agent: write a TPV, then call rebirth()
			pi.sendUserMessage([
				{ type: "text", text: "REBIRTH — Write a Total Perspective Vortex (TPV) handoff for your next self, then call rebirth() to be reborn into a fresh session.\n\n" +
					"## What to do\n\n" +
					"1. Review everything that happened in this session — decisions, dead ends, gotchas, files touched, line numbers, tickets, ADRs, next steps.\n" +
					"2. Write a thick TPV handoff into $.tpv — include:\n" +
					"   - Session context: what was the goal, what was accomplished\n" +
					"   - Key decisions and why (ADRs if any)\n" +
					"   - Dead ends and what was wrong about them\n" +
					"   - Files modified with line numbers for important bits\n" +
					"   - Tickets created/updated (IDs, status)\n" +
					"   - Unfinished work and exact next steps\n" +
					"   - Lessons learned, things to improve\n" +
					"   - Any warnings or gotchas for the continuation\n" +
					"3. Call: rebirth({ tpv: $.tpv })\n\n" +
					"Your mesh identity will be preserved — peers will still recognise you.\n" +
					"Session ID: " + sessionId + "\n" +
					"CWD: " + cwd },
			]);
		},
	});
}
