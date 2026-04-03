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
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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
	MeshTellAckEnvelope,
	MeshTellEnvelope,
	MeshTellReceiptPhase,
	PeerInfo,
	RequestEvent,
} from "./types.js";
import { getSessionNicknameText, setStableId } from "@pi-extensions/shared/session-nickname";
import {
	buildTellReceiptAck,
	createDeliveryId,
	isMeshTellAckEnvelope,
	isMeshTellEnvelope,
	unwrapInboundTell,
} from "./tell-protocol.ts";
import {
	buildMeshAskEnvelope,
	buildMeshAskReceipt,
	isMeshAskEnvelope,
	isMeshAskReceiptEnvelope,
} from "./ask-protocol.ts";

const ambientChatBatchMsRaw = Number(process.env.PI_MESH_AMBIENT_CHAT_BATCH_MS ?? "750");
const AMBIENT_CHAT_BATCH_MS = Number.isFinite(ambientChatBatchMsRaw) && ambientChatBatchMsRaw >= 0
	? Math.floor(ambientChatBatchMsRaw)
	: 750;

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
	private announceIntervalMs = 30_000;
	private lineBuf = "";
	private pendingGets: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();
	private pendingAskReceipts: Map<string, { phase: "delivered" | "visible"; resolve: (v: MeshAskReceiptEnvelope) => void; reject: (e: Error) => void }> = new Map();
	private pendingTellReceipts: Map<string, { phase: MeshTellReceiptPhase; resolve: (v: MeshTellAckEnvelope) => void; reject: (e: Error) => void }> = new Map();
	private serveIds: number[] = [];
	private subIds: number[] = [];
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

	sendTellReceipt(sessionId: string, ack: MeshTellAckEnvelope): void {
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
			const reqId = `ask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const timer = setTimeout(() => {
				this.pendingGets.delete(reqId);
				reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			this.pendingGets.set(reqId, {
				resolve: (v) => { clearTimeout(timer); resolve(v); },
				reject: (e) => { clearTimeout(timer); reject(e); },
			});

			const envelope = buildMeshAskEnvelope(this.myClientId, message);
			this._send({
				cmd: "get",
				topic: `pi/mesh/rpc/${sessionId}`,
				payload: JSON.stringify(envelope),
				timeout_ms: timeoutMs + 5000, // Rust safety net
				req_id: reqId,
			});
		});
	}

	askWithReceipt(
		sessionId: string,
		message: unknown,
		timeoutMs = 30_000,
		receiptPhase: "delivered" | "visible" = "delivered",
	): Promise<{ reply: unknown; receipt?: MeshAskReceiptEnvelope }> {
		return new Promise((resolve, reject) => {
			const reqId = `ask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			let receipt: MeshAskReceiptEnvelope | undefined;
			let settled = false;
			const finish = (fn: () => void) => {
				if (settled) return;
				settled = true;
				this.pendingGets.delete(reqId);
				this.pendingAskReceipts.delete(reqId);
				fn();
			};

			const timer = setTimeout(() => {
				finish(() => {
					const receiptNote = receipt ? ` request ${receipt.phase} by ${receipt.from} but no final reply arrived` : " no delivery receipt arrived";
					reject(new Error(`mesh_ask: timeout after ${timeoutMs}ms;${receiptNote}`));
				});
			}, timeoutMs);

			this.pendingAskReceipts.set(reqId, {
				phase: receiptPhase,
				resolve: (ack) => {
					receipt = ack;
				},
				reject: (error) => {
					clearTimeout(timer);
					finish(() => reject(error));
				},
			});

			this.pendingGets.set(reqId, {
				resolve: (reply) => {
					clearTimeout(timer);
					finish(() => resolve({ reply, receipt }));
				},
				reject: (error) => {
					clearTimeout(timer);
					finish(() => reject(error));
				},
			});

			const envelope = buildMeshAskEnvelope(this.myClientId, message, reqId, receiptPhase);
			this._send({
				cmd: "get",
				topic: `pi/mesh/rpc/${sessionId}`,
				payload: JSON.stringify(envelope),
				timeout_ms: timeoutMs + 5000,
				req_id: reqId,
			});
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

	/** Info about this session. */
	self(): PeerInfo {
		return {
			id: this.myClientId,
			sessionId: this.mySessionId,
			name: this.myName,
			nickname: getLiveNickname(this.myClientId) ?? getLiveNickname(this.mySessionId),
			hostname: hostname(),
			cwd: process.cwd(),
			lastSeen: Date.now(),
		};
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
				// Sidecar ready — extract unique client identity
				this.myZid = (ev.zid as string) ?? "";
				this.myClientId = (ev.client_id as string) ?? "";
				this.isSocketReady = true;
				setStableId(this.myClientId);
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
			case "query":
				this._handleQuery(ev.query_id as number, ev.topic as string, ev.payload as string);
				break;
			case "reply":
				this._handleGetReply(ev.req_id as string, ev.payload as string);
				break;
			case "subscribed":
				this.subIds.push(ev.id as number);
				break;
			case "served":
				this.serveIds.push(ev.id as number);
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
					if (pending && pending.phase === msg.payload.phase) {
						pending.resolve(msg.payload);
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
				this._emit("message", msg);
			} catch {}
		}
	}

	private _handleQuery(queryId: number, _topic: string, payload: string): void {
		let requestPayload: unknown;
		let fromId = "unknown";
		let askId: string | undefined;
		let askReceiptRequested: "delivered" | "visible" | undefined;
		try {
			const parsed = payload ? JSON.parse(payload) : undefined;
			// Unwrap ask envelope (sent by ask() method)
			if (isMeshAskEnvelope(parsed)) {
				fromId = parsed.__meshFrom;
				requestPayload = parsed.__meshPayload;
				askId = parsed.__meshAskId;
				askReceiptRequested = parsed.__meshAskReceiptRequested;
			} else {
				requestPayload = parsed;
			}
		} catch { requestPayload = payload; }

		if (fromId !== "unknown" && askId && askReceiptRequested) {
			this.sendTellReceipt(fromId, buildMeshAskReceipt(askId, this.myClientId, "delivered"));
		}

		const senderPeer = this.peerMap.get(fromId) ?? { id: fromId, lastSeen: Date.now() };

		let replied = false;
		const replyFn = (response: unknown) => {
			if (replied) return;
			replied = true;
			this._send({ cmd: "reply", query_id: queryId, payload: JSON.stringify(response) });
		};

		const event: RequestEvent = {
			requestId: queryId,
			from: senderPeer,
			payload: requestPayload,
			askId,
			askReceiptRequested,
			reply: replyFn,
		};
		this._emit("request", event);

		// No auto-ACK — let the sender's timeout handle "nobody replied".
		// The agent needs time to think and call mesh_reply explicitly.
	}

	private _handleGetReply(reqId: string, payload: string): void {
		const pending = this.pendingGets.get(reqId);
		if (!pending) return;
		this.pendingGets.delete(reqId);
		try {
			pending.resolve(payload ? JSON.parse(payload) : undefined);
		} catch (e) {
			pending.reject(e as Error);
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
		};
		this.peerMap.set(key, peer);
		if (!existing) this._emit("peer-join", peer);
	}

	private _setupSubscriptions(clientId: string, _cwd: string): void {
		this._send({ cmd: "subscribe", topic: `pi/mesh/session/${clientId}` });
		this._send({ cmd: "subscribe", topic: "pi/mesh/announce/**" });
		this._send({ cmd: "subscribe", topic: "pi/mesh/broadcast/**" });
		this._send({ cmd: "serve", topic: `pi/mesh/rpc/${clientId}` });
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
			nickname: getLiveNickname(clientId) ?? getLiveNickname(this.mySessionId),
			hostname: hostname(),
			pid: process.pid,
			cwd,
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

/** Returns true for teams lifecycle events that should NOT show as generic chat.
 *  teams:comment is allowed through — it's the only user-facing content. */
function isTeamsLifecyclePayload(payload: unknown): boolean {
	if (!payload || typeof payload !== "object") return false;
	const kind = (payload as Record<string, unknown>).kind;
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
	let agentBusy = false;
	let ambientChatFlushTimer: ReturnType<typeof setTimeout> | null = null;
	const pendingAmbientChat: Array<{ channelId: string; senderLabel: string; text: string }> = [];

	// Expose mesh instance for other extensions (e.g. teams) — avoids duplicate connections
	(globalThis as any).__piMesh = mesh;
	const pendingReplies = new Map<number, (response: unknown) => void>();

	const resolveTargetSessionId = (rawSessionId: string): string => {
		const needle = rawSessionId.trim();
		const peers = mesh.peers();
		const byExactMatch = peers.find((peer) => peer.id === needle || peer.sessionId === needle);
		if (byExactMatch) return byExactMatch.id;

		const byExactLabel = peers.filter((peer) => {
			const nickname = peer.nickname?.trim();
			const name = peer.name?.trim();
			return nickname === needle || name === needle;
		});
		if (byExactLabel.length === 1) return byExactLabel[0].id;
		if (byExactLabel.length > 1) {
			const matched = byExactLabel.map((peer) => `${getPeerLabel(peer)} (${peer.id.slice(0, 8)})`).join(", ");
			throw new Error(`Peer label '${needle}' is ambiguous: ${matched}`);
		}

		if (needle.length === 8) {
			const byPrefix = peers.filter((peer) => {
				const peerId = peer.id ?? "";
				const peerSessionId = peer.sessionId ?? "";
				return peerId.startsWith(needle) || peerSessionId.startsWith(needle);
			});
			if (byPrefix.length === 0) {
				const hint = /^([a-z]+-)?[a-z0-9]{3,5}$/i.test(needle)
					? ` '${needle}' looks like a ticket or local label, not a mesh peer id. Use mesh_peers and pass the short id in parentheses or an exact nickname.`
					: " Is the peer online?";
				throw new Error(`Unknown session id '${needle}'.${hint}`);
			}
			if (byPrefix.length === 1) {
				return byPrefix[0].id;
			}
			const matched = byPrefix.map((peer) => peer.id.slice(0, 8)).join(", ");
			throw new Error(`Session id '${needle}' is ambiguous: ${matched}`);
		}

		const hint = /^([a-z]+-)?[a-z0-9]{3,5}$/i.test(needle)
			? ` '${needle}' looks like a ticket or local label, not a mesh peer id. Use mesh_peers and pass the short id in parentheses or an exact nickname.`
			: " Is the peer online?";
		throw new Error(`Unknown session id '${needle}'.${hint}`);
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
			...batch.map(({ channelId, senderLabel, text }, idx) => `${idx + 1}. [#${channelId}] ${senderLabel}: ${text}`),
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

	pi.on("agent_start", () => {
		agentBusy = true;
		if (ambientChatFlushTimer) {
			clearTimeout(ambientChatFlushTimer);
			ambientChatFlushTimer = null;
		}
	});

	pi.on("agent_end", () => {
		agentBusy = false;
		scheduleAmbientChatFlush();
	});

	pi.on("session_start", async (_event, ctx) => {
		currentCtx = ctx;
		const sessionId = ctx.sessionManager.getSessionId();
		if (started) {
			mesh.updateSessionId(sessionId);
			return;
		}
		started = true;
		try {
			const name = pi.getSessionName?.() ?? undefined;
			mesh.start(binPath, sessionId, ctx.cwd, { mode: "peer", scouting: true }, name);

			// Wire inbound tells into the conversation
			mesh.on<MeshMessage>("message", (rawMsg) => {
				const { message: msg, deliveryId, ackRequested, originalFrom } = unwrapInboundTell(rawMsg);
				const senderPeer = mesh.peers().find((p) => p.id === msg.from);
				const senderLabel = senderPeer ? getPeerLabel(senderPeer) : msg.from?.slice(0, 8) ?? "unknown";
				const shouldAppendNow = agentBusy || ackRequested === "visible";
				const deliveryOptions = shouldAppendNow
					? ({ deliverAs: "appendNow" } as { deliverAs: "steer" | "followUp" | "nextTurn" })
					: { deliverAs: "followUp" as const, triggerTurn: true };
				pi.sendMessage(
					{
						customType: "mesh-inbound",
						content: `[mesh-tell] From ${senderLabel}:\n\n${typeof msg.payload === "string" ? msg.payload : JSON.stringify(msg.payload)}`,
						display: true,
						details: { from: msg.from, senderLabel, topic: msg.topic, deliveryId, ackRequested },
					},
					deliveryOptions,
				);
				if (deliveryId && originalFrom && ackRequested) {
					const phase: MeshTellReceiptPhase = shouldAppendNow ? "visible" : "delivered";
					mesh.sendTellReceipt(originalFrom, buildTellReceiptAck(deliveryId, mesh.self().id, phase));
				}
			});

			// Wire inbound channel messages — ambient context, visible immediately.
			// If the session is idle, batch them and wake the agent once with a hidden blob.
			mesh.on<ChannelMessage>("channel", (msg) => {
				if (msg.from === mesh.self().id) return; // don't echo own messages
				if (isTeamsLifecyclePayload(msg.payload)) return; // teams lifecycle events rendered by teams extension

				const senderPeer = mesh.peers().find((p) => p.id === msg.from || p.sessionId === msg.from);
				const senderLabel = senderPeer ? getPeerLabel(senderPeer) : msg.from?.slice(0, 8) ?? "unknown";
				const text = extractPayloadText(msg.payload);
				pi.sendMessage({
					customType: "mesh-chat",
					content: `👥 [#${msg.channel}] ${senderLabel}:\n${text}`,
					display: true,
				});
				pendingAmbientChat.push({ channelId: msg.channel, senderLabel, text });
				scheduleAmbientChatFlush();
			});

			// Wire inbound asks — agent sees the question and can reply
			mesh.on<RequestEvent>("request", (req) => {
				if (isMeshViewRequest(req.payload)) {
					if (!currentCtx) {
						req.reply({ error: "mesh_view unavailable: session context missing" });
						return;
					}
					const entries = projectMeaningfulSessionEntries(currentCtx.sessionManager.getBranch());
					const windowed = sliceSessionViewEntries(entries, req.payload.start ?? -20, req.payload.end ?? 0);
					req.reply({
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
				pendingReplies.set(reqId, req.reply);
				setTimeout(() => {
					pendingReplies.delete(reqId);
				}, 30_000);

				const senderLabel = req.from.id !== "unknown" ? getPeerLabel(req.from) : "unknown";
				const ts = new Date().toLocaleTimeString();
				const payloadText = extractPayloadText(req.payload);
				const shouldAppendNow = agentBusy || req.askReceiptRequested === "visible";
				const deliveryOptions = shouldAppendNow
					? ({ deliverAs: "appendNow" } as { deliverAs: "steer" | "followUp" | "nextTurn" })
					: { deliverAs: "followUp" as const, triggerTurn: true };
				pi.sendMessage(
					{
						customType: "mesh-inbound-ask",
						content: `[${reqId}] ${ts} ${senderLabel} asks: ${payloadText}\n\nUse mesh_reply(requestId: ${reqId}, response: your answer) to respond.`,
						display: true,
					},
					deliveryOptions,
				);
				if (req.askId && req.askReceiptRequested === "visible" && req.from.id !== "unknown") {
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
		if (!started) return;
		try { mesh.stop(); } catch {}
	});

	// ── MCP Tools ─────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "mesh_reply",
		label: "Mesh Reply",
		description: "Reply to a pending incoming mesh_ask request.",
		parameters: Type.Object({
			requestId: Type.Number({ description: "Request ID from last mesh-ask inbound event." }),
			response: Type.Unknown({ description: "Response payload" }),
		}),
		async execute(_toolCallId, params) {
			const { requestId, response } = params as { requestId: number; response: unknown };
			const sender = pendingReplies.get(requestId);
			if (!sender) {
				return {
					content: [{ type: "text", text: `No pending request with id ${requestId}` }],
					details: { requestId },
					isError: true,
				};
			}
			sender(response);
			pendingReplies.delete(requestId);
			return {
				content: [{ type: "text", text: `Replied to request ${requestId}` }],
				details: { requestId },
			};
		},
	});

	pi.registerTool({
		name: "mesh_tell",
		label: "Mesh Tell",
		description: "Send a direct message to another pi session. By default waits for a target-session delivery receipt so direct tells are diagnosable instead of silently vanishing.",
		parameters: Type.Object({
			sessionId: Type.String({ description: "Target mesh peer ID or exact nickname" }),
			message: Type.Unknown({ description: "Message payload (any JSON value)" }),
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
					details: { sessionId, error: String(e) },
					isError: true,
				};
			}

			const receiptMode = waitFor ?? "delivered";
			if (receiptMode === "none") {
				const { deliveryId } = mesh.tell(resolved, message);
				return {
					content: [{ type: "text", text: `Message sent to session ${resolved} (${deliveryId})` }],
					details: { sessionId, resolvedSessionId: resolved, sent: true, deliveryId, waitFor: "none" },
				};
			}

			try {
				const ack = await mesh.tellAndWaitForReceipt(resolved, message, receiptMode, timeoutMs ?? 10_000);
				return {
					content: [{ type: "text", text: `Message delivered to session ${resolved} (${ack.phase}, deliveryId=${ack.deliveryId})` }],
					details: { sessionId, resolvedSessionId: resolved, sent: true, ack, waitFor: receiptMode },
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, resolvedSessionId: resolved, error: String(e), waitFor: receiptMode },
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "mesh_ask",
		label: "Mesh Ask",
		description: "Send a request to another pi session and wait for a reply. Includes delivery receipt tracking so timeouts distinguish 'not delivered' from 'delivered but no reply'.",
		parameters: Type.Object({
			sessionId: Type.String({ description: "Target mesh peer ID or exact nickname" }),
			message: Type.Unknown({ description: "Request payload (any JSON value)" }),
			timeoutMs: Type.Optional(Type.Number({ description: "Timeout in ms (default: 30000)", minimum: 100 })),
			waitFor: Type.Optional(Type.String({ description: "Receipt to wait for before timing out diagnostics: 'delivered' or 'visible'. Default: 'delivered'" })),
		}),
		async execute(_toolCallId, params) {
			const { sessionId, message, timeoutMs, waitFor } = params as {
				sessionId: string;
				message: unknown;
				timeoutMs?: number;
				waitFor?: "delivered" | "visible";
			};
			let resolved: string;
			try {
				resolved = resolveTargetSessionId(sessionId);
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, error: String(e) },
					isError: true,
				};
			}

			try {
				const result = await mesh.askWithReceipt(resolved, message, timeoutMs ?? 30_000, waitFor ?? "delivered");
				const receiptLine = result.receipt ? `\nreceipt: ${result.receipt.phase} by ${result.receipt.from} (${result.receipt.askId})` : "\nreceipt: none";
				return {
					content: [{ type: "text", text: `${JSON.stringify(result.reply)}${receiptLine}` }],
					details: { sessionId, resolvedSessionId: resolved, reply: result.reply, receipt: result.receipt, waitFor: waitFor ?? "delivered" },
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, resolvedSessionId: resolved, error: String(e), waitFor: waitFor ?? "delivered" },
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
			sessionId: Type.String({ description: "Target mesh peer ID or exact nickname" }),
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
					details: { sessionId, error: String(e) },
					isError: true,
				};
			}

			try {
				const reply = await mesh.ask(resolved, { kind: "mesh:view", start, end }, timeoutMs ?? 10_000) as Record<string, unknown>;
				if (reply?.error) throw new Error(String(reply.error));
				return {
					content: [{ type: "text", text: typeof reply?.text === "string" ? reply.text : JSON.stringify(reply) }],
					details: { sessionId, resolvedSessionId: resolved, reply },
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Error: ${e}` }],
					details: { sessionId, resolvedSessionId: resolved, error: String(e) },
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
			message: Type.Unknown({ description: "Message payload (any JSON value)" }),
		}),
		async execute(_toolCallId, params) {
			const { topic, message } = params as { topic: string; message: unknown };
			mesh.broadcast(topic, message);
			return {
				content: [{ type: "text", text: `Broadcast sent on topic '${topic}'` }],
				details: { topic, sent: true },
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
			mesh.joinChannel(channelId);
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
			mesh.leaveChannel(channelId);
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
			message: Type.Unknown({ description: "Message payload (string or any JSON value)" }),
		}),
		async execute(_toolCallId, params) {
			const { channelId, message } = params as { channelId: string; message: unknown };
			mesh.chat(channelId, message);
			return {
				content: [{ type: "text", text: `Posted to #${channelId}` }],
				details: { channelId, sent: true },
			};
		},
	});

	pi.registerMessageRenderer("mesh-list", (msg, expanded, theme) =>
		renderToolResult(msg, expanded, theme),
	);

	// ── /mesh command ─────────────────────────────────────────────────────────

	pi.registerCommand("mesh", {
		description:
			"Mesh. Usage: /mesh [list] | /mesh tell <peer-id-or-nickname> <msg> [--visible|--no-wait] | /mesh ask <peer-id-or-nickname> <msg> [--visible] | /mesh view <peer-id-or-nickname> [start] [end] | /mesh join <channel> | /mesh leave <channel> | /mesh chat <channel> <msg>",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const sub = parts[0] ?? "list";
			if (sub === "join") {
				const channelId = parts[1];
				if (!channelId) { ctx.ui.notify("Usage: /mesh join <channel>", "warning"); return; }
				mesh.joinChannel(channelId);
				ctx.ui.notify(`Joined #${channelId}`, "info");
			} else if (sub === "leave") {
				const channelId = parts[1];
				if (!channelId) { ctx.ui.notify("Usage: /mesh leave <channel>", "warning"); return; }
				mesh.leaveChannel(channelId);
				ctx.ui.notify(`Left #${channelId}`, "info");
			} else if (sub === "chat") {
				const channelId = parts[1];
				const message = parts.slice(2).join(" ");
				if (!channelId || !message) { ctx.ui.notify("Usage: /mesh chat <channel> <message>", "warning"); return; }
				mesh.chat(channelId, message);
				ctx.ui.notify(`→ #${channelId}`, "info");
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
				const tellFlags = new Set(parts.filter((part) => part === "--visible" || part === "--no-wait"));
				const message = parts.slice(2).filter((part) => !tellFlags.has(part)).join(" ");
				if (!targetId || !message) { ctx.ui.notify("Usage: /mesh tell <sessionId> <message>", "warning"); return; }
				let resolved: string;
				try {
					resolved = resolveTargetSessionId(targetId);
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
					return;
				}
				try {
					if (tellFlags.has("--no-wait")) {
						const { deliveryId } = mesh.tell(resolved, message);
						ctx.ui.notify(`Sent to ${resolved} (${deliveryId})`, "info");
					} else {
						const phase: MeshTellReceiptPhase = tellFlags.has("--visible") ? "visible" : "delivered";
						await mesh.tellAndWaitForReceipt(resolved, message, phase, 10_000);
						ctx.ui.notify(`Delivered to ${resolved} (${phase})`, "info");
					}
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
				}
			} else if (sub === "ask") {
				const targetId = parts[1];
				const askFlags = new Set(parts.filter((part) => part === "--visible"));
				const message = parts.slice(2).filter((part) => !askFlags.has(part)).join(" ");
				if (!targetId || !message) { ctx.ui.notify("Usage: /mesh ask <sessionId> <message> [--visible]", "warning"); return; }
				let resolved: string;
				try {
					resolved = resolveTargetSessionId(targetId);
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
					return;
				}
				try {
					const result = await mesh.askWithReceipt(resolved, message, 30_000, askFlags.has("--visible") ? "visible" : "delivered");
					const receiptText = result.receipt ? `\nreceipt: ${result.receipt.phase} by ${result.receipt.from}` : "";
					ctx.ui.notify(`${JSON.stringify(result.reply)}${receiptText}`, "info");
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
					ctx.ui.notify(typeof reply?.text === "string" ? reply.text : JSON.stringify(reply), "info");
				} catch (e) {
					ctx.ui.notify(`Error: ${e}`, "warning");
				}
			} else {
				ctx.ui.notify("Unknown. Use: /mesh list | /mesh tell <id> <msg> | /mesh view <id> [start] [end] | /mesh join/leave/chat <channel>", "warning");
			}
		},
	});
}
