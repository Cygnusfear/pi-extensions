import { createConnection, type Socket } from "node:net";
import { join } from "node:path";
import { hostname } from "node:os";
import { EventEmitter } from "node:events";
import {
	unwrapInboundTell,
	isMeshTellAckEnvelope,
	createDeliveryId,
	buildTellReceiptAck,
} from "@pi-extensions/pi-mesh/extension/tell-protocol.js";
import type {
	MeshMessage,
	MeshTellEnvelope,
	AnnouncePayload,
	ChannelMessage,
	PeerInfo,
} from "@pi-extensions/pi-mesh/types";

const DEFAULT_SOCK = join(process.env.HOME ?? "/tmp", ".pi", "mesh.sock");

export interface InboundTell {
	fromClientId: string;
	fromMeshId?: string;
	nickname: string;
	text: string;
	attachment?: string;
	/** present ⇒ the sender asked for a delivery receipt; we ack it */
	deliveryId?: string;
}
export interface InboundChannel {
	fromClientId: string;
	nickname: string;
	channel: string;
	text: string;
}
export interface ReplyTarget {
	clientId: string;
	meshId?: string;
}

/**
 * A standalone mesh peer that impersonates a fixed durable identity ("The Hooman").
 * Speaks the sidecar's newline-JSON protocol directly (~/.pi/mesh.sock) — no pi runtime.
 * Mirrors packages/pi-mesh/extension/pi-mesh.ts wire behaviour; reuses its pure protocol
 * helpers (tell-protocol) so it stays byte-compatible with real pi peers, including the
 * mesh:tell UNWRAP that live worker→leader traffic requires.
 */
export class MeshClient extends EventEmitter {
	private sock: Socket | null = null;
	private lineBuf = "";
	private clientId = "";
	private announceTimer?: ReturnType<typeof setInterval>;
	private reconnectTimer?: ReturnType<typeof setTimeout>;
	private stopped = false;
	/** routing map: clientId → PeerInfo (incl. durable meshId + nickname) */
	readonly peers = new Map<string, PeerInfo>();

	constructor(
		private readonly opts: {
			meshId: string;
			nickname: string;
			channel: string;
			sessionId?: string;
			sockPath?: string;
		},
	) {
		super();
	}

	start(): void {
		this.stopped = false;
		this.connect();
	}

	stop(): void {
		this.stopped = true;
		if (this.announceTimer) clearInterval(this.announceTimer);
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		try {
			this.send({ cmd: "close" });
		} catch {}
		this.sock?.destroy();
		this.sock = null;
	}

	private connect(): void {
		const path = this.opts.sockPath ?? DEFAULT_SOCK;
		this.sock = createConnection(path);
		this.sock.on("data", (c: Buffer) => this.onData(c));
		this.sock.on("error", (e) => {
			console.warn("[mesh] socket error:", (e as Error).message);
			this.onDisconnect();
		});
		this.sock.on("close", () => this.onDisconnect());
	}

