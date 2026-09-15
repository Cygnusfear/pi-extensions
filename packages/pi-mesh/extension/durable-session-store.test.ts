import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReviveDescriptor, SPAWNER_PARTIAL_DESCRIPTOR_FILE } from "@pi-extensions/shared/revive-descriptor";
import { durableDescriptorPath } from "./durable-inbound-mailbox.ts";
import {
	buildReviveNotify,
	isRevivable,
	isReviveNotify,
	listDurableDescriptors,
	materialiseDurableDescriptor,
	readDurableDescriptor,
	readSpawnerPartialDescriptor,
	removeDurableDescriptor,
	REVIVE_DESCRIPTOR_ENV,
	spawnerPartialDescriptorPath,
	writeDurableDescriptor,
} from "./durable-session-store.ts";
import {
	createRegistryIndex,
	REGISTRY_TTL_MS,
	scanRegistry,
} from "./durable-registry-index.ts";

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

// A note on the missing default-root test, because its absence is a decision.
//
// The shipped bug was an unimported symbol on the no-argument path. The first two
// tests written for it had to be removed: durableMeshRoot() resolves via
// os.homedir(), which deliberately ignores process.env.HOME, so 'isolating' the
// registry that way did not isolate anything - the test wrote a nickname-'Valencia'
// descriptor into the real ~/.pi/mesh/durable registry that every live session on
// this box reads, and scanned all 4,835 entries (461ms) while asserting nothing.
// A test that pollutes a shared production registry is worse than no test.
//
// The static gate now covers this properly: packages/pi-mesh/tsconfig.json is
// strict and includes the routing files plus pi-mesh.ts, so an unimported symbol
// fails typecheck in EVERY call path rather than only the one a test happens to
// exercise. Runtime coverage of the default path would need an additive seam -
// honouring PI_MESH_HOME in durableMeshRoot() - which changes product behaviour
// for every durable path and so is deliberately left as a proposal, not a quiet edit.

// kal-3gc9tzrt required items: the default-root path, and a fixture that actually
// constructs the case it claims to test.
describe("listDurableDescriptors default root (kal-3gc9tzrt)", () => {
	// This only became testable in-process once durableMeshRoot() started honouring
	// $HOME. The earlier attempt failed for a real reason: os.homedir() ignored HOME,
	// so the test was silently writing to the LIVE registry. The product fix is what
	// makes this isolation honest, and that is the regression this pins.
	test("the no-argument call resolves the registry under $HOME, not the account home", () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "durable-home-"));
		const prev = process.env.HOME;
		try {
			process.env.HOME = home;
			writeDurableDescriptor(
				"durable-default",
				buildReviveDescriptor({
					durableId: "durable-default",
					nickname: "Zephyr Tester",
					sessionId: "s-default",
					sessionFile: path.join(home, "d.jsonl"),
					cwd: home,
					command: "pi",
					args: ["--resume"],
					supervisors: ["sup-1"],
					env: {},
					updatedAt: 1,
				}),
			);
			const found = listDurableDescriptors();
			expect(found.map((d) => d.durableId)).toEqual(["durable-default"]);
		} finally {
			if (prev === undefined) delete process.env.HOME;
			else process.env.HOME = prev;
			fs.rmSync(home, { recursive: true, force: true });
		}
	});
});

