import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { piMeshDisabled } from "./disabled.ts";
import piMeshExtension from "./pi-mesh.ts";

const dir = mkdtempSync(join(tmpdir(), "pimesh-disabled-"));
const settings = (o: unknown) => { const f = join(dir, "settings-" + Math.random().toString(36).slice(2) + ".json"); writeFileSync(f, typeof o === "string" ? o : JSON.stringify(o)); return f; };

describe("PI_MESH_DISABLED", () => {
  test("the env switch disables it", () => {
    expect(piMeshDisabled({ PI_MESH_DISABLED: "1" }, join(dir, "absent.json"))).toBe(true);
  });
  test("the settings key disables it", () => {
    expect(piMeshDisabled({}, settings({ piMesh: { disabled: true } }))).toBe(true);
  });
  test("absent, false, or unreadable means enabled", () => {
    expect(piMeshDisabled({}, join(dir, "absent.json"))).toBe(false);
    expect(piMeshDisabled({}, settings({ piMesh: { disabled: false } }))).toBe(false);
    expect(piMeshDisabled({ PI_MESH_DISABLED: "0" }, settings("{ not json"))).toBe(false);
  });
  test("a disabled load touches NOTHING on the extension API: no tool, hook, command or message", () => {
    const touched: string[] = [];
    const api = new Proxy({}, { get: (_t, prop) => (..._a: unknown[]) => { touched.push(String(prop)); throw new Error("pi-mesh touched pi." + String(prop) + " while disabled"); } });
    const before = process.env.PI_MESH_DISABLED;
    process.env.PI_MESH_DISABLED = "1";
    try {
      piMeshExtension(api as never);
    } finally {
      if (before === undefined) delete process.env.PI_MESH_DISABLED; else process.env.PI_MESH_DISABLED = before;
    }
    expect(touched).toEqual([]);
  });
});

process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
