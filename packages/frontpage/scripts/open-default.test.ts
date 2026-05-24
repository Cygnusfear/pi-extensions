import { describe, test, expect, mock } from "bun:test";

let spawnCalls: Array<{ cmd: string; args: string[] }> = [];

await mock.module("node:child_process", () => ({
  spawn: (cmd: string, args: string[] = []) => {
    spawnCalls.push({ cmd, args });
    const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
    const fakeChild = {
      on(event: string, cb: (...a: unknown[]) => void) {
        (handlers[event] ||= []).push(cb);
        // Fire 'close' on next tick so runMai's Promise can resolve
        if (event === "close") {
          setTimeout(() => cb(0), 0);
        }
        return fakeChild;
      },
      unref() {},
      pid: 12345,
      stdin: { write() {}, end() {} },
      stdout: { on(_e: string, _cb: (...a: unknown[]) => void) { return fakeChild.stdout; } },
      stderr: { on(_e: string, _cb: (...a: unknown[]) => void) { return fakeChild.stderr; } },
    };
    return fakeChild;
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

const minimalSpec = {
  slug: "open-default-test",
  title: "Open default test",
  thesis: "Verifies frontpage_create does not auto-open the file.",
  palette: "navy" as const,
  register: "nyt-editorial" as const,
  sections: [{ type: "lead" as const, text: "x" }],
};

function countOsOpens(calls: typeof spawnCalls): number {
  return calls.filter(c => c.cmd === "open" || c.cmd === "xdg-open" || c.cmd === "start").length;
}

describe("frontpage_create open default (opt-in)", () => {
  const tools = captureTools();

  test("does NOT auto-open when open is omitted", async () => {
    spawnCalls = [];
    await tools.frontpage_create.execute("c1", { spec: { ...minimalSpec, slug: "open-default-test-1" } });
    expect(countOsOpens(spawnCalls)).toBe(0);
  });

  test("does NOT auto-open when open is explicitly false", async () => {
    spawnCalls = [];
    await tools.frontpage_create.execute("c2", { spec: { ...minimalSpec, slug: "open-default-test-2" }, open: false });
    expect(countOsOpens(spawnCalls)).toBe(0);
  });

  test("DOES open when open is explicitly true", async () => {
    spawnCalls = [];
    await tools.frontpage_create.execute("c3", { spec: { ...minimalSpec, slug: "open-default-test-3" }, open: true });
    expect(countOsOpens(spawnCalls)).toBe(1);
  });

  test("frontpage_open ALWAYS opens (single-purpose tool)", async () => {
    await tools.frontpage_create.execute("c4a", { spec: { ...minimalSpec, slug: "open-default-test-4" } });
    spawnCalls = [];
    await tools.frontpage_open.execute("c4b", { slug: "open-default-test-4" });
    expect(countOsOpens(spawnCalls)).toBe(1);
  });
});
