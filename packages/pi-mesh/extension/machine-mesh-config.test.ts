import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MACHINE_MESH_CONFIG,
  MACHINE_MESH_CONFIG_MAX_BYTES,
  decodeMachineMeshConfig,
  loadMachineMeshConfig,
  machineMeshConfigPath,
  toMeshConfig,
} from "./machine-mesh-config.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "pi-mesh-config-"));
  roots.push(value);
  return value;
}

function writeConfig(home: string, value: string | Uint8Array): string {
  const path = machineMeshConfigPath(home);
  mkdirSync(join(home, ".pi"), { recursive: true });
  writeFileSync(path, value);
  return path;
}

describe("machine mesh config", () => {
  test("missing file uses local peer defaults", () => {
    const value = loadMachineMeshConfig(machineMeshConfigPath(root()));
    expect(value).toEqual(DEFAULT_MACHINE_MESH_CONFIG);
    expect(toMeshConfig(value)).toEqual({ mode: "peer", scouting: true });
  });

  test("accepts the exact versioned federated machine contract", () => {
    const home = root();
    const path = writeConfig(home, JSON.stringify({
      schemaVersion: 1,
      mode: "peer",
      endpoints: ["tcp/100.126.107.62:7447"],
      scouting: false,
    }));
    expect(loadMachineMeshConfig(path)).toEqual({
      schemaVersion: 1,
      mode: "peer",
      endpoints: ["tcp/100.126.107.62:7447"],
      scouting: false,
    });
  });

  test("rejects malformed, extra, duplicate, control-bearing, and oversized input", () => {
    const invalid = [
      null,
      {},
      { schemaVersion: 2, mode: "peer", endpoints: [], scouting: true },
      { schemaVersion: 1, mode: "invalid", endpoints: [], scouting: true },
      { schemaVersion: 1, mode: "peer", endpoints: "tcp/host:7447", scouting: true },
      { schemaVersion: 1, mode: "peer", endpoints: ["tcp/host:7447", "tcp/host:7447"], scouting: true },
      { schemaVersion: 1, mode: "peer", endpoints: ["tcp/host:7447\n"], scouting: true },
      { schemaVersion: 1, mode: "peer", endpoints: [], scouting: true, extra: true },
    ];
    for (const value of invalid) expect(() => decodeMachineMeshConfig(value)).toThrow("invalid_machine_mesh_config_v1");

    const home = root();
    expect(() => loadMachineMeshConfig(writeConfig(home, "{"))).toThrow("invalid_machine_mesh_config_v1");
    expect(() => loadMachineMeshConfig(writeConfig(home, new Uint8Array([0xff])))).toThrow("invalid_machine_mesh_config_v1");
    expect(() => loadMachineMeshConfig(writeConfig(home, "x".repeat(MACHINE_MESH_CONFIG_MAX_BYTES + 1)))).toThrow("invalid_machine_mesh_config_v1");
  });
});
