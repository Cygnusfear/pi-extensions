/**
 * mesh-model-control
 *
 * Part B of "see model errors on Telegram + switch models". Lets the Hooman
 * switch an agent's model from Telegram with `/model <name>` in that agent's
 * topic. The bridge turns that into a mesh:control tell {op:'setModel', model};
 * pi-mesh routes control tells to the registry below (NEVER to the LLM), so the
 * switch is a reliable HARNESS action (pi.setModel), not something the model has
 * to notice and obey.
 *
 * Authorized to the Hooman's durable mesh id only — agents can't switch each
 * other. Resolution is lenient (full ids or shortcut aliases). Every switch is
 * confirmed back on the Hooman's Telegram.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { relayToHooman, readHoomanMeshId } from "../../shared/src/relay-to-hooman.ts";
import { findLatest } from "../../shared/src/model-utils.ts";
import { SHORTCUTS } from "../../model-shortcuts/extensions/model-shortcuts.ts";

type MeshControlHandler = (input: {
  op: string;
  payload: Record<string, unknown>;
  from: string | undefined;
}) => void;

/** The inbound control-plane registry pi-mesh exposes on globalThis (symmetric
 *  with globalThis.__piMesh for sending). Lazily created; order-independent. */
function controlRegistry(): Map<string, MeshControlHandler> {
  const g = globalThis as unknown as { __piMeshControls?: Map<string, MeshControlHandler> };
  if (!g.__piMeshControls) g.__piMeshControls = new Map();
  return g.__piMeshControls;
}

/** Lenient model resolution: exact id / provider+id, then shortcut alias
 *  (opus, sonnet, zai, kimi, …), then id substring. Registry-resolved. */
function resolveModel(ctx: ExtensionContext, name: string) {
  const all = ctx.modelRegistry.getAll();
  const q = name.trim().toLowerCase();
  const pick = (m: { provider: string; id: string } | null | undefined) =>
    m ? (ctx.modelRegistry.find(m.provider, m.id) ?? m) : undefined;
  // 1. exact id, or provider/id
  let hit = all.find(
    (m) => m.id.toLowerCase() === q || (m.provider + "/" + m.id).toLowerCase() === q,
  );
  if (hit) return pick(hit);
  // 2. shortcut alias → latest model in that provider/family
  const sc = SHORTCUTS.find((s) => s.command === q || s.label.toLowerCase() === q);
  if (sc) {
    const latest = findLatest(all, sc.provider, sc.family);
    if (latest) return pick(latest);
  }
  // 3. id substring (e.g. "glm-5.2", "opus", "codex")
  hit = all.find((m) => m.id.toLowerCase().includes(q));
  if (hit) return pick(hit);
  return undefined;
}

export default function meshModelControl(pi: ExtensionAPI): void {
  let ctx: ExtensionContext | null = null;
  pi.on("session_start", (_event, c) => {
    ctx = c;
  });

  const handleSetModel = async (
    payload: Record<string, unknown>,
    from: string | undefined,
  ): Promise<void> => {
    // Authorization: only the Hooman (durable mesh id from bridge config) may
    // switch a model. Unknown senders are ignored (never surfaced anywhere).
    const hoomanId = readHoomanMeshId();
    if (!hoomanId || from !== hoomanId) {
      console.warn("[mesh-model-control] setModel from unauthorized sender:", from);
      return;
    }
    const name = typeof payload.model === "string" ? payload.model.trim() : "";
    if (!name) {
      relayToHooman("no model name given after /model.");
      return;
    }
    if (!ctx) {
      relayToHooman("/model: session not ready yet — try again in a moment.");
      return;
    }
    const resolved = resolveModel(ctx, name);
    if (!resolved) {
      relayToHooman(
        "no model matching '" +
          name +
          "'. Try a full id (provider/model) or a shortcut: opus, sonnet, haiku, gpt, codex, zai (glm-5), kimi.",
      );
      return;
    }
    const ok = await pi.setModel(resolved);
    if (ok) {
      relayToHooman("switched to " + resolved.provider + "/" + resolved.id + ".");
    } else {
      relayToHooman(
        "couldn't switch to " +
          resolved.provider +
          "/" +
          resolved.id +
          " — no API key for that provider?",
      );
    }
  };

  // Register the setModel control op. A mesh:control tell {op:'setModel', model}
  // routed by pi-mesh (never the LLM) lands here. Fire-and-forget async.
  controlRegistry().set("setModel", ({ payload, from }) => {
    void handleSetModel(payload, from);
  });
}
