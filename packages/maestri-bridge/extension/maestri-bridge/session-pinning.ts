import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import {
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	renameSync,
	symlinkSync,
	unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, normalize, resolve } from "node:path";

/**
 * Maestri terminal ↔ Pi session-file pinning.
 *
 * One symlink per canonical Maestri terminal UUID points at the authoritative
 * Pi JSONL session file. A symlink is the v2 mapping format; an old regular
 * file containing only a session id is legacy v1 and is never launchable.
 *
 * Why a symlink: it is an atomic, single-purpose filesystem pointer that a
 * POSIX launcher can consume without a second JSON parser. More importantly,
 * it identifies the concrete conversation file rather than a project-local id.
 */

/** Compatibility marker emitted during the v1 → v2 rollout. */
export const PIN_ENV = "PI_MAESTRI_PINNED";
/** Authoritative launch ownership state. */
export const PIN_MODE_ENV = "PI_MAESTRI_PIN_MODE";
export const MAESTRI_TERMINAL_ID_ENV = "MAESTRI_TERMINAL_ID";
export const PI_SESSION_ID_ENV = "PI_SESSION_ID";

export type PinLaunchMode = "resume" | "adopt" | "disabled" | "unmanaged";

export type TerminalPinState =
	| { kind: "missing" }
	| { kind: "pinned"; sessionFile: string }
	| { kind: "dangling"; sessionFile: string; reason: "missing" | "empty" }
	| { kind: "legacy"; sessionId: string }
	| { kind: "invalid"; reason: string };

/** Mirrors assertValidSessionId in Pi's SessionManager. Kept for v1 recovery. */
export function isValidSessionId(id: string): boolean {
	return /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/.test(id);
}

