import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AgentsDiscoveryManager } from "../lib/agents-discovery";
import { setupAgentsDiscoveryHook } from "./agents-discovery";
import { setupChromeHook } from "./chrome";
import { setupNotificationHook } from "./notification";
import { setupSessionNameHook } from "./session-name";
import { setupTerminalTitleHook } from "./terminal-title";
import { showMissingDeps } from "../../shared/src/tool-availability";

export function setupHooks(
  pi: ExtensionAPI,
  agentsDiscovery: AgentsDiscoveryManager,
) {
  setupAgentsDiscoveryHook(pi, agentsDiscovery);
  setupChromeHook(pi);
  setupSessionNameHook(pi);
  setupTerminalTitleHook(pi);
  setupNotificationHook(pi);

  // Consolidated dep check — one notification for all missing deps
  pi.on("session_start", (_event, ctx) => {
    // Delay so all extensions have registered their deps
    setTimeout(() => showMissingDeps(ctx), 200);
  });
}
