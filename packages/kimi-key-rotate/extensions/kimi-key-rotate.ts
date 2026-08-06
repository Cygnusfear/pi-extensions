/**
 * Kimi Key Rotate — automatic API key rotation for the Kimi For Coding provider
 *
 * Manages multiple Kimi API keys with:
 *   - Auto-swap on rate limit (429) detection
 *   - Manual swap via /kimi-keys swap (or /kimi-swap)
 *   - Key status via /kimi-keys keys
 *
 * Config stored in ~/.pi/agent/kimi-keys.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

const CONFIG_FILE = path.join(getAgentDir(), "kimi-keys.json");

function resolveKeysFromEnv(): string[] {
  return [
    process.env.KIMI_API_KEY_1 ?? process.env.KIMI_API_KEY ?? "",
    process.env.KIMI_API_KEY_2 ?? "",
  ].filter(Boolean);
}

interface KimiKeyConfig {
  keys: string[];
  activeIndex: number;
  autoRotate: boolean;
}

function loadConfig(): KimiKeyConfig {
  const envKeys = resolveKeysFromEnv();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const stored = JSON.parse(raw) as Partial<KimiKeyConfig>;
    const keys = Array.isArray(stored.keys) && stored.keys.length > 0 ? stored.keys : envKeys;
    return { keys, activeIndex: stored.activeIndex ?? 0, autoRotate: stored.autoRotate ?? true };
  } catch {
    return { keys: envKeys, activeIndex: 0, autoRotate: true };
  }
}

function saveConfig(config: KimiKeyConfig): void {
  const dir = path.dirname(CONFIG_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function redactKey(key: string | undefined): string {
  if (!key || key.length <= 12) return "***";
  return key.substring(0, 8) + "..." + key.substring(key.length - 4);
}

/**
 * Should this provider error trigger a key swap?
 *
 * Kimi For Coding reports quota exhaustion / account-limit-reached as **403**,
 * not 429 — so both shapes count. A 403 can also mean "key invalid", which is
 * equally swap-worthy in a rotation tool: the next key may be valid.
 */
function isSwapWorthyError(errorText: string): boolean {
  return (
    errorText.includes("429") ||
    errorText.includes("rate limit") ||
    errorText.includes("rate_limit") ||
    errorText.includes("too many requests") ||
    errorText.includes("quota exceeded") ||
    errorText.includes("limit exhausted") ||
    errorText.includes("403") ||
    errorText.includes("forbidden")
  );
}

/**
 * A /login credential owns the provider in pi's auth resolution
 * (stored > configured > env). While one is stored for kimi-coding, rotating
 * KIMI_API_KEY has NO effect on requests. Detect it so we can warn loudly
 * instead of silently swapping nothing.
 */
function storedLoginActive(ctx: {
  modelRegistry: { getProviderAuthStatus(provider: string): { configured: boolean; source?: string } };
}): boolean {
  try {
    for (const provider of KIMI_PROVIDERS) {
      const status = ctx.modelRegistry.getProviderAuthStatus(provider);
      if (status.configured && status.source === "stored") return true;
    }
  } catch {
    // status API unavailable — assume no stored login
  }
  return false;
}

const STORED_LOGIN_WARNING =
  "⚠ a /login credential is stored for kimi-coding and OVERRIDES key rotation — /logout from kimi-coding for rotation to take effect";

const KIMI_PROVIDERS = ["kimi-coding"];

