import type { ExtensionAPI, ToolDefinition } from "@mariozechner/pi-coding-agent";
import {
  bashToolDefinition,
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  editToolDefinition,
  findToolDefinition,
  grepToolDefinition,
  lsToolDefinition,
  readToolDefinition,
  writeToolDefinition,
} from "@mariozechner/pi-coding-agent";

export function buildOutput(warnings: string[], logs: string[]): string {
  const parts: string[] = [];
  if (warnings.length > 0) {
    parts.push(warnings.join("\n"));
    if (logs.length > 0) parts.push("---");
  }
  if (logs.length > 0) {
    parts.push(logs.join("\n"));
  }
  return parts.join("\n");
}

// =============================================================================
// Tool Reference — auto-extracted from built-in tool definitions
// =============================================================================

/** Shape of what we extract from each tool definition for the sandbox */
interface SandboxToolRef {
  name: string;
  description: string;
  snippet: string;
  guidelines: string[];
  params: string; // formatted parameter docs
}

/** Map from sandbox function name -> tool reference */
export const toolRefMap = new Map<string, SandboxToolRef>();

/** Cached reference text for system prompt injection */
export let cachedToolReference = "";

/** Name mapping: sandbox function -> built-in tool definition name */
export const SANDBOX_TO_TOOL_NAME: Record<string, string> = {
  Bash: "bash",
  Read: "read",
  Write: "write",
  Edit: "edit",
  Grep: "grep",
  Glob: "find",
  find: "find",
  fd: "find",
  ls: "ls",
};

export function extractParamDocs(paramsDef: any): string {
  if (!paramsDef?.properties) return "";
  const lines: string[] = [];
  for (const [key, schema] of Object.entries(paramsDef.properties) as [string, any][]) {
    const desc = schema.description || "";
    const optional = schema.optional ? " (optional)" : "";
    if (desc) lines.push("  - " + key + optional + ": " + desc);
  }
  return lines.join("\n");
}

export function buildToolRef(name: string, def: ToolDefinition): SandboxToolRef {
  return {
    name,
    description: def.description || "",
    snippet: (def as any).promptSnippet || "",
    guidelines: (def as any).promptGuidelines || [],
    params: extractParamDocs(def.parameters),
  };
}

export function initBuiltinToolRefs(): void {
  const cwd = process.cwd();
  const builtinDefs: Array<[string, ToolDefinition | undefined]> = [
    ["bash", bashToolDefinition ?? createBashToolDefinition(cwd)],
    ["read", readToolDefinition ?? createReadToolDefinition(cwd)],
    ["write", writeToolDefinition ?? createWriteToolDefinition(cwd)],
    ["edit", editToolDefinition ?? createEditToolDefinition(cwd)],
    ["grep", grepToolDefinition ?? createGrepToolDefinition(cwd)],
    ["find", findToolDefinition ?? createFindToolDefinition(cwd)],
    ["ls", lsToolDefinition ?? createLsToolDefinition(cwd)],
  ];

  for (const [name, def] of builtinDefs) {
    if (!def) continue;
    const ref = buildToolRef(name, def);
    toolRefMap.set(name, ref);
    for (const [sandbox, tool] of Object.entries(SANDBOX_TO_TOOL_NAME)) {
      if (tool === name) toolRefMap.set(sandbox, ref);
    }
  }
}

/** Pull descriptions from all registered tools (built-in + extensions) */
export function extendWithAllTools(api: ExtensionAPI): void {
  const allTools = api.getAllTools();
  for (const tool of allTools) {
    if (toolRefMap.has(tool.name)) continue;
    if (tool.name === "execute_code") continue;
    const params = extractParamDocs(tool.parameters);
    toolRefMap.set(tool.name, {
      name: tool.name,
      description: tool.description || "",
      snippet: "",
      guidelines: [],
      params,
    });
  }
}

/** Rebuild the cached reference text from toolRefMap */
export function rebuildCachedReference(): void {
  const sections: string[] = [
    "## Sandbox Function Reference (auto-extracted from tool definitions)",
  ];
  for (const [name, ref] of toolRefMap) {
    if (SANDBOX_TO_TOOL_NAME[name]) continue;
    const lineArr: string[] = [];
    if (ref.snippet) lineArr.push("**" + name + "**: " + ref.snippet);
    else if (ref.description)
      lineArr.push("**" + name + "**: " + ref.description.split(".")[0] + ".");
    for (const g of ref.guidelines) lineArr.push("- " + g);
    if (lineArr.length) sections.push(lineArr.join("\n"));
  }
  cachedToolReference = sections.join("\n\n");
}

// Initialize built-in refs at load time
initBuiltinToolRefs();
rebuildCachedReference();

/** Format a full manual page for man() */
export function stripForMatch(s: string): string {
  return s.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

/** Aliases for abbreviated compound tool names */
export const TOOL_ALIASES: Record<string, string> = {
  hotseatRead: "hotseat_handbook_read",
  hotseatUpdate: "hotseat_handbook_update",
  hotseatHandbook: "hotseat_handbook_read",
  initExperiment: "init_experiment",
  runExperiment: "run_experiment",
  logExperiment: "log_experiment",
};

export function formatManPage(name: string): string {
  const resolvedName = TOOL_ALIASES[name] || name;
  const key = resolvedName.toLowerCase();
  // camelCase fallback: applyPatch → apply_patch, meshPeers → mesh_peers
  const snakeCase = resolvedName.replace(/([A-Z])/g, "_$1").toLowerCase();
  // Strip-based fallback: gitAi → gitai matches git-ai
  const stripped = stripForMatch(resolvedName);
  let ref = toolRefMap.get(key) || toolRefMap.get(name) || toolRefMap.get(snakeCase);
  if (!ref) {
    // Fuzzy match: strip non-alnum from both sides
    for (const [toolName, toolRef] of toolRefMap) {
      if (stripForMatch(toolName) === stripped) {
        ref = toolRef;
        break;
      }
    }
  }
  if (!ref) {
    const available = [...new Set([...toolRefMap.keys()].filter((k) => !SANDBOX_TO_TOOL_NAME[k]))];
    return "No manual entry for '" + name + "'. Available: " + available.join(", ");
  }

  const lineArr: string[] = [];
  lineArr.push("## " + ref.name);
  if (ref.description) lineArr.push(ref.description);
  if (ref.snippet) lineArr.push("*" + ref.snippet + "*");
  if (ref.guidelines.length) {
    lineArr.push("");
    lineArr.push("Guidelines:");
    for (const g of ref.guidelines) lineArr.push("- " + g);
  }
  if (ref.params) {
    lineArr.push("");
    lineArr.push("Parameters:");
    lineArr.push(ref.params);
  }
  const sandboxNotes = SANDBOX_FN_NOTES[key];
  if (sandboxNotes) {
    lineArr.push("");
    lineArr.push("Sandbox notes:");
    lineArr.push(sandboxNotes);
  }
  return lineArr.join("\n");
}

/** Behavioral notes that differ between standalone tool and sandbox function */
export const SANDBOX_FN_NOTES: Record<string, string> = {
  bash: "Timeouts do NOT throw. Returns { stdout, stderr, exitCode: -1, timedOut: true }. Check result.timedOut.",
};
