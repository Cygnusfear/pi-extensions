/**
 * The mesh's inbox, held open for a session that is not a service.
 *
 * The landed courier (packages/mesh/src/courier.ts) does this for a process: hold `wait` open,
 * take what it answers, hand each message to an injector, advance the cursor only after the
 * injector has taken it, and tell the sender it surfaced. This is the same loop for a HOST that
 * is a live pi session, where the "injector" is `pi.sendMessage` and the delivery has to cross
 * the run boundary (run-boundary-delivery.ts, reused from pi-mesh).
 *
 * AT LEAST ONCE, AND IT SAYS SO. The cursor advances only AFTER `deliver` has accepted a message,
 * so a crash between the two re-delivers rather than loses, and every message carries the mesh's
 * own stable id for the session to dedupe on. The other order — advance, then deliver — is the
 * one that loses mail, and this file exists for hosts that cannot afford it.
 *
 * THE FIRST RUN DOES NOT REPLAY HISTORY. A mailbox read with no cursor returns from the beginning,
 * so a fresh attachment would hand a session every message its actor ever received. The first run
 * therefore walks the backlog forward WITHOUT delivering, and says how many it walked past.
 *
 * THE CURSOR IS PER ACTOR AND IS WRITTEN TORN-PROOF: a temp file and a rename, because a
 * half-written cursor parses as "start from the beginning" and replays everything.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** The mesh's own bound on a wait. Asking for more is refused by the service, so we ask for less. */
export const WAIT_MS = 20_000;
/** How many messages one backlog walk reads. The service caps a read at 500. */
const BACKLOG_WINDOW = 500;
export const RECEIPT_TOPIC = "receipt";
export const START = "0";

export interface CourierMessage {
	readonly id: string;
	readonly from: string;
	readonly topic?: string;
	readonly body: string;
}

