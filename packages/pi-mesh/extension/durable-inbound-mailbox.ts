import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MeshTellReceiptWaitForPhase } from "./types.ts";

/**
 * Durable inbound mailbox — the OFFLINE counterpart to v1b's in-memory
 * ActiveInboundTellMailbox. A tell addressed to a HIBERNATED durable session
 * (no live process to hold it) is persisted here so it survives the peer being
 * offline, and is DRAINED into the turn context on revive (ADD-2, FIFO across
 * the hibernation seam).
 *
 * Delivery semantics (contract pe-jimphzxj): at-least-once + IDEMPOTENT surface
 * (dedup by deliveryId) + FIFO-per-sender (preserved via a monotonic append
 * `seq`) + per-entry TTL → late 'expired' ack so a sender never believes
 * 'delivered' forever.
 *
 * Persisted as a SIDECAR jsonl (NOT inline in the session jsonl) so the durable
 * mailbox never bloats the session log or pollutes ouija/session views
 * (council U2 perf). One file per durable session, keyed by durable id.
 */

/** Default entry TTL — 24h. A hibernated session revived within a day drains
 *  its mail; older mail is reported 'expired' so the sender learns it lapsed. */
export const DURABLE_MAILBOX_TTL_MS = 24 * 60 * 60 * 1000;

export interface DurableMailboxEntry {
	/** Sender-minted delivery id — the dedup / idempotency key. */
	deliveryId: string;
	/** Sender's route id at send time (for the surfaced signature). */
	fromId: string;
	/** Human sender label captured at send time. */
	senderLabel: string;
	topic?: string;
	payload: unknown;
	payloadText: string;
	/** The phase the sender asked to be acked with (surfaced/delivered/...). */
	ackRequested?: MeshTellReceiptWaitForPhase;
	/** The durable id to send the follow-up ack to (sender's own id). */
	originalFrom?: string;
	/** unix ms the tell was accepted into the mailbox. */
	sentAt: number;
	/** unix ms after which the entry is 'expired' and must not surface. */
	expiresAt: number;
	/** Monotonic append order — the FIFO key (stable across rewrites). */
	seq: number;
}

export type DurableMailboxAppendInput = Omit<DurableMailboxEntry, "seq" | "expiresAt"> & {
	seq?: number;
	expiresAt?: number;
};

// ── Pure core (no fs — unit-testable) ────────────────────────────────────────

/** Append `entry` unless its deliveryId is already present (idempotent surface,
 *  dedup by msg id). Returns the (possibly unchanged) list + whether it was a
 *  duplicate. Never mutates the input array. */
export function dedupeAppend(
	entries: DurableMailboxEntry[],
	entry: DurableMailboxEntry,
): { entries: DurableMailboxEntry[]; duplicate: boolean } {
	if (entries.some((e) => e.deliveryId === entry.deliveryId)) {
		return { entries, duplicate: true };
	}
	return { entries: [...entries, entry], duplicate: false };
}

/** Split into live (not yet expired) and expired at `now`. */
export function partitionByExpiry(
	entries: DurableMailboxEntry[],
	now: number,
): { live: DurableMailboxEntry[]; expired: DurableMailboxEntry[] } {
	const live: DurableMailboxEntry[] = [];
	const expired: DurableMailboxEntry[] = [];
	for (const e of entries) {
		if (e.expiresAt <= now) expired.push(e);
		else live.push(e);
	}
	return { live, expired };
}

/** FIFO order — ascending append seq. Stable regardless of on-disk line order. */
export function orderForDrain(entries: DurableMailboxEntry[]): DurableMailboxEntry[] {
	return [...entries].sort((a, b) => a.seq - b.seq);
}

/**
 * Drain semantics: FIFO-ordered live entries to surface, expired entries to
 * ack 'expired'. The mailbox is fully consumed (nothing remains) — the caller
 * surfaces `drained` into the turn context and sends 'expired' acks for
 * `expired`.
 */
export function computeDrain(
	entries: DurableMailboxEntry[],
	now: number,
): { drained: DurableMailboxEntry[]; expired: DurableMailboxEntry[] } {
	const { live, expired } = partitionByExpiry(entries, now);
	return { drained: orderForDrain(live), expired: orderForDrain(expired) };
}

// ── fs wrapper ──────────────────────────────────────────────────────────────

/** Root for all durable-session sidecars. User-level, never in a repo tree. */
export function durableMeshRoot(): string {
	return path.join(os.homedir(), ".pi", "mesh", "durable");
}

/** The per-durable-session directory (descriptor + mailbox live here). */
export function durableSessionDir(durableId: string, root = durableMeshRoot()): string {
	return path.join(root, sanitizeDurableId(durableId));
}

