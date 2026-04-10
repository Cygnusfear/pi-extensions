/**
 * pi-supervisor — minimal auto-continue
 * 
 * When enabled, sends "[SUPERVISOR] continue, go" when the agent goes idle.
 * Toggle via supervise(true/false) in code_mode, or /supervise on|off in chat.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerSandboxFn } from "../../shared/src/sandbox-registry";

let enabled = false;

export default function (pi: ExtensionAPI) {
  // Sandbox function for code_mode
  registerSandboxFn("supervise", async (on: boolean) => {
    enabled = on;
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
        c.ui.notify("Auto-continue ON", "info");
      } else if (arg === "off" || arg === "false" || arg === "0") {
        enabled = false;
        c.ui.notify("Auto-continue OFF", "info");
      } else {
        c.ui.notify(`Auto-continue: ${enabled ? "ON" : "OFF"}`, "info");
      }
    },
  });
}
