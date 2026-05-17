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

  // Consolidated dep check — one notification for all missing deps.
  //
  // Deps register at module load time via createDep() in each extension, so by
  // the time session_start fires the registry is already populated. The
  // previous setTimeout(200ms) here was a defensive delay that captured ctx in
  // a closure; when the timer fired after the session was torn down, the
  // closure's ctx pointed at a stale runtime and pi emitted "extension ctx is
  // stale" warnings. showMissingDeps now uses safeAction internally so a
  // stale fire at this exact moment is also harmless.
  pi.on("session_start", (_event, ctx) => {
    showMissingDeps(ctx);
  });
}
