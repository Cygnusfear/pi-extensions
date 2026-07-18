import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	adoptedWorkerId,
	resolveAdoptableSession,
	type SessionSelector,
} from "./session-adoption.ts";

const cleanup: string[] = [];
const timestamp = "2026-07-18T00:00:00.000Z";

interface FixtureOptions {
	id?: string;
	cwd?: string;
	name?: string;
	meshId?: string;
	nickname?: string;
	extraLines?: string[];
	createCwd?: boolean;
}

function fixture(options: FixtureOptions = {}): { dir: string; cwd: string; file: string; id: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-adopt-"));
	cleanup.push(dir);
	const cwd = options.cwd ?? path.join(dir, "workspace");
	if (path.isAbsolute(cwd) && options.createCwd !== false) fs.mkdirSync(cwd, { recursive: true });
	const id = options.id ?? "source-session";
	const file = path.join(dir, `${id}.jsonl`);
	const lines: string[] = [JSON.stringify({ type: "session", version: 3, id, timestamp, cwd })];
	let parentId: string | null = null;
	if (options.name) {
		lines.push(JSON.stringify({ type: "session_info", id: "info", parentId, timestamp, name: options.name }));
		parentId = "info";
	}
	if (options.meshId) {
		lines.push(JSON.stringify({
			type: "custom",
			customType: "mesh_identity",
			data: { id: options.meshId, nickname: options.nickname },
			id: "mesh",
			parentId,
			timestamp,
		}));
	}
	lines.push(...(options.extraLines ?? []));
	fs.writeFileSync(file, `${lines.join("\n")}\n`);
	return { dir, cwd, file, id };
}

function options(currentSessionFile: string, overrides: {
	peers?: Array<{ id: string; sessionId?: string; meshId?: string; nickname?: string }>;
	isActivationHeld?: (sessionFile: string) => boolean;
	listSessions?: () => Promise<readonly never[]>;
} = {}) {
	return {
		currentSessionFile,
		peers: overrides.peers,
		isActivationHeld: overrides.isActivationHeld ?? (() => false),
		listSessions: overrides.listSessions,
	};
}

