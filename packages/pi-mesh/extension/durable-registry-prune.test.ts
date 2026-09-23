import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReviveDescriptor } from "@pi-extensions/shared/revive-descriptor";
import { durableDescriptorPath, durableMailboxPath } from "./durable-inbound-mailbox.ts";
import { pruneRegistry } from "./durable-registry-index.ts";

const DAY = 24 * 60 * 60_000;
const ID_A = "aaaaaaaa-1111-4111-8111-111111111111";
const ID_B = "bbbbbbbb-2222-4222-8222-222222222222";
const ID_C = "cccccccc-3333-4333-8333-333333333333";
const ID_D = "dddddddd-4444-4444-8444-444444444444";

const roots: string[] = [];

function tmpRoot(): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "pi-mesh-prune-"));
	roots.push(root);
	return root;
}

function writeDescriptor(root: string, durableId: string, updatedAt: number, recordedId?: string): void {
	const descriptorPath = durableDescriptorPath(durableId, root);
	mkdirSync(path.dirname(descriptorPath), { recursive: true });
	writeFileSync(
		descriptorPath,
		JSON.stringify(
			buildReviveDescriptor({
				durableId: recordedId ?? durableId,
				sessionFile: "/tmp/session.jsonl",
				cwd: "/tmp",
				command: "/usr/bin/pi",
				args: ["--session", "/tmp/session.jsonl"],
				updatedAt,
			}),
		),
	);
}

afterEach(() => {
	while (roots.length > 0) {
		const root = roots.pop();
		if (root) rmSync(root, { recursive: true, force: true });
	}
});

describe("pruneRegistry", () => {
	test("removes expired descriptors and empty leftovers, keeps fresh ones", () => {
		const root = tmpRoot();
		const now = 100 * DAY;
		writeDescriptor(root, ID_A, now - 40 * DAY);
		writeDescriptor(root, ID_B, now - DAY);
		mkdirSync(path.join(root, ID_C));

		const result = pruneRegistry({ root, now: () => now });

		expect(result).toMatchObject({ removedExpired: 1, removedEmpty: 1, removedCorrupt: 0, failed: 0 });
		expect(readdirSync(root)).toEqual([ID_B]);
		expect(existsSync(durableDescriptorPath(ID_A, root))).toBe(false);
		expect(existsSync(durableDescriptorPath(ID_B, root))).toBe(true);
	});

	test("keeps a mailbox-bearing directory and removes only its descriptor", () => {
		const root = tmpRoot();
		const now = 100 * DAY;
		writeDescriptor(root, ID_A, now - 40 * DAY);
		writeFileSync(durableMailboxPath(ID_A, root), '{"deliveryId":"delivery-1"}\n');

		const result = pruneRegistry({ root, now: () => now });

		expect(result.removedExpired).toBe(1);
		expect(existsSync(durableDescriptorPath(ID_A, root))).toBe(false);
		expect(existsSync(durableMailboxPath(ID_A, root))).toBe(true);
		expect(readdirSync(root)).toEqual([ID_A]);
	});

	test("removes a descriptor whose recorded id does not match its directory", () => {
		const root = tmpRoot();
		const now = 100 * DAY;
		writeDescriptor(root, ID_D, now, ID_A);

		const result = pruneRegistry({ root, now: () => now });

		expect(result).toMatchObject({ removedCorrupt: 1, removedExpired: 0, removedEmpty: 0 });
		expect(readdirSync(root)).toEqual([]);
	});

	test("a second pass finds nothing left to do", () => {
		const root = tmpRoot();
		const now = 100 * DAY;
		writeDescriptor(root, ID_A, now - 40 * DAY);
		writeDescriptor(root, ID_B, now - DAY);
		mkdirSync(path.join(root, ID_C));

		pruneRegistry({ root, now: () => now });
		const second = pruneRegistry({ root, now: () => now });

		expect(second).toEqual({ scanned: 1, removedExpired: 0, removedCorrupt: 0, removedEmpty: 0, failed: 0 });
	});

	test("a missing root is a no-op, not a throw", () => {
		const result = pruneRegistry({ root: path.join(os.tmpdir(), "pi-mesh-prune-does-not-exist"), now: () => 0 });
		expect(result).toEqual({ scanned: 0, removedExpired: 0, removedCorrupt: 0, removedEmpty: 0, failed: 0 });
	});
});
