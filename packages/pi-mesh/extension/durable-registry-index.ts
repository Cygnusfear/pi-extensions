/**
 * A cached, freshness-bound view of the durable-session registry (kal-rzjxbmgj).
 *
 * Why this exists as its own module rather than a few lines in the store: the
 * routing decisions below are about to be shared with the sidecar (kal-28jaxzqo),
 * which needs the same answers - "who is this nickname", "is this id still
 * credible", "is the name ambiguous" - and must not re-derive them from a
 * directory walk. One owner for that policy means the client in process and the
 * daemon can never disagree about who a name refers to.
 *
 * Three rules the previous scan got wrong, each here for a measured reason:
 *
 *  1. Never block the event loop for a filesystem walk. The registry has grown to
 *     ~4.8k directories (~1.3k descriptors) and is never pruned, so a synchronous
 *     readdir+stat+read+parse per refusal cost 286-980 ms and ran TWICE per tell.
 *     Results are therefore cached and reused, with a short TTL, and the caller
 *     resolves once and carries the answer into the refusal message.
 *  2. An old registration is not evidence of a live target. Descriptor ages have a
 *     46-day median on this box, so matching a nickname with no freshness bound
 *     turns a long-dead session into a black hole that answers 'delivered'.
 *  3. Where several ids claim one nickname, newest wins over a coin flip, and a
 *     still-live registration beats a stale one. 15 nicknames already collide.
 */