afterEach(() => {
	for (const dir of cleanup.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("resolveAdoptableSession", () => {
	test("resolves an exact file and preserves the source context metadata", async () => {
		const source = fixture({ name: "Durable actor", meshId: "mesh-1", nickname: "Anna Durable" });
		const current = fixture({ id: "coordinator" });
		const resolved = await resolveAdoptableSession({ kind: "file", path: source.file }, options(current.file));
		expect(resolved).toEqual({
			sessionId: source.id,
			sessionFile: fs.realpathSync(source.file),
			cwd: source.cwd,
			name: "Durable actor",
			durableMeshId: "mesh-1",
			nickname: "Anna Durable",
		});
	});

	test("resolves only an exact session ID and fails closed on ambiguity", async () => {
		const first = fixture({ id: "same" });
		const second = fixture({ id: "same" });
		const current = fixture({ id: "coordinator" });
		const selector: SessionSelector = { kind: "id", id: "same" };
		await expect(resolveAdoptableSession(selector, options(current.file, {
			listSessions: async () => [{ id: "same", path: first.file }, { id: "same", path: second.file }] as never,
		}))).rejects.toThrow("ambiguous");
		await expect(resolveAdoptableSession({ kind: "id", id: "sam" }, options(current.file, {
			listSessions: async () => [{ id: "same", path: first.file }] as never,
		}))).rejects.toThrow("No persisted Pi session");
	});

	test("rejects a stale session index whose file header has another ID", async () => {
		const source = fixture({ id: "actual" });
		const current = fixture({ id: "coordinator" });
		await expect(resolveAdoptableSession({ kind: "id", id: "selected" }, options(current.file, {
			listSessions: async () => [{ id: "selected", path: source.file }] as never,
		}))).rejects.toThrow("Session index mismatch");
	});

	test("rejects the coordinator session even through a symlink", async () => {
		const current = fixture({ id: "coordinator" });
		const symlink = path.join(current.dir, "alias.jsonl");
		fs.symlinkSync(current.file, symlink);
		await expect(resolveAdoptableSession({ kind: "file", path: symlink }, options(current.file)))
			.rejects.toThrow("cannot adopt its own");
	});

	test("rejects malformed JSON anywhere in the source session", async () => {
		const source = fixture({ extraLines: ["{broken"] });
		const current = fixture({ id: "coordinator" });
		await expect(resolveAdoptableSession({ kind: "file", path: source.file }, options(current.file)))
			.rejects.toThrow("invalid JSON on line 2");
	});

	test("rejects relative source file selectors", async () => {
		const source = fixture();
		const current = fixture({ id: "coordinator" });
		const relativePath = path.relative(process.cwd(), source.file);
		await expect(resolveAdoptableSession({ kind: "file", path: relativePath }, options(current.file)))
			.rejects.toThrow("Session file path must be absolute");
	});

	test("rejects structurally invalid entries and duplicate session headers", async () => {
		const primitive = fixture({ extraLines: [JSON.stringify("not-an-entry")] });
		const current = fixture({ id: "coordinator" });
		await expect(resolveAdoptableSession({ kind: "file", path: primitive.file }, options(current.file)))
			.rejects.toThrow("non-object entry on line 2");

		const untyped = fixture({ id: "untyped", extraLines: [JSON.stringify({ id: "missing-type" })] });
		await expect(resolveAdoptableSession({ kind: "file", path: untyped.file }, options(current.file)))
			.rejects.toThrow("untyped entry on line 2");

		const duplicateHeader = fixture({
			id: "duplicate",
			extraLines: [JSON.stringify({ type: "session", version: 3, id: "duplicate", timestamp, cwd: current.cwd })],
		});
		await expect(resolveAdoptableSession({ kind: "file", path: duplicateHeader.file }, options(current.file)))
			.rejects.toThrow("more than one session header");
	});

	test("rejects missing and non-absolute source working directories", async () => {
		const missing = fixture({ cwd: path.join(os.tmpdir(), `missing-${crypto.randomUUID()}`), createCwd: false });
		const current = fixture({ id: "coordinator" });
		await expect(resolveAdoptableSession({ kind: "file", path: missing.file }, options(current.file)))
			.rejects.toThrow("working directory does not exist");
		const relative = fixture({ id: "relative", cwd: "relative/workspace" });
		await expect(resolveAdoptableSession({ kind: "file", path: relative.file }, options(current.file)))
			.rejects.toThrow("non-absolute working directory");
	});

	test("rejects a live mesh session by session or durable mesh identity", async () => {
		const source = fixture({ meshId: "durable-mesh" });
		const current = fixture({ id: "coordinator" });
		for (const peers of [
			[{ id: "peer-1", sessionId: source.id, nickname: "Live by session" }],
			[{ id: "durable-mesh", nickname: "Live by mesh" }],
		]) {
			await expect(resolveAdoptableSession({ kind: "file", path: source.file }, options(current.file, { peers })))
				.rejects.toThrow("already active on mesh");
		}
	});

	test("rejects a session with a live activation lease", async () => {
		const source = fixture();
		const current = fixture({ id: "coordinator" });
		let checked: string | undefined;
		await expect(resolveAdoptableSession({ kind: "file", path: source.file }, options(current.file, {
			isActivationHeld: (sessionFile) => {
				checked = sessionFile;
				return true;
			},
		}))).rejects.toThrow("live activation lease");
		expect(checked).toBe(fs.realpathSync(source.file));
	});
});

describe("adoptedWorkerId", () => {
	test("is deterministic per coordinator/source relationship and separates either identity", () => {
		const id = adoptedWorkerId("coordinator", "source");
		expect(adoptedWorkerId("coordinator", "source")).toBe(id);
		expect(adoptedWorkerId("other-coordinator", "source")).not.toBe(id);
		expect(adoptedWorkerId("coordinator", "other-source")).not.toBe(id);
		expect(id).toMatch(/^adopted-worker:[0-9a-f]{64}$/);
	});
});
