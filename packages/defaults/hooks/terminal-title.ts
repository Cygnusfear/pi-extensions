/**
 * Terminal Title Hook
 *
 * Emits terminal title change events and persists them to the session file.
 * The actual OSC sequences are handled by the presenter extension.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { safeAction } from "@pi-extensions/shared/tool-availability";

// Event channel for terminal title changes
const TERMINAL_TITLE_EVENT = "ad:terminal-title";

// Custom entry type for session persistence
const TERMINAL_TITLE_ENTRY = "ad:terminal-title";

interface TerminalTitleEvent {
  title: string;
}

// Maximum breadcrumb depth before truncation (root > ... > current)
const MAX_BREADCRUMB_DEPTH = 2;

// Markers that indicate a project root
const ROOT_MARKERS = [".git", ".root", "pnpm-workspace.yaml"];

/**
 * Find the project root by looking for root markers.
 * Returns null if no root found.
 */
function findProjectRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    for (const marker of ROOT_MARKERS) {
      const markerPath = path.join(currentDir, marker);
      try {
        if (fs.existsSync(markerPath)) {
          return currentDir;
        }
      } catch {
        // Continue checking other markers
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Get a friendly name for the current context.
 * Creates a breadcrumb from project root to current directory.
 * Truncates to 3 levels max: root > ... > current
 */
function getContextName(cwd: string): string {
  const projectRoot = findProjectRoot(cwd);

  if (!projectRoot) {
    return path.basename(cwd);
  }

  if (projectRoot === cwd) {
    return path.basename(projectRoot);
  }

  const relativePath = path.relative(projectRoot, cwd);
  const parts = relativePath.split(path.sep);
  const rootName = path.basename(projectRoot);

  if (parts.length <= MAX_BREADCRUMB_DEPTH) {
    return `${rootName} > ${parts.join(" > ")}`;
  }
  return `${rootName} > ... > ${parts[parts.length - 1]}`;
}

/**
 * Emit title event and persist to session.
 *
 * Callers must wrap invocations in safeAction — pi.appendEntry is an
 * assertActive-guarded action method that throws "extension ctx is stale"
 * when the runtime has been invalidated (e.g. mid-teardown).
 */
function emitTitle(pi: ExtensionAPI, title: string) {
  const event: TerminalTitleEvent = { title };
  pi.events.emit(TERMINAL_TITLE_EVENT, event);
  pi.appendEntry(TERMINAL_TITLE_ENTRY, event);
}

export function setupTerminalTitleHook(pi: ExtensionAPI) {
  // Every handler below reads ctx.cwd, which is an assertActive-guarded getter
  // in pi 0.74. The whole body is wrapped in safeAction so a stale read silently
  // no-ops the title update instead of surfacing an "extension ctx is stale"
  // warning to pi -p stderr.
  pi.on("session_start", (_event, ctx) => {
    safeAction(() => emitTitle(pi, `π: ${getContextName(ctx.cwd)}`));
  });

  pi.on("agent_start", (_event, ctx) => {
    safeAction(() => emitTitle(pi, `π: ${getContextName(ctx.cwd)} (thinking...)`));
  });

  pi.on("tool_call", (event, ctx) => {
    safeAction(() => emitTitle(pi, `π: ${getContextName(ctx.cwd)} (${event.toolName})`));
    return undefined;
  });

  pi.on("agent_end", (_event, ctx) => {
    safeAction(() => emitTitle(pi, `π: ${getContextName(ctx.cwd)}`));
  });

  pi.on("session_shutdown", () => {
    safeAction(() => emitTitle(pi, "Terminal"));
  });
}
