
import { describe, test, expect } from "bun:test";
import { default as registerFrontpage } from "../extensions/frontpage.ts";

// Capture the registered execute() handlers via a fake ExtensionAPI
function captureTools() {
  const tools: Record<string, { execute: (id: string, params: any) => Promise<any> }> = {};
  const fakeApi: any = {
    registerTool: (def: { name: string; execute: any }) => { tools[def.name] = { execute: def.execute }; },
    registerCommand: () => {},
  };
  registerFrontpage(fakeApi);
  return tools;
}

describe("frontpage defensive validation", () => {
  const tools = captureTools();

  test("frontpage_create({}) returns isError tool_result instead of throwing", async () => {
    const result = await tools.frontpage_create.execute("call-1", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("missing required parameter");
    expect(result.content[0].text).toContain("spec");
    expect(result.details).toMatchObject({ error: "missing-parameter" });
  });

  test("frontpage_create with partial spec returns isError listing missing fields", async () => {
    const result = await tools.frontpage_create.execute("call-2", { spec: { slug: "x", title: "y" } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("thesis");
    expect(result.content[0].text).toContain("palette");
    expect(result.content[0].text).toContain("register");
    expect(result.content[0].text).toContain("sections");
  });

  test("frontpage_update({}) returns isError tool_result", async () => {
    const result = await tools.frontpage_update.execute("call-3", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("slug");
    expect(result.content[0].text).toContain("patch");
    expect(result.content[0].text).toContain("note");
  });

  test("frontpage_open({}) returns isError tool_result", async () => {
    const result = await tools.frontpage_open.execute("call-4", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("slug");
  });

  test("frontpage_open with non-existent slug returns isError, not crash", async () => {
    const result = await tools.frontpage_open.execute("call-5", { slug: "absolutely-does-not-exist-xyz" });
    expect(result.isError).toBe(true);
  });
});
