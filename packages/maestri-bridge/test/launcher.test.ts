import { describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WRAPPER = join(import.meta.dir, "..", "bin", "pi-maestri");
const TERMINAL = "DD4003FA-563A-4861-A094-3E41BFAFD46A";

interface Launch {
	args: string[];
	mode: string;
	pinned: string;
	stderr: string;
	code: number;
	piInvoked: boolean;
}

function runWrapper(
	home: string,
	env: Record<string, string | undefined>,
	argv: string[] = [],
	cwd = home,
): Launch {
	mkdirSync(join(home, "shim"), { recursive: true });
	writeFileSync(
		join(home, "shim", "pi"),
		`#!/bin/sh
printf '%s\\n' "$@" > "$PI_MAESTRI_TEST_OUTPUT_DIR/args.txt"
printf '%s' "$PI_MAESTRI_PIN_MODE" > "$PI_MAESTRI_TEST_OUTPUT_DIR/mode.txt"
printf '%s' "$PI_MAESTRI_PINNED" > "$PI_MAESTRI_TEST_OUTPUT_DIR/pinned.txt"
touch "$PI_MAESTRI_TEST_OUTPUT_DIR/invoked.txt"
`,
		{ mode: 0o755 },
	);
	const cleanEnv: Record<string, string> = {
		HOME: home,
		PATH: `${join(home, "shim")}:/usr/bin:/bin`,
		PI_MAESTRI_BRIDGE_HOME: home,
		PI_MAESTRI_TEST_OUTPUT_DIR: home,
	};
	for (const [key, value] of Object.entries(env))
		if (value !== undefined) cleanEnv[key] = value;
	const result = Bun.spawnSync(["sh", WRAPPER, ...argv], {
		cwd,
		env: cleanEnv,
		stdout: "pipe",
		stderr: "pipe",
	});
	const outputDir =
		process.platform === "darwin" && home.startsWith("/var/")
			? `/private${home}`
			: home;
	const text = (name: string) => {
		try {
			return readFileSync(join(outputDir, name), "utf8");
		} catch {
			return "";
		}
	};
	return {
		args: text("args.txt").split("\n").filter(Boolean),
		mode: text("mode.txt"),
		pinned: text("pinned.txt"),
		stderr: new TextDecoder().decode(result.stderr),
		code: result.exitCode,
		piInvoked: (() => {
			try {
				readFileSync(join(outputDir, "invoked.txt"));
				return true;
			} catch {
				return false;
			}
		})(),
	};
}

function freshHome(): string {
	return mkdtempSync(join(tmpdir(), "pi-maestri-launch-v2-"));
}

function mapPath(home: string): string {
	const dir = join(home, ".pi", "agent", "maestri-sessions");
	mkdirSync(dir, { recursive: true });
	return join(dir, TERMINAL);
}

function sessionFile(home: string, id = "session-a"): string {
	const dir = join(home, ".pi", "agent", "sessions", "--project-a--");
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${id}.jsonl`);
	writeFileSync(
		file,
		`${JSON.stringify({ type: "session", id, cwd: "/tmp/project-a" })}\n`,
	);
	return file;
}

function cleanup(home: string): void {
	rmSync(home, { recursive: true, force: true });
}

describe("pi-maestri concrete-file launcher", () => {
	test("outside Maestri is exact plain passthrough", () => {
		const home = freshHome();
		const launch = runWrapper(home, {}, ["hello", "world"]);
		expect(launch).toMatchObject({
			code: 0,
			args: ["hello", "world"],
			mode: "",
			pinned: "",
			piInvoked: true,
		});
		cleanup(home);
	});

	test("new terminal bootstraps deterministic id in resume mode", () => {
		const home = freshHome();
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
			"--model",
			"x",
		]);
		expect(launch).toMatchObject({
			code: 0,
			args: ["--session-id", TERMINAL.toLowerCase(), "--model", "x"],
			mode: "resume",
			pinned: "1",
			piInvoked: true,
		});
		cleanup(home);
	});

	test("v2 pin resumes exact absolute file even from another cwd", () => {
		const home = freshHome();
		const file = sessionFile(home);
		symlinkSync(file, mapPath(home));
		const other = join(home, "different-project");
		mkdirSync(other);
		const launch = runWrapper(
			home,
			{ MAESTRI_TERMINAL_ID: TERMINAL },
			["--model", "x"],
			other,
		);
		expect(launch).toMatchObject({
			code: 0,
			args: ["--session", file, "--model", "x"],
			mode: "resume",
			pinned: "1",
		});
		cleanup(home);
	});

	for (const [name, argv] of [
		["--session", ["--session", "/tmp/chosen.jsonl"]],
		["--session-id", ["--session-id", "chosen"]],
		["--continue", ["--continue"]],
		["-c", ["-c"]],
		["--resume", ["--resume"]],
		["-r", ["-r"]],
		["--fork", ["--fork", "source"]],
	] as const) {
		test(`explicit persistent selector ${name} adopts without stale pin injection`, () => {
			const home = freshHome();
			const file = sessionFile(home);
			symlinkSync(file, mapPath(home));
			const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
				...argv,
				"--model",
				"x",
			]);
			expect(launch).toMatchObject({
				code: 0,
				args: [...argv, "--model", "x"],
				mode: "adopt",
				pinned: "1",
			});
			cleanup(home);
		});
	}

	test("host restart argv adopts the active concrete session without stale-map injection", () => {
		const home = freshHome();
		const stale = sessionFile(home, "stale-session");
		symlinkSync(stale, mapPath(home));
		const active = sessionFile(home, "active-session");
		const hostRestartArgv = ["--model", "x", "--session", active];
		const launch = runWrapper(
			home,
			{ MAESTRI_TERMINAL_ID: TERMINAL },
			hostRestartArgv,
		);
		expect(launch).toMatchObject({
			code: 0,
			args: hostRestartArgv,
			mode: "adopt",
			pinned: "1",
			piInvoked: true,
		});
		expect(launch.args).not.toContain(stale);
		cleanup(home);
	});

	test("--no-session has priority and is deliberately disabled", () => {
		const home = freshHome();
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
			"--session-id",
			"ephemeral",
			"--no-session",
		]);
		expect(launch).toMatchObject({
			code: 0,
			args: ["--session-id", "ephemeral", "--no-session"],
			mode: "disabled",
			pinned: "",
		});
		cleanup(home);
	});

	test("every Pi value-taking flag shields a selector-shaped value", () => {
		const home = freshHome();
		const file = sessionFile(home);
		symlinkSync(file, mapPath(home));
		const valueFlags = [
			"--mode",
			"--provider",
			"--model",
			"--api-key",
			"--system-prompt",
			"--append-system-prompt",
			"--name",
			"-n",
			"--session-dir",
			"--models",
			"--tools",
			"-t",
			"--exclude-tools",
			"-xt",
			"--extension",
			"-e",
			"--skill",
			"--prompt-template",
			"--theme",
			"--thinking",
			"--export",
		];
		for (const flag of valueFlags) {
			const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
				flag,
				"--no-session",
			]);
			expect(launch.mode).toBe("resume");
			expect(launch.args).toEqual(["--session", file, flag, "--no-session"]);
		}
		cleanup(home);
	});

	test("selector-shaped option values are data, not ownership flags", () => {
		const home = freshHome();
		const file = sessionFile(home);
		symlinkSync(file, mapPath(home));
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
			"--model",
			"--resume",
			"--name",
			"--no-session",
		]);
		expect(launch).toMatchObject({
			code: 0,
			args: [
				"--session",
				file,
				"--model",
				"--resume",
				"--name",
				"--no-session",
			],
			mode: "resume",
		});
		cleanup(home);
	});

	test("ordinary positional text containing a selector is not misclassified", () => {
		const home = freshHome();
		const file = sessionFile(home);
		symlinkSync(file, mapPath(home));
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
			"explain --fork semantics",
		]);
		expect(launch).toMatchObject({
			code: 0,
			args: ["--session", file, "explain --fork semantics"],
			mode: "resume",
		});
		cleanup(home);
	});
});

describe("fail-loud map boundaries", () => {
	test("legacy regular map blocks before invoking Pi", () => {
		const home = freshHome();
		writeFileSync(mapPath(home), "old-session-id\n");
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL }, [
			"hello",
		]);
		expect(launch.code).toBe(78);
		expect(launch.piInvoked).toBe(false);
		expect(launch.stderr).toContain("legacy or invalid");
		cleanup(home);
	});

	test("missing target blocks before invoking Pi", () => {
		const home = freshHome();
		symlinkSync(join(home, "gone.jsonl"), mapPath(home));
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL });
		expect(launch.code).toBe(78);
		expect(launch.piInvoked).toBe(false);
		expect(launch.stderr).toContain("missing");
		cleanup(home);
	});

	test("empty target blocks before invoking Pi", () => {
		const home = freshHome();
		const empty = join(home, "empty.jsonl");
		writeFileSync(empty, "");
		symlinkSync(empty, mapPath(home));
		const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL });
		expect(launch.code).toBe(78);
		expect(launch.piInvoked).toBe(false);
		expect(launch.stderr).toContain("empty");
		cleanup(home);
	});

	test("relative, non-jsonl, and control-byte symlink targets block", () => {
		for (const target of [
			"relative.jsonl",
			join(freshHome(), "not-jsonl.txt"),
			`/tmp/x.jsonl\n/tmp/y.jsonl`,
		]) {
			const home = freshHome();
			try {
				symlinkSync(target, mapPath(home));
				const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: TERMINAL });
				expect(launch.code).toBe(78);
				expect(launch.piInvoked).toBe(false);
			} finally {
				cleanup(home);
			}
		}
	});
});

describe("terminal UUID whole-scalar validation", () => {
	for (const value of [
		"../foreign-map",
		"------------------------------------",
		"DD4003F--563A-4861-A094-3E41BFAFD46A",
		`${TERMINAL}\n../foreign-map`,
		`../foreign-map\n${TERMINAL}`,
		`${TERMINAL}\n${TERMINAL}`,
		`${TERMINAL}\n`,
	]) {
		test(`invalid scalar ${JSON.stringify(value)} fails closed to plain Pi`, () => {
			const home = freshHome();
			const launch = runWrapper(home, { MAESTRI_TERMINAL_ID: value }, [
				"keep",
				"exact",
			]);
			expect(launch).toMatchObject({
				code: 0,
				args: ["keep", "exact"],
				mode: "",
				pinned: "",
				piInvoked: true,
			});
			expect(launch.stderr).toContain("not a canonical UUID");
			cleanup(home);
		});
	}
});
