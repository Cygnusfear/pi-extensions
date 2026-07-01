import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rtkRewrite, rtkSplitTee } from "./sandbox-tools.ts";
import { rtkDep } from "./rtk-dep.ts";

describe("rtkSplitTee — failure-tee raw extraction + reference stripping", () => {
	test("reads the tee file and strips the [full output: ...] reference from the view", () => {
		const tee = path.join(os.tmpdir(), `rtk-test-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
		fs.writeFileSync(tee, "FULL RAW OUTPUT\nline2\nerror[E0001]", "utf8");
		const { compacted, raw } = rtkSplitTee(`error: 1 error\n[full output: ${tee}]`);
		expect(compacted).toBe("error: 1 error");
		expect(raw).toBe("FULL RAW OUTPUT\nline2\nerror[E0001]");
		fs.unlinkSync(tee);
	});
	test("no tee reference (e.g. success) → raw null, compacted unchanged", () => {
		const { compacted, raw } = rtkSplitTee("TypeScript: No errors found");
		expect(raw).toBeNull();
		expect(compacted).toBe("TypeScript: No errors found");
	});
	test("missing tee file → raw null (graceful), reference still stripped", () => {
		const { compacted, raw } = rtkSplitTee("x\n[full output: /nonexistent/zzz.log]");
		expect(raw).toBeNull();
		expect(compacted).toBe("x");
	});
	test("expands a leading ~ in the tee path", () => {
		const name = `rtk-home-${Date.now()}.log`;
		const abs = path.join(os.homedir(), name);
		fs.writeFileSync(abs, "home-tee", "utf8");
		const { raw } = rtkSplitTee(`done\n[full output: ~/${name}]`);
		expect(raw).toBe("home-tee");
		fs.unlinkSync(abs);
	});
});

describe("rtkDep + rtkRewrite — real rtk binary (skips when rtk is absent)", () => {
	test("rewrites a handled command, passes through a non-handled one, handles compound", async () => {
		const bin = rtkDep.resolved;
		if (!bin) return; // rtk not installed in this environment — skip
		expect(await rtkRewrite(bin, "cargo build", process.env)).toBe("rtk cargo build");
		expect(await rtkRewrite(bin, "mkdir foo_rtk_test", process.env)).toBeNull();
		expect(await rtkRewrite(bin, "cd /tmp && cargo test", process.env)).toContain("rtk cargo test");
	});
});