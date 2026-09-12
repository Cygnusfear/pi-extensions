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
	MeshTellReceiptPhase,
	MeshTellReceiptWaitForPhase,
} from "@pi-extensions/pi-mesh/types";
import { displayPayload, projectAgentPayload } from "./format.ts";

const DEFAULT_SOCK = join(process.env.HOME ?? "/tmp", ".pi", "mesh.sock");

export interface InboundTell {
	fromClientId: string;
	fromMeshId?: string;
	nickname: string;
	text: string;
	attachment?: string;
	reaction?: string;
	/** Agent-authored speech text with fish.audio expression tags — preferred over text for synthesis. */
	voice?: string;
	sessionName?: string;
	/** present ⇒ the sender asked for a delivery receipt; we ack it */
	deliveryId?: string;
	/** Phase the sender is waiting for; the ACK phase is decided after routing. */
	ackRequested?: MeshTellReceiptWaitForPhase;
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
				this.emit("peer", { meshId: ann.meshId, clientId: ann.clientId, nickname: ann.nickname, name: ann.name });
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
			// A peer may identify itself by its DURABLE mesh id rather than the
			// per-connection client id (pi-mesh does). The peer map is keyed by client id,
			// so a durable-id sender used to miss the lookup, be treated as an
			// "unannounced client", wait out the topic timeout and have its tell DROPPED -
			// while the sender was told 'delivered'. Fall back to matching the durable id.
			const peer = this.peers.get(fromClientId)
				?? [...this.peers.values()].find((p) => p.meshId === fromClientId);
			// The receipt is NOT sent here. Acking on receipt told the sender
			// "delivered" before the bridge had decided whether it could route the tell
			// at all - so a dropped message looked successful. The bridge acks via
			// ackTell() once it knows: delivered when posted, undeliverable when not.
			const projectedPayload = projectAgentPayload(message.payload);
			this.emit("tell", {
				fromClientId,
				fromMeshId: peer?.meshId,
				nickname: peer?.nickname ?? fromClientId.slice(0, 8),
				...projectedPayload,
				sessionName: peer?.name,
				deliveryId,
				ackRequested,
			} satisfies InboundTell);
			return;
		}
	}

	/**
	 * Publish a tell receipt to the sender. Called by the bridge AFTER it knows whether
	 * the tell could be delivered: an ack sent on receipt claims success for a message
	 * that may then be dropped, which is exactly the silent failure this replaces.
	 *
	 * The envelope must be wrapped in a MeshMessage (mirrors PiMesh.sendTellReceipt) so
	 * the sender's inbound handler recognises it as mesh:tell:ack and resolves its wait.
	 */
	ackTell(
		senderId: string,
		deliveryId: string,
		phase: MeshTellReceiptPhase,
		extras?: { receiverBusy?: boolean; receiverDeafened?: boolean },
	): void {
		const ackEnvelope: MeshMessage = {
			from: this.clientId,
			topic: `session/${senderId}`,
			payload: buildTellReceiptAck(deliveryId, this.clientId, phase, extras),
			timestamp: Date.now(),
		};
		this.publish(`pi/mesh/session/${senderId}`, ackEnvelope);
	}

	/** Direct mesh tell to a specific agent — durable-id routed when known. */
	tellAgent(target: ReplyTarget, text: string): void {
		this.sendTellPayload(target, { text, from: this.opts.nickname });
	}

	/** Control-plane tell — the inner payload is a harness command (e.g. setModel)
	 *  that pi-mesh routes to a handler instead of the LLM. See mesh-model-control. */
	tellAgentControl(target: ReplyTarget, payload: Record<string, unknown>): void {
		this.sendTellPayload(target, payload);
	}

	/**
	 * Every tell this bridge sends is the hooman speaking, so it goes out as an
	 * interrupt at the ABORT level (pi-mesh: action "preempt-abort",
	 * abortFirst=agentBusy, deliverAs "followUp", triggerTurn).
	 *
	 * abort is deliberate, not an oversight: the hooman wants to be able to STOP a
	 * running agent, so the receiver cancels its in-flight operation before the
	 * message lands. That cost is real - a build, a test run or a git commit can be
	 * cut off mid-flight - and it is a choice the hooman owns. pi-mesh aborts only
	 * when the receiver is actually busy, and /mesh deafen still protects a receiver
	 * that explicitly opted out.
	 *
	 * Control-plane tells route to a handler before pi-mesh consults the plan, so
	 * stamping them costs nothing and keeps one choke point instead of two.
	 */
	private sendTellPayload(target: ReplyTarget, payload: Record<string, unknown>): void {
		const route = target.meshId ?? target.clientId;
		const tellEnvelope: MeshTellEnvelope = {
			kind: "mesh:tell",
			deliveryId: createDeliveryId(),
			from: this.clientId,
			preempt: "abort",
			payload,
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

	private display(payload: unknown): string {
		return displayPayload(payload);
	}
}
