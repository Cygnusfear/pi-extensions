import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, chmodSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDep } from "./tool-availability.js";

/**
 * Regression tests for the mai-spawn ENOENT bug.
 *
 * Root cause: `createDep({ binary: "mai" })` used to only cache a yes/no
 * availability bit, and callers spawned bare `"mai"`. When the child process
 * inherited a stripped/stale PATH, posix_spawn failed with ENOENT even though
 * `command -v mai` resolved fine at extension init.
 *
 * The fix: checkBinary always returns an ABSOLUTE existing path, and resolves
 * via envOverride -> command -v -> fallbacks. These tests pin that contract.
 */

function writeExecutable(filePath: string): void {
	writeFileSync(filePath, "#!/bin/sh\necho ok\n");
	chmodSync(filePath, 0o755);
}

describe("createDep binary resolution", () => {
	let tmp: string;
	let savedEnv: string | undefined;

	beforeEach(() => {
		tmp = mkdtempSync(path.join(os.tmpdir(), "tool-avail-"));
		savedEnv = process.env.PI_TEST_FAKEBIN;
		delete process.env.PI_TEST_FAKEBIN;
	});

	afterEach(() => {
		if (savedEnv === undefined) delete process.env.PI_TEST_FAKEBIN;
		else process.env.PI_TEST_FAKEBIN = savedEnv;
		try {
			rmSync(tmp, { recursive: true, force: true });
		} catch {
			// ignore
		}
	});

	it("resolves to an absolute path via envOverride when set", () => {
		const exe = path.join(tmp, "pi-test-fakebin-env");
		writeExecutable(exe);
		process.env.PI_TEST_FAKEBIN = exe;

		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			envOverride: "PI_TEST_FAKEBIN",
		});

		expect(dep.ok).toBe(true);
		expect(dep.resolved).toBe(exe);
		expect(path.isAbsolute(dep.resolved!)).toBe(true);
	});

	it("ignores envOverride that points to a non-existent or relative path", () => {
		process.env.PI_TEST_FAKEBIN = path.join(tmp, "does-not-exist");
		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			envOverride: "PI_TEST_FAKEBIN",
		});
		expect(dep.ok).toBe(false);
		expect(dep.resolved).toBeNull();
	});

	it("falls back to absolute candidate paths when command -v fails", () => {
		const exe = path.join(tmp, "pi-test-fakebin-fallback");
		writeExecutable(exe);

		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			fallbacks: [
				path.join(tmp, "missing-1"),
				exe,
				path.join(tmp, "missing-2"),
			],
		});

		expect(dep.ok).toBe(true);
		expect(dep.resolved).toBe(exe);
	});

	it("recheck() picks up a fallback binary that appears after init", () => {
		const exe = path.join(tmp, "pi-test-fakebin-late");
		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			fallbacks: [exe],
		});
		expect(dep.ok).toBe(false);
		expect(dep.resolved).toBeNull();

		writeExecutable(exe);
		expect(dep.recheck()).toBe(true);
		expect(dep.resolved).toBe(exe);
	});

	it("recheck() drops a stale resolved path when the binary disappears", () => {
		const exe = path.join(tmp, "pi-test-fakebin-stale");
		writeExecutable(exe);
		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			fallbacks: [exe],
		});
		expect(dep.ok).toBe(true);
		expect(dep.resolved).toBe(exe);

		unlinkSync(exe);
		expect(dep.recheck()).toBe(false);
		expect(dep.resolved).toBeNull();
	});

	it("returns null when nothing resolves", () => {
		const dep = createDep({
			binary: "pi-test-fakebin-never-on-path-" + Date.now(),
			install: "n/a",
			fallbacks: [path.join(tmp, "nope-a"), path.join(tmp, "nope-b")],
		});
		expect(dep.ok).toBe(false);
		expect(dep.resolved).toBeNull();
		expect(dep.reason).toContain("not installed");
	});
});
