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
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULT_SURFACED_DELIVERY_LIMIT = 500;

/**
 * Where a session keeps its surfaced ids between runs.
 *
 * Keyed by DURABLE id on purpose: the client id changes on every reconnect, so a
 * client-id keyed file would look empty exactly when it matters - the restart that
 * triggers the replay.
 */
export function surfacedDeliveryPath(durableId: string): string {
	return join(homedir(), ".pi", "mesh", `surfaced-${durableId}.json`);
}

/**
 * Say it once per distinct message. A failing guard retries every delivery, and a
 * wall of identical warnings would hide the very failure it reports.
 */
const warned = new Set<string>();
function warnOnce(message: string): void {
	if (warned.has(message)) return;
	warned.add(message);
	console.warn(`[pi-mesh] surfaced-delivery guard: ${message}`);
}

export interface SurfacedDeliveryGuard {
	/** True when this delivery was already surfaced, so it must not be shown again. */
	has(deliveryId: string): boolean;
	/** Record a delivery as surfaced, evicting the oldest entry beyond the limit. */
	remember(deliveryId: string): void;
	size(): number;
}

export interface SurfacedGuardOptions {
	limit?: number;
	/** Resolved lazily: identity is not known when the extension is set up. */
	path?: () => string | undefined;
}

export function createSurfacedDeliveryGuard(
	limitOrOptions: number | SurfacedGuardOptions = DEFAULT_SURFACED_DELIVERY_LIMIT,
): SurfacedDeliveryGuard {
	const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
	const limit = options.limit ?? DEFAULT_SURFACED_DELIVERY_LIMIT;
	const ids = new Set<string>();
	let loaded = false;

	const load = (): void => {
		if (loaded) return;
		loaded = true;
		try {
			const path = options.path?.();
			if (!path || !existsSync(path)) return;
			const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
			if (!Array.isArray(parsed)) return;
			for (const id of parsed) if (typeof id === "string" && id) ids.add(id);
		} catch (error) {
			// An unreadable history costs duplicate suppression, never correctness - but a
			// guard that fails QUIETLY is how you report success into a void, so say it.
			warnOnce(`could not read surfaced-delivery history: ${(error as Error)?.message ?? error}`);
		}
	};

	const save = (): void => {
		try {
			const path = options.path?.();
			if (!path) return;
			mkdirSync(dirname(path), { recursive: true });
			const temporaryPath = `${path}.tmp.${process.pid}`;
			writeFileSync(temporaryPath, JSON.stringify([...ids]), { encoding: "utf8", mode: 0o600 });
			renameSync(temporaryPath, path);
		} catch (error) {
			// Not fatal (an in-memory guard still suppresses within this run) but never
			// silent: a persistence failure is exactly what makes cross-restart
			// duplicates look random.
			warnOnce(`could not persist surfaced-delivery history: ${(error as Error)?.message ?? error}`);
		}
	};

	return {
		has(deliveryId: string): boolean {
			load();
			return ids.has(deliveryId);
		},
		remember(deliveryId: string): void {
			load();
			ids.add(deliveryId);
			while (ids.size > limit) {
				const oldest = ids.values().next().value;
				if (oldest === undefined) break;
				ids.delete(oldest);
			}
			save();
		},
		size(): number {
			load();
			return ids.size;
		},
	};
}
