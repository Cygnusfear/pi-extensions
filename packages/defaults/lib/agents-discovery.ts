import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_CONVENTION_FILE_MAX_BYTES = 32 * 1024;

export interface ConventionFileSpec {
  name: string;
  cascade: boolean;
  maxBytes?: number;
}

export interface DiscoveredFile {
  path: string;
  content: string;
  spec: ConventionFileSpec;
  reason: "new" | "changed";
  truncated: boolean;
}

interface SeenEntry {
  sha: string;
  mtimeMs: number;
  bytes: number;
}

export const DEFAULT_CONVENTION_FILE_SPECS: ConventionFileSpec[] = [
  { name: "AGENTS.md", cascade: true, maxBytes: DEFAULT_CONVENTION_FILE_MAX_BYTES },
  { name: "CLAUDE.md", cascade: true, maxBytes: DEFAULT_CONVENTION_FILE_MAX_BYTES },
];

/**
 * Tracks project convention files that must be visible to the agent whenever it
 * touches files under their directory. Pi loads cwd + ancestor context files in
 * the system prompt at startup; this manager fills the subdirectory gap and
 * re-injects any already-loaded file when its content changes mid-session.
 */
export class AgentsDiscoveryManager {
  private seen = new Map<string, SeenEntry>();
  private currentCwd = "";
  private homeDir = "";
  private readonly specs: ConventionFileSpec[];

  constructor(
    private readonly getIgnoredPaths: () => string[] = () => [],
    specs: ConventionFileSpec[] = [],
    options: { replaceDefaults?: boolean } = {},
  ) {
    const baseSpecs = options.replaceDefaults ? [] : DEFAULT_CONVENTION_FILE_SPECS;
    this.specs = this.normalizeSpecs([...baseSpecs, ...specs]);
  }

  resetSession(cwd: string) {
    this.currentCwd = this.resolvePath(cwd, process.cwd());
    this.homeDir = this.resolvePath(os.homedir(), process.cwd());
    this.seen.clear();
    this.seedSystemPromptFiles();
  }

  /**
   * Discover convention files applicable to touchedPath.
   * Returns new-or-changed files. Empty means nothing needs to be injected.
   */
  async discover(touchedPath: string): Promise<DiscoveredFile[]> {
    const absolutePath = this.resolvePath(touchedPath, this.currentCwd);

    if (this.shouldIgnorePath(absolutePath)) return [];

    const searchRoot = this.isInsideRoot(this.currentCwd, absolutePath)
      ? this.currentCwd
      : this.isInsideRoot(this.homeDir, absolutePath)
        ? this.homeDir
        : "";

    if (!searchRoot) return [];

    // If the agent reads a convention file directly, the tool result already
    // contains the file. Record its hash so later unchanged touches don't append
    // a duplicate convention block.
    if (this.isConventionFile(absolutePath)) {
      await this.recordIfReadable(absolutePath);
      return [];
    }

    const candidates = this.findConventionFiles(absolutePath, searchRoot);
    const discovered: DiscoveredFile[] = [];

    for (const candidate of candidates) {
      const resolved = this.resolvePath(candidate.path, this.currentCwd);
      if (this.shouldIgnorePath(resolved)) continue;

      const next = await this.readIfNewOrChanged(candidate.path, candidate.spec);
      if (next) discovered.push(next);
    }

    return discovered;
  }

  get isInitialized(): boolean {
    return this.currentCwd !== "";
  }

  get cwd(): string {
    return this.currentCwd;
  }

  /**
   * Format a path for display. Uses relative path if inside cwd, otherwise
   * replaces home directory prefix with ~.
   */
  prettyPath(filePath: string): string {
    if (this.isInsideRoot(this.currentCwd, filePath)) {
      return path.relative(this.currentCwd, filePath);
    }

    if (this.homeDir && filePath.startsWith(this.homeDir + path.sep)) {
      return `~${filePath.slice(this.homeDir.length)}`;
    }

    return filePath;
  }

  /** Exposed for tests and diagnostics. */
  getSpecs(): ConventionFileSpec[] {
    return [...this.specs];
  }

  private seedSystemPromptFiles(): void {
    const seedPaths: string[] = [];

    for (const spec of this.specs) {
      const cwdFile = path.join(this.currentCwd, spec.name);
      if (fs.existsSync(cwdFile)) seedPaths.push(cwdFile);
    }

    let dir = path.dirname(this.currentCwd);
    while (dir !== path.dirname(dir)) {
      for (const spec of this.specs) {
        const ancestorFile = path.join(dir, spec.name);
        if (fs.existsSync(ancestorFile)) seedPaths.push(ancestorFile);
      }
      dir = path.dirname(dir);
    }

    for (const spec of this.specs) {
      const globalFile = path.join(this.homeDir, ".pi", "agent", spec.name);
      if (fs.existsSync(globalFile)) seedPaths.push(globalFile);
    }

    for (const seedPath of seedPaths) {
      this.recordSync(seedPath);
    }
  }

  private async readIfNewOrChanged(
    conventionPath: string,
    spec: ConventionFileSpec,
  ): Promise<DiscoveredFile | null> {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(conventionPath);
    } catch {
      return null;
    }

    const resolved = this.resolvePath(conventionPath, this.currentCwd);
    const prior = this.seen.get(resolved);
    if (prior && prior.mtimeMs === stat.mtimeMs) return null;

    let content: string;
    try {
      content = await fs.promises.readFile(conventionPath, "utf-8");
    } catch {
      return null;
    }

