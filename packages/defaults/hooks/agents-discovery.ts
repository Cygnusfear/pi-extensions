/**
 * Convention File Discovery Hook
 *
 * Auto-discovers project convention files such as AGENTS.md and CLAUDE.md
 * whenever the agent touches paths through tools. Pi's built-in discovery loads
 * cwd + ancestor context files into the startup system prompt; this hook fills
 * the subdirectory gap and re-injects changed convention files by content hash.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { safeAction, isStaleCtxError } from "@pi-extensions/shared/tool-availability";
import type { AgentsDiscoveryManager, DiscoveredFile } from "../lib/agents-discovery";

type TextContent = { type: "text"; text: string };

type ToolInput = Record<string, unknown>;

export function getDiscoveryPathsForToolResult(
  toolName: string,
  input: ToolInput,
): string[] {
  switch (toolName) {
    case "read":
    case "edit":
    case "write":
      return stringPath(input.path) ? [input.path] : [];
    case "ls":
    case "grep":
    case "find":
      return stringPath(input.path) ? [input.path] : ["."];
    case "bash":
      // Do not parse shell commands for cd; that is brittle and can be wrong.
      // Only explicit cwd is a reliable path signal.
      return stringPath(input.cwd) ? [input.cwd] : [];
    default:
      return [];
  }
}

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
    if (event.isError) return undefined;

    const rawPaths = getDiscoveryPathsForToolResult(event.toolName, event.input);
    if (rawPaths.length === 0) return undefined;
    const paths = [...new Set(rawPaths)];

    // ctx.cwd read may throw stale; if so, the rest of this handler can't
    // do anything useful — bail out.
    try {
      if (!manager.isInitialized) manager.resetSession(ctx.cwd);
    } catch (err) {
      if (isStaleCtxError(err)) return undefined;
      throw err;
    }

    const discovered = await discoverForPaths(manager, paths, ctx);
    if (discovered.length === 0) return undefined;

    const additions: TextContent[] = discovered.map((file) => ({
      type: "text",
      text: formatDiscoveredFile(manager, file),
    }));

    // Notify UI without adding extra agent context. ctx.hasUI and ctx.ui.notify
    // can throw stale during teardown; safeAction swallows that case so the
    // convention file content still returns to the LLM.
    safeAction(() => {
      if (ctx.hasUI) {
        const prettyPaths = discovered.map((f) => manager.prettyPath(f.path));
        ctx.ui.notify(
          `Convention context: ${prettyPaths.join(", ")}`,
          "info",
        );
      }
    });

    const baseContent = event.content ?? [];
    return { content: [...baseContent, ...additions], details: event.details };
  });
}

async function discoverForPaths(
  manager: AgentsDiscoveryManager,
  paths: string[],
  ctx: ExtensionContext,
): Promise<DiscoveredFile[]> {
  const allDiscovered: DiscoveredFile[] = [];
  const seenPaths = new Set<string>();

  for (const pathInput of paths) {
    let discovered: DiscoveredFile[];
    try {
      discovered = await manager.discover(pathInput);
    } catch (error) {
      safeAction(() => {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Failed to load convention context: ${String(error)}`,
            "warning",
          );
        }
      });
      continue;
    }

    for (const file of discovered) {
      if (seenPaths.has(file.path)) continue;
      seenPaths.add(file.path);
      allDiscovered.push(file);
    }
  }

  return allDiscovered;
}

function formatDiscoveredFile(
  manager: AgentsDiscoveryManager,
  file: DiscoveredFile,
): string {
  const prettyPath = manager.prettyPath(file.path);
  const reason = file.reason === "changed" ? " (updated since last read)" : "";
  const truncated = file.truncated ? " [truncated]" : "";
  return `📋 ${file.spec.name}${reason}${truncated} — ${prettyPath}\n\n${file.content}`;
}

function stringPath(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
