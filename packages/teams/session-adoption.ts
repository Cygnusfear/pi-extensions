import {
	parseSessionEntries,
	SessionManager,
	type FileEntry,
	type SessionInfo,
} from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";
import { isActivationLeaseHeldLive } from "./lease.js";
import { sha256Id } from "./v2/session-facts.js";

export type SessionSelector =
	| { kind: "id"; id: string }
	| { kind: "file"; path: string };

export interface AdoptionPeer {
	id: string;
	sessionId?: string;
	meshId?: string;
	nickname?: string;
	name?: string;
}

export interface AdoptableSession {
	sessionId: string;
	sessionFile: string;
	cwd: string;
	name?: string;
	durableMeshId?: string;
	nickname?: string;
}

export interface SessionAdoptionResolverOptions {
	currentSessionFile: string;
	peers?: readonly AdoptionPeer[];
	listSessions?: () => Promise<readonly SessionInfo[]>;
	isActivationHeld?: (sessionFile: string) => boolean;
}

function nonEmpty(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function canonicalSessionFile(candidate: string): string {
	if (!nonEmpty(candidate)) throw new Error("Session file path must be non-empty");
	if (!path.isAbsolute(candidate)) throw new Error(`Session file path must be absolute: ${candidate}`);
	const resolved = path.resolve(candidate);
	if (path.extname(resolved) !== ".jsonl") {
		throw new Error(`Session file must be a .jsonl file: ${resolved}`);
	}
	let stat: fs.Stats;
	try {
		stat = fs.statSync(resolved);
	} catch {
		throw new Error(`Session file does not exist: ${resolved}`);
	}
	if (!stat.isFile()) throw new Error(`Session path is not a regular file: ${resolved}`);
	return fs.realpathSync(resolved);
}

function currentSessionPath(sessionFile: string): string {
	const resolved = path.resolve(sessionFile);
	try {
		return fs.realpathSync(resolved);
	} catch {
		return resolved;
	}
}

function readSessionEntries(sessionFile: string): FileEntry[] {
	const content = fs.readFileSync(sessionFile, "utf8");
	const lines = content.split("\n").filter((line) => line.trim().length > 0);
	const firstLine = lines[0];
	if (!firstLine) throw new Error(`Session file is empty: ${sessionFile}`);
	const parsedLines: unknown[] = [];
	for (const [index, line] of lines.entries()) {
		try {
			parsedLines.push(JSON.parse(line));
		} catch {
			throw new Error(`Session file contains invalid JSON on line ${index + 1}: ${sessionFile}`);
		}
	}
	const first = parsedLines[0];
	if (first === null || typeof first !== "object" || Array.isArray(first)) {
		throw new Error(`Session file has an invalid header: ${sessionFile}`);
	}
	const header = first as Record<string, unknown>;
	for (const [index, value] of parsedLines.entries()) {
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			throw new Error(`Session file has a non-object entry on line ${index + 1}: ${sessionFile}`);
		}
		const entry = value as Record<string, unknown>;
		if (!nonEmpty(entry.type)) {
			throw new Error(`Session file has an untyped entry on line ${index + 1}: ${sessionFile}`);
		}
		if (index > 0 && entry.type === "session") {
			throw new Error(`Session file has more than one session header: ${sessionFile}`);
		}
	}
	if (header.type !== "session" || !nonEmpty(header.id) || !nonEmpty(header.cwd)) {
		throw new Error(`Session file has no valid Pi session header: ${sessionFile}`);
	}
	const entries = parseSessionEntries(content);
	if (entries.length === 0 || entries[0]?.type !== "session") {
		throw new Error(`Session file is not a valid Pi session: ${sessionFile}`);
	}
	return entries;
}

function latestSessionMetadata(entries: readonly FileEntry[]): Pick<AdoptableSession, "name" | "durableMeshId" | "nickname"> {
	let name: string | undefined;
	let durableMeshId: string | undefined;
	let nickname: string | undefined;
	for (const entry of entries) {
		if (entry.type === "session_info") {
			name = nonEmpty(entry.name) ? entry.name.trim() : undefined;
			continue;
		}
		if (entry.type !== "custom" || entry.customType !== "mesh_identity") continue;
		const data = entry.data;
		if (data === null || typeof data !== "object" || Array.isArray(data)) continue;
		const identity = data as Record<string, unknown>;
		if (!nonEmpty(identity.id)) continue;
		durableMeshId = identity.id;
		nickname = nonEmpty(identity.nickname) ? identity.nickname.trim() : undefined;
	}
	return { name, durableMeshId, nickname };
}

