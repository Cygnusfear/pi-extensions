/**
 * Redelivery guard for inbound tells.
 *
 * A tell can arrive twice: a sender retries when its receipt does not resolve, and
 * the durable mailbox can redeliver across a revive. Rendering it twice shows the
 * human the same message again, carrying its original send time - observed live,
 * one tell, same deliveryId, 37 seconds apart.
 *
 * Two keys per tell (pe-hbdmvoav):
 *   - the deliveryId, the contract's idempotency key (pe-jimphzxj);
 *   - a CONTENT key: sender id + the tell's send timestamp + a hash of its payload.
 * The content key exists because one logical tell has been MEASURED on satsang under
 * four deliveryIds, all minted in the same millisecond (mesh-tell-1790528423113-*):
 * a sender loop over a roster that listed the receiver more than once (pe-rp4pdsnq)
 * mints one id per entry, so an id-only guard can never collapse them. The timestamp
 * is part of the key on purpose: two genuinely different tells with the same text are
 * sent at different times and must both surface.
 *
 * Bounded on purpose: this is a reason to suppress a duplicate RENDER, not a
 * ledger of everything ever received, so it keeps the most recent keys and forgets
 * the rest.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Keys kept (a tell costs up to two: its id and its content key). */
export const DEFAULT_SURFACED_DELIVERY_LIMIT = 1000;

const CONTENT_KEY_PREFIX = "content:";

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

/** The payload as one canonical string: strings as-is, anything else as JSON. */
function canonicalPayload(payload: unknown): string {
	if (typeof payload === "string") return payload;
	try {
		return JSON.stringify(payload ?? null) ?? "null";
	} catch {
		return String(payload);
	}
}

/**
 * The content key of one logical tell, or undefined when there is not enough to
 * build a trustworthy one (no sender, or no numeric send time). Without a timestamp
 * the key would collapse two different tells that merely share their text, so it is
 * better to have no content key than a wrong one.
 */
export function tellContentKey(input: {
	from: string | undefined;
	sentAt: number | undefined;
	payload: unknown;
}): string | undefined {
	if (!input.from || typeof input.sentAt !== "number" || !Number.isFinite(input.sentAt)) return undefined;
	const hash = createHash("sha256").update(canonicalPayload(input.payload)).digest("hex").slice(0, 32);
	return `${CONTENT_KEY_PREFIX}${input.from}:${input.sentAt}:${hash}`;
}

export interface SurfaceKeys {
	deliveryId?: string;
	contentKey?: string;
}

export interface ClaimResult {
	/** True when this tell has not been surfaced before and must be surfaced now. */
	fresh: boolean;
	/**
	 * True when the decision reached disk before this call returned. False means the
	 * guard is degraded (reported through onError): the decision holds for this run
	 * only, and a restart could surface the tell again.
	 */
	persisted: boolean;
}

export interface SurfacedDeliveryGuard {
	/** True when this delivery was already surfaced, so it must not be shown again. */
	has(deliveryId: string): boolean;
	/** Record a delivery as surfaced, evicting the oldest entry beyond the limit. */
	remember(deliveryId: string): void;
	/**
	 * The one call a surface path makes: decide whether the tell is fresh and, when it
	 * is, record BOTH keys durably BEFORE returning. The caller surfaces only after
	 * this returns fresh, so a crash between the decision and the render loses at most
	 * a render, never replays one.
	 */
	claim(keys: SurfaceKeys): ClaimResult;
	size(): number;
	/** True while the history could not be read or written (the guard is degraded). */
	degraded(): boolean;
}

export interface SurfacedGuardOptions {
	limit?: number;
	/** Resolved lazily: identity is not known when the extension is set up. */
	path?: () => string | undefined;
	/**
	 * Told about EVERY read or write failure, not once per distinct message: a guard
	 * that cannot persist is exactly the state that duplicates messages across a
	 * restart, so each occurrence is reported. Defaults to console.error.
	 */
	onError?: (message: string) => void;
}

