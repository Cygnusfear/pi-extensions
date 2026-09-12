import { type MeshIcons, formatSentSuffix } from "./inbound-format.ts";

export interface PendingAskQueueItem {
	requestId: number;
	senderLabel: string;
	payloadText: string;
	expiresAt: number;
}

export function splitExpiredPendingAsks<T extends { expiresAt: number }>(
	pending: T[],
	now = Date.now(),
): { active: T[]; expired: T[] } {
	const active: T[] = [];
	const expired: T[] = [];
	for (const item of pending) {
		if (item.expiresAt <= now) expired.push(item);
		else active.push(item);
	}
	return { active, expired };
}

export function buildPendingAskBatchContent(
	batch: Array<Pick<PendingAskQueueItem, "requestId" | "senderLabel" | "payloadText"> & { sentAt?: number }>,
	icons: MeshIcons,
): string {
	const header = batch.length === 1
		? "1 direct mesh-ask was queued while you were busy."
		: `${batch.length} direct mesh-asks were queued while you were busy.`;
	return [
		header,
		"These asks are waiting for a reply via mesh_tell.",
		"",
		...batch.map(
			({ requestId, senderLabel, payloadText, sentAt }, idx) =>
				`${idx + 1}. #${requestId} ${senderLabel} asks${formatSentSuffix(icons.sep, sentAt)}\n${payloadText}`,
		),
	].join("\n");
}
