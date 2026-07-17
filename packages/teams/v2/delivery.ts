import { randomUUID } from "node:crypto";
import type { LifecycleProjection } from "./state.ts";
import type { LifecycleAck } from "./state.ts";
import {
	branchAcknowledgedEventIds,
	type SessionEntryLike,
	type SessionFactWriter,
} from "./session-facts.ts";

export const MAX_EVENTS_PER_DELIVERY = 20;
export const MAX_DELIVERY_BODY_CHARS = 12_000;
const MARKER_PATTERN = /\[teams-event:([^\]\s]+)\]/g;

export interface DeliveryBatch {
	eventIds: string[];
	content: string;
}

export interface ProviderRequestObservation {
	ordinal: number;
	markers: Set<string>;
	status?: number;
	stopReason?: string;
}

export function extractEventMarkers(value: unknown): Set<string> {
	const found = new Set<string>();
	const seen = new WeakSet<object>();
	const visit = (candidate: unknown): void => {
		if (typeof candidate === "string") {
			for (const match of candidate.matchAll(MARKER_PATTERN)) if (match[1]) found.add(match[1]);
			return;
		}
		if (!candidate || typeof candidate !== "object") return;
		if (seen.has(candidate)) return;
		seen.add(candidate);
		if (Array.isArray(candidate)) {
			for (const item of candidate) visit(item);
			return;
		}
		for (const item of Object.values(candidate as Record<string, unknown>)) visit(item);
	};
	visit(value);
	return found;
}

/**
 * Whether the provider hook exposes the actual conversation payload. An opaque
 * adapter object must fall back to the immediately preceding context snapshot;
 * an exposed-but-empty message list must remain empty so stripped markers are
 * never falsely acknowledged.
 */
export function providerPayloadExposesConversation(value: unknown): boolean {
	if (typeof value === "string") return true;
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	for (const key of ["messages", "input", "contents", "prompt", "conversation", "turns"]) {
		if (Object.prototype.hasOwnProperty.call(record, key)) return true;
	}
	for (const key of ["body", "request", "data", "payload"]) {
		if (Object.prototype.hasOwnProperty.call(record, key) && providerPayloadExposesConversation(record[key])) return true;
	}
	return extractEventMarkers(value).size > 0;
}

function renderEvent(event: LifecycleProjection["actionableEvents"] extends Map<string, infer T> ? T : never): string {
	const header = `[teams-event:${event.eventId}] ${event.type} · ${event.name} · attempt ${event.attemptId}\n`;
	const available = Math.max(0, MAX_DELIVERY_BODY_CHARS - header.length);
	if (event.summary.length <= available) return `${header}${event.summary}`;
	if (available === 0) return header.slice(0, MAX_DELIVERY_BODY_CHARS);
	const suffix = "…";
	return `${header}${event.summary.slice(0, Math.max(0, available - suffix.length))}${suffix}`;
}

export function buildPendingDelivery(
	projection: LifecycleProjection,
	branch: readonly SessionEntryLike[],
): DeliveryBatch | null {
	const acknowledged = branchAcknowledgedEventIds(branch, projection.coordinatorSessionId);
	const eventIds: string[] = [];
	const bodies: string[] = [];
	let chars = 0;
	for (const event of projection.actionableEvents.values()) {
		if (acknowledged.has(event.eventId)) continue;
		const body = renderEvent(event);
		const separator = bodies.length === 0 ? 0 : 2;
		if (eventIds.length >= MAX_EVENTS_PER_DELIVERY) break;
		if (bodies.length > 0 && chars + separator + body.length > MAX_DELIVERY_BODY_CHARS) break;
		eventIds.push(event.eventId);
		bodies.push(body);
		chars += separator + body.length;
	}
	if (eventIds.length === 0) return null;
	return { eventIds, content: bodies.join("\n\n") };
}

/** Correlates one agent run's injected marker batch with provider request outcomes. */
export class ProviderDeliveryTracker {
	private runId = randomUUID();
	private ordinal = 0;
	private contextMarkers = new Set<string>();
	private requests: ProviderRequestObservation[] = [];
	private deliveredBatch = new Set<string>();
	private aborted = false;

	beginRun(runId = randomUUID()): string {
		this.runId = runId;
		this.ordinal = 0;
		this.contextMarkers = new Set();
		this.requests = [];
		this.deliveredBatch = new Set();
		this.aborted = false;
		return runId;
	}

	setDeliveredBatch(eventIds: readonly string[]): void {
		this.deliveredBatch = new Set(eventIds);
	}

	observeContext(messages: unknown): void {
		this.contextMarkers = extractEventMarkers(messages);
	}

	beforeProviderRequest(payload: unknown, payloadExposed?: boolean): number {
		const payloadMarkers = extractEventMarkers(payload);
		const exposed = payloadExposed ?? providerPayloadExposesConversation(payload);
		const markers = exposed ? payloadMarkers : new Set(this.contextMarkers);
		const ordinal = ++this.ordinal;
		this.requests.push({ ordinal, markers });
		return ordinal;
	}

	afterProviderResponse(status: number): void {
		const request = this.requests.at(-1);
		if (request) request.status = status;
	}

	messageEnd(message: unknown): void {
		if (!message || typeof message !== "object") return;
		const assistant = message as { role?: unknown; stopReason?: unknown };
		if (assistant.role !== "assistant" || typeof assistant.stopReason !== "string") return;
		const request = [...this.requests].reverse().find((candidate) => candidate.stopReason === undefined);
		if (request) request.stopReason = assistant.stopReason;
		if (assistant.stopReason === "aborted") this.aborted = true;
	}

	markAborted(): void { this.aborted = true; }

	acknowledgeSuccessfulDelivery(writer: SessionFactWriter, acknowledgedAt = Date.now()): string[] {
		if (this.aborted) return [];
		// Only the final provider request can be paired with the terminal assistant
		// message for this run. An earlier successful tool-use request must not
		// acknowledge delivery when a later request fails or never completes.
		const terminal = this.requests.at(-1);
		if (
			!terminal
			|| terminal.status === undefined
			|| terminal.status < 200
			|| terminal.status >= 300
			|| terminal.stopReason === undefined
			|| terminal.stopReason === "error"
			|| terminal.stopReason === "aborted"
		) return [];
		const acknowledged = [...this.deliveredBatch].filter((eventId) => terminal.markers.has(eventId));
		for (const eventId of acknowledged) {
			const ack: LifecycleAck = {
				schemaVersion: 1,
				coordinatorSessionId: writer.coordinatorSessionId,
				eventId,
				runId: this.runId,
				acknowledgedAt,
			};
			writer.appendAck(ack);
		}
		return acknowledged;
	}

	observations(): readonly ProviderRequestObservation[] { return this.requests; }
}