import fs from "node:fs";
import path from "node:path";
import { isRevivable, readDurableDescriptor, removeDurableDescriptor } from "./durable-session-store.ts";
import { durableMeshRoot } from "./durable-inbound-mailbox.ts";
import type { ReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";

/** One registry row: where it lives, and what it claims. */
export interface RegistryEntry {
	/** Directory name under the registry root - the sanitised form. */
	dirName: string;
	/** The descriptor as parsed, whose durableId is authoritative. */
	descriptor: ReviveDescriptor;
}

export type NicknameLookup =
	| { kind: "resolved"; entry: RegistryEntry }
	| { kind: "ambiguous"; candidates: Array<{ durableId: string; ageMs: number }> }
	| { kind: "none" };

export interface RegistryIndexOptions {
	/** Registry root. Defaults to the HOME-derived one. */
	root?: string;
	/** How long a cached snapshot may be reused. */
	ttlMs?: number;
	/** A descriptor older than this is not routable, and is pruned. */
	maxAgeMs?: number;
	now?: () => number;
}

export const REGISTRY_TTL_MS = 5_000;
/** 30 days: generous enough for a long-lived isolate, tight enough that a session
 *  abandoned last month can never swallow a tell addressed to its old name. */
export const REGISTRY_MAX_AGE_MS = 30 * 24 * 60 * 60_000;

/**
 * Read the registry once. Returns rows in stable order and never throws: a
 * partially corrupt registry degrades to a smaller set rather than an error, but
 * note that "smaller" is not "empty" - a caller that needs to distinguish "no
 * registrations" from "every registration unreadable" must look at `degraded`.
 */
export function scanRegistry(options: RegistryIndexOptions = {}): { entries: RegistryEntry[]; degraded: boolean } {
	const root = options.root ?? durableMeshRoot();
	const now = (options.now ?? Date.now)();
	let names: string[];
	try {
		names = fs.readdirSync(root);
	} catch {
		return { entries: [], degraded: false };
	}
	const entries: RegistryEntry[] = [];
	let unreadable = 0;
	let seen = 0;
	for (const dirName of names) {
		try {
			if (!fs.statSync(path.join(root, dirName)).isDirectory()) continue;
		} catch {
			continue;
		}
		seen++;
		const descriptor = readDurableDescriptor(dirName, root);
		if (!descriptor) {
			unreadable++;
			continue;
		}
		// A descriptor whose recorded id is not the directory it sits in is a
		// mismatch we refuse to route on: one of the two is wrong and we cannot
		// tell which, and guessing here is how a tell lands in the wrong mailbox.
		if (descriptor.durableId !== dirName) {
			unreadable++;
			continue;
		}
		if (typeof descriptor.updatedAt !== "number" || now - descriptor.updatedAt > (options.maxAgeMs ?? REGISTRY_MAX_AGE_MS)) {
			continue;
		}
		entries.push({ dirName, descriptor });
	}
	return { entries, degraded: seen > 0 && unreadable === seen };
}

/**
 * Remove registrations past the freshness bound. Pruning is what keeps rule 2
 * honest over time - a bound that only ever hides stale rows lets the directory
 * grow forever and every scan pay for them.
 */
export function pruneRegistry(options: RegistryIndexOptions = {}): number {
	const root = options.root ?? durableMeshRoot();
	const maxAgeMs = options.maxAgeMs ?? REGISTRY_MAX_AGE_MS;
	const now = (options.now ?? Date.now)();
	let removed = 0;
	let names: string[];
	try {
		names = fs.readdirSync(root);
	} catch {
		return 0;
	}
	for (const dirName of names) {
		const descriptor = readDurableDescriptor(dirName, root);
		if (!descriptor) continue;
		if (typeof descriptor.updatedAt === "number" && now - descriptor.updatedAt <= maxAgeMs) continue;
		removeDurableDescriptor(dirName, root);
		removed++;
	}
	return removed;
}

/**
 * Why a nickname lookup did not resolve, kept distinct because the sender must be
 * told different things: 'nobody by that name' and 'everyone by that name is too
 * old to reach' and 'two peers claim that name' are different fixes.
 */
export type RegistryFailureReason = "not-found" | "stale" | "ambiguous" | "corrupt";

export interface RegistryIndex {
	entries(): RegistryEntry[];
	/** Nickname lookup with freshness and newest-wins already applied. */
	lookupNickname(rawName: string): NicknameLookup;
	/** True when a durable id has a live-enough registration, for the offline guard. */
	isRoutableDurableId(durableId: string): boolean;
	/** Force the next entries() call to re-read. */
	invalidate(): void;
	/** Why a lookup failed, so refusal wording is derived, not guessed. */
	lastFailureReason(): RegistryFailureReason | null;
}

/**
 * Memoising view over the registry.
 *
 * One instance is enough for a session; the TTL bounds staleness while removing
 * the per-refusal double scan. `invalidate()` exists so a caller that just wrote
 * a descriptor can see it immediately rather than waiting out the TTL.
 */
export function createRegistryIndex(options: RegistryIndexOptions = {}): RegistryIndex {
	const ttlMs = options.ttlMs ?? REGISTRY_TTL_MS;
	const now = options.now ?? Date.now;
	let cache: { at: number; entries: RegistryEntry[]; degraded: boolean } | null = null;
	let reason: RegistryFailureReason | null = null;

	const snapshot = (): { entries: RegistryEntry[]; degraded: boolean } => {
		const at = now();
		if (cache && at - cache.at < ttlMs) return cache;
		cache = { at, ...scanRegistry({ ...options, now }) };
		return cache;
	};

	const norm = (s: string) => s.trim().toLowerCase();

	return {
		entries: () => snapshot().entries,
		isRoutableDurableId: (durableId: string) => snapshot().entries.some((e) => e.descriptor.durableId === durableId),
		invalidate: () => {
			cache = null;
		},
		lastFailureReason: () => reason,
		lookupNickname: (rawName: string) => {
			reason = null;
			const needle = norm(rawName);
			if (!needle) {
				reason = "not-found";
				return { kind: "none" };
			}
			const { entries, degraded } = snapshot();
			const hits = entries.filter((e) => norm(e.descriptor.nickname ?? "") === needle);
			if (hits.length === 0) {
				reason = degraded ? "corrupt" : entries.length === 0 ? "not-found" : "stale";
				return { kind: "none" };
			}
			// Bind the validated id into the value once. Re-reading descriptor.durableId
			// afterwards would re-introduce the optional-field problem being guarded here.
			const byId = new Map<string, { id: string; entry: RegistryEntry }>();
			for (const h of hits) {
				const id = h.descriptor.durableId;
				// A descriptor with no usable durable id is not routable by definition;
				// keying by undefined would hand back a candidate nothing can address.
				if (typeof id !== "string" || !id) continue;
				if (!byId.has(id)) byId.set(id, { id, entry: h });
			}
			if (byId.size > 1) {
				reason = "ambiguous";
				return {
					kind: "ambiguous",
					candidates: [...byId.values()]
						.map((v) => ({
							durableId: v.id,
							ageMs: Math.max(0, now() - v.entry.descriptor.updatedAt),
						}))
						.sort((a, b) => a.ageMs - b.ageMs),
				};
			}
			// Newest wins even within one id's duplicates; nothing here is a coin flip.
			const winner = [...byId.values()].sort(
				(a, b) => b.entry.descriptor.updatedAt - a.entry.descriptor.updatedAt,
			)[0];
			if (!winner) {
				reason = "corrupt";
				return { kind: "none" };
			}
			return { kind: "resolved", entry: winner.entry };
		},
	};
}

export function isRegisteredRevivable(durableId: string, root?: string): boolean {
	return isRevivable(durableId, root);
}
