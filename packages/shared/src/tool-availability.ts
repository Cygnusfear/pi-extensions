/**
 * Tool availability checks for external CLI dependencies.
 * 
 * Extensions use this to gracefully degrade when tools aren't installed.
 */

import { execSync } from "node:child_process";

export interface ToolInfo {
  name: string;
  available: boolean;
  path: string | null;
  installHint: string;
}

const INSTALL_HINTS: Record<string, string> = {
  mai: "Install maitake: bun add -g maitake",
  foresight: "Install foresight: bun add -g foresight-memory",
  "llm-tldr": "Install tldr: uv tool install llm-tldr",
  rg: "Install ripgrep: brew install ripgrep",
  fd: "Install fd: brew install fd",
  git: "Install git: brew install git",
};

const cache = new Map<string, ToolInfo>();

/** Check if a CLI tool is available on PATH. Results are cached. */
export function checkTool(name: string, customHint?: string): ToolInfo {
  const cached = cache.get(name);
  if (cached) return cached;

  let toolPath: string | null = null;
  try {
    toolPath = execSync(`command -v ${name} 2>/dev/null`, { encoding: "utf-8" }).trim() || null;
  } catch {
    toolPath = null;
  }

  const info: ToolInfo = {
    name,
    available: toolPath !== null,
    path: toolPath,
    installHint: customHint ?? INSTALL_HINTS[name] ?? `Install ${name} and ensure it's on your PATH`,
  };

  cache.set(name, info);
  return info;
}

/** Clear the cache (e.g. after installation). */
export function clearToolCache(name?: string) {
  if (name) cache.delete(name);
  else cache.clear();
}

/**
 * Guard wrapper — returns a function that throws with install instructions
 * if the tool isn't available. Use to wrap tool execution functions.
 */
export function requireTool(name: string, customHint?: string): ToolInfo {
  const info = checkTool(name, customHint);
  if (!info.available) {
    throw new Error(
      `${name} is not installed.\n${info.installHint}`
    );
  }
  return info;
}