export function durableMailboxPath(durableId: string, root = durableMeshRoot()): string {
	return path.join(durableSessionDir(durableId, root), "mailbox.jsonl");
}

export function durableDescriptorPath(durableId: string, root = durableMeshRoot()): string {
	return path.join(durableSessionDir(durableId, root), "descriptor.json");
}

/** Durable ids are uuids (hex + dashes), but guard against path traversal from
 *  a hostile id: strip everything except hex-id-safe chars — dots included, so a
 *  bare ".."/"." can never escape the durable root. */
function sanitizeDurableId(durableId: string): string {
	const safe = durableId.replace(/[^A-Za-z0-9_-]/g, "_");
	return safe.length > 0 ? safe : "_";
}

function readEntries(mailboxPath: string): DurableMailboxEntry[] {
	let raw: string;
	try {
		raw = fs.readFileSync(mailboxPath, "utf-8");
	} catch {
		return [];
	}
	const out: DurableMailboxEntry[] = [];
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const parsed = JSON.parse(trimmed) as DurableMailboxEntry;
			if (parsed && typeof parsed.deliveryId === "string" && typeof parsed.seq === "number") {
				out.push(parsed);
			}
		} catch {
			// skip a corrupt line — never let one bad line strand the whole mailbox
		}
	}
	return out;
}

function writeEntries(mailboxPath: string, entries: DurableMailboxEntry[]): void {
	fs.mkdirSync(path.dirname(mailboxPath), { recursive: true });
	if (entries.length === 0) {
		// Empty mailbox → remove the file so a hibernated session with no mail
		// leaves no litter (hygiene). Callers treat missing == empty.
		try {
			fs.unlinkSync(mailboxPath);
		} catch {
			// already gone — fine
		}
		return;
	}
	const body = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
	// Atomic replace: write a temp then rename so a concurrent reader never sees
	// a half-written mailbox.
	const tmp = `${mailboxPath}.${process.pid}.${Date.now()}.tmp`;
	fs.writeFileSync(tmp, body, "utf-8");
	fs.renameSync(tmp, mailboxPath);
}

/** Persisted durable mailbox for one durable session. Thin fs wrapper over the
 *  pure core; every mutation re-reads → applies → atomically rewrites, so
 *  concurrent senders on different processes converge (last write wins, dedup
 *  keeps it idempotent). */
export class DurableInboundMailbox {
	readonly path: string;
	private ttlMs: number;

	constructor(mailboxPath: string, opts?: { ttlMs?: number }) {
		this.path = mailboxPath;
		this.ttlMs = opts?.ttlMs ?? DURABLE_MAILBOX_TTL_MS;
	}

	static forDurableId(durableId: string, opts?: { ttlMs?: number; root?: string }): DurableInboundMailbox {
		return new DurableInboundMailbox(durableMailboxPath(durableId, opts?.root), { ttlMs: opts?.ttlMs });
	}

	/** Append a tell. Dedup by deliveryId (returns the existing entry on dup).
	 *  Assigns a monotonic seq (FIFO) and an expiresAt (TTL). */
	append(input: DurableMailboxAppendInput, now = Date.now()): { entry: DurableMailboxEntry; duplicate: boolean } {
		const entries = readEntries(this.path);
		const existing = entries.find((e) => e.deliveryId === input.deliveryId);
		if (existing) return { entry: existing, duplicate: true };
		const nextSeq = entries.reduce((max, e) => Math.max(max, e.seq), 0) + 1;
		const entry: DurableMailboxEntry = {
			...input,
			seq: input.seq ?? nextSeq,
			expiresAt: input.expiresAt ?? input.sentAt + this.ttlMs,
		};
		const { entries: appended } = dedupeAppend(entries, entry);
		writeEntries(this.path, appended);
		return { entry, duplicate: false };
	}

	/** Non-destructive: live entries in FIFO order (does not consume). */
	peek(now = Date.now()): DurableMailboxEntry[] {
		return computeDrain(readEntries(this.path), now).drained;
	}

	/** Consume everything: returns FIFO live entries to surface + expired ones to
	 *  ack 'expired'. The mailbox is emptied on disk. */
	drain(now = Date.now()): { drained: DurableMailboxEntry[]; expired: DurableMailboxEntry[] } {
		const result = computeDrain(readEntries(this.path), now);
		writeEntries(this.path, []); // fully consumed
		return result;
	}

	/** Drop expired entries without surfacing live ones. Returns the expired set
	 *  (for late 'expired' acks). Keeps the mailbox bounded over long hibernation. */
	pruneExpired(now = Date.now()): DurableMailboxEntry[] {
		const { live, expired } = partitionByExpiry(readEntries(this.path), now);
		if (expired.length > 0) writeEntries(this.path, live);
		return expired;
	}

	get length(): number {
		return readEntries(this.path).length;
	}
}