	private onDisconnect(): void {
		if (this.announceTimer) clearInterval(this.announceTimer);
		this.sock = null;
		if (this.stopped || this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			console.warn("[mesh] reconnecting…");
			this.connect();
		}, 2000);
	}

	private send(obj: Record<string, unknown>): void {
		if (!this.sock?.writable) return;
		try {
			this.sock.write(JSON.stringify(obj) + "\n");
		} catch {}
	}

	private publish(topic: string, payload: unknown): void {
		this.send({ cmd: "publish", topic, payload: JSON.stringify(payload) });
	}

	private subscribe(topic: string): void {
		this.send({ cmd: "subscribe", topic });
	}

	private onData(chunk: Buffer): void {
		this.lineBuf += chunk.toString();
		let nl: number;
		while ((nl = this.lineBuf.indexOf("\n")) !== -1) {
			const line = this.lineBuf.slice(0, nl).trim();
			this.lineBuf = this.lineBuf.slice(nl + 1);
			if (!line) continue;
			try {
				this.handleEvent(JSON.parse(line));
			} catch {}
		}
	}

	private handleEvent(ev: Record<string, unknown>): void {
		switch (ev.ev) {
			case "ready": {
				this.clientId = (ev.client_id as string) ?? "";
				if (!this.clientId) {
					console.warn("[mesh] sidecar reported empty client_id");
					return;
				}
				// Inbound: durable-id topic (post-v1a routing) + per-connection clientId topic
				// + the shared channel + peer announcements.
				this.subscribe(`pi/mesh/session/${this.opts.meshId}`);
				this.subscribe(`pi/mesh/session/${this.clientId}`);
				this.subscribe(`pi/mesh/channel/${this.opts.channel}`);
				this.subscribe("pi/mesh/announce/**");
				this.announce();
				if (this.announceTimer) clearInterval(this.announceTimer);
				this.announceTimer = setInterval(() => this.announce(), 30_000);
				console.log(
					`[mesh] ready — "${this.opts.nickname}" durable=${this.opts.meshId} clientId=${this.clientId}`,
				);
				this.emit("ready");
				break;
			}
			case "msg":
				this.handleMsg(ev.topic as string, ev.payload as string);
				break;
			case "error":
				console.warn("[mesh sidecar]", ev.msg);
				break;
		}
	}

	private handleMsg(topic: string, payloadStr: string): void {
		let msg: unknown;
		try {
			msg = JSON.parse(payloadStr);
		} catch {
			return;
		}

		if (topic.startsWith("pi/mesh/announce/")) {
			const ann = msg as AnnouncePayload;
			if (ann.clientId && ann.clientId !== this.clientId) {
				this.peers.set(ann.clientId, {
					id: ann.clientId,
					sessionId: ann.sessionId,
					name: ann.name,
					nickname: ann.nickname,
					hostname: ann.hostname,
					cwd: ann.cwd,
					lastSeen: Date.now(),
					meshId: ann.meshId,
				} as PeerInfo);
			}
			return;
		}

		if (topic.startsWith("pi/mesh/channel/")) {
			const cm = msg as ChannelMessage;
			if (cm.from === this.clientId) return; // ignore our own
			this.emit("channel", {
				fromClientId: cm.from,
				nickname: this.nick(cm.from),
				channel: cm.channel,
				text: this.display(cm.payload),
			} satisfies InboundChannel);
			return;
		}

		if (topic.startsWith("pi/mesh/session/")) {
			const m = msg as MeshMessage;
			if (isMeshTellAckEnvelope(m.payload)) return; // acks are not user messages
			// Inbound tells arrive wrapped in a mesh:tell envelope — unwrap first.
			const { message, deliveryId, ackRequested, originalFrom } = unwrapInboundTell(m);
			const fromClientId = originalFrom ?? message.from ?? m.from;
			if (fromClientId === this.clientId) return;
			const peer = this.peers.get(fromClientId);
			// Honest ack: the sender's mesh.tell receipt resolves to "delivered".
			if (deliveryId && ackRequested) {
				// The ack must be wrapped in a MeshMessage envelope (mirrors
				// PiMesh.sendTellReceipt) so the sender's inbound handler recognises
				// msg.payload as a mesh:tell:ack and resolves its delivery receipt.
				const ackEnvelope: MeshMessage = {
					from: this.clientId,
					topic: `session/${fromClientId}`,
					payload: buildTellReceiptAck(deliveryId, this.clientId, "delivered"),
					timestamp: Date.now(),
				};
				this.publish(`pi/mesh/session/${fromClientId}`, ackEnvelope);
			}
			this.emit("tell", {
				fromClientId,
				fromMeshId: peer?.meshId,
				nickname: peer?.nickname ?? fromClientId.slice(0, 8),
				text: this.display(message.payload),
				attachment: this.attachmentOf(message.payload),
				deliveryId,
			} satisfies InboundTell);
			return;
		}
	}

	/** Direct mesh tell to a specific agent — durable-id routed when known. */
	tellAgent(target: ReplyTarget, text: string): void {
		const route = target.meshId ?? target.clientId;
		const tellEnvelope: MeshTellEnvelope = {
			kind: "mesh:tell",
			deliveryId: createDeliveryId(),
			from: this.clientId,
			payload: { text, from: this.opts.nickname },
			timestamp: Date.now(),
		};
		const envelope: MeshMessage = {
			from: this.clientId,
			topic: `session/${route}`,
			payload: tellEnvelope,
			timestamp: Date.now(),
		};
		this.publish(`pi/mesh/session/${route}`, envelope);
	}

	/** Broadcast to the shared channel — the hooman's plain (non-reply) message. */
	broadcast(text: string): void {
		const cm: ChannelMessage = {
			from: this.clientId,
			channel: this.opts.channel,
			payload: { text, from: this.opts.nickname },
			timestamp: Date.now(),
		};
		this.publish(`pi/mesh/channel/${this.opts.channel}`, cm);
	}

	private announce(): void {
		const ann: AnnouncePayload = {
			clientId: this.clientId,
			sessionId: this.opts.sessionId ?? this.opts.meshId,
			name: this.opts.nickname,
			hostname: hostname(),
			pid: process.pid,
			cwd: process.cwd(),
			nickname: this.opts.nickname,
			meshId: this.opts.meshId,
			claimedAt: 0, // fixed + lowest ⇒ we always keep the "The Hooman" nickname (stable identity)
		};
		this.publish(`pi/mesh/announce/${this.clientId}`, ann);
	}

	private nick(clientId: string): string {
		return this.peers.get(clientId)?.nickname ?? clientId.slice(0, 8);
	}

	private attachmentOf(payload: unknown): string | undefined {
		if (payload && typeof payload === "object") {
			const p = payload as Record<string, unknown>;
			const a = p.attachment ?? p.image ?? p.file ?? p.path;
			if (typeof a === "string" && a.trim()) return a.trim();
		}
		return undefined;
	}

	private display(payload: unknown): string {
		if (typeof payload === "string") return payload;
		if (payload && typeof payload === "object") {
			const p = payload as Record<string, unknown>;
			if (typeof p.text === "string") return p.text;
			if (typeof p.body === "string") return (p.subject ? `${p.subject}\n` : "") + p.body;
			if (typeof p.message === "string") return p.message;
		}
		try {
			return JSON.stringify(payload);
		} catch {
			return String(payload);
		}
	}
}