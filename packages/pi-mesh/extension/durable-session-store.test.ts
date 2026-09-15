import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReviveDescriptor, SPAWNER_PARTIAL_DESCRIPTOR_FILE } from "@pi-extensions/shared/revive-descriptor";
import { durableDescriptorPath } from "./durable-inbound-mailbox.ts";
import {
	buildReviveNotify,
	listDurableDescriptors,
	writeDurableDescriptor,
	isRevivable,
	isReviveNotify,
	materialiseDurableDescriptor,
	readDurableDescriptor,
	readSpawnerPartialDescriptor,
	removeDurableDescriptor,
	REVIVE_DESCRIPTOR_ENV,
	spawnerPartialDescriptorPath,
	writeDurableDescriptor,
} from "./durable-session-store.ts";

const cleanup: string[] = [];
function tmpRoot(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "durable-store-"));
	cleanup.push(dir);
	return dir;
}
afterEach(() => {
	for (const dir of cleanup.splice(0)) {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	}
});

function partial(sessionFile: string) {
	return buildReviveDescriptor({
		sessionFile,
		cwd: "/repo",
		command: "pi",
		args: ["--session", sessionFile, "--model", "anthropic/claude-opus-4-8"],
		model: "anthropic/claude-opus-4-8",
		ticketId: "pe-xyz",
		worktreePath: "/wt",
		env: { PI_TEAMS_TICKET_ID: "pe-xyz", PI_TEAMS_COORDINATOR_ID: "coord-id" },
		supervisors: ["coord-id"],
		updatedAt: 100,
	});
}

describe("durable session store — descriptor registry", () => {
	test("write → read round-trips the canonical descriptor keyed by durable id", () => {
		const root = tmpRoot();
		const d = { ...partial("/s/session.jsonl"), durableId: "dur-1", sessionId: "sess-1", nickname: "Nova Star" };
		writeDurableDescriptor("dur-1", d, root);
		const read = readDurableDescriptor("dur-1", root);
		expect(read).not.toBeNull();
		expect(read!.durableId).toBe("dur-1");
		expect(read!.args).toEqual(d.args);
		expect(read!.supervisors).toEqual(["coord-id"]);
	});

	test("isRevivable is true only when a valid descriptor exists", () => {
		const root = tmpRoot();
		expect(isRevivable("missing", root)).toBe(false);
		writeDurableDescriptor("present", { ...partial("/s/x.jsonl"), durableId: "present" }, root);
		expect(isRevivable("present", root)).toBe(true);
	});

	test("readDurableDescriptor rejects corrupt / wrong-schema json (→ not revivable)", () => {
		const root = tmpRoot();
		const p = durableDescriptorPath("bad", root);
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, "{ not valid json");
		expect(readDurableDescriptor("bad", root)).toBeNull();
		fs.writeFileSync(p, JSON.stringify({ kind: "other", version: 1 }));
		expect(readDurableDescriptor("bad", root)).toBeNull();
	});

	test("removeDurableDescriptor deletes the registry entry (retirement)", () => {
		const root = tmpRoot();
		writeDurableDescriptor("gone", { ...partial("/s/x.jsonl"), durableId: "gone" }, root);
		expect(isRevivable("gone", root)).toBe(true);
		removeDurableDescriptor("gone", root);
		expect(isRevivable("gone", root)).toBe(false);
	});
});