describe("scanRegistry and the index (kal-3gc9tzrt)", () => {
	const rootOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
	// Built through the production constructor: a hand-written literal with the wrong
	// kind silently fails isReviveDescriptor, the row vanishes, and a test that then
	// asserts the row was filtered out passes for entirely the wrong reason.
	const descriptor = (id: string, nick: string, updatedAt: number) =>
		buildReviveDescriptor({
			durableId: id, nickname: nick, sessionId: "s-" + id,
			sessionFile: "/tmp/" + id + ".jsonl", cwd: "/tmp", command: "pi",
			args: ["--resume"], supervisors: ["sup-1"], env: {}, updatedAt,
		});
	const putInto = (dir: string, subDir: string, body: object) => {
		fs.mkdirSync(path.join(dir, subDir), { recursive: true });
		fs.writeFileSync(path.join(dir, subDir, "descriptor.json"), JSON.stringify(body));
	};
	const put = (dir: string, id: string, nick: string, updatedAt: number) =>
		putInto(dir, id, descriptor(id, nick, updatedAt));

	test("a descriptor whose id disagrees with its directory name is refused", () => {
		const dir = rootOf();
		try {
			// The genuine case putGood could never express: it derived the path from
			// the id every time, so dir and id always agreed.
			// a descriptor that is valid in every way except the one under test: it is
			// filed under a directory that is not its durable id
			putInto(dir, "weird-dir", descriptor("other-id", "Mismatched", Date.now()));
			fs.writeFileSync(
				path.join(dir, "weird-dir", "descriptor.json"),
				JSON.stringify({
					kind: "pi.mesh.revive", version: 1, durableId: "other-id", nickname: "Mismatched",
					sessionId: "s", sessionFile: "/tmp/x", cwd: "/tmp", command: "pi",
					args: [], supervisors: [], env: {}, updatedAt: Date.now(),
				}),
			);
			put(dir, "good-id", "Matched", Date.now());
			const ids = scanRegistry({ root: dir }).entries.map((e) => e.descriptor.durableId);
			expect(ids).toEqual(["good-id"]);
		} finally { fs.rmSync(dir, { recursive: true, force: true }); }
	});

	test("registrations past the freshness bound are not routable", () => {
		const dir = rootOf();
		try {
			const now = 1_700_000_000_000;
			put(dir, "fresh", "Fresh Name", now - 60_000);
			put(dir, "ancient", "Ancient Name", now - 400 * 24 * 3600_000);
			const got = scanRegistry({ root: dir, now: () => now });
			expect(got.entries.map((e) => e.descriptor.durableId)).toEqual(["fresh"]);
		} finally { fs.rmSync(dir, { recursive: true, force: true }); }
	});

	test("the snapshot is reused inside the TTL and re-read after it", () => {
		const dir = rootOf();
		try {
			let clock = 1_700_000_000_000;
			put(dir, "one", "First", clock);
			const idx = createRegistryIndex({ root: dir, now: () => clock });
			expect(idx.entries().length).toBe(1);
			put(dir, "two", "Second", clock);
			expect(idx.entries().length).toBe(1);
			clock += REGISTRY_TTL_MS + 1;
			expect(idx.entries().length).toBe(2);
		} finally { fs.rmSync(dir, { recursive: true, force: true }); }
	});

	test("a colliding nickname is reported ambiguous with both candidates, newest first", () => {
		const dir = rootOf();
		try {
			const now = 1_700_000_000_000;
			put(dir, "older", "Collide", now - 10_000);
			put(dir, "newer", "Collide", now - 1);
			const hit = createRegistryIndex({ root: dir, now: () => now }).lookupNickname("collide");
			expect(hit.kind).toBe("ambiguous");
			if (hit.kind === "ambiguous") {
				expect(hit.candidates.map((c) => c.durableId).sort()).toEqual(["newer", "older"]);
				expect(hit.candidates[0].durableId).toBe("newer");
			}
		} finally { fs.rmSync(dir, { recursive: true, force: true }); }
	});

	test("too-old and never-present are told apart, because the fixes differ", () => {
		const dir = rootOf();
		try {
			const now = 1_700_000_000_000;
			put(dir, "old", "Ghost", now - 400 * 24 * 3600_000);
			const idx = createRegistryIndex({ root: dir, now: () => now });
			const ghost = idx.lookupNickname("Ghost");
			expect(ghost.kind === "none" && ghost.reason).toBe("stale");
			const never = idx.lookupNickname("Never Existed");
			expect(never.kind === "none" && never.reason).toBe("not-found");
		} finally { fs.rmSync(dir, { recursive: true, force: true }); }
	});
});
