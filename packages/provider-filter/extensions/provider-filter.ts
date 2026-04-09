/**
 * Provider Filter — disable/enable model providers
 *
 * Persists across launches via ~/.pi/agent/disabled-providers.json
 *
 * Usage:
 *   /provider                    — show all providers and status
 *   /provider disable openai     — disable a provider (hides its models)
 *   /provider enable openai      — re-enable a provider (restores its models)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

const CONFIG_FILE = path.join(getAgentDir(), "disabled-providers.json");

function loadDisabledProviders(): Set<string> {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((s: unknown) => typeof s === "string"));
  } catch {
    // file doesn't exist or invalid — start fresh
  }
  return new Set();
}

function saveDisabledProviders(disabled: Set<string>): void {
  const dir = path.dirname(CONFIG_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify([...disabled], null, 2) + "\n", "utf-8");
}

function applyDisabledProviders(pi: ExtensionAPI, disabled: Set<string>): void {
  for (const provider of disabled) {
    try {
      pi.registerProvider(provider, { models: [] });
    } catch (err) {
      console.error(`[provider-filter] Failed to disable ${provider}:`, err);
    }
  }
}

function restoreProvider(pi: ExtensionAPI, provider: string): void {
  try {
    pi.unregisterProvider(provider);
  } catch (err) {
    console.error(`[provider-filter] Failed to restore ${provider}:`, err);
  }
}

export default function (pi: ExtensionAPI) {
  const disabled = loadDisabledProviders();

  // Apply on startup
  if (disabled.size > 0) {
    applyDisabledProviders(pi, disabled);
  }

  // Re-apply after reload (extensions get re-instantiated)
  pi.on("session_start", async (event) => {
    if (event.reason === "reload" && disabled.size > 0) {
      applyDisabledProviders(pi, disabled);
    }
  });

  pi.registerCommand("provider", {
    description: "Enable/disable model providers (persists across launches)",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const action = parts[0]?.toLowerCase();
      const provider = parts[1];

      // No args — show status
      if (!action) {
        const all = pi.getAllTools ? null : null; // not useful here
        // Build provider list from model registry
        const allModels = ctx.modelRegistry.getModels?.() ?? [];

        // Show disabled providers
        if (disabled.size === 0) {
          ctx.ui.notify("All providers enabled. Use: /provider disable <name>", "info");
        } else {
          const list = [...disabled].join(", ");
          ctx.ui.notify(`Disabled providers: ${list}`, "info");
        }
        return;
      }

      if (action === "disable") {
        if (!provider) {
          ctx.ui.notify("Usage: /provider disable <provider-name>", "error");
          return;
        }

        if (disabled.has(provider)) {
          ctx.ui.notify(`${provider} is already disabled`, "info");
          return;
        }

        disabled.add(provider);
        saveDisabledProviders(disabled);
        applyDisabledProviders(pi, disabled);
        ctx.ui.notify(`Disabled provider: ${provider}`, "success");
        return;
      }

      if (action === "enable") {
        if (!provider) {
          ctx.ui.notify("Usage: /provider enable <provider-name>", "error");
          return;
        }

        if (!disabled.has(provider)) {
          ctx.ui.notify(`${provider} is not disabled`, "info");
          return;
        }

        disabled.delete(provider);
        saveDisabledProviders(disabled);
        restoreProvider(pi, provider);
        ctx.ui.notify(`Enabled provider: ${provider}`, "success");
        return;
      }

      ctx.ui.notify("Usage: /provider [disable|enable] <provider-name>", "error");
    },
  });
}
