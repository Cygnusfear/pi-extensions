/**
 * Redelivery guard for inbound tells.
 *
 * A tell can arrive twice: a sender retries when its receipt does not resolve, and
 * the durable mailbox can redeliver across a revive. Rendering it twice shows the
 * human the same message again, carrying its original send time - observed live,
 * one tell, same deliveryId, 37 seconds apart.
 *
 * Bounded on purpose: this is a reason to suppress a duplicate RENDER, not a
 * ledger of everything ever received, so it keeps the most recent ids and forgets
 * the rest.
 */
export const DEFAULT_SURFACED_DELIVERY_LIMIT = 500;

export interface SurfacedDeliveryGuard {
	/** True when this delivery was already surfaced, so it must not be shown again. */
	has(deliveryId: string): boolean;
	/** Record a delivery as surfaced, evicting the oldest entry beyond the limit. */
	remember(deliveryId: string): void;
	size(): number;
}

export function createSurfacedDeliveryGuard(
	limit = DEFAULT_SURFACED_DELIVERY_LIMIT,
): SurfacedDeliveryGuard {
	const ids = new Set<string>();
	return {
		has(deliveryId: string): boolean {
			return ids.has(deliveryId);
		},
		remember(deliveryId: string): void {
			ids.add(deliveryId);
			while (ids.size > limit) {
				const oldest = ids.values().next().value;
				if (oldest === undefined) break;
				ids.delete(oldest);
			}
		},
		size(): number {
			return ids.size;
		},
	};
}
