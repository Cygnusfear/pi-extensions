export type TeamId = string;
export type LeaderEpoch = string;
export type WorkerId = string;
export type AttemptId = string;
export type SequenceNumber = number;

export type MeshReceiptPhase = "sent" | "delivered" | "visible" | "handled";

export type WorkerSessionMode =
	| { kind: "fresh" }
	| { kind: "fork"; parentSessionFile: string; parentLeafId: string; sessionFile: string }
	| { kind: "resume"; sessionFile: string };

export interface WorkerRuntimeEnvelope {
	protocolVersion: 1;
	teamId: TeamId;
	leaderEpoch: LeaderEpoch;
	workerId: WorkerId;
	attemptId: AttemptId;
	coordinatorSessionId: string;
	channelId?: string;
	leasePath: string;
	sessionMode: WorkerSessionMode;
}

export type TeamEnvelopeType =
	| "worker.hello"
	| "worker.comment"
	| "worker.finish"
	| "worker.heartbeat"
	| "leader.ack"
	| "leader.cancel"
	| "leader.resume"
	| "leader.shutdown";

export interface TeamEnvelope<TPayload = unknown> {
	version: 1;
	teamId: TeamId;
	leaderEpoch: LeaderEpoch;
	workerId?: WorkerId;
	attemptId?: AttemptId;
	from: "leader" | "worker";
	to: "leader" | "worker";
	seq: SequenceNumber;
	type: TeamEnvelopeType;
	sentAt: number;
	correlationId?: string;
	requiresAck?: boolean;
	/** The sender's DURABLE mesh identity (mesh.self().id) — the stable routing
	 *  address, decoupled from the sidecar clientId. A worker declares this so the
	 *  leader binds handle->durableId and routes replies over the durable session
	 *  topic (survives clientId churn). Optional for back-compat with pre-v1a envelopes. */
	meshId?: string;
	payload: TPayload;
}

export interface WorkerHelloPayload {
	runtime: WorkerRuntimeEnvelope;
}

export interface WorkerCommentPayload {
	text: string;
}

export interface WorkerFinishPayload {
	status: "done" | "quit";
	summary: string;
}

export interface TeamReceipt {
	teamId: TeamId;
	leaderEpoch: LeaderEpoch;
	workerId?: WorkerId;
	attemptId?: AttemptId;
	correlationId: string;
	phase: MeshReceiptPhase;
	at: number;
}
