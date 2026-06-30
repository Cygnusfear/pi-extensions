import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createToolBindings } from "./sandbox-tools.ts";
import { spawnAsync } from "./shell-utils.ts";

function rgAvailable(): boolean {
	try {
		return spawnSync("rg", ["--version"]).status === 0;
	} catch {
		return false;
	}
}

// R2 — spawnAsync must reject a non-directory cwd with an actionable message,
// not the OS-level "ENOTDIR posix_spawn" that confused agents.
describe("spawnAsync — cwd validation (R2)", () => {
	test("a file path as cwd yields an actionable error, not ENOTDIR", async () => {
		const f = path.join(os.tmpdir(), `cwd-file-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
		fs.writeFileSync(f, "x", "utf8");
		const r = await spawnAsync({ cmd: "echo", args: ["hi"], cwd: f });
		expect(r.error).toBeTruthy();
		expect(r.error!.message).toContain("cwd is not a directory");
		expect(r.error!.message).not.toContain("ENOTDIR");
		fs.unlinkSync(f);
	});

	test("a real directory cwd runs normally", async () => {
		const r = await spawnAsync({ cmd: "echo", args: ["hi"], cwd: os.tmpdir() });
		expect(r.error).toBeFalsy();
		expect(r.stdout.trim()).toBe("hi");
	});
});

// R6 — rg/fd must never return stderr (filesystem traversal errors) as if it
// were match output. A broken symlink under the default --follow used to come
// back as a phantom "match".
describe("rg — stderr never masquerades as matches (R6)", () => {
	test("no-match search in a tree with a broken symlink returns empty, not the error", async () => {
		if (!rgAvailable()) return;
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-r6-"));
		fs.writeFileSync(path.join(dir, "real.txt"), "hello world\n", "utf8");
		fs.symlinkSync(path.join(dir, "does-not-exist"), path.join(dir, "broken"));
		const tools = createToolBindings({ cwd: dir, images: [] }) as Record<string, (a: unknown) => Promise<string>>;
		const out = await tools.rg({ args: "-l 'zzz_no_such_token_xyz'" });
		expect(out).toBe("");
		expect(out).not.toContain("No such file");
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test("a real match is still returned despite a broken symlink in the tree", async () => {
		if (!rgAvailable()) return;
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-r6b-"));
		fs.writeFileSync(path.join(dir, "real.txt"), "needle here\n", "utf8");
		fs.symlinkSync(path.join(dir, "nope"), path.join(dir, "broken"));
		const tools = createToolBindings({ cwd: dir, images: [] }) as Record<string, (a: unknown) => Promise<string>>;
		const out = await tools.rg({ args: "-l 'needle'" });
		expect(out).toContain("real.txt");
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test("a genuine pattern error throws (not a silent empty result)", async () => {
		if (!rgAvailable()) return;
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-r6c-"));
		fs.writeFileSync(path.join(dir, "real.txt"), "x\n", "utf8");
		const tools = createToolBindings({ cwd: dir, images: [] }) as Record<string, (a: unknown) => Promise<string>>;
		await expect(tools.rg({ args: "'('" })).rejects.toThrow("rg error");
		fs.rmSync(dir, { recursive: true, force: true });
	});
});
