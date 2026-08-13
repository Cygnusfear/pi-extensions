import { afterAll, describe, expect, test } from "bun:test";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	classifyMapping,
	collectPinnedEntries,
	collectPinnedEntriesFromFiles,
	coverageFor,
	scanLiveTerminalIds,
} from "../bin/maestri-pin-install";
import {
	collectLaunchAuditRows,
	dynamicTerminalCommand,
	parsePiCommand,
	rewritePiCommand,
	tokenizeSimpleCommand,
} from "../extension/maestri-bridge/maestri-config.ts";
import type { TerminalPinState } from "../extension/maestri-bridge/session-pinning.ts";

const TERMINAL = "AA000000-0000-4000-8000-000000000000";
const SESSION = "session-good";
const WRAPPER_ROOT = mkdtempSync(join(tmpdir(), "maestri-wrapper-fixture-"));
const WRAPPER = join(WRAPPER_ROOT, "custom agent", "bin", "pi-maestri");
mkdirSync(join(WRAPPER_ROOT, "custom agent", "bin"), { recursive: true });
writeFileSync(WRAPPER, "#!/bin/sh\nexit 0\n");
chmodSync(WRAPPER, 0o755);
afterAll(() => rmSync(WRAPPER_ROOT, { recursive: true, force: true }));
const AT = "2026-08-12T00:00:00.000Z";

function custom(data: Record<string, unknown>): string {
	return JSON.stringify({
		type: "custom",
		customType: "maestri-pi-bridge",
		data,
	});
}

function v1(overrides: Record<string, unknown> = {}): string {
	return custom({
		version: 1,
		event: "session-pinned",
		terminalId: TERMINAL,
		sessionId: SESSION,
		at: AT,
		...overrides,
	});
}

describe("legacy compatibility collector", () => {
	test("raw legacy classification remains strict", () => {
		expect(classifyMapping(undefined)).toBe("missing");
		expect(classifyMapping("abc\n")).toBe("valid");
		expect(classifyMapping("abc\r\n")).toBe("invalid");
	});

	test("strict timestamps and newest valid v1 evidence", () => {
		const newer = "2026-08-12T00:00:01.000Z";
		const found = collectPinnedEntries(
			[v1(), v1({ at: newer, sessionId: "new" }), v1({ at: "August 1, 2026" })],
			Date.parse(newer),
		);
		expect(found.get(TERMINAL)?.sessionId).toBe("new");
	});
});

describe("live terminal identity scan", () => {
	test("accepts only complete assignment scalars, never UUID prefixes", () => {
		const malformed = `${TERMINAL}-suffix`;
		expect(
			scanLiveTerminalIds(`cmd MAESTRI_TERMINAL_ID=${TERMINAL} x`),
		).toEqual({
			terminalIds: [TERMINAL],
			malformedValues: [],
		});
		expect(
			scanLiveTerminalIds(`cmd MAESTRI_TERMINAL_ID=${malformed} x`),
		).toEqual({
			terminalIds: [],
			malformedValues: [malformed],
		});
	});
});

describe("v2 coverage", () => {
	test("states are sorted and preserve concrete file evidence", () => {
		const states = new Map<string, TerminalPinState>([
			["B", { kind: "legacy", sessionId: "old" }],
			["A", { kind: "pinned", sessionFile: "/tmp/a.jsonl" }],
		]);
		expect(coverageFor(["B", "A"], (id) => states.get(id)!)).toEqual([
			{ terminalId: "A", verdict: "pinned", sessionFile: "/tmp/a.jsonl" },
			{ terminalId: "B", verdict: "legacy", detail: "old" },
		]);
	});
});

