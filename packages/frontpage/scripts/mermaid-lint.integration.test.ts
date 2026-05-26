import { describe, test, expect, mock } from "bun:test";

let spawnCalls: Array<{ cmd: string; args: string[] }> = [];

await mock.module("node:child_process", () => ({
  spawn: (cmd: string) => {
    spawnCalls.push({ cmd, args: [] });
    const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
    return {
      on(event: string, cb: (...a: unknown[]) => void) {
        (handlers[event] ||= []).push(cb);
        if (event === "close") setTimeout(() => cb(0), 0);
        return this;
      },
      unref() {},
      pid: 12345,
      stdin: { write() {}, end() {} },
      stdout: { on() { return this; } },
      stderr: { on() { return this; } },
    };
  },
}));

const { default: registerFrontpage } = await import("../extensions/frontpage.ts");

function captureTools() {
  const tools: Record<string, { execute: (id: string, params: any) => Promise<any> }> = {};
  const fakeApi: any = {
    registerTool: (def: { name: string; execute: any }) => { tools[def.name] = { execute: def.execute }; },
    registerCommand: () => {},
  };
  registerFrontpage(fakeApi);
  return tools;
}

describe("frontpage_create surfaces mermaid lint findings", () => {
  const tools = captureTools();
  const baseSpec = {
    title: "T",
    thesis: "Y",
    palette: "navy" as const,
    register: "nyt-editorial" as const,
  };

  test("backslash-n in mermaid label surfaces ERROR finding, page still written", async () => {
    const result = await tools.frontpage_create.execute("c1", {
      spec: {
        ...baseSpec,
        slug: "mermaid-lint-test-1",
        sections: [
          { type: "mermaid", source: 'graph TD\n  A["line1\\nline2"] --> B' },
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    // Page was written
    expect(text).toContain("Frontpage written");
    // Lint surfaced in the text
    expect(text).toContain("Mermaid lint:");
    expect(text).toContain("ERROR");
    expect(text).toContain("mermaid/literal-newline-in-label");
    // Structured details
    expect(result.details.mermaidFindings).toHaveLength(1);
    expect(result.details.mermaidFindings[0].rule).toBe("mermaid/literal-newline-in-label");
    expect(result.details.mermaidFindings[0].level).toBe("error");
  });

  test("clean mermaid section produces no findings", async () => {
    const result = await tools.frontpage_create.execute("c2", {
      spec: {
        ...baseSpec,
        slug: "mermaid-lint-test-2",
        sections: [
          { type: "mermaid", source: "graph TD\n  A --> B" },
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).not.toContain("Mermaid lint:");
    expect(result.details.mermaidFindings).toEqual([]);
  });

  test("multiple mermaid sections — findings attribute to specific section IDs", async () => {
    const result = await tools.frontpage_create.execute("c3", {
      spec: {
        ...baseSpec,
        slug: "mermaid-lint-test-3",
        sections: [
          { type: "mermaid", source: "graph TD\n  A --> B" }, // clean
          { type: "mermaid", source: "" }, // empty → error
          { type: "mermaid", source: "graph\n  A --> B" }, // missing direction → warn
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("1 error(s)");
    expect(text).toContain("1 warning(s)");
    expect(text).toContain("mermaid/empty");
    expect(text).toContain("mermaid/missing-direction");
    // Section IDs are assigned by assignIds; check they're present in details
    const findings = result.details.mermaidFindings;
    expect(findings).toHaveLength(2);
    expect(findings.every((f: any) => typeof f.sectionId === "string")).toBe(true);
  });

  test("non-mermaid sections are not linted", async () => {
    const result = await tools.frontpage_create.execute("c4", {
      spec: {
        ...baseSpec,
        slug: "mermaid-lint-test-4",
        sections: [
          { type: "lead", text: "no mermaid here" },
          { type: "prose", body: "also nothing" },
        ],
      },
    });
    expect(result.details.mermaidFindings).toEqual([]);
  });
});

describe("frontpage_update surfaces mermaid lint findings", () => {
  const tools = captureTools();
  const baseSpec = {
    title: "T",
    thesis: "Y",
    palette: "navy" as const,
    register: "nyt-editorial" as const,
  };

  test("updating to a broken mermaid section surfaces the finding", async () => {
    // Create with a clean section first
    await tools.frontpage_create.execute("u1a", {
      spec: {
        ...baseSpec,
        slug: "mermaid-lint-update-1",
        sections: [
          { type: "mermaid", source: "graph TD\n  A --> B", id: "s1" },
        ],
      },
    });
    // Now patch to broken
    const result = await tools.frontpage_update.execute("u1b", {
      slug: "mermaid-lint-update-1",
      patch: [{
        op: "replace_section",
        section_id: "s1",
        new_section: { type: "mermaid", source: 'graph TD\n  A["broken\\nlabel"]' },
      }],
      note: "test",
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Frontpage updated");
    expect(result.content[0].text).toContain("Mermaid lint:");
    expect(result.content[0].text).toContain("mermaid/literal-newline-in-label");
  });
});
