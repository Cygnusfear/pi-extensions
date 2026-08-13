import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	agentDir,
	consumeProcessLaunchMode,
	exposeLaunchModeForRestart,
	isManagedLaunch,
	isValidSessionFilePath,
	isValidSessionId,
	isValidTerminalId,
	mappingDir,
	mappingPath,
	parseLaunchMode,
	parseLegacyMappingContent,
	pinnedSessionFileForTerminal,
	processLaunchMode,
	recordSessionForTerminal,
	resetProcessLaunchModeForTests,
	terminalPinState,
} from "../extension/maestri-bridge/session-pinning.ts";

const TERMINAL = "DD4003FA-563A-4861-A094-3E41BFAFD46A";
const SESSION_A = "019ff6ff-38d3-7ff8-83dc-630a73433024";
const SESSION_B = "019ff700-0000-7000-8000-000000000042";
let home: string;
let sessionA: string;
let sessionB: string;

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "pi-maestri-pin-v2-"));
	const sessions = join(home, ".pi", "agent", "sessions", "--project--");
	mkdirSync(sessions, { recursive: true });
	sessionA = join(sessions, `a_${SESSION_A}.jsonl`);
	sessionB = join(sessions, `b_${SESSION_B}.jsonl`);
	writeFileSync(
		sessionA,
		`${JSON.stringify({ type: "session", id: SESSION_A, cwd: "/tmp/a" })}\n`,
	);
	writeFileSync(
		sessionB,
		`${JSON.stringify({ type: "session", id: SESSION_B, cwd: "/tmp/b" })}\n`,
	);
	resetProcessLaunchModeForTests();
});

afterEach(() => {
	resetProcessLaunchModeForTests();
	delete process.env.PI_MAESTRI_PIN_MODE;
	delete process.env.PI_MAESTRI_PINNED;
	delete process.env.PI_CODING_AGENT_DIR;
	delete process.env.PI_MAESTRI_BRIDGE_HOME;
	rmSync(home, { recursive: true, force: true });
});

describe("identity validation", () => {
	test("session ids mirror Pi and terminal ids are canonical UUID scalars", () => {
		expect(isValidSessionId(SESSION_A)).toBe(true);
		expect(isValidSessionId("-bad")).toBe(false);
		expect(isValidTerminalId(TERMINAL)).toBe(true);
		expect(isValidTerminalId(`${TERMINAL}\n${TERMINAL}`)).toBe(false);
	});

	test("session file paths are normalized absolute control-free JSONL paths", () => {
		expect(isValidSessionFilePath(sessionA)).toBe(true);
		expect(isValidSessionFilePath("relative.jsonl")).toBe(false);
		expect(isValidSessionFilePath(`${sessionA}\nother`)).toBe(false);
		expect(
			isValidSessionFilePath(`${dirname(sessionA)}/../project/x.jsonl`),
		).toBe(false);
		expect(isValidSessionFilePath(`${sessionA}.txt`)).toBe(false);
	});
});

describe("v2 concrete-file pin state", () => {
	test("missing → record → pinned symlink", () => {
		expect(terminalPinState(TERMINAL, home)).toEqual({ kind: "missing" });
		expect(recordSessionForTerminal(TERMINAL, SESSION_A, sessionA, home)).toBe(
			"recorded",
		);
		const map = mappingPath(TERMINAL, home);
		expect(lstatSync(map).isSymbolicLink()).toBe(true);
		expect(readlinkSync(map)).toBe(sessionA);
		expect(terminalPinState(TERMINAL, home)).toEqual({
			kind: "pinned",
			sessionFile: sessionA,
		});
		expect(pinnedSessionFileForTerminal(TERMINAL, home)).toBe(sessionA);
	});

	test("same target is kept; a deliberate session move atomically replaces it", () => {
		expect(recordSessionForTerminal(TERMINAL, SESSION_A, sessionA, home)).toBe(
			"recorded",
		);
		expect(recordSessionForTerminal(TERMINAL, SESSION_A, sessionA, home)).toBe(
			"kept",
		);
		expect(recordSessionForTerminal(TERMINAL, SESSION_B, sessionB, home)).toBe(
			"recorded",
		);
		expect(readlinkSync(mappingPath(TERMINAL, home))).toBe(sessionB);
		expect(readdirSync(mappingDir(home))).toEqual([TERMINAL]);
	});

	test("session filename assigned before first flush is represented as dangling until created", () => {
		const pending = join(dirname(sessionA), `pending_${SESSION_A}.jsonl`);
		expect(recordSessionForTerminal(TERMINAL, SESSION_A, pending, home)).toBe(
			"recorded",
		);
		expect(terminalPinState(TERMINAL, home)).toEqual({
			kind: "dangling",
			sessionFile: pending,
			reason: "missing",
		});
		writeFileSync(
			pending,
			`${JSON.stringify({ type: "session", id: SESSION_A, cwd: "/tmp" })}\n`,
		);
		expect(terminalPinState(TERMINAL, home)).toEqual({
			kind: "pinned",
			sessionFile: pending,
		});
	});

	test("empty, missing, malformed, and legacy entries remain distinguishable", () => {
		mkdirSync(mappingDir(home), { recursive: true });
		const map = mappingPath(TERMINAL, home);
		const empty = join(dirname(sessionA), "empty.jsonl");
		writeFileSync(empty, "");
		symlinkSync(empty, map);
		expect(terminalPinState(TERMINAL, home)).toEqual({
			kind: "dangling",
			sessionFile: empty,
			reason: "empty",
		});
		unlinkSync(map);
		symlinkSync(join(dirname(sessionA), "gone.jsonl"), map);
		expect(terminalPinState(TERMINAL, home).kind).toBe("dangling");
		unlinkSync(map);
		writeFileSync(map, `${SESSION_A}\n`);
		expect(terminalPinState(TERMINAL, home)).toEqual({
			kind: "legacy",
			sessionId: SESSION_A,
		});
		writeFileSync(map, "bad/session\n");
		expect(terminalPinState(TERMINAL, home).kind).toBe("invalid");
	});

	test("an invalid directory map is never removed during publication", () => {
		const path = mappingPath(TERMINAL, home);
		mkdirSync(path, { recursive: true });
		expect(() =>
			recordSessionForTerminal(TERMINAL, SESSION_A, sessionA, home),
		).toThrow();
		expect(terminalPinState(TERMINAL, home)).toMatchObject({ kind: "invalid" });
		expect(existsSync(path)).toBe(true);
	});

	test("invalid identities and paths are rejected without touching the store", () => {
		expect(recordSessionForTerminal("../bad", SESSION_A, sessionA, home)).toBe(
			"rejected",
		);
		expect(recordSessionForTerminal(TERMINAL, "bad id", sessionA, home)).toBe(
			"rejected",
		);
		expect(
			recordSessionForTerminal(TERMINAL, SESSION_A, "relative.jsonl", home),
		).toBe("rejected");
		expect(existsSync(mappingDir(home))).toBe(false);
	});
});

