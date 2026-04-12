import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunbookMeta {
	name: string;
	description: string;
	file: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const RUNBOOK_DIR = ".pi/runbooks";
const GLOBAL_RUNBOOK_DIR = path.join(os.homedir(), ".pi", "runbooks");

/** Sanitise a runbook name — alphanumeric, hyphens, underscores only. */
function validateName(name: string): string {
	const clean = name.replace(/\.js$/, "");
	if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
		throw new Error(
			`Invalid runbook name "${name}". Use alphanumeric characters, hyphens, and underscores only.`,
		);
	}
	if (clean.length > 64) {
		throw new Error("Runbook name must be 64 characters or fewer.");
	}
	return clean;
}

function runbookDir(projectRoot: string): string {
	return path.join(projectRoot, RUNBOOK_DIR);
}

function runbookPath(projectRoot: string, name: string): string {
	return path.join(runbookDir(projectRoot), `${validateName(name)}.js`);
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

/** Extract @runbook and @description from a JSDoc comment at the top of the file. */
function parseFrontmatter(code: string): { name?: string; description?: string } {
	const match = code.match(/^\/\*\*([\s\S]*?)\*\//);
	if (!match) return {};

	const block = match[1];
	const nameMatch = block.match(/@runbook\s+(.+)/);
	const descMatch = block.match(/@description\s+(.+)/);

	return {
		name: nameMatch?.[1]?.trim(),
		description: descMatch?.[1]?.trim(),
	};
}

/** Build a JSDoc frontmatter comment. */
function buildFrontmatter(name: string, description: string): string {
	return [
		"/**",
		` * @runbook ${name}`,
		` * @description ${description}`,
		" */",
	].join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Save a runbook to .pi/runbooks/<name>.js */
export function saveRunbook(
	projectRoot: string,
	name: string,
	description: string,
	code: string,
): string {
	const clean = validateName(name);
	const dir = runbookDir(projectRoot);
	fs.mkdirSync(dir, { recursive: true });

	const filePath = runbookPath(projectRoot, clean);
	const content = `${buildFrontmatter(clean, description)}\n${code.trim()}\n`;
	fs.writeFileSync(filePath, content, "utf-8");

	return filePath;
}

/** Scan a directory for runbook .js files and return their metadata. */
function scanRunbookDir(dir: string): RunbookMeta[] {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir)
		.filter((f) => f.endsWith(".js"))
		.sort()
		.map((file) => {
			const filePath = path.join(dir, file);
			const code = fs.readFileSync(filePath, "utf-8");
			const meta = parseFrontmatter(code);
			return {
				name: meta.name || file.replace(/\.js$/, ""),
				description: meta.description || "(no description)",
				file: filePath,
			};
		});
}

/** List all runbooks — global (~/.pi/runbooks/) + project-local (.pi/runbooks/).
 *  Local runbooks override global ones on name collision. */
export function listRunbooks(projectRoot: string): RunbookMeta[] {
	const globalBooks = scanRunbookDir(GLOBAL_RUNBOOK_DIR);
	const localBooks = scanRunbookDir(runbookDir(projectRoot));

	// Merge: local wins on name collision
	const byName = new Map<string, RunbookMeta>();
	for (const b of globalBooks) byName.set(b.name, b);
	for (const b of localBooks) byName.set(b.name, b); // override
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Load a runbook's code (without frontmatter).
 *  Checks project-local first, then global. */
export function loadRunbook(projectRoot: string, name: string): { code: string; raw: string } {
	const localPath = runbookPath(projectRoot, name);
	const globalPath = path.join(GLOBAL_RUNBOOK_DIR, `${validateName(name)}.js`);

	const filePath = fs.existsSync(localPath) ? localPath : fs.existsSync(globalPath) ? globalPath : null;
	if (!filePath) {
		throw new Error(`Runbook "${name}" not found in .pi/runbooks/ or ~/.pi/runbooks/`);
	}
	const raw = fs.readFileSync(filePath, "utf-8");
	const code = raw.replace(/^\/\*\*[\s\S]*?\*\/\n?/, "").trim();
	return { code, raw };
}

/** Delete a runbook. */
export function deleteRunbook(projectRoot: string, name: string): boolean {
	const filePath = runbookPath(projectRoot, name);
	if (!fs.existsSync(filePath)) return false;
	fs.unlinkSync(filePath);
	return true;
}