/** Canonical Maestri terminal UUID (8-4-4-4-12 hex). */
export function isValidTerminalId(id: string): boolean {
	return /^[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/.test(id);
}

/**
 * Strictly recognize a legacy v1 id file. Only the raw first line participates,
 * matching the shipped v1 launcher so --recover can migrate existing pins.
 */
export function parseLegacyMappingContent(
	content: string | undefined,
): string | undefined {
	if (content === undefined) return undefined;
	const newline = content.indexOf("\n");
	const firstLine = newline === -1 ? content : content.slice(0, newline);
	return isValidSessionId(firstLine) ? firstLine : undefined;
}

/** @deprecated v1 migration alias; new launch code consumes symlinks only. */
export const parseMappingContent = parseLegacyMappingContent;

/**
 * A stored session path must be a complete normalized absolute JSONL path.
 * Control bytes are rejected so shell command substitution can never normalize
 * the identity into another path. Existence is intentionally not required:
 * Pi assigns a new session filename at session_start before its first flush.
 */
export function isValidSessionFilePath(sessionFile: string): boolean {
	return (
		sessionFile.length > 0 &&
		sessionFile.length <= 4096 &&
		isAbsolute(sessionFile) &&
		normalize(sessionFile) === sessionFile &&
		sessionFile.endsWith(".jsonl") &&
		![...sessionFile].some((character) => {
			const code = character.charCodeAt(0);
			return code <= 0x1f || code === 0x7f;
		})
	);
}

/** Pi-compatible agent-directory resolution plus an explicit test seam. */
export function agentDir(home?: string): string {
	if (home !== undefined) return resolve(home, ".pi", "agent");
	const seam = process.env.PI_MAESTRI_BRIDGE_HOME;
	if (seam) return resolve(seam, ".pi", "agent");
	const custom = process.env.PI_CODING_AGENT_DIR;
	if (custom) return resolve(custom);
	return resolve(homedir(), ".pi", "agent");
}

export function mappingDir(home?: string): string {
	return join(agentDir(home), "maestri-sessions");
}

export function mappingPath(terminalId: string, home?: string): string {
	if (!isValidTerminalId(terminalId))
		throw new Error("terminal id is not a canonical UUID");
	return join(mappingDir(home), terminalId);
}

function missingError(error: unknown): boolean {
	return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

/** Classify the mapping filesystem entry without following the map symlink. */
export function terminalPinState(
	terminalId: string,
	home?: string,
): TerminalPinState {
	if (!isValidTerminalId(terminalId))
		return { kind: "invalid", reason: "terminal id is not a canonical UUID" };
	const path = mappingPath(terminalId, home);
	let stat: Stats;
	try {
		stat = lstatSync(path);
	} catch (error) {
		if (missingError(error)) return { kind: "missing" };
		return { kind: "invalid", reason: "mapping entry is unreadable" };
	}

	if (stat.isSymbolicLink()) {
		let sessionFile: string;
		try {
			sessionFile = readlinkSync(path, "utf8");
		} catch {
			return { kind: "invalid", reason: "mapping symlink is unreadable" };
		}
		if (!isValidSessionFilePath(sessionFile)) {
			return {
				kind: "invalid",
				reason: "mapping target is not a normalized absolute JSONL path",
			};
		}
		try {
			const target = lstatSync(sessionFile);
			if (!target.isFile())
				return {
					kind: "invalid",
					reason: "mapping target is not a regular file",
				};
			if (target.size === 0)
				return { kind: "dangling", sessionFile, reason: "empty" };
			return { kind: "pinned", sessionFile };
		} catch (error) {
			if (missingError(error))
				return { kind: "dangling", sessionFile, reason: "missing" };
			return { kind: "invalid", reason: "mapping target is unreadable" };
		}
	}

	if (stat.isFile()) {
		try {
			const sessionId = parseLegacyMappingContent(readFileSync(path, "utf8"));
			return sessionId === undefined
				? { kind: "invalid", reason: "legacy mapping content is invalid" }
				: { kind: "legacy", sessionId };
		} catch {
			return { kind: "invalid", reason: "legacy mapping is unreadable" };
		}
	}

	return {
		kind: "invalid",
		reason: "mapping entry is neither a symlink nor a regular legacy file",
	};
}

/** Return only a fully launchable concrete session file. */
export function pinnedSessionFileForTerminal(
	terminalId: string,
	home?: string,
): string | undefined {
	const state = terminalPinState(terminalId, home);
	return state.kind === "pinned" ? state.sessionFile : undefined;
}

/**
 * Publish the terminal's authoritative session file with an atomic symlink
 * replacement. Only managed wrapper launches call this function; unmanaged Pi
 * processes never create or mutate terminal ownership.
 */
export function recordSessionForTerminal(
	terminalId: string,
	sessionId: string,
	sessionFile: string,
	home?: string,
): "recorded" | "kept" | "rejected" {
	if (
		!isValidTerminalId(terminalId) ||
		!isValidSessionId(sessionId) ||
		!isValidSessionFilePath(sessionFile)
	) {
		return "rejected";
	}

	const current = terminalPinState(terminalId, home);
	if (
		(current.kind === "pinned" || current.kind === "dangling") &&
		current.sessionFile === sessionFile
	) {
		return "kept";
	}

	const dir = mappingDir(home);
	mkdirSync(dir, { recursive: true, mode: 0o700 });
	const path = mappingPath(terminalId, home);
	const tmp = join(dir, `.${terminalId}.tmp-${process.pid}-${randomUUID()}`);
	try {
		symlinkSync(sessionFile, tmp);
		// rename is atomic on POSIX when replacing a regular file or symlink. A
		// directory/device at the terminal-owned path is never removed implicitly;
		// rename fails and leaves that invalid evidence for operator inspection.
		renameSync(tmp, path);
		return "recorded";
	} finally {
		try {
			unlinkSync(tmp);
		} catch {
			// rename consumed it, or publication failed before creation
		}
	}
}

const PROCESS_MODE_KEY = Symbol.for("pi.maestri.pin.launch-mode");
type ProcessWithPinMode = NodeJS.Process & {
	[PROCESS_MODE_KEY]?: PinLaunchMode;
};

/** Pure parser used by tests and by the one-time environment consumer. */
export function parseLaunchMode(env: NodeJS.ProcessEnv): PinLaunchMode {
	const mode = env[PIN_MODE_ENV];
	if (mode === "resume" || mode === "adopt" || mode === "disabled") return mode;
	// One-release compatibility for a process started by the shipped v1 wrapper.
	if (env[PIN_ENV] === "1") return "resume";
	return "unmanaged";
}

/**
 * Consume wrapper ownership exactly once into process-local memory, deleting the
 * exported capability before user commands can spawn descendants. A nested bare
 * Pi therefore cannot inherit authority to replace this terminal's pin.
 */
export function consumeProcessLaunchMode(
	env: NodeJS.ProcessEnv = process.env,
): PinLaunchMode {
	const owner = process as ProcessWithPinMode;
	const supplied = parseLaunchMode(env);
	delete env[PIN_MODE_ENV];
	delete env[PIN_ENV];
	if (supplied !== "unmanaged") owner[PROCESS_MODE_KEY] = supplied;
	return owner[PROCESS_MODE_KEY] ?? "unmanaged";
}

export function processLaunchMode(): PinLaunchMode {
	return (process as ProcessWithPinMode)[PROCESS_MODE_KEY] ?? "unmanaged";
}

/** Re-expose ownership only immediately before Pi deliberately spawns a restart. */
export function exposeLaunchModeForRestart(
	mode: PinLaunchMode = processLaunchMode(),
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (mode === "unmanaged") return;
	env[PIN_MODE_ENV] = mode;
	if (mode === "resume" || mode === "adopt") env[PIN_ENV] = "1";
}

export function isManagedLaunch(
	mode: PinLaunchMode = processLaunchMode(),
): boolean {
	return mode === "resume" || mode === "adopt";
}

/** Test-only reset: production ownership lives for exactly one OS process. */
export function resetProcessLaunchModeForTests(): void {
	delete (process as ProcessWithPinMode)[PROCESS_MODE_KEY];
}

/** @deprecated compatibility alias for callers that only need ownership. */
export const isPinnedLaunch = isManagedLaunch;
