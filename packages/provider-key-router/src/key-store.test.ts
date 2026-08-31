import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	discoverEnvKeySources,
	keySourceId,
	loadProviderKeyStore,
	parseProviderKeyStore,
	resolveKeySource,
	resolveProviderKeys,
	saveProviderKeyStore,
} from "./key-store.ts";
import type { ProviderDefinition, ProviderKeyStore } from "./types.ts";

const tempDirs: string[] = [];
const definition: ProviderDefinition = {
	id: "example",
	label: "Example",
	providerIds: ["example", "example-coding"],
	command: "example",
	envVar: "EXAMPLE_API_KEY",
	legacyFile: "example-keys.json",
};

function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-key-router-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0))
		fs.rmSync(dir, { recursive: true, force: true });
});

describe("provider key store", () => {
	test("migrates legacy state without changing key order or active selection", () => {
		const dir = tempDir();
		const legacy = path.join(dir, "example-keys.json");
		fs.writeFileSync(
			legacy,
			JSON.stringify({
				keys: ["key-a", "key-b"],
				activeIndex: 1,
				autoRotate: false,
			}),
		);
		const loaded = loadProviderKeyStore({
			agentDir: dir,
			definitions: [definition],
			env: {},
		});
		const ring = loaded.store.providers.example;
		expect(ring.keys.map((key) => key.source)).toEqual(["key-a", "key-b"]);
		expect(ring.activeKeyId).toBe(keySourceId("key-b"));
		expect(ring.autoRotate).toBe(false);
		expect(fs.existsSync(legacy)).toBe(false);
		expect(fs.statSync(loaded.path).mode & 0o777).toBe(0o600);
	});

	test("leaves a legacy file in place when the unified write fails", () => {
		const dir = tempDir();
		const legacy = path.join(dir, "example-keys.json");
		fs.writeFileSync(
			legacy,
			JSON.stringify({ keys: ["key-a"], activeIndex: 0 }),
		);
		fs.mkdirSync(path.join(dir, "provider-keys.json"));
		expect(() =>
			loadProviderKeyStore({
				agentDir: dir,
				definitions: [definition],
				env: {},
			}),
		).toThrow();
		expect(fs.existsSync(legacy)).toBe(true);
	});

	test("discovers all numbered environment keys in numeric order", () => {
		const sources = discoverEnvKeySources("EXAMPLE_API_KEY", {
			EXAMPLE_API_KEY_10: "ten",
			EXAMPLE_API_KEY_2: "two",
			EXAMPLE_API_KEY: "base",
		});
		expect(sources.map((source) => source.source)).toEqual([
			"$EXAMPLE_API_KEY",
			"$EXAMPLE_API_KEY_2",
			"$EXAMPLE_API_KEY_10",
		]);
	});

	test("resolves literal, environment, and command sources without logging secrets", () => {
		expect(
			resolveKeySource({ id: "literal", source: "literal-secret" }).secret,
		).toBe("literal-secret");
		expect(
			resolveKeySource(
				{ id: "env", source: "$KEY" },
				{ env: { KEY: "env-secret" } },
			).secret,
		).toBe("env-secret");
		expect(
			resolveKeySource(
				{ id: "cmd", source: "!secret-command" },
				{ runCommand: () => "command-secret\n" },
			).secret,
		).toBe("command-secret");
	});

	test("sanitizes source-resolution failures before storing diagnostics", () => {
		const marker = "synthetic-source-secret-marker";
		const result = resolveProviderKeys(
			{
				label: "Example",
				providerIds: ["example"],
				command: "example",
				keys: [{ id: "command-id", source: `!${marker}` }],
				autoRotate: true,
			},
			{
				runCommand: () => {
					throw new Error(`stderr ${marker}`);
				},
			},
		);
		expect(result.keys).toEqual([]);
		expect(result.errors).toEqual([
			{ id: "command-id", message: "Key source is unavailable" },
		]);
		expect(JSON.stringify(result.errors)).not.toContain(marker);
	});

	test("deduplicates resolved secrets while preserving source order", () => {
		const result = resolveProviderKeys(
			{
				label: "Example",
				providerIds: ["example"],
				command: "example",
				keys: [
					{ id: "a", source: "$A" },
					{ id: "b", source: "$B" },
					{ id: "c", source: "$C" },
				],
				autoRotate: true,
			},
			{ env: { A: "same", B: "same", C: "different" } },
		);
		expect(result.keys.map((key) => key.id)).toEqual(["a", "c"]);
	});

	test("rejects malformed stores instead of silently discarding them", () => {
		expect(() =>
			parseProviderKeyStore('{"version":1,"providers":{"bad":{"keys":[]}}}'),
		).toThrow();
		expect(() => parseProviderKeyStore('{"version":2,"providers":{}}')).toThrow(
			/unsupported/,
		);
	});

	test("writes and round-trips a valid store", () => {
		const dir = tempDir();
		const file = path.join(dir, "provider-keys.json");
		const store: ProviderKeyStore = {
			version: 1,
			providers: {
				example: {
					label: "Example",
					providerIds: ["example"],
					command: "example",
					keys: [{ id: "a", source: "$A" }],
					activeKeyId: "a",
					autoRotate: true,
				},
			},
		};
		saveProviderKeyStore(file, store);
		expect(parseProviderKeyStore(fs.readFileSync(file, "utf8"))).toEqual(store);
	});
});