export default function (pi: ExtensionAPI) {
  let config = loadConfig();

  function getActiveKey(): string | undefined {
    return config.keys[config.activeIndex] ?? config.keys[0];
  }

  function applyActiveKey(): void {
    const key = getActiveKey();
    if (!key) return;
    // KIMI_API_KEY env var is read on every request — mutating it is the only reliable override
    process.env.KIMI_API_KEY = key;
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

  // Track whether we've already swapped during this agent turn
  let swappedThisTurn = false;
  pi.on("agent_start", async () => { swappedThisTurn = false; });

  // Re-apply after reload; also warn once per session when a stored /login
  // credential silently defeats rotation (stored > env in pi's auth resolution).
  pi.on("session_start", async (event, ctx) => {
    if (event.reason === "reload") {
      config = loadConfig();
      applyActiveKey();
    }
    if (config.keys.length >= 2 && storedLoginActive(ctx)) {
      ctx.ui.notify(STORED_LOGIN_WARNING, "warning");
    }
  });

  // Auto-swap on rate limit — hooks message_end to catch provider-level 429s
  pi.on("message_end", async (event, ctx) => {
    if (!config.autoRotate) return;
    if (config.keys.length < 2) return;

    const msg = event.message;
    if (msg.role !== "assistant") return;
    if (msg.stopReason !== "error") return;

    const errorText = (msg.errorMessage ?? "").toLowerCase();
    if (!isSwapWorthyError(errorText)) return;
    if (swappedThisTurn) return; // already swapped this turn, don't ping-pong

    // Check if the current model is a Kimi provider
    const model = ctx.model;
    if (!model || !KIMI_PROVIDERS.includes(model.provider)) return;

    const prevIndex = config.activeIndex;
    const newIndex = swapToNext();

    swappedThisTurn = true;
    const storedNote = storedLoginActive(ctx) ? `\n${STORED_LOGIN_WARNING}` : "";
    ctx.ui.notify(
      `Rate limit hit — auto-swapped Kimi key: #${prevIndex + 1} → #${newIndex + 1} (${redactKey(getActiveKey())})${storedNote}`,
      "warning",
    );
  });


  // Convenience alias: /kimi-swap for quick key swap
  pi.registerCommand("kimi-swap", {
    description: "Swap Kimi API key (alias for /kimi-keys swap)",
    handler: async (_args, ctx) => {
      const prevIndex = config.activeIndex;
      const prevKey = redactKey(getActiveKey());
      const newIndex = swapToNext();
      const newKey = redactKey(getActiveKey());
      const storedNote = storedLoginActive(ctx) ? `\n${STORED_LOGIN_WARNING}` : "";
      ctx.ui.notify(
        `Swapped Kimi key: #${prevIndex + 1} (${prevKey}) → #${newIndex + 1} (${newKey})${storedNote}`,
        "info",
      );
    },
  });

  // /kimi-keys command — delegates to subcommands
  pi.registerCommand("kimi-keys", {
    description: "Manage Kimi API key rotation",
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
          const storedNote = storedLoginActive(ctx) ? `\n${STORED_LOGIN_WARNING}` : "";
          ctx.ui.notify(
            `Swapped Kimi key: #${prevIndex + 1} (${prevKey}) → #${newIndex + 1} (${newKey})${storedNote}`,
            "info",
          );
          break;
        }

        case "keys":
        case "": {
          const lines = [
            "Kimi API Keys:",
            "",
            ...config.keys.map((k, i) => {
              const marker = i === config.activeIndex ? " ← active" : "";
              return `  #${i + 1}: ${redactKey(k)}${marker}`;
            }),
            "",
            `Auto-rotate: ${config.autoRotate ? "on" : "off"}`,
            ...(storedLoginActive(ctx) ? ["", STORED_LOGIN_WARNING] : []),
          ];
          ctx.ui.notify(lines.join("\n"), "info");
          break;
        }

        case "auto-on": {
          config.autoRotate = true;
          saveConfig(config);
          ctx.ui.notify("Kimi auto-rotate: on", "info");
          break;
        }

        case "auto-off": {
          config.autoRotate = false;
          saveConfig(config);
          ctx.ui.notify("Kimi auto-rotate: off", "info");
          break;
        }

        case "add": {
          const newKey = parts[1];
          if (!newKey) {
            ctx.ui.notify("Usage: /kimi-keys add <api-key>", "error");
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
            "info",
          );
          break;
        }

        case "remove": {
          const idx = parseInt(parts[1] ?? "", 10);
          if (isNaN(idx) || idx < 1 || idx > config.keys.length) {
            ctx.ui.notify(
              `Usage: /kimi-keys remove <1-${config.keys.length}>`,
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
            "info",
          );
          break;
        }

        default:
          ctx.ui.notify(
            "Usage: /kimi-keys [swap|keys|auto-on|auto-off|add <key>|remove <#>]",
            "error",
          );
      }
    },
  });
}
