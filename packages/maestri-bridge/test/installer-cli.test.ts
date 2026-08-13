import { describe, expect, test } from "bun:test";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const INSTALLER = join(import.meta.dir, "..", "bin", "maestri-pin-install");
const TERMINAL = "AA000000-0000-4000-8000-000000000000";
const SESSION = "session-good";

function runInstaller(
	home: string,
	args: string[],
	extra: Record<string, string> = {},
) {
	const env = {
		...process.env,
		HOME: home,
		PI_MAESTRI_BRIDGE_HOME: home,
		PI_MAESTRI_CONFIG_HOME: join(home, ".maestri"),
		...extra,
	};
	const result = Bun.spawnSync([process.execPath, INSTALLER, ...args], {
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		code: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

function session(
	home: string,
	terminalId = TERMINAL,
	version: 1 | 2 = 1,
): string {
	const dir = join(home, ".pi", "agent", "sessions", "--project--");
	mkdirSync(dir, { recursive: true });
	const file = resolve(join(dir, `${SESSION}.jsonl`));
	const data: Record<string, unknown> = {
		version,
		event: "session-pinned",
		terminalId,
		sessionId: SESSION,
		at: "2026-08-12T00:00:00.000Z",
	};
	if (version === 2) data.sessionFile = file;
	writeFileSync(
		file,
		`${JSON.stringify({ type: "session", version: 3, id: SESSION, timestamp: "2026-08-12T00:00:00.000Z", cwd: home })}\n` +
			`${JSON.stringify({ type: "custom", customType: "maestri-pi-bridge", data })}\n`,
	);
	return file;
}

function config(home: string): { preferences: string; workspace: string } {
	const root = join(home, ".maestri");
	const wsDir = join(root, "workspaces", "ws");
	mkdirSync(wsDir, { recursive: true });
	const preferences = join(root, "preferences.json");
	const workspace = join(wsDir, "workspace.json");
	writeFileSync(
		preferences,
		JSON.stringify({
			payload: {
				agentPresets: [
					{ name: "Pi", agentType: "custom", command: "pi --model x" },
				],
			},
		}),
	);
	writeFileSync(
		workspace,
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
									command: "pi --name work --session old --model x",
									resumeCommand: "pi --session stale",
								},
							},
						},
					},
					{
						content: {
							terminal: {
								_0: {
									id: "BB000000-0000-4000-8000-000000000000",
									name: "Pi ephemeral",
									agentType: "custom",
									command: "pi --no-session --session-id eph --model x",
								},
							},
						},
					},
				],
			},
		}),
	);
	return { preferences, workspace };
}