describe("replay-safe migration and durable publication", () => {
	test("reconciles a remaining divergent legacy file into an existing canonical ring", () => {
		const dir = tempDir();
		const file = path.join(dir, "provider-keys.json");
		const canonical: ProviderKeyStore = {
			version: 1,
			providers: {
				example: {
					label: "Example",
					providerIds: ["example"],
					command: "example",
					keys: [{ id: keySourceId("key-a"), source: "key-a" }],
					activeKeyId: keySourceId("key-a"),
					autoRotate: false,
				},
			},
		};
		saveProviderKeyStore(file, canonical);
		const legacy = path.join(dir, "example-keys.json");
		fs.writeFileSync(
			legacy,
			JSON.stringify({
				keys: ["key-a", "key-b"],
				activeIndex: 1,
				autoRotate: true,
			}),
		);
		const loaded = loadProviderKeyStore({
			agentDir: dir,
			definitions: [definition],
			env: {},
		});
		expect(
			loaded.store.providers.example.keys.map((key) => key.source),
		).toEqual(["key-a", "key-b"]);
		expect(loaded.store.providers.example.activeKeyId).toBe(
			keySourceId("key-a"),
		);
		expect(loaded.store.providers.example.autoRotate).toBe(false);
		expect(fs.existsSync(legacy)).toBe(false);
	});

	test("fsyncs file data and the parent directory around rename", () => {
		const calls: string[] = [];
		let nextFd = 1;
		const ops: import("./key-store.ts").DurableFileOps = {
			mkdir: () => calls.push("mkdir"),
			open: (_file, flags, mode) => {
				calls.push(`open:${flags}:${mode ?? ""}`);
				return nextFd++;
			},
			write: (fd) => calls.push(`write:${fd}`),
			fsync: (fd) => calls.push(`fsync:${fd}`),
			close: (fd) => calls.push(`close:${fd}`),
			rename: () => calls.push("rename"),
			unlink: () => calls.push("unlink"),
		};
		saveProviderKeyStore(
			"/virtual/provider-keys.json",
			{ version: 1, providers: {} },
			ops,
		);
		expect(calls).toEqual([
			"mkdir",
			"open:wx:384",
			"write:1",
			"fsync:1",
			"close:1",
			"rename",
			"open:r:",
			"fsync:2",
			"close:2",
		]);
	});

	test("keeps legacy state when directory fsync fails after rename", () => {
		const dir = tempDir();
		const legacy = path.join(dir, "example-keys.json");
		fs.writeFileSync(
			legacy,
			JSON.stringify({ keys: ["key-a"], activeIndex: 0 }),
		);
		const nextFd = 1;
		const ops: import("./key-store.ts").DurableFileOps = {
			mkdir: (target) => fs.mkdirSync(target, { recursive: true }),
			open: (target, flags, mode) =>
				flags === "r" ? 99 : fs.openSync(target, flags, mode),
			write: (fd, data) => fs.writeFileSync(fd, data),
			fsync: (fd) => {
				if (fd === 99) throw new Error("directory fsync failed");
				fs.fsyncSync(fd);
			},
			close: (fd) => {
				if (fd !== 99) fs.closeSync(fd);
			},
			rename: (from, to) => fs.renameSync(from, to),
			unlink: (target) => fs.unlinkSync(target),
		};
		expect(() =>
			loadProviderKeyStore({
				agentDir: dir,
				definitions: [definition],
				env: {},
				fileOps: ops,
			}),
		).toThrow(/directory fsync failed/);
		expect(fs.existsSync(legacy)).toBe(true);
	});
	test("surfaces every durable-publication stage failure", () => {
		const stages = [
			"mkdir",
			"open-temp",
			"write",
			"fsync-temp",
			"close-temp",
			"rename",
			"open-dir",
			"fsync-dir",
			"close-dir",
		];
		for (const failAt of stages) {
			let nextFd = 1;
			let failed = false;
			const step = (name: string) => {
				if (name === failAt && !failed) {
					failed = true;
					throw new Error(`failed:${name}`);
				}
			};
			const ops: import("./key-store.ts").DurableFileOps = {
				mkdir: () => step("mkdir"),
				open: (_file, flags) => {
					step(flags === "r" ? "open-dir" : "open-temp");
					return nextFd++;
				},
				write: () => step("write"),
				fsync: (fd) => step(fd === 1 ? "fsync-temp" : "fsync-dir"),
				close: (fd) => step(fd === 1 ? "close-temp" : "close-dir"),
				rename: () => step("rename"),
				unlink: () => {},
			};
			expect(() =>
				saveProviderKeyStore(
					"/virtual/provider-keys.json",
					{ version: 1, providers: {} },
					ops,
				),
			).toThrow(`failed:${failAt}`);
		}
	});
});

test("rejects ambiguous provider routing invariants before startup", () => {
	const ring = (overrides: Record<string, unknown> = {}) => ({
		label: "Example",
		providerIds: ["example"],
		command: "example",
		keys: [{ id: "key-a", source: "$EXAMPLE" }],
		activeKeyId: "key-a",
		autoRotate: true,
		...overrides,
	});
	const parse = (providers: Record<string, unknown>) =>
		parseProviderKeyStore(JSON.stringify({ version: 1, providers }));
	expect(() => parse({ "Bad ID": ring() })).toThrow(
		/invalid logical provider ID/,
	);
	expect(() => parse({ one: ring({ providerIds: ["bad provider"] }) })).toThrow(
		/invalid provider ID/,
	);
	expect(() => parse({ one: ring({ activeKeyId: "missing" }) })).toThrow(
		/activeKeyId must reference/,
	);
	expect(() => parse({ one: ring(), two: ring({ command: "two" }) })).toThrow(
		/duplicate routed provider ID/,
	);
	expect(() =>
		parse({ one: ring(), two: ring({ providerIds: ["two"] }) }),
	).toThrow(/duplicate provider key command/);
});
