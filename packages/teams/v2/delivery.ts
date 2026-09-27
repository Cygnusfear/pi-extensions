import type { LifecycleProjection } from "./state.ts";
import {
	branchAcknowledgedEventIds,
	deliveredTeamEventIds,
	type SessionEntryLike,
} from "./session-facts.ts";

export const MAX_EVENTS_PER_DELIVERY = 20;
export const MAX_DELIVERY_BODY_CHARS = 12_000;

export interface DeliveryBatch {
	eventIds: string[];
	content: string;
}

function renderEvent(event: LifecycleProjection["actionableEvents"] extends Map<string, infer T> ? T : never): string {
	const header = `[teams-event:${event.eventId}] ${event.type} · ${event.name} · attempt ${event.attemptId}\n`;
	const available = Math.max(0, MAX_DELIVERY_BODY_CHARS - header.length);
	if (event.summary.length <= available) return `${header}${event.summary}`;
	if (available === 0) return header.slice(0, MAX_DELIVERY_BODY_CHARS);
	const suffix = "…";
	return `${header}${event.summary.slice(0, Math.max(0, available - suffix.length))}${suffix}`;
}

/**
 * Assessment events a recovered declaration has already superseded.
 * A provisional "missing finish" assessment is a provisional claim made from a
 * process exit; when the worker's declaration is recovered afterwards, that
 * claim is known to be wrong. It stays in the fact history as the superseded
 * record, but it must never be delivered as the worker's outcome — otherwise a
 * worker that declared a completed verdict is reported to the coordinator as
 * having produced nothing.
 */
function supersededAssessmentEventIds(projection: LifecycleProjection): Set<string> {
	const superseded = new Set<string>();
	for (const attempt of projection.attempts.values()) {
		if (!attempt.declaration || !attempt.assessment?.provisional) continue;
		superseded.add(attempt.assessment.eventId);
	}
	return superseded;
}

/**
 * Delivery truth is the session file itself. A lifecycle event is delivered
 * once a `team-event` custom message carrying its eventId in
 * `details.eventIds` has been persisted into the coordinator session. That
 * persisted message participates in LLM context permanently, so the model
 * sees it on the turn it lands or on any later turn — including provider
 * retry turns after a 429/error. No provider-transport correlation exists;
 * if the message never persisted (turn aborted before injection), the event
 * simply stays pending and is redelivered.
 *
 * Legacy `teams-lifecycle-ack-v1` entries written by the retired
 * provider-correlation design are still honored on read so old sessions keep
 * their history.
 */
export function buildPendingDelivery(
	projection: LifecycleProjection,
	entries: readonly SessionEntryLike[],
): DeliveryBatch | null {
	const delivered = deliveredTeamEventIds(entries);
	for (const legacy of branchAcknowledgedEventIds(entries, projection.coordinatorSessionId)) delivered.add(legacy);
	const superseded = supersededAssessmentEventIds(projection);
	const eventIds: string[] = [];
	const bodies: string[] = [];
	let chars = 0;
	for (const event of projection.actionableEvents.values()) {
		if (delivered.has(event.eventId)) continue;
		if (superseded.has(event.eventId)) continue;
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
