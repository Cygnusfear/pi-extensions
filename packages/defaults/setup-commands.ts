import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerCommands } from "./commands";
import { generateAndSetTitle } from "./lib/title";
import { getAllDeps } from "../shared/src/tool-availability";

export function setupCommands(pi: ExtensionAPI) {
  registerCommands(pi);

  pi.registerCommand("ad-name", {
    description: "Set or generate session name",
    handler: async (args, ctx) => {
      const input = args.trim();

      // /ad-name auto -- force regenerate
      if (input === "auto" || !input) {
        const currentName = pi.getSessionName();

        // /ad-name (no args) with existing name -- just display it
        if (!input && currentName) {
          ctx.ui.notify(
            `Session: ${currentName} (use /ad-name <text> to change)`,
            "info",
          );
          return;
        }

        // Auto-generate (either explicit "auto" or no args + no name)
        await generateAndSetTitle(pi, ctx);
        return;
      }

      // /ad-name <text> -- set manually
      pi.setSessionName(input);
      ctx.ui.notify(`Session: ${input}`, "info");
    },
  });

  pi.registerCommand("deps", {
    description: "Show status of optional dependencies",
    handler: async (_args, ctx) => {
      const deps = getAllDeps();
      if (deps.length === 0) {
        ctx.ui.notify("No optional dependencies registered.", "info");
        return;
      }
      const lines = deps.map(d =>
        d.ok ? `  ✓ ${d.name}` : `  ✗ ${d.name} — ${d.install}`
      );
      const missing = deps.filter(d => !d.ok).length;
      const header = missing === 0
        ? "All dependencies available:"
        : `${missing} of ${deps.length} missing:`;
      ctx.ui.notify(`${header}\n${lines.join("\n")}`, missing ? "warning" : "info");
    },
  });
}
