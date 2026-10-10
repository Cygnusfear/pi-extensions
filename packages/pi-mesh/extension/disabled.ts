// PI_MESH_DISABLED — the switch the laptop swap to Sanga uses (ruling by Johannes, 2026-10-10 13:14).
//
// pi-mesh ships inside the pi-extensions package entry together with ~50 other extensions, so it cannot be
// unloaded by removing a package: that would unload everything. Instead, when this switch is on, pi-mesh loads
// as NOTHING — no tools, no hooks, no commands, no sidecar connect — and every other extension is untouched.
// The swap runbook sets it; its rollback clears it.
//
// Two ways to turn it on, either is enough:
//   env       PI_MESH_DISABLED=1
//   settings  ~/.pi/agent/settings.json  { "piMesh": { "disabled": true } }
// The settings key is the durable one: a pi started from a terminal does not inherit launchd's environment.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DISABLE_ENV = "PI_MESH_DISABLED";
export const settingsPath = (): string => join(process.env.PI_AGENT_DIR ?? join(homedir(), ".pi", "agent"), "settings.json");

/** True when pi-mesh must load as nothing. A missing or unreadable settings file means NOT disabled. */
export function piMeshDisabled(env: Record<string, string | undefined> = process.env, file: string = settingsPath()): boolean {
  if (env[DISABLE_ENV] === "1") return true;
  try {
    const s = JSON.parse(readFileSync(file, "utf8")) as { piMesh?: { disabled?: unknown } };
    return s?.piMesh?.disabled === true;
  } catch {
    return false;
  }
}