describe("maestri-pin-install v2 subprocess", () => {
	test("unknown arguments fail with EX_USAGE and no mutation", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-unknown-v2-"));
		try {
			const result = runInstaller(home, ["--recvoer"]);
			expect(result.code).toBe(64);
			expect(result.stderr).toContain("--recvoer");
			expect(result.stderr).toContain("usage:");
			expect(existsSync(join(home, ".pi", "agent"))).toBe(false);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--install targets the test agent root", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-install-v2-"));
		try {
			const result = runInstaller(home, ["--install"]);
			expect(result.code).toBe(0);
			expect(existsSync(join(home, ".pi", "agent", "bin", "pi-maestri"))).toBe(
				true,
			);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--recover upgrades v1 evidence to a concrete symlink", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-recover-v2-"));
		try {
			const file = session(home, TERMINAL, 1);
			const result = runInstaller(home, ["--recover"]);
			const map = join(home, ".pi", "agent", "maestri-sessions", TERMINAL);
			expect(result.code).toBe(0);
			expect(result.stdout).toContain("from v1 record");
			expect(lstatSync(map).isSymbolicLink()).toBe(true);
			expect(readlinkSync(map)).toBe(file);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--recover replaces legacy/invalid entries but keeps an existing valid v2 pin", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-recover-keep-"));
		try {
			const file = session(home, TERMINAL, 2);
			const mapDir = join(home, ".pi", "agent", "maestri-sessions");
			mkdirSync(mapDir, { recursive: true });
			writeFileSync(join(mapDir, TERMINAL), "legacy-old\n");
			expect(runInstaller(home, ["--recover"]).code).toBe(0);
			expect(readlinkSync(join(mapDir, TERMINAL))).toBe(file);
			const second = runInstaller(home, ["--recover"]);
			expect(second.stdout).toContain("kept");
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--recover fails closed when a legacy pin has no provenance-valid session file", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-recover-unbound-"));
		try {
			const file = session(home, TERMINAL, 2);
			const unbound = "CC000000-0000-4000-8000-000000000000";
			const mapDir = join(home, ".pi", "agent", "maestri-sessions");
			mkdirSync(mapDir, { recursive: true });
			writeFileSync(join(mapDir, unbound), "legacy-without-evidence\n");
			const result = runInstaller(home, ["--recover"]);
			expect(result.code).toBe(1);
			expect(result.stderr).toContain(unbound);
			expect(result.stderr).toContain("do not restart Maestri");
			expect(file.length).toBeGreaterThan(0);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--audit blocks bare commands and stale/missing resumeCommand", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-audit-v2-"));
		try {
			config(home);
			const result = runInstaller(home, ["--audit"]);
			expect(result.code).toBe(1);
			expect(result.stdout).toContain("BLOCKED");
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("bare wrapper commands remain blocked until patch normalizes them", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-bare-wrapper-v2-"));
		try {
			const paths = config(home);
			session(home, TERMINAL, 2);
			expect(runInstaller(home, ["--recover"]).code).toBe(0);
			for (const path of [paths.preferences, paths.workspace]) {
				const data = JSON.parse(readFileSync(path, "utf8"));
				if (path === paths.preferences)
					data.payload.agentPresets[0].command = "pi-maestri --model x";
				else {
					const terminal = data.payload.nodes[0].content.terminal._0;
					terminal.command = "pi-maestri --model x";
					terminal.resumeCommand = "pi-maestri --model x";
				}
				writeFileSync(path, JSON.stringify(data));
			}
			const audit = runInstaller(home, ["--audit"], { PATH: "/usr/bin:/bin" });
			expect(audit.code).toBe(1);
			expect(audit.stdout).toContain("BLOCKED");
			const patch = runInstaller(home, ["--install", "--patch"], {
				PI_MAESTRI_ALLOW_RUNNING_PATCH: "1",
				PATH: "/usr/bin:/bin",
			});
			expect(patch.code).toBe(0);
			const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
			const workspace = JSON.parse(readFileSync(paths.workspace, "utf8"));
			const terminal = workspace.payload.nodes[0].content.terminal._0;
			expect(terminal.command).toContain(wrapper);
			expect(terminal.resumeCommand).toContain(wrapper);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("absolute persisted commands remain blocked until the wrapper is installed", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-missing-wrapper-v2-"));
		try {
			const paths = config(home);
			session(home, TERMINAL, 2);
			expect(runInstaller(home, ["--recover"]).code).toBe(0);
			const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
			for (const path of [paths.preferences, paths.workspace]) {
				const data = JSON.parse(readFileSync(path, "utf8"));
				if (path === paths.preferences) {
					data.payload.agentPresets[0].command = wrapper;
				} else {
					const terminal = data.payload.nodes[0].content.terminal._0;
					terminal.command = wrapper;
					terminal.resumeCommand = wrapper;
					const ephemeral = data.payload.nodes[1].content.terminal._0;
					ephemeral.command = `${wrapper} --no-session`;
					ephemeral.resumeCommand = `${wrapper} --no-session`;
				}
				writeFileSync(path, JSON.stringify(data));
			}
			const beforeInstall = runInstaller(home, ["--audit"]);
			expect(beforeInstall.code).toBe(1);
			expect(beforeInstall.stdout).toContain("BLOCKED");
			const installed = runInstaller(home, ["--install"]);
			expect(installed.code).toBe(0);
			const afterInstall = runInstaller(home, ["--audit"]);
			if (afterInstall.code !== 0)
				throw new Error(
					`audit after install failed:\n${afterInstall.stdout}\n${afterInstall.stderr}`,
				);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("malformed later config blocks patch before any mutation or backup", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-malformed-preflight-v2-"));
		try {
			const paths = config(home);
			const before = readFileSync(paths.preferences, "utf8");
			writeFileSync(paths.workspace, "{ malformed");
			const result = runInstaller(home, ["--patch"], {
				PI_MAESTRI_ALLOW_RUNNING_PATCH: "1",
			});
			expect(result.code).toBe(1);
			expect(result.stderr).toContain("preflight failed before any mutation");
			expect(result.stderr).toContain(paths.workspace);
			expect(readFileSync(paths.preferences, "utf8")).toBe(before);
			const backupProbe = Bun.spawnSync([
				"sh",
				"-c",
				`ls ${paths.preferences}.pin-backup-* >/dev/null 2>&1`,
			]);
			expect(backupProbe.exitCode).not.toBe(0);
			const audit = runInstaller(home, ["--audit"]);
			expect(audit.code).toBe(1);
			expect(audit.stdout).toContain("malformed configuration");
			expect(audit.stdout).toContain(paths.workspace);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("mid-transaction rename failure restores every changed input byte", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-rollback-v2-"));
		try {
			const paths = config(home);
			const beforePreferences = readFileSync(paths.preferences, "utf8");
			const beforeWorkspace = readFileSync(paths.workspace, "utf8");
			const result = runInstaller(home, ["--patch"], {
				PI_MAESTRI_ALLOW_RUNNING_PATCH: "1",
				PI_MAESTRI_TEST_FAIL_AFTER_RENAMES: "1",
			});
			expect(result.code).toBe(1);
			expect(result.stderr).toContain("prior files were restored");
			expect(readFileSync(paths.preferences, "utf8")).toBe(beforePreferences);
			expect(readFileSync(paths.workspace, "utf8")).toBe(beforeWorkspace);
			const backups = Bun.spawnSync([
				"sh",
				"-c",
				`find ${home} -name '*.pin-backup-*' -print`,
			]);
			expect(backups.stdout.toString().trim()).toBe("");
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("--patch rewrites preset, terminal command, and native resumeCommand then passes audit", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-patch-v2-"));
		try {
			const paths = config(home);
			session(home, TERMINAL, 2);
			expect(runInstaller(home, ["--recover"]).code).toBe(0);
			const result = runInstaller(home, ["--install", "--patch"], {
				PI_MAESTRI_ALLOW_RUNNING_PATCH: "1",
			});
			expect(result.code).toBe(0);
			expect(result.stdout).toContain("audit:");
			const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
			const pref = JSON.parse(readFileSync(paths.preferences, "utf8"));
			expect(pref.payload.agentPresets[0].command).toContain(wrapper);
			const ws = JSON.parse(readFileSync(paths.workspace, "utf8"));
			const normal = ws.payload.nodes[0].content.terminal._0;
			expect(normal.command).not.toContain("--session old");
			expect(normal.resumeCommand).toContain(wrapper);
			expect(normal.resumeCommand).not.toContain("--session old");
			const ephemeral = ws.payload.nodes[1].content.terminal._0;
			expect(ephemeral.resumeCommand).toContain("--no-session");
			expect(ephemeral.resumeCommand).toContain("--session-id eph");
			expect(existsSync(`${paths.preferences}.pin-backup-`)).toBe(false);
			expect(
				Bun.spawnSync([
					"sh",
					"-c",
					`ls ${paths.preferences}.pin-backup-* >/dev/null`,
				]).exitCode,
			).toBe(0);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("combined requested phases all run even when an earlier audit fails", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-phases-v2-"));
		try {
			config(home);
			const result = runInstaller(home, ["--audit", "--install"]);
			expect(result.code).toBe(1);
			expect(result.stdout).toContain("BLOCKED");
			expect(result.stdout).toContain("install:");
			expect(existsSync(join(home, ".pi", "agent", "bin", "pi-maestri"))).toBe(
				true,
			);
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("unsupported compound Pi command remains blocked rather than heuristically rewritten", () => {
		const home = mkdtempSync(join(tmpdir(), "pin-compound-v2-"));
		try {
			const { preferences } = config(home);
			const pref = JSON.parse(readFileSync(preferences, "utf8"));
			pref.payload.agentPresets[0].command = "cd /tmp && pi";
			writeFileSync(preferences, JSON.stringify(pref));
			const result = runInstaller(home, ["--patch"], {
				PI_MAESTRI_ALLOW_RUNNING_PATCH: "1",
			});
			expect(result.code).toBe(1);
			expect(result.stdout).toContain("BLOCKED");
			expect(
				JSON.parse(readFileSync(preferences, "utf8")).payload.agentPresets[0]
					.command,
			).toBe("cd /tmp && pi");
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});
});
