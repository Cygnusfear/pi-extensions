import type {
	LeaderAckPayload,
	TeamEnvelope,
	TeamEnvelopeType,
	WorkerCommentPayload,
	WorkerFinishPayload,
	WorkerHelloPayload,
	WorkerRuntimeEnvelope,
} from "./protocol.ts";

export function createWorkerEnvelope<TPayload>(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	type: TeamEnvelopeType;
	payload: TPayload;
	correlationId?: string;
	requiresAck?: boolean;
	meshId?: string;
}): TeamEnvelope<TPayload> {
	return {
		version: 1,
		teamId: input.teamId,
		leaderEpoch: input.leaderEpoch,
		workerId: input.workerId,
		attemptId: input.attemptId,
		from: "worker",
		to: "leader",
		seq: input.seq,
		type: input.type,
		sentAt: Date.now(),
		payload: input.payload,
		...(input.correlationId ? { correlationId: input.correlationId } : {}),
		...(input.requiresAck !== undefined ? { requiresAck: input.requiresAck } : {}),
		...(input.meshId ? { meshId: input.meshId } : {}),
	};
}

export function createLeaderEnvelope<TPayload>(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	type: TeamEnvelopeType;
	payload: TPayload;
	correlationId?: string;
}): TeamEnvelope<TPayload> {
	return {
		version: 1,
		teamId: input.teamId,
		leaderEpoch: input.leaderEpoch,
		workerId: input.workerId,
		attemptId: input.attemptId,
		from: "leader",
		to: "worker",
		seq: input.seq,
		type: input.type,
		sentAt: Date.now(),
		payload: input.payload,
		...(input.correlationId ? { correlationId: input.correlationId } : {}),
	};
}

export function createWorkerHelloEnvelope(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	runtime: WorkerRuntimeEnvelope;
	meshId?: string;
}): TeamEnvelope<WorkerHelloPayload> {
	return createWorkerEnvelope({ ...input, type: "worker.hello", payload: { runtime: input.runtime }, requiresAck: true });
}

export function createWorkerCommentEnvelope(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	text: string;
	meshId?: string;
}): TeamEnvelope<WorkerCommentPayload> {
	return createWorkerEnvelope({ ...input, type: "worker.comment", payload: { text: input.text } });
}

export function createWorkerFinishEnvelope(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	status: "done" | "quit";
	summary: string;
	eventId: string;
	meshId?: string;
}): TeamEnvelope<WorkerFinishPayload> {
	return createWorkerEnvelope({
		...input,
		type: "worker.finish",
		payload: { status: input.status, summary: input.summary, eventId: input.eventId },
		correlationId: input.eventId,
		requiresAck: true,
	});
}

export function createLeaderPersistedAckEnvelope(input: {
	teamId: string;
	leaderEpoch: string;
	workerId: string;
	attemptId: string;
	seq: number;
	eventId: string;
}): TeamEnvelope<LeaderAckPayload> {
	return createLeaderEnvelope({
		...input,
		type: "leader.ack",
		correlationId: input.eventId,
		payload: { eventId: input.eventId, phase: "persisted" },
	});
}
