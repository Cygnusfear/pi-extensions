import { describe, test, expect } from "bun:test";
import { lintMermaid, formatMermaidFinding } from "../extensions/mermaid-lint.ts";

describe("lintMermaid", () => {
  describe("empty source", () => {
    test("empty string", () => {
      const f = lintMermaid("");
      expect(f).toHaveLength(1);
      expect(f[0].level).toBe("error");
      expect(f[0].rule).toBe("mermaid/empty");
    });

    test("whitespace-only", () => {
      const f = lintMermaid("   \n  \n");
      expect(f[0].rule).toBe("mermaid/empty");
    });
  });

  describe("backslash-n in label (SKILL.md anti-pattern)", () => {
    test("flags \\n inside quoted label", () => {
      const src = 'graph TD\n  A["line1\\nline2"] --> B';
      const f = lintMermaid(src);
      const found = f.find((x) => x.rule === "mermaid/literal-newline-in-label");
      expect(found).toBeDefined();
      expect(found?.level).toBe("error");
      expect(found?.line).toBe(2);
    });

    test("does NOT flag <br/> in label", () => {
      const src = 'graph TD\n  A["line1<br/>line2"] --> B';
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/literal-newline-in-label")).toBeUndefined();
    });
  });

  describe("bracket balance", () => {
    test("flags extra closing square bracket", () => {
      const src = "graph TD\n  A] --> B";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/bracket-balance")).toBeDefined();
    });

    test("flags unclosed paren", () => {
      const src = "graph TD\n  A(label --> B";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/bracket-balance")).toBeDefined();
    });

    test("flags unclosed brace", () => {
      const src = "graph TD\n  A{label --> B";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/bracket-balance")).toBeDefined();
    });

    test("ignores brackets INSIDE quoted labels", () => {
      const src = 'graph TD\n  A["this [is] fine ( really )"] --> B';
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/bracket-balance")).toBeUndefined();
    });

    test("ignores brackets in comment lines", () => {
      const src = "graph TD\n  %% TODO: fix [unclosed bracket\n  A --> B";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/bracket-balance")).toBeUndefined();
    });

    test("flags unbalanced quotes", () => {
      const src = 'graph TD\n  A["unclosed --> B';
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/quote-balance")).toBeDefined();
    });
  });

  describe(".node class redefinition (SKILL.md anti-pattern)", () => {
    test("flags classDef node", () => {
      const src = "graph TD\n  classDef node fill:#f00\n  A --> B";
      const f = lintMermaid(src);
      const found = f.find((x) => x.rule === "mermaid/node-class-redefinition");
      expect(found).toBeDefined();
      expect(found?.level).toBe("error");
    });

    test("flags class X node assignment", () => {
      const src = "graph TD\n  A --> B\n  class A node";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/node-class-redefinition")).toBeDefined();
    });

    test("does NOT flag other class names", () => {
      const src = "graph TD\n  classDef highlight fill:#f00\n  A --> B";
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/node-class-redefinition")).toBeUndefined();
    });
  });

  describe("flowchart direction", () => {
    test("warns on bare graph/flowchart with no direction", () => {
      const f = lintMermaid("graph\n  A --> B");
      const found = f.find((x) => x.rule === "mermaid/missing-direction");
      expect(found).toBeDefined();
      expect(found?.level).toBe("warning");
    });

    test("ok on graph TD / TB / LR / RL / BT", () => {
      for (const dir of ["TD", "TB", "LR", "RL", "BT"]) {
        const f = lintMermaid(`graph ${dir}\n  A --> B`);
        expect(f.find((x) => x.rule === "mermaid/missing-direction")).toBeUndefined();
      }
    });
  });

  describe("flowchart node count", () => {
    test("warns on 15+ nodes", () => {
      const nodes = Array.from({ length: 16 }, (_, i) => `N${i}[label${i}]`).join("\n  ");
      const src = `graph TD\n  ${nodes}`;
      const f = lintMermaid(src);
      const found = f.find((x) => x.rule === "mermaid/too-many-nodes");
      expect(found).toBeDefined();
      expect(found?.level).toBe("warning");
    });

    test("ok on 14 nodes", () => {
      const nodes = Array.from({ length: 14 }, (_, i) => `N${i}[label]`).join("\n  ");
      const src = `graph TD\n  ${nodes}`;
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/too-many-nodes")).toBeUndefined();
    });
  });

  describe("state-diagram strict labels", () => {
    test("warns on colons inside transition labels", () => {
      const src = "stateDiagram-v2\n  A --> B : got 200: success";
      const f = lintMermaid(src);
      const found = f.find((x) => x.rule === "mermaid/state-strict-label");
      expect(found).toBeDefined();
    });

    test("does not warn on flowchart with colons in labels", () => {
      const src = 'graph TD\n  A -->|"got 200: success"| B';
      const f = lintMermaid(src);
      expect(f.find((x) => x.rule === "mermaid/state-strict-label")).toBeUndefined();
    });
  });

  describe("clean source", () => {
    test("simple flowchart passes with no findings", () => {
      const f = lintMermaid("graph TD\n  A --> B\n  B --> C");
      expect(f).toHaveLength(0);
    });

    test("flowchart with explicit direction + quoted labels passes", () => {
      const f = lintMermaid('graph LR\n  A["start"] --> B["end"]');
      expect(f).toHaveLength(0);
    });
  });
});

describe("formatMermaidFinding", () => {
  test("formats error with rule, section, line", () => {
    const out = formatMermaidFinding("s2", {
      level: "error",
      rule: "mermaid/empty",
      message: "Mermaid section source is empty.",
      line: 5,
    });
    expect(out).toContain("ERROR");
    expect(out).toContain("[s2]");
    expect(out).toContain("mermaid/empty");
    expect(out).toContain("(line 5)");
    expect(out).toContain("empty");
  });

  test("WARN level for warnings", () => {
    const out = formatMermaidFinding(undefined, {
      level: "warning",
      rule: "mermaid/missing-direction",
      message: "no dir",
    });
    expect(out).toContain("WARN");
  });

  test("omits line when not present", () => {
    const out = formatMermaidFinding("s1", {
      level: "error",
      rule: "x",
      message: "y",
    });
    expect(out).not.toContain("line");
  });
});
