/**
 * Relay notify() pings to the Hooman's Telegram via the agent's OWN live mesh
 * connection.
 *
 * packages/pi-mesh exposes its running PiMesh instance on globalThis.__piMesh
 * (see pi-mesh.ts `(globalThis as any).__piMesh = mesh`) precisely so other
 * extensions can send on the existing connection instead of opening a
 * duplicate one. We call its tell(hoomanDurableId, text) — the message lands
 * as a normal mesh:tell from THIS agent, so the bridge recognises the sender
 * and routes it to this agent's existing Ramdock topic. No transient socket,
 * no new topic, no identity collision, no bridge changes.
 *
 * The Hooman's durable mesh id is read from the bridge's out-of-repo config
 * (~/.config/mesh-telegram-bridge/config.env, key HOOMAN_MESH_ID) — the single
 * source of truth. Override via process.env.HOOMAN_MESH_ID.
 *
 * Fire-and-forget. NEVER throws — a failed relay must not break a notify().
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { NotifyParts } from "../../shared/src/desktop-notify.ts";

const BRIDGE_CONFIG = join(homedir(), ".config", "mesh-telegram-bridge", "config.env");

interface PiMeshLike {
	tell?: (sessionId: string, message: unknown) => unknown;
}

let cachedHoomanId: string | null | undefined;

/** Read the Hooman durable mesh id (env first, then the bridge config file). Cached. */
function readHoomanMeshId(): string | null {
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

/**
 * Compose the TG-facing text from notify parts. Drops the title — the bridge
 * already labels the message with the sending agent's nickname (👤 Anna …), so
 * echoing the title (which defaults to the same short name) would duplicate it.
 */
function composeText({ subtitle, body }: NotifyParts): string {
	const sub = (subtitle ?? "").trim();
	const bod = (body ?? "").trim();
	if (sub && bod) return "🔔 " + sub + ": " + bod;
	if (bod) return "🔔 " + bod;
	if (sub) return "🔔 " + sub;
	return "";
}

/**
 * Relay a notify() ping to the Hooman's Telegram topic via the live mesh.
 * Returns true only when a tell was actually handed to the mesh.
 */
export function relayNotifyToHooman(parts: NotifyParts): boolean {
	try {
		const text = composeText(parts);
		if (!text) return false;
		const hoomanId = readHoomanMeshId();
		if (!hoomanId) return false;
		const mesh = (globalThis as { __piMesh?: PiMeshLike }).__piMesh;
		if (!mesh || typeof mesh.tell !== "function") return false;
		mesh.tell(hoomanId, text);
		return true;
	} catch {
		return false;
	}
}
