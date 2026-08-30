import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { MeshConfig } from "./types.ts";

export const MACHINE_MESH_CONFIG_MAX_BYTES = 16_384;
const MAX_ENDPOINTS = 32;
const MAX_ENDPOINT_BYTES = 512;
const encoder = new TextEncoder();

export interface MachineMeshConfigV1 {
  readonly schemaVersion: 1;
  readonly mode: "peer" | "client" | "router";
  readonly endpoints: readonly string[];
  readonly scouting: boolean;
}

export const DEFAULT_MACHINE_MESH_CONFIG: MachineMeshConfigV1 = Object.freeze({
  schemaVersion: 1,
  mode: "peer",
  endpoints: Object.freeze([]),
  scouting: true,
});

function invalid(): never {
  throw new Error("invalid_machine_mesh_config_v1");
}

function exactObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  const object = value as Record<string, unknown>;
  const actual = Object.keys(object).sort();
  const expected = ["endpoints", "mode", "schemaVersion", "scouting"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) invalid();
  return object;
}

function endpoint(value: unknown): string {
  if (typeof value !== "string" || encoder.encode(value).byteLength < 1 || encoder.encode(value).byteLength > MAX_ENDPOINT_BYTES) invalid();
  if (!/^[a-z][a-z0-9+.-]*\/[\x21-\x7e]+$/u.test(value)) invalid();
  return value;
}

export function decodeMachineMeshConfig(value: unknown): MachineMeshConfigV1 {
  const object = exactObject(value);
  if (object.schemaVersion !== 1 || (object.mode !== "peer" && object.mode !== "client" && object.mode !== "router") || typeof object.scouting !== "boolean") invalid();
  if (!Array.isArray(object.endpoints) || object.endpoints.length > MAX_ENDPOINTS) invalid();
  const endpoints = object.endpoints.map(endpoint);
  if (new Set(endpoints).size !== endpoints.length) invalid();
  return Object.freeze({ schemaVersion: 1, mode: object.mode, endpoints: Object.freeze(endpoints), scouting: object.scouting });
}

export function machineMeshConfigPath(home = homedir()): string {
  return join(home, ".pi", "mesh-config.json");
}

export function loadMachineMeshConfig(path = machineMeshConfigPath()): MachineMeshConfigV1 {
  let bytes: Uint8Array;
  try {
    const size = statSync(path).size;
    if (!Number.isSafeInteger(size) || size < 1 || size > MACHINE_MESH_CONFIG_MAX_BYTES) invalid();
    bytes = readFileSync(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return DEFAULT_MACHINE_MESH_CONFIG;
    throw error;
  }
  if (bytes.byteLength < 1 || bytes.byteLength > MACHINE_MESH_CONFIG_MAX_BYTES) invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    invalid();
  }
  return decodeMachineMeshConfig(parsed);
}

export function toMeshConfig(value: MachineMeshConfigV1): MeshConfig {
  return { mode: value.mode, scouting: value.scouting, ...(value.endpoints.length > 0 ? { endpoints: [...value.endpoints] } : {}) };
}