    const sha = this.hash(content);
    if (prior && prior.sha === sha) {
      this.seen.set(resolved, { sha, mtimeMs: stat.mtimeMs, bytes: Buffer.byteLength(content, "utf-8") });
      return null;
    }

    const reason: "new" | "changed" = prior ? "changed" : "new";
    const maxBytes = spec.maxBytes ?? DEFAULT_CONVENTION_FILE_MAX_BYTES;
    const contentBytes = Buffer.byteLength(content, "utf-8");
    const truncated = contentBytes > maxBytes;
    const emitContent = truncated
      ? this.truncateUtf8(content, maxBytes) +
        `\n\n…[truncated at ${maxBytes} bytes — read ${conventionPath} for full content]`
      : content;

    this.seen.set(resolved, { sha, mtimeMs: stat.mtimeMs, bytes: contentBytes });
    return { path: conventionPath, content: emitContent, spec, reason, truncated };
  }

  private async recordIfReadable(filePath: string): Promise<void> {
    try {
      const stat = await fs.promises.stat(filePath);
      const content = await fs.promises.readFile(filePath, "utf-8");
      const resolved = this.resolvePath(filePath, this.currentCwd);
      this.seen.set(resolved, {
        sha: this.hash(content),
        mtimeMs: stat.mtimeMs,
        bytes: Buffer.byteLength(content, "utf-8"),
      });
    } catch {
      // File disappeared between tool result and discovery. Nothing to record.
    }
  }

  private recordSync(filePath: string): void {
    try {
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const resolved = this.resolvePath(filePath, this.currentCwd);
      this.seen.set(resolved, {
        sha: this.hash(content),
        mtimeMs: stat.mtimeMs,
        bytes: Buffer.byteLength(content, "utf-8"),
      });
    } catch {
      // File may disappear between existsSync and readFileSync.
    }
  }

  private resolvePath(targetPath: string, baseDir: string): string {
    const expanded =
      targetPath === "~"
        ? this.homeDir || os.homedir()
        : targetPath.startsWith("~/")
          ? path.join(this.homeDir || os.homedir(), targetPath.slice(2))
          : targetPath;

    const absolute = path.isAbsolute(expanded)
      ? path.normalize(expanded)
      : path.resolve(baseDir, expanded);

    try {
      return fs.realpathSync.native?.(absolute) ?? fs.realpathSync(absolute);
    } catch {
      return absolute;
    }
  }

  private isInsideRoot(rootDir: string, targetPath: string): boolean {
    if (!rootDir) return false;
    const relative = path.relative(rootDir, targetPath);
    return (
      relative === "" ||
      (!relative.startsWith("..") && !path.isAbsolute(relative))
    );
  }

  private findConventionFiles(
    touchedPath: string,
    rootDir: string,
  ): Array<{ path: string; spec: ConventionFileSpec }> {
    if (!rootDir) return [];

    const levels: Array<Array<{ path: string; spec: ConventionFileSpec }>> = [];
    const startDir = this.getSearchStartDir(touchedPath);
    let dir = startDir;

    while (this.isInsideRoot(rootDir, dir)) {
      const filesAtLevel: Array<{ path: string; spec: ConventionFileSpec }> = [];
      for (const spec of this.specs) {
        if (!spec.cascade && dir !== startDir) continue;
        const candidate = path.join(dir, spec.name);
        if (fs.existsSync(candidate)) filesAtLevel.push({ path: candidate, spec });
      }
      if (filesAtLevel.length > 0) levels.unshift(filesAtLevel);

      if (dir === rootDir) break;

      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    // Return in root-first order. For files in the same directory, preserve spec order.
    return levels.flat();
  }

  private getSearchStartDir(touchedPath: string): string {
    try {
      if (fs.existsSync(touchedPath) && fs.statSync(touchedPath).isDirectory()) {
        return touchedPath;
      }
    } catch {
      // Treat inaccessible paths as files and search from their parent.
    }
    return path.dirname(touchedPath);
  }

  private shouldIgnorePath(targetPath: string): boolean {
    const ignored = this.getIgnoredPaths();
    if (ignored.length === 0) return false;

    for (const rawPath of ignored) {
      const trimmed = rawPath.trim();
      if (!trimmed) continue;

      const resolved = this.resolvePath(trimmed, this.currentCwd);
      const ignoredIsConventionFile = this.isConventionFile(resolved);

      if (ignoredIsConventionFile) {
        if (targetPath === resolved) return true;
        continue;
      }

      // Directory-style ignore: skip any convention file at or under this path.
      if (this.isInsideRoot(resolved, targetPath) && this.isConventionFile(targetPath)) {
        return true;
      }
    }

    return false;
  }

  private isConventionFile(targetPath: string): boolean {
    const base = path.basename(targetPath);
    return this.specs.some((spec) => base === spec.name);
  }

  private normalizeSpecs(specs: ConventionFileSpec[]): ConventionFileSpec[] {
    const byName = new Map<string, ConventionFileSpec>();
    for (const spec of specs) {
      const name = spec.name.trim();
      if (!name) continue;
      byName.set(name, {
        name,
        cascade: spec.cascade,
        maxBytes: spec.maxBytes ?? DEFAULT_CONVENTION_FILE_MAX_BYTES,
      });
    }
    return [...byName.values()];
  }

  private hash(content: string): string {
    return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
  }

  private truncateUtf8(content: string, maxBytes: number): string {
    const buffer = Buffer.from(content, "utf-8");
    if (buffer.byteLength <= maxBytes) return content;
    return buffer.subarray(0, maxBytes).toString("utf-8").replace(/�+$/u, "");
  }
}
