import { describe, test, expect } from "bun:test";
import { lintMermaid } from "./mermaid-lint.ts";

const rules = (src: string) => lintMermaid(src).map((f) => `${f.level}:${f.rule}`);

describe("mermaid-lint — edge-label brackets (parse-breakers)", () => {
	test("unquoted ( ) in a pipe edge label is an ERROR", () => {
		expect(rules("graph TD\n  A -->|spawn (x) ship| B")).toContain("error:mermaid/edge-label-needs-quotes");
	});
	test("unquoted [ ] and { } in edge labels error too", () => {
		expect(rules("graph TD\n  A -->|tag [v2]| B")).toContain("error:mermaid/edge-label-needs-quotes");
		expect(rules("graph TD\n  A -->|set {x}| B")).toContain("error:mermaid/edge-label-needs-quotes");
	});
	test("QUOTING the bracketed label clears it", () => {
		expect(rules('graph TD\n  A -->|"spawn (x) ship"| B')).not.toContain("error:mermaid/edge-label-needs-quotes");
	});
	test("slash / colon / star / ellipsis in edge labels are FINE (they parse)", () => {
		// Verified against mermaid.parse: only ( ) [ ] { } break unquoted labels.
		expect(rules("graph TD\n  A -->|raiders / distress ship| B")).not.toContain("error:mermaid/edge-label-needs-quotes");
		expect(rules("graph TD\n  A -->|decides WHEN: start| B")).not.toContain("error:mermaid/edge-label-needs-quotes");
		expect(rules("graph TD\n  A -->|glob * match| B")).not.toContain("error:mermaid/edge-label-needs-quotes");
	});
});

describe("mermaid-lint — single-quoted labels (mermaid only quotes with double quotes)", () => {
	test("single-quoted node label with parens errors (the real agent break)", () => {
		expect(rules("flowchart LR\n  MAP['World-map (already shows pip)'] --> X['y']")).toContain("error:mermaid/single-quoted-label");
	});
	test("single-quoted edge label errors", () => {
		expect(rules("flowchart LR\n  A -->|'spawn (x)'| B")).toContain("error:mermaid/single-quoted-label");
	});
	test("double-quoted labels are clean", () => {
		expect(rules('flowchart LR\n  MAP["World-map (already shows pip)"] --> X["y"]')).not.toContain("error:mermaid/single-quoted-label");
	});
	test("apostrophe INSIDE a double-quoted label is NOT flagged", () => {
		expect(rules('flowchart LR\n  A["it' + "'" + 's fine"] --> B["ok"]')).not.toContain("error:mermaid/single-quoted-label");
	});
});

describe("mermaid-lint — self-loop", () => {
	test("X --> X warns", () => {
		expect(rules("graph TD\n  L3b -->|start| L3b")).toContain("warning:mermaid/self-loop");
	});
	test("X --> Y does not warn", () => {
		expect(rules("graph TD\n  A -->|start| B")).not.toContain("warning:mermaid/self-loop");
	});
});

describe("mermaid-lint — no false positives", () => {
	test("3-digit hex (#fff) in classDef is NOT flagged — mermaid themes use it and it renders fine", () => {
		const r = rules("graph TD\n  A-->B\n  classDef x fill:#1b5e20,color:#fff;");
		expect(r).not.toContain("warning:mermaid/short-hex-color");
		expect(r.filter((x) => x.startsWith("error"))).toHaveLength(0);
	});
	test("a real, valid quoted-label flowchart with classDefs is clean", () => {
		const src = [
			"graph TD",
			'  D["DIRECTOR<br/>role=Director"]:::missing',
			'  L3b["SCENARIO RUNTIME"]:::designed',
			'  D -->|"watches player, decides WHEN: start"| L3b',
			"  classDef missing fill:#b71c1c,stroke:#ff8a80,color:#fff;",
			"  classDef designed fill:#4a148c,stroke:#ce93d8,color:#fff;",
		].join("\n");
		expect(lintMermaid(src)).toHaveLength(0);
	});
});

describe("mermaid-lint — existing rules still fire", () => {
	test("literal backslash-n in a label errors", () => {
		expect(rules('graph TD\n  A["line1\\nline2"] --> B')).toContain("error:mermaid/literal-newline-in-label");
	});
	test("missing direction warns", () => {
		expect(rules("graph\n  A --> B")).toContain("warning:mermaid/missing-direction");
	});
	test("empty source errors", () => {
		expect(rules("   ")).toContain("error:mermaid/empty");
	});
});