describe("spawner partial descriptor → activator materialisation (ADD-1 round-trip)", () => {
	test("spawnerPartialDescriptorPath prefers env, falls back to session dir", () => {
		expect(spawnerPartialDescriptorPath("/s/session.jsonl", { [REVIVE_DESCRIPTOR_ENV]: "/explicit/desc.json" })).toBe("/explicit/desc.json");
		expect(spawnerPartialDescriptorPath("/s/session.jsonl", {})).toBe(path.join("/s", SPAWNER_PARTIAL_DESCRIPTOR_FILE));
		expect(spawnerPartialDescriptorPath(undefined, {})).toBeNull();
	});

	test("materialise reads the spawner partial + fills durableId → canonical keyed by durable id", () => {
		const root = tmpRoot();
		// Spawner writes the PARTIAL next to the session file (durableId unknown).
		const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), "sess-"));
		cleanup.push(sessionDir);
		const sessionFile = path.join(sessionDir, "session.jsonl");
		fs.writeFileSync(path.join(sessionDir, SPAWNER_PARTIAL_DESCRIPTOR_FILE), JSON.stringify(partial(sessionFile)));

		// pi-mesh reads it on identity resolve + materialises the canonical one.
		const canonical = materialiseDurableDescriptor({
			durableId: "worker-dur",
			sessionId: "sess-1",
			nickname: "Nova Star Worker",
			sessionFile,
			env: {},
			root,
			now: 200,
		});
		expect(canonical).not.toBeNull();
		expect(canonical!.durableId).toBe("worker-dur");
		expect(canonical!.updatedAt).toBe(200);
		// Activator reads it back by bare durable id.
		const activatorView = readDurableDescriptor("worker-dur", root);
		expect(activatorView!.command).toBe("pi");
		expect(activatorView!.model).toBe("anthropic/claude-opus-4-8");
		expect(activatorView!.ticketId).toBe("pe-xyz");
		expect(activatorView!.supervisors).toEqual(["coord-id"]);
	});

	test("materialise is a no-op with no partial (plain session stays unregistered → honest undeliverable)", () => {
		const root = tmpRoot();
		const result = materialiseDurableDescriptor({
			durableId: "human-sess",
			sessionFile: "/no/such/session.jsonl",
			env: {},
			root,
		});
		expect(result).toBeNull();
		expect(isRevivable("human-sess", root)).toBe(false);
	});

	test("readSpawnerPartialDescriptor via explicit env path", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "partial-"));
		cleanup.push(dir);
		const descPath = path.join(dir, "desc.json");
		fs.writeFileSync(descPath, JSON.stringify(partial("/s/session.jsonl")));
		const read = readSpawnerPartialDescriptor(undefined, { [REVIVE_DESCRIPTOR_ENV]: descPath });
		expect(read).not.toBeNull();
		expect(read!.ticketId).toBe("pe-xyz");
	});
});

describe("revive notify (supervisor-notified, v1)", () => {
	test("build + guard round-trip", () => {
		const notify = buildReviveNotify({
			durableId: "dur-1",
			nickname: "Nova",
			deliveryId: "d1",
			from: "sender",
			senderLabel: "Sender",
			mailboxCount: 3,
		});
		expect(isReviveNotify(notify)).toBe(true);
		expect(notify.mailboxCount).toBe(3);
		expect(isReviveNotify({})).toBe(false);
		expect(isReviveNotify({ ...notify, kind: "other" })).toBe(false);
	});
});

// kal-sbc4q4l9: offline peers must be addressable by nickname, which requires the
// whole registry to be enumerable. The scan returns what the DESCRIPTOR says rather
// than directory names (those are sanitised), and one corrupt entry must not make the
// rest of the registry unresolvable.
describe("listDurableDescriptors (kal-sbc4q4l9)", () => {
		// Built with the production constructor rather than a hand-written object: the
	// schema validator requires kind/version/cwd/command/args, and an ad-hoc literal
	// silently fails validation, which would make a green-looking test assert nothing.
	const descriptorFor = (durableId: string, nickname: string) =>
		buildReviveDescriptor({
			durableId,
			nickname,
			sessionId: "session-" + durableId,
			sessionFile: "/tmp/" + durableId + ".jsonl",
			cwd: "/tmp",
			command: "pi",
			args: ["--resume"],
			supervisors: ["sup-" + durableId],
			env: {},
			updatedAt: 1,
		});
test("returns registered descriptors keyed by the id inside the file", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "durable-list-"));
		try {
			const put = (dir: string, body: string) => {
				fs.mkdirSync(path.join(root, dir), { recursive: true });
				fs.writeFileSync(path.join(root, dir, "descriptor.json"), body);
			};
			const putGood = (dir: string, durableId: string, nickname: string) =>
				writeDurableDescriptor(durableId, descriptorFor(durableId, nickname), root);
			putGood("d-a", "d-a", "Valencia");
			putGood("d-b", "d-b", "Adam");
			// this dir name and its internal durable id differ on purpose: it proves
			// the returned id comes from the descriptor, not from the directory name
			putGood("dir-name", "real-id", "Nadia");
			put("d-corrupt", "{ definitely not json");
			put("d-incomplete", JSON.stringify({ durableId: "d-incomplete" }));
			fs.mkdirSync(path.join(root, "d-empty"), { recursive: true });
			fs.writeFileSync(path.join(root, "stray.txt"), "not a session dir");

			const found = listDurableDescriptors(root);
			expect(found.map((d) => d.durableId).sort()).toEqual(["d-a", "d-b", "real-id"]);
			expect(found.map((d) => d.nickname).sort()).toEqual(["Adam", "Nadia", "Valencia"]);
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});

	test("an absent registry is empty rather than fatal", () => {
		const missing = path.join(os.tmpdir(), "definitely-not-a-durable-root-" + Date.now());
		expect(listDurableDescriptors(missing)).toEqual([]);
	});
});
