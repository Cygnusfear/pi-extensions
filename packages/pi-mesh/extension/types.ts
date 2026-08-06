/**
 * Shared types for pi-mesh extension.
 */

import type { SessionViewEntry } from "../../shared/src/session-view.ts";

export interface PeerInfo {
	id: string; // Zenoh peer ID
	sessionId?: string; // pi session ID
	name?: string; // session title (e.g. "Fix crashing session")
	hostname?: string;
	nickname?: string;
	cwd?: string;
	lastSeen: number; // unix ms
	claimedAt?: number; // unix ms — distributed tie-breaker for nickname conflicts
	meshId?: string; // stable mesh identity (decoupled from sidecar clientId)
	zmxSession?: string; // explicit zmx session coordinate, when the peer runs inside zmx
}

export interface MeshConfig {
	mode?: "peer" | "client" | "router";
	endpoints?: string[]; // Tailscale IPs for cross-machine
	scouting?: boolean; // mDNS (default: true)
	announceIntervalMs?: number;
}

export interface MeshMessage {
	from: string;
	topic: string;
	payload: unknown;
	timestamp: number;
}

export type MeshTellReceiptPhase = "delivered" | "surfaced" | "refused" | "undeliverable" | "expired";
/** Compatibility input: old callers may still request "visible"; it is normalized to "surfaced". */
export type MeshTellReceiptWaitForPhase = MeshTellReceiptPhase | "visible";

/**
 * Preempt level for a tell that should jump the receiver's queue.
 * - "steer": message lands after the receiver's current tool batch finishes,
 *   before its next LLM call. Does NOT kill in-flight work. The safe default
 *   for "wait, not this" corrections.
 * - "abort": NUCLEAR. Cancels the receiver's in-flight tool/operation via the
 *   agent AbortSignal (a half-done git/publish/write can be left corrupt),
 *   then delivers the message and wakes a fresh turn. Use only when stopping
 *   the peer NOW prevents real damage.
 */
export type MeshTellPreemptLevel = "steer" | "abort";

/**
 * Tail snapshot of the receiver's session at the moment a tell landed.
 * Rides the existing tell-ack (no extra round-trip). Bounded to a small window
 * so it stays O(window), not O(session-length).
 */
export interface MeshTellAckView {
	entries: SessionViewEntry[];
	text: string;
	/** Count of meaningful entries within the projected TAIL (not the whole session).
	 *  Indices on entries are window-relative — the snapshot is "recent activity",
	 *  not an absolute branch coordinate (absolute position would cost O(session)). */
	total: number;
}

export interface MeshTellEnvelope {
	kind: "mesh:tell";
	deliveryId: string;
	from: string;
	ackRequested?: MeshTellReceiptWaitForPhase;
	/** When set, this tell preempts the receiver's queue at the given level. */
	preempt?: MeshTellPreemptLevel;
	payload: unknown;
	timestamp: number;
}

export interface MeshTellAckEnvelope {
	kind: "mesh:tell:ack";
	deliveryId: string;
	from: string;
	phase: MeshTellReceiptPhase;
	timestamp: number;
	/** Optional receipt metadata: was the receiver mid-turn when this landed?
	 *  Its absence is neutral and must not be used to infer peer version or delivery semantics. */
	receiverBusy?: boolean;
	/** True when the receiver has /mesh deafen on and dropped this message. */
	receiverDeafened?: boolean;
	/** Tail snapshot of what the receiver was doing when the message landed. */
	view?: MeshTellAckView;
	/** For a preempt='abort' interrupt: true iff the receiver actually invoked
	 *  ctx.abort() (i.e. it had a live session context). false means the abort was a
	 *  NO-OP (nothing was cancelled). Its absence is inconclusive; do not assume the
	 *  peer's work was stopped. */
	aborted?: boolean;
}

export type MeshAskReceiptWaitForPhase = "delivered" | "visible";
export type MeshAskReceiptPhase = MeshAskReceiptWaitForPhase | "busy";

export interface MeshAskReceiptEnvelope {
	kind: "mesh:ask:receipt";
	askId: string;
	from: string;
	phase: MeshAskReceiptPhase;
	timestamp: number;
}

export interface AnnouncePayload {
	clientId: string;  // unique per connection — the routing identity
	zid?: string;      // Zenoh peer ID — shared across clients on same machine, metadata only
	sessionId: string; // pi session ID — metadata, can change on resume/checkout
	name?: string;     // session title
	hostname: string;
	pid: number;
	cwd: string;
	nickname?: string;
	claimedAt?: number; // unix ms — tie-breaker for nickname conflicts
	meshId?: string;    // stable mesh identity (decoupled from sidecar clientId)
	zmxSession?: string; // explicit zmx session coordinate, omitted outside zmx
}

/** Emitted on the "request" event when another session calls ask() on this session. */
export interface RequestEvent {
	requestId: number;
	from: PeerInfo;
	payload: unknown;
	askId: string;
	askReceiptRequested?: MeshAskReceiptWaitForPhase;
	timeoutMs?: number;
}

/** Emitted on the "channel" event when a message arrives on a joined channel. */
export interface ChannelMessage {
	from: string; // sender session ID
	channel: string; // channel ID
	payload: unknown;
	timestamp: number;
}