export function createSurfacedDeliveryGuard(
	limitOrOptions: number | SurfacedGuardOptions = DEFAULT_SURFACED_DELIVERY_LIMIT,
): SurfacedDeliveryGuard {
	const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
	const limit = options.limit ?? DEFAULT_SURFACED_DELIVERY_LIMIT;
	const report = (message: string): void => {
		const line = `[pi-mesh] surfaced-delivery guard: ${message}`;
		try {
			(options.onError ?? ((m: string) => console.error(m)))(line);
		} catch {
			console.error(line);
		}
	};
	const keys = new Set<string>();
	// Only true once the on-disk history has been merged in (or found absent). It is
	// NOT latched when the path is unknown or the read fails: the previous version
	// set it on the first call, so a guard first consulted before the durable id was
	// known never loaded its history for the rest of the run.
	let loaded = false;
	let readFailed = false;
	let writeFailed = false;

	const add = (key: string): void => {
		keys.delete(key); // re-insert so a re-seen key counts as recent
		keys.add(key);
		while (keys.size > limit) {
			const oldest = keys.values().next().value;
			if (oldest === undefined) break;
			keys.delete(oldest);
		}
	};

	const load = (): void => {
		if (loaded) return;
		const path = options.path?.();
		if (!path) return; // identity not known yet: stay in memory, load later
		if (!existsSync(path)) {
			loaded = true;
			readFailed = false;
			return;
		}
		let raw: string;
		try {
			raw = readFileSync(path, "utf8");
		} catch (error) {
			// A transient I/O failure (EACCES, EIO, EMFILE). Do not latch and do not
			// overwrite: the history may be readable on the next call, and a save now
			// would replace it with this run's keys only.
			readFailed = true;
			report(`could not read surfaced-delivery history at ${path}: ${(error as Error)?.message ?? error} - will retry; not overwriting it`);
			return;
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			parsed = error;
		}
		if (!Array.isArray(parsed)) {
			// Corrupt for good: retrying cannot help, and refusing to write would leave the
			// guard degraded for the rest of the run. Keep the evidence beside it and start
			// a valid file on the next save.
			const aside = `${path}.corrupt-${Date.now()}`;
			try {
				renameSync(path, aside);
				report(`surfaced-delivery history at ${path} was not a JSON array; moved it to ${aside} and started a new one`);
			} catch (error) {
				report(`surfaced-delivery history at ${path} is corrupt and could not be moved aside: ${(error as Error)?.message ?? error}`);
			}
			loaded = true;
			readFailed = false;
			return;
		}
		// History first, then anything this run recorded before it could load.
		const recordedBeforeLoad = [...keys];
		keys.clear();
		for (const key of parsed) if (typeof key === "string" && key) add(key);
		for (const key of recordedBeforeLoad) add(key);
		loaded = true;
		readFailed = false;
	};

	/** Returns true when the current keys are on disk. */
	const save = (): boolean => {
		const path = options.path?.();
		if (!path) return false; // no identity yet: nothing durable to write to
		if (!loaded) {
			// The history exists but could not be read: writing now would destroy it.
			report(`not persisting to ${path}: its history could not be read, and a write would replace it`);
			return false;
		}
		try {
			mkdirSync(dirname(path), { recursive: true });
			const temporaryPath = `${path}.tmp.${process.pid}`;
			writeFileSync(temporaryPath, JSON.stringify([...keys]), { encoding: "utf8", mode: 0o600 });
			renameSync(temporaryPath, path);
			if (writeFailed) report(`persisting to ${path} works again`);
			writeFailed = false;
			return true;
		} catch (error) {
			writeFailed = true;
			report(`could not persist surfaced-delivery history to ${path}: ${(error as Error)?.message ?? error} - this run still suppresses duplicates in memory, but a restart could surface them again`);
			return false;
		}
	};

	const seen = (surface: SurfaceKeys): boolean =>
		(!!surface.deliveryId && keys.has(surface.deliveryId))
		|| (!!surface.contentKey && keys.has(surface.contentKey));

	return {
		has(deliveryId: string): boolean {
			load();
			return keys.has(deliveryId);
		},
		remember(deliveryId: string): void {
			load();
			add(deliveryId);
			save();
		},
		claim(surface: SurfaceKeys): ClaimResult {
			load();
			if (seen(surface)) {
				// Learn a re-minted id too, so its next redelivery is matched by id alone -
				// only in memory; it is not worth a write.
				if (surface.deliveryId && !keys.has(surface.deliveryId)) add(surface.deliveryId);
				return { fresh: false, persisted: true };
			}
			if (surface.deliveryId) add(surface.deliveryId);
			if (surface.contentKey) add(surface.contentKey);
			// FAIL-SAFE CHOICE: when the write fails we still report fresh, so the caller
			// still surfaces. The contract is at-least-once: a tell that is never shown is
			// a silent drop, which is worse than a duplicate after a restart. The decision
			// is kept in memory (no duplicate within this run) and the failure is reported
			// loudly on every occurrence instead of once.
			const persisted = save();
			return { fresh: true, persisted };
		},
		size(): number {
			load();
			return keys.size;
		},
		degraded(): boolean {
			return readFailed || writeFailed;
		},
	};
}

/** One entry drained from the durable mailbox, as far as dedup cares. */
export interface DrainCandidate {
	deliveryId?: string;
	fromId?: string;
	originalFrom?: string;
	sentAt?: number;
	payload?: unknown;
	payloadText?: string;
}

/**
 * The revive drain's surface decision: which drained entries are fresh, decided and
 * recorded BEFORE anything is surfaced. Also collapses duplicates WITHIN one drain
 * (the same tell appended under several ids), since claim() records as it goes.
 */
export function selectFreshDrained<T extends DrainCandidate>(
	drained: readonly T[],
	guard: SurfacedDeliveryGuard,
): { fresh: T[]; suppressed: T[]; persisted: boolean } {
	const fresh: T[] = [];
	const suppressed: T[] = [];
	let persisted = true;
	for (const entry of drained) {
		const contentKey = tellContentKey({
			from: entry.originalFrom ?? entry.fromId,
			sentAt: entry.sentAt,
			payload: entry.payload !== undefined ? entry.payload : entry.payloadText,
		});
		const result = guard.claim({ deliveryId: entry.deliveryId, contentKey });
		if (!result.persisted) persisted = false;
		(result.fresh ? fresh : suppressed).push(entry);
	}
	return { fresh, suppressed, persisted };
}
