/**
 * Relay a one-line message to the Hooman's Telegram via the agent's OWN live
 * mesh connection.
 *
 * packages/pi-mesh exposes its running PiMesh instance on globalThis.__piMesh
 * (intended for other extensions), so we send on the existing connection instead
 * of opening a duplicate. We call .tell(hoomanDurableId, text) — the message
 * lands as a normal mesh:tell from THIS agent, so the mesh<->Telegram bridge
 * recognises the sender and routes it into this agent's Ramdock topic.
 *
 * The Hooman's durable mesh id is read from the bridge's out-of-repo config
 * (~/.config/mesh-telegram-bridge/config.env, key HOOMAN_MESH_ID) or
 * process.env.HOOMAN_MESH_ID — the single source of truth, never hardcoded.
 *
 * Fire-and-forget. NEVER throws. Silently no-ops when the mesh or the bridge
 * config is unavailable (e.g. no bridge configured on this box).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BRIDGE_CONFIG = join(homedir(), ".config", "mesh-telegram-bridge", "config.env");

interface PiMeshLike {
	tell?: (sessionId: string, message: unknown) => unknown;
}

let cachedHoomanId: string | null | undefined;

/** Read the Hooman durable mesh id (env first, then the bridge config file). Cached. */
export function readHoomanMeshId(): string | null {
	if (cachedHoomanId !== undefined) return cachedHoomanId;
	const fromEnv = process.env.HOOMAN_MESH_ID;
	if (fromEnv && fromEnv.trim()) {
		cachedHoomanId = fromEnv.trim();
		return cachedHoomanId;
	}
	try {
		if (existsSync(BRIDGE_CONFIG)) {
			for (const raw of readFileSync(BRIDGE_CONFIG, "utf8").split("\n")) {
				const m = raw.match(/^\s*HOOMAN_MESH_ID\s*=\s*(.*?)\s*$/);
				if (!m) continue;
				let v = m[1];
				if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
					v = v.slice(1, -1);
				}
				if (v.trim()) {
					cachedHoomanId = v.trim();
					return cachedHoomanId;
				}
			}
		}
	} catch {}
	cachedHoomanId = null;
	return null;
}

/** Relay a one-line message to the Hooman's Telegram. Returns true only when a tell was handed to the mesh. */
export function relayToHooman(text: string): boolean {
	try {
		const t = (text ?? "").trim();
		if (!t) return false;
		const hoomanId = readHoomanMeshId();
		if (!hoomanId) return false;
		const mesh = (globalThis as { __piMesh?: PiMeshLike }).__piMesh;
		if (!mesh || typeof mesh.tell !== "function") return false;
		mesh.tell(hoomanId, t);
		return true;
	} catch {
		return false;
	}
}
