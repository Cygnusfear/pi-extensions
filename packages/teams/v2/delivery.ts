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
	const eventIds: string[] = [];
	const bodies: string[] = [];
	let chars = 0;
	for (const event of projection.actionableEvents.values()) {
		if (delivered.has(event.eventId)) continue;
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