/** One verb call on the mesh. The MCP face refuses with `isError`; a transport failure throws. */
export interface MeshCall {
	(verb: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface CourierLoopOptions {
	readonly call: MeshCall;
	/** Hand a message to the session. Resolving means the session has taken responsibility for it. */
	readonly deliver: (message: CourierMessage) => void;
	/** Where the cursor lives. The file is named after the ACTOR: the mailbox is the actor's, not the session's. */
	readonly stateDir: string;
	readonly actor: string;
	readonly signal: AbortSignal;
	readonly waitMs?: number;
	readonly log?: (line: string) => void;
	readonly sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export interface CourierProgress {
	readonly skipped: number;
	readonly delivered: number;
}

interface WaitReply {
	readonly cursor: string;
	readonly messages: readonly CourierMessage[];
}

/**
 * A MALFORMED REPLY IS A LOUD FAILURE, not a silent idle: the loop is typed as unknown at the
 * transport boundary, and a reader that took `messages` off the wrong shape would look like an
 * actor nobody writes to.
 */
export function parseWaitReply(value: unknown): WaitReply {
	const reply = value as { readonly cursor?: unknown; readonly messages?: unknown };
	const cursor = reply.cursor;
	if (typeof cursor !== "string" || !/^[0-9]+$/u.test(cursor)) throw new Error("the wait reply carries no cursor");
	if (!Array.isArray(reply.messages)) throw new Error("the wait reply carries no message list");
	const messages = reply.messages.map((raw): CourierMessage => {
		const message = raw as { readonly id?: unknown; readonly from?: unknown; readonly topic?: unknown; readonly body?: unknown };
		if (typeof message.id !== "string" || typeof message.from !== "string" || typeof message.body !== "string") {
			throw new Error("a message in the wait reply is missing its id, sender or body");
		}
		return {
			id: message.id,
			from: message.from,
			...(typeof message.topic === "string" ? { topic: message.topic } : {}),
			body: message.body,
		};
	});
	return { cursor, messages };
}

function cursorPath(options: CourierLoopOptions): string {
	return join(options.stateDir, options.actor + ".cursor");
}

export function loadCursor(options: CourierLoopOptions): string | undefined {
	try {
		const raw = readFileSync(cursorPath(options), "utf8").trim();
		return /^[0-9]+$/u.test(raw) ? raw : undefined;
	} catch {
		return undefined;
	}
}

/** Temp file and rename: a torn cursor reads as "start over", which replays the whole mailbox. */
export function saveCursor(options: CourierLoopOptions, cursor: string): void {
	const path = cursorPath(options);
	mkdirSync(dirname(path), { recursive: true });
	const temporary = path + ".tmp";
	writeFileSync(temporary, cursor, { mode: 0o600 });
	renameSync(temporary, path);
}

async function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
	await new Promise<void>((resolve) => {
		const timer = setTimeout(finish, ms);
		function finish(): void {
			clearTimeout(timer);
			signal.removeEventListener("abort", finish);
			resolve();
		}
		signal.addEventListener("abort", finish, { once: true });
	});
}

/**
 * Walk past everything already in the mailbox without delivering it, and remember where that
 * stopped. Returns the cursor to continue from.
 */
async function skipBacklog(options: CourierLoopOptions, call: MeshCall): Promise<{ cursor: string; skipped: number }> {
	let cursor = START;
	let skipped = 0;
	for (;;) {
		const reply = parseWaitReply(await call("wait", { after: cursor, timeoutMs: 1, limit: BACKLOG_WINDOW }));
		if (reply.messages.length === 0) return { cursor, skipped };
		const last = reply.messages[reply.messages.length - 1];
		cursor = last?.id ?? reply.cursor;
		skipped += reply.messages.length;
	}
}

/** Tell the sender a message surfaced. A receipt that cannot be sent never holds the cursor. */
async function sendReceipt(call: MeshCall, message: CourierMessage, log: (line: string) => void): Promise<void> {
	try {
		await call("tell", {
			to: message.from,
			topic: RECEIPT_TOPIC,
			body: JSON.stringify({ id: message.id, state: "surfaced" }),
			content: "typed",
		});
	} catch (error) {
		log("receipt for " + message.id + " failed: " + describe(error));
	}
}

export function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** The loop: hold a wait, deliver what it answers, back off on failures, until aborted. */
export async function runCourier(options: CourierLoopOptions): Promise<CourierProgress> {
	const log = options.log ?? (() => undefined);
	const sleep = options.sleep ?? defaultSleep;
	const waitMs = options.waitMs ?? WAIT_MS;
	let cursor = loadCursor(options);
	let skipped = 0;
	let delivered = 0;
	let backoffMs = 0;

	if (cursor === undefined) {
		// FIRST ATTACHMENT: the mailbox may hold a history this session has never seen. Walk past
		// it, say so, and start from there.
		const walked = await skipBacklog(options, options.call);
		cursor = walked.cursor;
		skipped = walked.skipped;
		saveCursor(options, cursor);
		log("first run: " + String(skipped) + " message(s) already in the mailbox were left alone");
	}

	while (!options.signal.aborted) {
		try {
			const reply = parseWaitReply(
				await options.call("wait", { ...(cursor === START ? {} : { after: cursor }), timeoutMs: waitMs }),
			);
			backoffMs = 0;
			for (const message of reply.messages) {
				options.deliver(message);
				delivered += 1;
				// DELIVER FIRST, THEN REMEMBER: a crash in between re-delivers rather than loses.
				cursor = message.id;
				saveCursor(options, cursor);
				await sendReceipt(options.call, message, log);
			}
			if (reply.messages.length === 0 && reply.cursor !== cursor) {
				// The service advanced its own position (a stranger's message, or its own bookkeeping);
				// follow it so the next wait asks from the right place.
				cursor = reply.cursor;
				saveCursor(options, cursor);
			}
		} catch (error) {
			if (options.signal.aborted) break;
			backoffMs = backoffMs === 0 ? 1000 : Math.min(backoffMs * 2, 30_000);
			log("wait failed: " + describe(error) + "; retrying in " + String(backoffMs) + "ms");
			await sleep(backoffMs, options.signal);
		}
	}
	return { skipped, delivered };
}
