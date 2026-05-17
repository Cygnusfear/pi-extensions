/**
 * Provider Filter — disable/enable model providers
 *
 * Persists across launches via ~/.pi/agent/disabled-providers.json
 *
 * Usage:
 *   /provider                    — show all providers and status
 *   /provider disable openai     — disable a provider (hides its models)
 *   /provider enable openai      — restore a provider's models
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

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

function disableProvider(pi: ExtensionAPI, provider: string): void {
  try {
    // Register with a single placeholder model to trigger built-in model removal.
    // The placeholder uses a bogus API key so it never appears in getAvailable().
    pi.registerProvider(provider, {
      baseUrl: "https://disabled.invalid",
      apiKey: "__DISABLED_PROVIDER_NO_KEY__",
      api: "openai-responses",
      models: [
        {
          id: "__disabled__",
          name: "(disabled)",
          reasoning: false,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 1,
          maxTokens: 1,
        },
      ],
    });
  } catch (err) {
    console.error(`[provider-filter] Failed to disable ${provider}:`, err);
  }
}

function enableProvider(pi: ExtensionAPI, provider: string): void {
  try {
    // unregisterProvider triggers refresh() which reloads built-in models
    pi.unregisterProvider(provider);
  } catch (err) {
    console.error(`[provider-filter] Failed to restore ${provider}:`, err);
  }
}

export default function (pi: ExtensionAPI) {
  const disabled = loadDisabledProviders();

  // Apply on startup
  for (const provider of disabled) {
    disableProvider(pi, provider);
  }

  // Re-apply after reload
  pi.on("session_start", async (event) => {
    if (event.reason === "reload") {
      for (const provider of disabled) {
        disableProvider(pi, provider);
      }
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
        if (disabled.size === 0) {
          ctx.ui.notify("All providers enabled. Use: /provider disable <name>", "info");
        } else {
          const list = [...disabled].join(", ");
          ctx.ui.notify(`Disabled: ${list}`, "info");
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
        disableProvider(pi, provider);
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
        enableProvider(pi, provider);
        ctx.ui.notify(`Enabled provider: ${provider}`, "success");
        return;
      }

      ctx.ui.notify("Usage: /provider [disable|enable] <provider-name>", "error");
    },
  });
}
