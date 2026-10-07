import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the away flag and the Hooman's id at test values BEFORE importing the module: a test
// must never touch the real flag, and it must never send a tell to the real Hooman.
const dir = mkdtempSync(join(tmpdir(), "relay-away-test-"));
process.env.PI_AFK_STATE_PATH = join(dir, "afk.json");
process.env.HOOMAN_MESH_ID = "hooman-durable-id";
const { relayWhileAway } = await import("./relay-to-hooman.ts");
const { writeAfkState } = await import("./afk.ts");

interface SentTell {
	id: string;
	text: unknown;
}
const sent: SentTell[] = [];

function stubMesh(tell?: (id: string, text: unknown) => unknown): void {
	(globalThis as { __piMesh?: unknown }).__piMesh = tell ? { tell } : undefined;
}

afterEach(() => {
	sent.length = 0;
	stubMesh();
});

describe("relayWhileAway", () => {
	test("sends nothing while the Hooman is not away", () => {
		stubMesh((id, text) => sent.push({ id, text }));
		writeAfkState({ on: false });
		expect(relayWhileAway("status update")).toBe(false);
		expect(sent).toEqual([]);
	});

	test("relays to the Hooman's durable id while they are away", () => {
		stubMesh((id, text) => sent.push({ id, text }));
		writeAfkState({ on: true, since: 1 });
		expect(relayWhileAway("status update")).toBe(true);
		expect(sent).toEqual([{ id: "hooman-durable-id", text: "status update" }]);
	});

	test("an unreachable mesh is a silent no-op, not a throw", () => {
		stubMesh();
		writeAfkState({ on: true });
		expect(relayWhileAway("status update")).toBe(false);
		expect(sent).toEqual([]);
	});

	test("an empty message is never relayed", () => {
		stubMesh((id, text) => sent.push({ id, text }));
		writeAfkState({ on: true });
		expect(relayWhileAway("   ")).toBe(false);
		expect(sent).toEqual([]);
	});
});
