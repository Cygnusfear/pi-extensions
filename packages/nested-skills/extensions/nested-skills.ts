import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import { registerSandboxFn } from "../../shared/src/sandbox-registry";

/**
 * Nested Skills Discovery
 *
 * Pi's skill scanner stops recursing when it finds SKILL.md in a directory.
 * Tree-structured skill collections (like playbook/) only get their root
 * discovered — all children are invisible.
 *
 * This extension rescans skill directories for nested SKILL.md files that
 * pi missed, and contributes them back through resources_discover so pi
 * loads them as real skills instead of prompt-only ghosts.
 */

interface NestedSkill {
  name: string;
  description: string;
  filePath: string;
}

interface PiSettings {
  skills?: string[];
  packages?: string[];
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", "bin", "scripts", "assets",
  "references", "workflows", "templates",
]);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[m[1]] = val;
    }
  }
  return result;
}

function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, "utf-8").replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveSettingPath(baseDir: string, value: string): string | null {
  if (!value || /^\w+:/.test(value)) return null;
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  return resolve(baseDir, value);
}

/** Try to load a SKILL.md and return a NestedSkill, or null if invalid. */
function tryLoadSkill(filePath: string): NestedSkill | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm.description) return null;
    return {
      name: fm.name || basename(dirname(filePath)),
      description: fm.description,
      filePath,
    };
  } catch {
    return null;
  }
}

/**
 * Recursively find all SKILL.md files under a directory.
 * Skips the SKILL.md at the root (already discovered by pi).
 */
function findNestedSkills(rootDir: string): NestedSkill[] {
  const skills: NestedSkill[] = [];

  function walk(dir: string) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // If this dir has SKILL.md and it's not the root, it's a nested skill
    if (dir !== rootDir) {
      const skillMd = join(dir, "SKILL.md");
      if (entries.some((e) => e.name === "SKILL.md" && (e.isFile() || e.isSymbolicLink()))) {
        const skill = tryLoadSkill(skillMd);
        if (skill) skills.push(skill);
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try { isDir = statSync(fullPath).isDirectory(); } catch { continue; }
      }
      if (isDir) walk(fullPath);
    }
  }

  walk(rootDir);
  return skills;
}

/**
 * Read pi.skills paths from the project's package.json.
 */
function getPackageSkillPaths(packageDir: string): string[] {
  const paths: string[] = [];
  const pkg = readJsonFile<{ pi?: { skills?: string[] } }>(join(packageDir, "package.json"));

  for (const skillPath of pkg?.pi?.skills ?? []) {
    paths.push(resolve(packageDir, skillPath));
  }

  const conventionalSkillsDir = join(packageDir, "skills");
  if (existsSync(conventionalSkillsDir)) paths.push(conventionalSkillsDir);

  return paths;
}

