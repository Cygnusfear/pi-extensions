import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
	applyEditsToText,
	computeContentVersion,
	computeLineHash,
	formatHashLines,
	sha1Hex,
} from "./hashline-core";

const fixtures = ["", "abc", "hello world", "white  space\t", "λ日本語", "line\r", "a\n".repeat(200)];

describe("workerd-safe SHA-1", () => {
	for (const fixture of fixtures) {
		test(`matches node crypto for ${JSON.stringify(fixture.slice(0, 20))}`, () => {
			expect(sha1Hex(fixture)).toBe(createHash("sha1").update(fixture).digest("hex"));
		});
	}

	test("preserves existing whitespace-normalized two-hex line anchors", () => {
		expect(computeLineHash(" a\t b ")).toBe(createHash("sha1").update("ab").digest("hex").slice(0, 2));
		expect(computeContentVersion(" a\t b ")).toBe(createHash("sha1").update(" a\t b ").digest("hex"));
	});
});

describe("hashline domain", () => {
	test("formats line ranges", () => {
		const text = "one\ntwo\nthree";
		expect(formatHashLines(text, 2, 3)).toBe(`2:${computeLineHash("two")}|two\n3:${computeLineHash("three")}|three`);
	});

	test("applies edits and preserves trailing newline semantics", () => {
		const original = "one\ntwo\nthree\n";
		const result = applyEditsToText(original, [
			{ set_line: { anchor: `2:${computeLineHash("two")}`, new_text: "TWO" } },
			{ insert_after: { anchor: `3:${computeLineHash("three")}`, text: "four" } },
		]);
		expect(result.updated).toBe("one\nTWO\nthree\nfour\n");
		expect(result.appliedEdits).toBe(2);
	});

	test("rejects stale anchors without changing the input", () => {
		const original = "one\ntwo";
		expect(() => applyEditsToText(original, [
			{ set_line: { anchor: "2:00", new_text: "changed" } },
		])).toThrow("anchor mismatch");
		expect(original).toBe("one\ntwo");
	});
});
