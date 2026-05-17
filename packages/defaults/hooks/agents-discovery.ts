/**
 * Agents Discovery Hook
 *
 * Auto-discovers AGENTS.md files in subdirectories when the agent reads files.
 * Pi's built-in discovery only walks up from cwd. This hook fills the gap by
 * injecting AGENTS.md files found between cwd and the directory of the file
 * being read.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { safeAction, isStaleCtxError } from "@pi-extensions/shared/tool-availability";
import type { AgentsDiscoveryManager } from "../lib/agents-discovery";

type TextContent = { type: "text"; text: string };

export function setupAgentsDiscoveryHook(
  pi: ExtensionAPI,
  manager: AgentsDiscoveryManager,
) {
  const handleSessionChange = (_event: unknown, ctx: ExtensionContext) => {
    // ctx.cwd is an assertActive-guarded getter in pi 0.74. Wrap to swallow
    // stale reads instead of letting them surface as "extension ctx is stale".
    safeAction(() => manager.resetSession(ctx.cwd));
  };

  pi.on("session_start", handleSessionChange);

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "read" || event.isError) return undefined;

    const pathInput = event.input.path as string | undefined;
    if (!pathInput) return undefined;

    // ctx.cwd read may throw stale; if so, the rest of this handler can't
    // do anything useful — bail out.
    try {
      if (!manager.isInitialized) manager.resetSession(ctx.cwd);
    } catch (err) {
      if (isStaleCtxError(err)) return undefined;
      throw err;
    }

    let discovered: Awaited<ReturnType<typeof manager.discover>>;
    try {
      discovered = await manager.discover(pathInput);
    } catch (error) {
      safeAction(() => {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Failed to load subdirectory context: ${String(error)}`,
            "warning",
          );
        }
      });
      return undefined;
    }

    if (!discovered) return undefined;

    const prettyPaths = discovered.map((f) => manager.prettyPath(f.path));

    const additions: TextContent[] = discovered.map((file, i) => ({
      type: "text",
      text: `Loaded subdirectory context from ${prettyPaths[i]}\n\n${file.content}`,
    }));

    // Notify UI without adding to agent context (appendEntry doesn't go to LLM).
    // ctx.hasUI and ctx.ui.notify can throw stale during teardown; safeAction
    // swallows that case so the file content still gets returned to the LLM.
    safeAction(() => {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Loaded subdirectory context: ${prettyPaths.join(", ")}`,
          "info",
        );
      }
    });

    const baseContent = event.content ?? [];
    return { content: [...baseContent, ...additions], details: event.details };
  });
}
