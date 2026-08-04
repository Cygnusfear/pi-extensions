import { describe, expect, test } from "bun:test";
import { computeContentVersion, computeLineHash } from "./hashline-core";
import { runHashEdit, runHashRead, type HashlineHands } from "./hashline-hands";

function memoryHands(initial: Record<string, string>): HashlineHands & { files: Map<string, string> } {
	const files = new Map(Object.entries(initial));
	return {
		files,
		authority: { kind: "resource-namespace", namespace: "test-memory" },
		consistency: { kind: "storage-atomic" },
		async readText(path) {
			const text = files.get(path);
			if (text === undefined) throw new Error(`Not found: ${path}`);
			return { path, text, version: computeContentVersion(text) };
		},
		async compareAndSwapText(input) {
			const current = files.get(input.path);
			if (current === undefined) throw new Error(`Not found: ${input.path}`);
			if (computeContentVersion(current) !== input.expectedVersion) throw new Error("Stale version; re-read the file.");
			files.set(input.path, input.updated);
			return {
				changed: true,
				version: computeContentVersion(input.updated),
				diffText: `--- a/${input.displayPath}\n+++ b/${input.displayPath}\n-${input.before}\n+${input.updated}`,
			};
		},
	};
}

describe("HashlineHands port", () => {
	test("reads, version-checks, writes and returns a deterministic diff", async () => {
		const hands = memoryHands({ "a.txt": "one\ntwo" });
		const read = await runHashRead(hands, { path: "a.txt" });
		expect(read.formatted).toContain(`2:${computeLineHash("two")}|two`);

		const edited = await runHashEdit(hands, {
			path: "a.txt",
			edits: [{ set_line: { anchor: `2:${computeLineHash("two")}`, new_text: "TWO" } }],
		});
		expect(edited.changed).toBe(true);
		expect(edited.diffText).toContain("+++ b/a.txt");
		expect(hands.files.get("a.txt")).toBe("one\nTWO");
	});
	test("preserves an opaque adapter version for a no-op edit", async () => {
		let compareAndSwapCalls = 0;
		const hands: HashlineHands = {
			authority: { kind: "resource-namespace", namespace: "opaque-test" },
			consistency: { kind: "storage-atomic" },
			async readText(path) {
				return { path, text: "one", version: "opaque-v7" };
			},
			async compareAndSwapText() {
				compareAndSwapCalls += 1;
				throw new Error("compare-and-swap should not run");
			},
		};

		const result = await runHashEdit(hands, { path: "a.txt", edits: [] });
		expect(result).toMatchObject({ changed: false, version: "opaque-v7", diffText: "" });
		expect(compareAndSwapCalls).toBe(0);
	});


	test("rejects a stale version atomically", async () => {
		const hands = memoryHands({ "a.txt": "one" });
		const snapshot = await hands.readText("a.txt");
		hands.files.set("a.txt", "external change");
		await expect(hands.compareAndSwapText({
			path: "a.txt",
			expectedVersion: snapshot.version,
			before: snapshot.text,
			updated: "ours",
			displayPath: "a.txt",
		})).rejects.toThrow("Stale version");
		expect(hands.files.get("a.txt")).toBe("external change");
	});
});
