/**
 * pi-supervisor — minimal auto-continue
 * 
 * When enabled, sends "[SUPERVISOR] continue, go" when the agent goes idle.
 * Toggle via supervise(true/false) in code_mode, or /supervise on|off in chat.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { registerSandboxFn } from "../../shared/src/sandbox-registry";

let enabled = false;
let ctx: ExtensionContext | null = null;

const STATUS_KEY = "supervisor";

function updateStatus() {
  if (!ctx) return;
  ctx.ui.setStatus(STATUS_KEY, enabled ? "🤖 auto" : undefined);
}

export default function (pi: ExtensionAPI) {
  // Store context for status updates
  pi.on("session_start", (_event, c) => {
    ctx = c;
    updateStatus();
  });

  // Sandbox function for code_mode
  registerSandboxFn("supervise", async (on: boolean) => {
    enabled = on;
    updateStatus();
    return enabled ? "Auto-continue enabled" : "Auto-continue disabled";
  });

  // Auto-continue on idle
  pi.on("agent_end", async () => {
    if (!enabled) return;
    await new Promise(r => setTimeout(r, 500));
    pi.sendUserMessage("[SUPERVISOR] continue, go");
  });

  // Chat command
  pi.registerCommand("supervise", {
    description: "Toggle auto-continue: /supervise on | /supervise off",
    handler: async (args, c) => {
      const arg = (args ?? "").trim().toLowerCase();
      if (arg === "on" || arg === "true" || arg === "1") {
        enabled = true;
        updateStatus();
        c.ui.notify("Auto-continue ON", "info");
      } else if (arg === "off" || arg === "false" || arg === "0") {
        enabled = false;
        updateStatus();
        c.ui.notify("Auto-continue OFF", "info");
      } else {
        c.ui.notify(`Auto-continue: ${enabled ? "ON" : "OFF"}`, "info");
      }
    },
  });
}
