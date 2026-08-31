/**
 * pi-supervisor — minimal auto-continue
 * 
 * When enabled, sends "[SUPERVISOR] continue, go" when the agent goes idle.
 * Toggle via supervise(true/false) in code_mode, or /supervise on|off in chat.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { registerSandboxFn } from "../../shared/src/sandbox-registry";

let enabled = false;
let ctx: ExtensionContext | null = null;

const STATUS_KEY = "supervisor";

// Sent on every auto-continue. The completion clause lets the agent end the
// loop itself once there is genuinely nothing left to do.
const CONTINUE_MESSAGE =
  "[SUPERVISOR] continue, go. If all work is complete and nothing remains, disable the supervisor (supervise(false) in code_mode or /supervise off) so this loop stops.";

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

  // Auto-continue on idle.
  // deliverAs: "followUp" queues the nudge if a turn is already running (e.g. a
  // wake or another extension started one between agent_end and this call)
  // instead of throwing "Agent is already processing".
  pi.on("agent_end", () => {
    if (!enabled) return;
    // Promise.resolve().then() absorbs both a synchronous throw (the runtime
    // typings declare sendUserMessage(): void) and a returned rejection.
    void Promise.resolve()
      .then(() => pi.sendUserMessage(CONTINUE_MESSAGE, { deliverAs: "followUp" }))
      .catch((err: unknown) => {
        ctx?.ui.notify?.(
          `[supervisor] failed to queue continue: ${err instanceof Error ? err.message : String(err)}`,
          "warning",
        );
      });
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
