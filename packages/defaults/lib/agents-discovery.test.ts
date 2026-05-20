import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AgentsDiscoveryManager } from "./agents-discovery";
import { getDiscoveryPathsForToolResult } from "../hooks/agents-discovery";

function mkdirp(p: string) {
  mkdirSync(p, { recursive: true });
}

function write(p: string, content: string) {
  mkdirp(path.dirname(p));
  writeFileSync(p, content);
}

function bumpMtime(p: string) {
  const now = Date.now() / 1000 + Math.random() + 10;
  utimesSync(p, now, now);
}

describe("AgentsDiscoveryManager", () => {
  let dir: string;
  let project: string;

  beforeEach(() => {
    dir = path.join(tmpdir(), `pi-ext-agents-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    project = path.join(dir, "project");
    mkdirp(project);
  });

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test("injects subdirectory convention file on first touch", async () => {
    const sub = path.join(project, "packages", "foo");
    write(path.join(sub, "AGENTS.md"), "foo rules");
    write(path.join(sub, "src.ts"), "export const x = 1;");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    const found = await manager.discover(path.join(sub, "src.ts"));
    expect(found).toHaveLength(1);
    expect(found[0].reason).toBe("new");
    expect(found[0].spec.name).toBe("AGENTS.md");
    expect(found[0].content).toBe("foo rules");
  });

  test("does not re-inject unchanged content", async () => {
    const sub = path.join(project, "pkg");
    write(path.join(sub, "AGENTS.md"), "same rules");
    write(path.join(sub, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(1);
    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(0);
  });

  test("re-injects when content hash changes", async () => {
    const sub = path.join(project, "pkg");
    const agents = path.join(sub, "AGENTS.md");
    write(agents, "old rules");
    write(path.join(sub, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);
    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(1);

    write(agents, "new rules");
    bumpMtime(agents);

    const found = await manager.discover(path.join(sub, "file.ts"));
    expect(found).toHaveLength(1);
    expect(found[0].reason).toBe("changed");
    expect(found[0].content).toBe("new rules");
  });

  test("mtime-only changes update cache without re-injection", async () => {
    const sub = path.join(project, "pkg");
    const agents = path.join(sub, "AGENTS.md");
    write(agents, "same rules");
    write(path.join(sub, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);
    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(1);

    bumpMtime(agents);
    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(0);
  });

  test("discovers AGENTS.md and CLAUDE.md in registry order", async () => {
    const sub = path.join(project, "pkg");
    write(path.join(sub, "AGENTS.md"), "agent rules");
    write(path.join(sub, "CLAUDE.md"), "claude rules");
    write(path.join(sub, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    const found = await manager.discover(path.join(sub, "file.ts"));
    expect(found.map((f) => f.spec.name)).toEqual(["AGENTS.md", "CLAUDE.md"]);
    expect(found.map((f) => f.content)).toEqual(["agent rules", "claude rules"]);
  });

  test("truncates files above maxBytes", async () => {
    const sub = path.join(project, "pkg");
    write(path.join(sub, "RULES.md"), "0123456789abcdefghij");
    write(path.join(sub, "file.ts"), "");

    const manager = new AgentsDiscoveryManager(() => [], [{ name: "RULES.md", cascade: true, maxBytes: 10 }], {
      replaceDefaults: true,
    });
    manager.resetSession(project);

    const found = await manager.discover(path.join(sub, "file.ts"));
    expect(found).toHaveLength(1);
    expect(found[0].truncated).toBe(true);
    expect(found[0].content).toContain("0123456789");
    expect(found[0].content).toContain("truncated at 10 bytes");
  });

  test("seeds cwd convention files loaded by the startup system prompt", async () => {
    write(path.join(project, "AGENTS.md"), "root rules");
    write(path.join(project, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    expect(await manager.discover(path.join(project, "file.ts"))).toHaveLength(0);
  });

  test("re-injects a seeded cwd convention file when it changes mid-session", async () => {
    const agents = path.join(project, "AGENTS.md");
    write(agents, "root rules v1");
    write(path.join(project, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);
    expect(await manager.discover(path.join(project, "file.ts"))).toHaveLength(0);

    write(agents, "root rules v2");
    bumpMtime(agents);

    const found = await manager.discover(path.join(project, "file.ts"));
    expect(found).toHaveLength(1);
    expect(found[0].reason).toBe("changed");
    expect(found[0].content).toBe("root rules v2");
  });

  test("returns no files outside cwd and home roots", async () => {
    const outside = path.join(dir, "outside");
    write(path.join(outside, "AGENTS.md"), "outside rules");
    write(path.join(outside, "file.ts"), "");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    expect(await manager.discover(path.join(outside, "file.ts"))).toHaveLength(0);
  });

  test("reading a convention file directly records it without duplicate injection", async () => {
    const sub = path.join(project, "pkg");
    const agents = path.join(sub, "AGENTS.md");
    write(agents, "rules");

    const manager = new AgentsDiscoveryManager();
    manager.resetSession(project);

    expect(await manager.discover(agents)).toHaveLength(0);
    expect(await manager.discover(path.join(sub, "file.ts"))).toHaveLength(0);
  });

  test("custom convention files extend defaults by default", () => {
    const manager = new AgentsDiscoveryManager(() => [], [{ name: "RULES.md", cascade: true }]);
    expect(manager.getSpecs().map((s) => s.name)).toEqual(["AGENTS.md", "CLAUDE.md", "RULES.md"]);
  });

  test("custom convention files can replace defaults", () => {
    const manager = new AgentsDiscoveryManager(() => [], [{ name: "RULES.md", cascade: true }], {
      replaceDefaults: true,
    });
    expect(manager.getSpecs().map((s) => s.name)).toEqual(["RULES.md"]);
  });
});

describe("getDiscoveryPathsForToolResult", () => {
  test("path-touching tools extract stable paths", () => {
    expect(getDiscoveryPathsForToolResult("read", { path: "src/a.ts" })).toEqual(["src/a.ts"]);
    expect(getDiscoveryPathsForToolResult("edit", { path: "src/a.ts" })).toEqual(["src/a.ts"]);
    expect(getDiscoveryPathsForToolResult("write", { path: "src/a.ts" })).toEqual(["src/a.ts"]);
    expect(getDiscoveryPathsForToolResult("grep", { path: "src" })).toEqual(["src"]);
    expect(getDiscoveryPathsForToolResult("find", { path: "src" })).toEqual(["src"]);
    expect(getDiscoveryPathsForToolResult("ls", { path: "src" })).toEqual(["src"]);
    expect(getDiscoveryPathsForToolResult("bash", { cwd: "src" })).toEqual(["src"]);
  });

  test("search/list tools fall back to cwd marker and bash without cwd does not guess", () => {
    expect(getDiscoveryPathsForToolResult("grep", {})).toEqual(["."]);
    expect(getDiscoveryPathsForToolResult("find", {})).toEqual(["."]);
    expect(getDiscoveryPathsForToolResult("ls", {})).toEqual(["."]);
    expect(getDiscoveryPathsForToolResult("bash", { command: "cd src && ls" })).toEqual([]);
    expect(getDiscoveryPathsForToolResult("read", {})).toEqual([]);
    expect(getDiscoveryPathsForToolResult("unknown", { path: "src" })).toEqual([]);
  });
});
