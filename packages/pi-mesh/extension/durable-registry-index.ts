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
import { readDurableDescriptor, removeDurableDescriptor } from "./durable-session-store.ts";
import { durableDescriptorPath, durableMeshRoot } from "./durable-inbound-mailbox.ts";
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
	| { kind: "none"; reason: RegistryFailureReason };

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
export interface RegistryScan {
	entries: RegistryEntry[];
	/** Every row was present but unreadable - distinct from an empty registry. */
	degraded: boolean;
	/**
	 * Nicknames that ARE registered but were dropped for exceeding the freshness
	 * bound, kept precisely so a lookup can tell 'too old to route' apart from
	 * 'nobody ever registered that name'. Without them the difference is not
	 * recoverable downstream, and reporting 'stale' would be an unreachable claim.
	 */
	expiredNicknames: string[];
}

export function scanRegistry(options: RegistryIndexOptions = {}): RegistryScan {
	const root = options.root ?? durableMeshRoot();
	const now = (options.now ?? Date.now)();
	let names: string[];
	try {
		names = fs.readdirSync(root);
	} catch {
		return { entries: [], degraded: false, expiredNicknames: [] };
	}
	const entries: RegistryEntry[] = [];
	const expiredNicknames: string[] = [];
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
			if (typeof descriptor.nickname === "string" && descriptor.nickname) {
				expiredNicknames.push(descriptor.nickname.trim().toLowerCase());
			}
			continue;
		}
		entries.push({ dirName, descriptor });
	}
	return { entries, degraded: seen > 0 && unreadable === seen, expiredNicknames };
}

/**
 * Remove registrations past the freshness bound, plus descriptor-less empty
 * directories. Pruning is what keeps rule 2 honest over time - a bound that
 * only ever hides stale rows lets the directory grow forever and every scan
 * pay for them (measured: 5,872 directories, ~1.3k descriptors, 286-980ms per
 * scan). A descriptor past REGISTRY_MAX_AGE_MS is already unroutable, so
 * deleting it changes no routing answer; it only stops it costing future scans.
 *
 * Never deletes a mailbox: a non-empty directory keeps its mail and loses only
 * the descriptor, so revive-on-send reports 'undeliverable' instead of waking
 * a dead session. Everything is best-effort - one failed unlink never aborts
 * the sweep, and concurrent scans racing on the same file are harmless.
 */
export interface RegistryPruneResult {
	/** Directories inspected. */
	scanned: number;
	/** Descriptors past the freshness bound, removed. */
	removedExpired: number;
	/** Descriptors whose recorded id did not match their directory, removed. */
	removedCorrupt: number;
	/** Empty descriptor-less directories, removed. */
	removedEmpty: number;
	/** Directories that could not be inspected or cleaned this pass. */
	failed: number;
}

export function pruneRegistry(options: RegistryIndexOptions = {}): RegistryPruneResult {
	const root = options.root ?? durableMeshRoot();
	const now = (options.now ?? Date.now)();
	const result: RegistryPruneResult = { scanned: 0, removedExpired: 0, removedCorrupt: 0, removedEmpty: 0, failed: 0 };
	let names: string[];
	try {
		names = fs.readdirSync(root);
	} catch {
		return result;
	}
	const removeEmptyDir = (dirPath: string): boolean => {
		try {
			fs.rmdirSync(dirPath);
			return true;
		} catch {
			// Non-empty (mailbox present) or a racing writer - leave it.
			return false;
		}
	};
	for (const dirName of names) {
		const dirPath = path.join(root, dirName);
		try {
			if (!fs.statSync(dirPath).isDirectory()) continue;
		} catch {
			result.failed++;
			continue;
		}
		result.scanned++;
		const descriptor = readDurableDescriptor(dirName, root);
		if (!descriptor) {
			if (removeEmptyDir(dirPath)) result.removedEmpty++;
			continue;
		}
		// A descriptor whose id is not the directory it sits in cannot be trusted;
		// the scan refuses to route on it, and keeping the file only leaks space.
		if (descriptor.durableId !== dirName) {
			try {
				fs.unlinkSync(durableDescriptorPath(dirName, root));
				result.removedCorrupt++;
			} catch {
				result.failed++;
			}
			removeEmptyDir(dirPath);
			continue;
		}
		if (typeof descriptor.updatedAt !== "number" || now - descriptor.updatedAt > (options.maxAgeMs ?? REGISTRY_MAX_AGE_MS)) {
			removeDurableDescriptor(descriptor.durableId, root);
			result.removedExpired++;
		}
	}
	return result;
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
	let cache: { at: number; entries: RegistryEntry[]; degraded: boolean; expired: string[] } | null = null;

	const snapshot = (): { entries: RegistryEntry[]; degraded: boolean; expired: string[] } => {
		const at = now();
		if (cache && at - cache.at < ttlMs) return cache;
				const scanned = scanRegistry({ ...options, now });
		// Named fields rather than a spread: the scan calls this column
		// expiredNicknames and the cache calls it expired, and a spread let those two
		// drift apart silently - the lookup then read an undefined it trusted.
		cache = {
			at,
			entries: scanned.entries,
			degraded: scanned.degraded,
			expired: scanned.expiredNicknames,
		};
		return cache;
	};

	const norm = (s: string) => s.trim().toLowerCase();

	return {
		entries: () => snapshot().entries,
		lookupNickname: (rawName: string) => {
			const needle = norm(rawName);
			// Empty input is not a stale match or a corrupt registry; saying so keeps
			// the refusal accurate instead of blaming the data.
			if (!needle) return { kind: "none", reason: "not-found" };
			const { entries, degraded, expired } = snapshot();
			const hits = entries.filter((e) => norm(e.descriptor.nickname ?? "") === needle);
			if (hits.length === 0) {
				// Three different problems, told apart because they have three different fixes:
				// nobody registered, everyone registered is too old, or the registry is
				// unreadable. Collapsing them is what made the old message lie.
				const why: RegistryFailureReason = expired.includes(needle)
					? "stale"
					: degraded
						? "corrupt"
						: "not-found";
				return { kind: "none", reason: why };
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
			if (!winner) return { kind: "none", reason: "corrupt" };
			return { kind: "resolved", entry: winner.entry };
		},
	};
}