describe("legacy v1 recognition", () => {
	test("raw first-line contract remains only for explicit recovery", () => {
		expect(parseLegacyMappingContent("abc-123\n")).toBe("abc-123");
		expect(parseLegacyMappingContent("abc-123\r\n")).toBeUndefined();
		expect(parseLegacyMappingContent("bad/session\n")).toBeUndefined();
	});
});

describe("process-local launch ownership", () => {
	test("pure launch-mode parser covers resume/adopt/disabled/compat/unmanaged", () => {
		expect(
			parseLaunchMode({ PI_MAESTRI_PIN_MODE: "resume" } as NodeJS.ProcessEnv),
		).toBe("resume");
		expect(
			parseLaunchMode({ PI_MAESTRI_PIN_MODE: "adopt" } as NodeJS.ProcessEnv),
		).toBe("adopt");
		expect(
			parseLaunchMode({ PI_MAESTRI_PIN_MODE: "disabled" } as NodeJS.ProcessEnv),
		).toBe("disabled");
		expect(
			parseLaunchMode({ PI_MAESTRI_PINNED: "1" } as NodeJS.ProcessEnv),
		).toBe("resume");
		expect(parseLaunchMode({} as NodeJS.ProcessEnv)).toBe("unmanaged");
	});

	test("consumption deletes inherited capability while retaining process ownership", () => {
		const env = {
			PI_MAESTRI_PIN_MODE: "adopt",
			PI_MAESTRI_PINNED: "1",
		} as NodeJS.ProcessEnv;
		expect(consumeProcessLaunchMode(env)).toBe("adopt");
		expect(env.PI_MAESTRI_PIN_MODE).toBeUndefined();
		expect(env.PI_MAESTRI_PINNED).toBeUndefined();
		expect(processLaunchMode()).toBe("adopt");
		expect(isManagedLaunch()).toBe(true);
	});

	test("restart exposure is explicit and unmanaged processes gain nothing", () => {
		const env = {} as NodeJS.ProcessEnv;
		exposeLaunchModeForRestart("resume", env);
		expect(env).toEqual({
			PI_MAESTRI_PIN_MODE: "resume",
			PI_MAESTRI_PINNED: "1",
		});
		const none = {} as NodeJS.ProcessEnv;
		exposeLaunchModeForRestart("unmanaged", none);
		expect(none).toEqual({});
	});
});

describe("agentDir resolution", () => {
	test("explicit home, test seam, Pi override, and default", () => {
		expect(agentDir(home)).toBe(resolve(home, ".pi", "agent"));
		process.env.PI_MAESTRI_BRIDGE_HOME = home;
		process.env.PI_CODING_AGENT_DIR = "/ignored";
		expect(agentDir()).toBe(resolve(home, ".pi", "agent"));
		delete process.env.PI_MAESTRI_BRIDGE_HOME;
		process.env.PI_CODING_AGENT_DIR = join(home, "custom-agent");
		expect(agentDir()).toBe(resolve(home, "custom-agent"));
		delete process.env.PI_CODING_AGENT_DIR;
		expect(agentDir()).toBe(resolve(homedir(), ".pi", "agent"));
	});
});

function dirname(path: string): string {
	return path.slice(0, path.lastIndexOf("/"));
}
