import fs from "node:fs";
import path from "node:path";
import {
	buildReviveDescriptor,
	isReviveDescriptor,
	type ReviveDescriptor,
} from "@pi-extensions/shared/revive-descriptor";
import { durableDescriptorPath, durableSessionDir } from "./durable-inbound-mailbox.ts";

/**
 * Durable-session STORE — the address book that makes revive-on-send possible.
 *
 * A sender that mesh.tells a HIBERNATED durable id has only the id string; it
 * cannot find the session's files. So the canonical revive descriptor is keyed
 * by durable id at `~/.pi/mesh/durable/<durableId>/descriptor.json`, written by
 * the session's OWN pi-mesh on identity resolution (it alone knows both its
 * durable id and its session file). The activator reads it by bare durable id.
 *
 * "revivable = durable session record EXISTS AND a persisted revive descriptor
 * EXISTS" (contract pe-jimphzxj). No descriptor → dead → the sender acks
 * 'undeliverable', never a false 'delivered'.
 */

export function writeDurableDescriptor(
	durableId: string,
	descriptor: ReviveDescriptor,
	root?: string,
): void {
	const p = durableDescriptorPath(durableId, root);
	fs.mkdirSync(path.dirname(p), { recursive: true });
	const body = JSON.stringify(descriptor, null, 2);
	// Atomic replace so a concurrent activator never reads a half-written file.
	const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
	fs.writeFileSync(tmp, body, "utf-8");
	fs.renameSync(tmp, p);
}

export function readDurableDescriptor(durableId: string, root?: string): ReviveDescriptor | null {
	let raw: string;
	try {
		raw = fs.readFileSync(durableDescriptorPath(durableId, root), "utf-8");
	} catch {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		return isReviveDescriptor(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/** A durable id is REVIVABLE iff a valid persisted descriptor exists for it. */
export function isRevivable(durableId: string, root?: string): boolean {
	return readDurableDescriptor(durableId, root) !== null;
}

/** Remove a durable session's registry entry (descriptor). Used by retirement. */
export function removeDurableDescriptor(durableId: string, root?: string): void {
	try {
		fs.unlinkSync(durableDescriptorPath(durableId, root));
	} catch {
		// already gone — fine
	}
	// Best-effort: prune the (now possibly empty) session dir.
	try {
		fs.rmdirSync(durableSessionDir(durableId, root));
	} catch {
		// non-empty (mailbox still present) or gone — fine
	}
}

// ── The spawner's PARTIAL descriptor (written next to the session file) ───────

/** Filename the spawner writes its PARTIAL descriptor under, in the session dir.
 *  pi-mesh reads it on identity resolution to materialise the canonical one. */
export const SPAWNER_PARTIAL_DESCRIPTOR_FILE = "revive-descriptor.json";

/** Env var pointing at the spawner's partial descriptor (set at spawn). Falls
 *  back to `<dirname(sessionFile)>/revive-descriptor.json` when unset. */
export const REVIVE_DESCRIPTOR_ENV = "PI_TEAMS_REVIVE_DESCRIPTOR";

export function spawnerPartialDescriptorPath(
	sessionFile: string | undefined,
	env: Record<string, string | undefined> = process.env,
): string | null {
	const explicit = env[REVIVE_DESCRIPTOR_ENV];
	if (explicit && explicit.length > 0) return explicit;
	if (sessionFile && sessionFile.length > 0) {
		return path.join(path.dirname(sessionFile), SPAWNER_PARTIAL_DESCRIPTOR_FILE);
	}
	return null;
}

export function readSpawnerPartialDescriptor(
	sessionFile: string | undefined,
	env: Record<string, string | undefined> = process.env,
): ReviveDescriptor | null {
	const p = spawnerPartialDescriptorPath(sessionFile, env);
	if (!p) return null;
	let raw: string;
	try {
		raw = fs.readFileSync(p, "utf-8");
	} catch {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		return isReviveDescriptor(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Materialise the CANONICAL revive descriptor (keyed by durable id) from the
 * spawner's PARTIAL one. Only spawned sessions that carry a partial descriptor
 * register — a plain human session without one is intentionally NOT revivable
 * (honest 'undeliverable' when offline), keeping the registry blast-radius to
 * the sessions an activator can actually be notified about.
 *
 * Returns the canonical descriptor it wrote, or null when there was nothing to
 * materialise.
 */
export function materialiseDurableDescriptor(input: {
	durableId: string;
	sessionId?: string;
	nickname?: string;
	sessionFile: string | undefined;
	env?: Record<string, string | undefined>;
	root?: string;
	now?: number;
}): ReviveDescriptor | null {
	const partial = readSpawnerPartialDescriptor(input.sessionFile, input.env ?? process.env);
	if (!partial) return null;
	const canonical = buildReviveDescriptor({
		...partial,
		durableId: input.durableId,
		sessionId: input.sessionId ?? partial.sessionId,
		nickname: input.nickname ?? partial.nickname,
		sessionFile: partial.sessionFile || input.sessionFile || "",
		updatedAt: input.now ?? Date.now(),
	});
	writeDurableDescriptor(input.durableId, canonical, input.root);
	return canonical;
}

// ── Revive notify (supervisor-NOTIFIED revive-on-send, v1 = notify) ──────────

export const REVIVE_NOTIFY_KIND = "mesh:revive-notify" as const;
export const REVIVE_NOTIFY_VERSION = 1 as const;

/**
 * Emitted to a hibernated session's supervisor(s) when a tell lands in the
 * durable mailbox. v1 = NOTIFY ONLY: the supervisor (or a human) decides to
 * revive via the STANDARD revive path; the durable mailbox is the reliable
 * channel, the notify is a best-effort nudge. v2 = auto-activation.
 */
export interface ReviveNotify {
	kind: typeof REVIVE_NOTIFY_KIND;
	version: typeof REVIVE_NOTIFY_VERSION;
	/** The hibernated durable session that has pending mail. */
	durableId: string;
	/** Deterministic nickname of the hibernated session, for readable logs. */
	nickname?: string;
	/** The delivery id just enqueued (dedup / correlation). */
	deliveryId: string;
	/** The sender that triggered the notify. */
	from: string;
	senderLabel?: string;
	/** How many entries are now pending in the durable mailbox. */
	mailboxCount: number;
	sentAt: number;
}

export function buildReviveNotify(
	fields: Omit<ReviveNotify, "kind" | "version" | "sentAt"> & { sentAt?: number },
): ReviveNotify {
	return {
		kind: REVIVE_NOTIFY_KIND,
		version: REVIVE_NOTIFY_VERSION,
		...fields,
		sentAt: fields.sentAt ?? Date.now(),
	};
}

export function isReviveNotify(payload: unknown): payload is ReviveNotify {
	if (!payload || typeof payload !== "object") return false;
	const p = payload as Record<string, unknown>;
	return (
		p.kind === REVIVE_NOTIFY_KIND &&
		p.version === REVIVE_NOTIFY_VERSION &&
		typeof p.durableId === "string" &&
		typeof p.deliveryId === "string" &&
		typeof p.from === "string" &&
		typeof p.mailboxCount === "number" &&
		typeof p.sentAt === "number"
	);
}
