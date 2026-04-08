import { describe, test, expect } from "bun:test";
import { tokenize, buildBm25Index, searchBm25, bm25Search } from "./bm25.js";

describe("tokenize", () => {
	test("splits on non-alphanumeric", () => {
		expect(tokenize("Hello, World! foo_bar")).toEqual(["hello", "world", "foo_bar"]);
	});

	test("empty input", () => {
		expect(tokenize("")).toEqual([]);
	});
});

describe("BM25", () => {
	const docs = [
		{ id: "a", fields: { title: "Mesh networking protocol", body: "P2P agent communication via Zenoh" } },
		{ id: "b", fields: { title: "Code mode sandbox", body: "execute_code runs JS with typed async functions" } },
		{ id: "c", fields: { title: "Teams multi-agent", body: "Spawn workers across models and collect results" } },
		{ id: "d", fields: { title: "Mesh reliability fix", body: "Direct tells no longer disappear behind busy sessions" } },
	];

	test("finds relevant docs by title", () => {
		const results = bm25Search(docs, "mesh", { fieldWeights: { title: 3, body: 1 }, topK: 5 });
		expect(results.length).toBeGreaterThan(0);
		// Both mesh docs should be in results
		const ids = results.map(r => r.id);
		expect(ids).toContain("a");
		expect(ids).toContain("d");
	});

	test("finds relevant docs by body", () => {
		const results = bm25Search(docs, "Zenoh P2P", { fieldWeights: { title: 3, body: 1 } });
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].id).toBe("a");
	});

	test("returns empty for nonsense query", () => {
		const results = bm25Search(docs, "xyzzyplugh");
		expect(results).toEqual([]);
	});

	test("field weights affect ranking", () => {
		// Body-only match should rank below title match with same terms
		const docs2 = [
			{ id: "title-match", fields: { title: "ouija", body: "something else" } },
			{ id: "body-match", fields: { title: "something else", body: "ouija context window usage" } },
		];
		const results = bm25Search(docs2, "ouija", { fieldWeights: { title: 5, body: 1 } });
		expect(results[0].id).toBe("title-match");
	});

	test("reusable index", () => {
		const index = buildBm25Index(docs, { title: 3, body: 1 });
		const r1 = searchBm25(index, "mesh");
		const r2 = searchBm25(index, "code sandbox");
		expect(r1[0].id).toBe("a");
		expect(r2[0].id).toBe("b");
	});
});