describe("provenance-strict containing-file recovery", () => {
	test("v1 record is bound to its containing valid session header", () => {
		const home = mkdtempSync(join(tmpdir(), "recover-files-"));
		try {
			const file = resolve(join(home, "session.jsonl"));
			writeFileSync(
				file,
				`${JSON.stringify({ type: "session", id: SESSION, cwd: home })}\n${v1()}\n`,
			);
			const found = collectPinnedEntriesFromFiles([file], Date.parse(AT));
			expect(found.get(TERMINAL)).toMatchObject({
				sessionId: SESSION,
				sessionFile: file,
				version: 1,
			});
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("v2 nominated path must equal the containing file", () => {
		const home = mkdtempSync(join(tmpdir(), "recover-v2-"));
		try {
			const file = resolve(join(home, "session.jsonl"));
			const valid = custom({
				version: 2,
				event: "session-pinned",
				terminalId: TERMINAL,
				sessionId: SESSION,
				sessionFile: file,
				launchMode: "resume",
				at: AT,
			});
			writeFileSync(
				file,
				`${JSON.stringify({ type: "session", id: SESSION, cwd: home })}\n${valid}\n`,
			);
			expect(
				collectPinnedEntriesFromFiles([file], Date.parse(AT)).get(TERMINAL)
					?.sessionFile,
			).toBe(file);
			const forged = custom({
				version: 2,
				event: "session-pinned",
				terminalId: TERMINAL,
				sessionId: SESSION,
				sessionFile: join(home, "other.jsonl"),
				at: AT,
			});
			writeFileSync(
				file,
				`${JSON.stringify({ type: "session", id: SESSION, cwd: home })}\n${forged}\n`,
			);
			expect(collectPinnedEntriesFromFiles([file], Date.parse(AT)).size).toBe(
				0,
			);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("header mismatch, malformed timestamp, future bound, and malformed JSON are rejected", () => {
		const home = mkdtempSync(join(tmpdir(), "recover-bad-"));
		try {
			const cases = [
				{ header: "different", entry: v1() },
				{ header: SESSION, entry: v1({ at: "2026-02-30T00:00:00.000Z" }) },
				{ header: SESSION, entry: v1({ at: "2026-08-14T00:00:00.001Z" }) },
			];
			for (const [index, item] of cases.entries()) {
				const file = resolve(join(home, `${index}.jsonl`));
				writeFileSync(
					file,
					`${JSON.stringify({ type: "session", id: item.header, cwd: home })}\n${item.entry}\n`,
				);
				expect(collectPinnedEntriesFromFiles([file], Date.parse(AT)).size).toBe(
					0,
				);
			}
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});
});

describe("safe Maestri command rewriting", () => {
	test("tokenizer handles quoting/backslashes and rejects shell composition", () => {
		expect(tokenizeSimpleCommand(`pi --name "hello world"`)).toEqual([
			"pi",
			"--name",
			"hello world",
		]);
		expect(tokenizeSimpleCommand(`pi --name hello\\ world`)).toEqual([
			"pi",
			"--name",
			"hello world",
		]);
		expect(tokenizeSimpleCommand("pi; rm -rf /")).toBeUndefined();
		expect(tokenizeSimpleCommand("pi 'unterminated")).toBeUndefined();
		expect(tokenizeSimpleCommand("pi trailing\\")).toBeUndefined();
	});

	test("all observed Pi command shapes rewrite to wrapper without losing argv", () => {
		for (const [command, args] of [
			["pi", []],
			["/opt/tools/pi --offline", ["--offline"]],
			[
				"pi --name CRITIC --model kimi-coding/k3",
				["--name", "CRITIC", "--model", "kimi-coding/k3"],
			],
			["pi --session 019fa09d", ["--session", "019fa09d"]],
			[
				"pi --name INTRO --no-session --session-id exec-fix --model x",
				[
					"--name",
					"INTRO",
					"--no-session",
					"--session-id",
					"exec-fix",
					"--model",
					"x",
				],
			],
		] as const) {
			const rewritten = rewritePiCommand(command, WRAPPER)!;
			expect(parsePiCommand(rewritten, WRAPPER)).toMatchObject({
				kind: "wrapper",
				args: [...args],
			});
		}
	});

	test("dynamic restored command strips stale persistent selectors but preserves flags", () => {
		expect(
			parsePiCommand(
				dynamicTerminalCommand("pi --name x --session old --model m", WRAPPER)!,
				WRAPPER,
			).args,
		).toEqual(["--name", "x", "--model", "m"]);
		expect(
			parsePiCommand(
				dynamicTerminalCommand(
					"pi --model --resume --name --no-session --session old",
					WRAPPER,
				)!,
				WRAPPER,
			).args,
		).toEqual(["--model", "--resume", "--name", "--no-session"]);
		expect(
			parsePiCommand(
				dynamicTerminalCommand("pi --model --session --session old", WRAPPER)!,
				WRAPPER,
			).args,
		).toEqual(["--model", "--session"]);
		expect(parsePiCommand("pi --name --no-session", WRAPPER).ephemeral).toBe(
			false,
		);
		expect(
			parsePiCommand(
				dynamicTerminalCommand(
					"pi --no-session --session-id eph --model m",
					WRAPPER,
				)!,
				WRAPPER,
			).args,
		).toEqual(["--no-session", "--session-id", "eph", "--model", "m"]);
	});

	test("only the absolute installed target is verified wrapper ownership", () => {
		expect(parsePiCommand("pi-maestri --offline", WRAPPER)).toMatchObject({
			kind: "other",
			args: ["--offline"],
		});
		expect(parsePiCommand("./not-the-wrapper/pi-maestri", WRAPPER).kind).toBe(
			"other",
		);
		expect(parsePiCommand("/opt/pi-maestri", WRAPPER).kind).toBe("other");
		expect(
			rewritePiCommand("/opt/pi-maestri --offline", WRAPPER),
		).toBeUndefined();
		expect(parsePiCommand("../custom agent/bin/pi-maestri", WRAPPER).kind).toBe(
			"other",
		);
		expect(parsePiCommand(`'${WRAPPER}' --offline`, WRAPPER).kind).toBe(
			"wrapper",
		);
		expect(rewritePiCommand("pi-maestri --offline", WRAPPER)).toBe(
			`'${WRAPPER}' --offline`,
		);
	});

	test("an absent or non-executable target never proves wrapper ownership", () => {
		const root = mkdtempSync(join(tmpdir(), "maestri-wrapper-ownership-"));
		try {
			const target = join(root, "pi-maestri");
			expect(parsePiCommand(target, target).kind).toBe("other");
			writeFileSync(target, "#!/bin/sh\n");
			chmodSync(target, 0o644);
			expect(parsePiCommand(target, target).kind).toBe("other");
			chmodSync(target, 0o755);
			expect(parsePiCommand(target, target).kind).toBe("wrapper");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("compound Pi commands are unsupported, never heuristically rewritten", () => {
		expect(rewritePiCommand("cd /tmp && pi", WRAPPER)).toBeUndefined();
		expect(parsePiCommand("pi | tee out", WRAPPER).kind).toBe("unsupported");
	});
});

describe("disk-backed launch audit", () => {
	test("preset command and terminal command+resumeCommand must all be wrapper-owned", () => {
		const root = mkdtempSync(join(tmpdir(), "maestri-config-"));
		try {
			mkdirSync(join(root, "workspaces", "ws"), { recursive: true });
			writeFileSync(
				join(root, "preferences.json"),
				JSON.stringify({
					payload: {
						agentPresets: [{ name: "Pi", agentType: "custom", command: "pi" }],
					},
				}),
			);
			writeFileSync(
				join(root, "workspaces", "ws", "workspace.json"),
				JSON.stringify({
					payload: {
						nodes: [
							{
								content: {
									terminal: {
										_0: {
											id: TERMINAL,
											name: "Pi",
											agentType: "custom",
											command: `'${WRAPPER}'`,
											resumeCommand: "pi --session stale",
										},
									},
								},
							},
						],
					},
				}),
			);
			const rows = collectLaunchAuditRows(root, WRAPPER, () => ({
				kind: "missing",
			}));
			expect(rows).toHaveLength(2);
			expect(rows[0]?.commandState).toBe("pi");
			expect(rows[1]).toMatchObject({
				commandState: "wrapper",
				resumeState: "pi",
				pinState: "missing",
			});
			const pinned = collectLaunchAuditRows(root, WRAPPER, () => ({
				kind: "pinned",
				sessionFile: "/tmp/session.jsonl",
			}));
			expect(pinned[1]?.pinState).toBe("pinned");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
