/**
 * ZAI Key Rotate — automatic API key rotation for ZAI providers
 *
 * Manages multiple ZAI API keys with:
 *   - Auto-swap on rate limit (429) detection
 *   - Manual swap via /zai swap
 *   - Key status via /zai keys
 *
 * Config stored in ~/.pi/agent/zai-keys.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

const CONFIG_FILE = path.join(getAgentDir(), "zai-keys.json");

function resolveKeysFromEnv(): string[] {
  return [
    process.env.ZAI_API_KEY_1 ?? process.env.ZAI_API_KEY ?? "",
    process.env.ZAI_API_KEY_2 ?? "",
  ].filter(Boolean);
}

interface ZaiKeyConfig {
  keys: string[];
  activeIndex: number;
  autoRotate: boolean;
}

function loadConfig(): ZaiKeyConfig {
  const envKeys = resolveKeysFromEnv();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const stored = JSON.parse(raw) as Partial<ZaiKeyConfig>;
    const keys = Array.isArray(stored.keys) && stored.keys.length > 0 ? stored.keys : envKeys;
    return { keys, activeIndex: stored.activeIndex ?? 0, autoRotate: stored.autoRotate ?? true };
  } catch {
    return { keys: envKeys, activeIndex: 0, autoRotate: true };
  }
}

function saveConfig(config: ZaiKeyConfig): void {
  const dir = path.dirname(CONFIG_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function redactKey(key: string | undefined): string {
  if (!key || key.length <= 12) return "***";
  return key.substring(0, 8) + "..." + key.substring(key.length - 4);
}

const ZAI_PROVIDERS = ["zai-coding", "zai"];

export default function (pi: ExtensionAPI) {
  let config = loadConfig();

  function getActiveKey(): string | undefined {
    return config.keys[config.activeIndex] ?? config.keys[0];
  }

  function applyActiveKey(): void {
    const key = getActiveKey();
    if (!key) return;
    for (const provider of ZAI_PROVIDERS) {
      try {
        pi.registerProvider(provider, { apiKey: key });
      } catch {
        // Provider may not exist in current registry — that's fine
      }
    }
  }

  function swapToNext(): number {
    if (config.keys.length < 2) return config.activeIndex;
    config.activeIndex = (config.activeIndex + 1) % config.keys.length;
    saveConfig(config);
    applyActiveKey();
    return config.activeIndex;
  }

  // Apply on startup
  applyActiveKey();

  // Re-apply after reload
  pi.on("session_start", async (event) => {
    if (event.reason === "reload") {
      config = loadConfig();
      applyActiveKey();
    }
  });

  // Auto-swap on rate limit
  pi.on("tool_result", async (event, ctx) => {
    if (!config.autoRotate) return;

    // Detect rate limit errors from ZAI providers
    const isZaiError =
      event.isError &&
      event.content?.some((c) => {
        if (c.type !== "text") return false;
        const text = c.text?.toLowerCase() ?? "";
        return (
          text.includes("429") ||
          text.includes("rate limit") ||
          text.includes("rate_limit") ||
          text.includes("too many requests") ||
          text.includes("quota exceeded")
        );
      });

    if (!isZaiError) return;

    // Check if the current model is a ZAI provider
    const model = ctx.model;
    if (!model || !ZAI_PROVIDERS.includes(model.provider)) return;

    const prevIndex = config.activeIndex;
    const newIndex = swapToNext();

    ctx.ui.notify(
      `Rate limit hit! Auto-swapped ZAI key: key #${prevIndex + 1} → key #${newIndex + 1} (${redactKey(getActiveKey())})`,
      "warning",
    );
  });


  // Convenience alias: /swap for quick key swap
  pi.registerCommand("swap", {
    description: "Swap ZAI API key (alias for /zai-keys swap)",
    handler: async (_args, ctx) => {
      const prevIndex = config.activeIndex;
      const prevKey = redactKey(getActiveKey());
      const newIndex = swapToNext();
      const newKey = redactKey(getActiveKey());
      ctx.ui.notify(
        `Swapped ZAI key: #${prevIndex + 1} (${prevKey}) → #${newIndex + 1} (${newKey})`,
        "success",
      );
    },
  });

  // /zai command — delegates to subcommands
  pi.registerCommand("zai-keys", {
    description: "Manage ZAI API key rotation",
    getArgumentCompletions: (prefix: string) => {
      const subcmds = ["swap", "keys", "auto-on", "auto-off", "add", "remove"];
      const items = subcmds.map((s) => ({ value: s, label: s }));
      const filtered = items.filter((i) => i.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const sub = parts[0]?.toLowerCase();

      switch (sub) {
        case "swap": {
          const prevIndex = config.activeIndex;
          const prevKey = redactKey(getActiveKey());
          const newIndex = swapToNext();
          const newKey = redactKey(getActiveKey());
          ctx.ui.notify(
            `Swapped ZAI key: #${prevIndex + 1} (${prevKey}) → #${newIndex + 1} (${newKey})`,
            "success",
          );
          break;
        }

        case "keys":
        case "": {
          const lines = [
            "ZAI API Keys:",
            "",
            ...config.keys.map((k, i) => {
              const marker = i === config.activeIndex ? " ← active" : "";
              return `  #${i + 1}: ${redactKey(k)}${marker}`;
            }),
            "",
            `Auto-rotate: ${config.autoRotate ? "on" : "off"}`,
          ];
          ctx.ui.notify(lines.join("\n"), "info");
          break;
        }

        case "auto-on": {
          config.autoRotate = true;
          saveConfig(config);
          ctx.ui.notify("ZAI auto-rotate: on", "success");
          break;
        }

        case "auto-off": {
          config.autoRotate = false;
          saveConfig(config);
          ctx.ui.notify("ZAI auto-rotate: off", "success");
          break;
        }

        case "add": {
          const newKey = parts[1];
          if (!newKey) {
            ctx.ui.notify("Usage: /zai-keys add <api-key>", "error");
            return;
          }
          if (config.keys.includes(newKey)) {
            ctx.ui.notify("Key already exists", "warning");
            return;
          }
          config.keys.push(newKey);
          saveConfig(config);
          ctx.ui.notify(
            `Added key #${config.keys.length}: ${redactKey(newKey)}`,
            "success",
          );
          break;
        }

        case "remove": {
          const idx = parseInt(parts[1] ?? "", 10);
          if (isNaN(idx) || idx < 1 || idx > config.keys.length) {
            ctx.ui.notify(
              `Usage: /zai-keys remove <1-${config.keys.length}>`,
              "error",
            );
            return;
          }
          if (config.keys.length <= 1) {
            ctx.ui.notify("Cannot remove the last key", "error");
            return;
          }
          const removed = config.keys.splice(idx - 1, 1)[0];
          if (config.activeIndex >= config.keys.length) {
            config.activeIndex = 0;
          }
          saveConfig(config);
          applyActiveKey();
          ctx.ui.notify(
            `Removed key #${idx}: ${redactKey(removed)}`,
            "success",
          );
          break;
        }

        default:
          ctx.ui.notify(
            "Usage: /zai-keys [swap|keys|auto-on|auto-off|add <key>|remove <#>]",
            "error",
          );
      }
    },
  });
}