async function resolveSelectorPath(
	selector: SessionSelector,
	listSessions: () => Promise<readonly SessionInfo[]>,
): Promise<string> {
	if (selector.kind === "file") return canonicalSessionFile(selector.path);
	if (selector.kind !== "id" || !nonEmpty(selector.id)) {
		throw new Error("Session selector must contain a non-empty exact session ID or file path");
	}
	const matches = (await listSessions()).filter((session) => session.id === selector.id.trim());
	const canonicalMatches = new Map<string, string>();
	for (const match of matches) {
		const canonical = canonicalSessionFile(match.path);
		canonicalMatches.set(canonical, match.path);
	}
	if (canonicalMatches.size === 0) throw new Error(`No persisted Pi session has ID "${selector.id}"`);
	if (canonicalMatches.size > 1) {
		throw new Error(
			`Session ID "${selector.id}" is ambiguous across ${canonicalMatches.size} files: ${[...canonicalMatches.keys()].join(", ")}`,
		);
	}
	const [canonical] = canonicalMatches.keys();
	if (!canonical) throw new Error(`No persisted Pi session has ID "${selector.id}"`);
	return canonical;
}

export function adoptedWorkerId(coordinatorSessionId: string, sourceSessionId: string): string {
	if (!nonEmpty(coordinatorSessionId) || !nonEmpty(sourceSessionId)) {
		throw new Error("Coordinator and source session IDs are required for adopted worker identity");
	}
	return sha256Id("adopted-worker:", {
		coordinatorSessionId: coordinatorSessionId.trim(),
		sourceSessionId: sourceSessionId.trim(),
	});
}

/** Resolve and validate a stopped durable Pi session without mutating it. */
export async function resolveAdoptableSession(
	selector: SessionSelector,
	options: SessionAdoptionResolverOptions,
): Promise<AdoptableSession> {
	const sessionFile = await resolveSelectorPath(selector, options.listSessions ?? (() => SessionManager.listAll()));
	if (sessionFile === currentSessionPath(options.currentSessionFile)) {
		throw new Error("The coordinator cannot adopt its own active session");
	}

	const entries = readSessionEntries(sessionFile);
	const header = entries[0];
	if (!header || header.type !== "session") {
		throw new Error(`Session file has no Pi session header: ${sessionFile}`);
	}
	if (selector.kind === "id" && header.id !== selector.id.trim()) {
		throw new Error(`Session index mismatch: selected ID "${selector.id}" but ${sessionFile} contains "${header.id}"`);
	}
	if (!path.isAbsolute(header.cwd)) {
		throw new Error(`Session ${header.id} has a non-absolute working directory: ${header.cwd}`);
	}
	let cwdStat: fs.Stats;
	try {
		cwdStat = fs.statSync(header.cwd);
	} catch {
		throw new Error(`Session ${header.id} working directory does not exist: ${header.cwd}`);
	}
	if (!cwdStat.isDirectory()) {
		throw new Error(`Session ${header.id} working directory is not a directory: ${header.cwd}`);
	}

	const metadata = latestSessionMetadata(entries);
	const livePeer = (options.peers ?? []).find((peer) =>
		peer.sessionId === header.id
		|| (metadata.durableMeshId !== undefined
			&& (peer.meshId === metadata.durableMeshId || peer.id === metadata.durableMeshId)),
	);
	if (livePeer) {
		const label = livePeer.nickname ?? livePeer.name ?? livePeer.id;
		throw new Error(`Session ${header.id} is already active on mesh as ${label}`);
	}
	if ((options.isActivationHeld ?? isActivationLeaseHeldLive)(sessionFile)) {
		throw new Error(`Session ${header.id} already has a live activation lease`);
	}

	return {
		sessionId: header.id,
		sessionFile,
		cwd: header.cwd,
		...metadata,
	};
}
