/**
 * Shared types for pi-mesh extension.
 */

export interface PeerInfo {
	id: string; // Zenoh peer ID
	sessionId?: string; // pi session ID
	name?: string; // session title (e.g. "Fix crashing session")
	hostname?: string;
	nickname?: string;
	cwd?: string;
	lastSeen: number; // unix ms
	claimedAt?: number; // unix ms — distributed tie-breaker for nickname conflicts
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

export type MeshTellReceiptPhase = "delivered" | "visible";

export interface MeshTellEnvelope {
	kind: "mesh:tell";
	deliveryId: string;
	from: string;
	ackRequested?: MeshTellReceiptPhase;
	payload: unknown;
	timestamp: number;
}

export interface MeshTellAckEnvelope {
	kind: "mesh:tell:ack";
	deliveryId: string;
	from: string;
	phase: MeshTellReceiptPhase;
	timestamp: number;
}

export interface MeshAskReceiptEnvelope {
	kind: "mesh:ask:receipt";
	askId: string;
	from: string;
	phase: "delivered" | "visible";
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
}

/** Emitted on the "request" event when another session calls ask() on this session. */
export interface RequestEvent {
	requestId: number;
	from: PeerInfo;
	payload: unknown;
	askId?: string;
	askReceiptRequested?: "delivered" | "visible";
	/** Call reply() to send a response back to the caller. Can only be called once. */
	reply: (response: unknown) => void;
}

/** Emitted on the "channel" event when a message arrives on a joined channel. */
export interface ChannelMessage {
	from: string; // sender session ID
	channel: string; // channel ID
	payload: unknown;
	timestamp: number;
}