function getAncestorSkillPaths(cwd: string): string[] {
  const paths: string[] = [];
  let current = resolve(cwd);

  while (true) {
    paths.push(join(current, ".pi", "skills"));
    paths.push(join(current, ".agents", "skills"));

    if (existsSync(join(current, ".git"))) break;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return paths;
}

function getSettingsSkillPaths(settingsPath: string): string[] {
  const settingsDir = dirname(settingsPath);
  const settings = readJsonFile<PiSettings>(settingsPath);
  const paths: string[] = [];

  for (const skillPath of settings?.skills ?? []) {
    const resolved = resolveSettingPath(settingsDir, skillPath);
    if (resolved) paths.push(resolved);
  }

  for (const packagePath of settings?.packages ?? []) {
    const packageDir = resolveSettingPath(settingsDir, packagePath);
    if (!packageDir) continue;

    paths.push(...getPackageSkillPaths(packageDir));
  }

  return paths;
}

function getSkillPaths(cwd: string): string[] {
  const resolvedPaths = [
    ...getPackageSkillPaths(cwd),
    ...getAncestorSkillPaths(cwd),
    ...getSettingsSkillPaths(join(homedir(), ".pi", "agent", "settings.json")),
    ...getSettingsSkillPaths(join(cwd, ".pi", "settings.json")),
    join(homedir(), ".pi", "agent", "skills"),
    join(homedir(), ".agents", "skills"),
  ];

  return [...new Set(resolvedPaths.filter((skillPath) => existsSync(skillPath)))];
}

/**
 * Scan all pi.skills directories for nested SKILL.md files that pi missed.
 *
 * For each skills path, pi finds direct children with SKILL.md and stops.
 * If a found skill directory has MORE SKILL.md files deeper inside,
 * those are the nested skills we discover here.
 */
function discoverNestedSkills(cwd: string): NestedSkill[] {
  const skillPaths = getSkillPaths(cwd);
  const allNested: NestedSkill[] = [];

  for (const skillsDir of skillPaths) {
    if (!existsSync(skillsDir)) continue;

    // Check if the skills path ITSELF has a SKILL.md (e.g. "./playbook/SKILL.md").
    // If so, pi discovered that one file and stopped. Everything below is nested.
    const rootSkillMd = join(skillsDir, "SKILL.md");
    if (existsSync(rootSkillMd)) {
      allNested.push(...findNestedSkills(skillsDir));
      continue;
    }

    // Otherwise this is a flat skills directory (e.g. "./skills").
    // Pi discovered each child that has SKILL.md. Check if any of
    // those children have deeper nested SKILL.md files.
    let entries;
    try { entries = readdirSync(skillsDir, { withFileTypes: true }); } catch { continue; }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

      const childDir = join(skillsDir, entry.name);
      if (!existsSync(join(childDir, "SKILL.md"))) continue;

      const nested = findNestedSkills(childDir);
      if (nested.length > 0) allNested.push(...nested);
    }
  }

  return allNested;
}

function formatSkillsXml(skills: NestedSkill[]): string {
  return skills
    .map(
      (s) =>
        `  <skill>\n    <name>${escapeXml(s.name)}</name>\n    <description>${escapeXml(s.description)}</description>\n    <location>${escapeXml(s.filePath)}</location>\n  </skill>`,
    )
    .join("\n");
}

function deduplicateByName(skills: NestedSkill[]): NestedSkill[] {
  const seen = new Set<string>();
  return skills.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}

export default function nestedSkillsExtension(pi: ExtensionAPI) {
  let cachedSkillsXml: string | null = null;
  let cachedCount = 0;
  let cachedSkillPaths: string[] = [];
  let cachedRootPaths: string[] = [];
  let currentCwd: string = process.cwd();

  // Expose skill paths to code_mode
  registerSandboxFn("getSkillPaths", async () => {
    return {
      roots: cachedRootPaths,      // Root directories (e.g. ~/.pi/agent/skills/)
      skills: cachedSkillPaths,    // Actual skill dirs (where SKILL.md lives)
    };
  });

  function scan(cwd: string, notify: (msg: string, level: "info") => void) {
    currentCwd = cwd;
    cachedRootPaths = getSkillPaths(cwd);
    const nested = discoverNestedSkills(cwd);
    if (nested.length === 0) {
      cachedSkillsXml = null;
      cachedCount = 0;
      cachedSkillPaths = [];
      return;
    }

    const unique = deduplicateByName(nested);
    cachedSkillsXml = formatSkillsXml(unique);
    cachedCount = unique.length;
    cachedSkillPaths = unique.map((skill) => dirname(skill.filePath));
    notify(`+${cachedCount} nested skills discovered`, "info");
  }

  pi.on("resources_discover", (event) => {
    scan(event.cwd, () => {});
    if (cachedSkillPaths.length === 0) return;
    return { skillPaths: cachedSkillPaths };
  });

  // Scan on session start and on reload (session_start fires for both)
  pi.on("session_start", (_event, ctx) => {
    scan(ctx.cwd, (msg, level) => {
      // Delay so our message appears after pi's own "Loaded X skills..." output.
      // Ignore stale-session errors during reload/session replacement.
      setTimeout(() => {
        try {
          ctx.ui.notify(msg, level);
        } catch {
          // stale replacement-session context; safe to ignore
        }
      }, 100);
    });
  });
}
