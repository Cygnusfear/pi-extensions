import { describe, expect, it } from "bun:test";
import { safeJsonParse } from "./safe-json.js";

describe("safeJsonParse", () => {
	it("parses JSON after leading warning lines", () => {
		const input = [
			'2026-03-26T16:41:38.427042Z  WARN sqlx::query: slow statement: execution time exceeded alert threshold summary="WITH semantic_ranked AS (...)"',
			'{"results":[{"id":"abc","text":"hello","score":0.9,"fact_type":"world"}]}',
		].join("\n");

		expect(safeJsonParse<{ results: Array<{ id: string }> }>(input)).toEqual({
			results: [{ id: "abc", text: "hello", score: 0.9, fact_type: "world" }],
		});
	});

	it("skips non-json balanced text before the real payload", () => {
		const input = [
			"warning context [not json at all] before payload",
			'{"ok":true,"items":[1,2,3]}',
		].join("\n");

		expect(safeJsonParse<{ ok: boolean; items: number[] }>(input)).toEqual({
			ok: true,
			items: [1, 2, 3],
		});
	});
});
