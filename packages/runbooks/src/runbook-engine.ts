import fs from "node:fs";
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

/** List all runbooks in .pi/runbooks/ */
export function listRunbooks(projectRoot: string): RunbookMeta[] {
	const dir = runbookDir(projectRoot);
	if (!fs.existsSync(dir)) return [];

	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
	return files.map((file) => {
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

/** Load a runbook's code (without frontmatter). */
export function loadRunbook(projectRoot: string, name: string): { code: string; raw: string } {
	const filePath = runbookPath(projectRoot, name);
	if (!fs.existsSync(filePath)) {
		throw new Error(`Runbook "${name}" not found at ${filePath}`);
	}
	const raw = fs.readFileSync(filePath, "utf-8");

	// Strip the leading JSDoc frontmatter block if present
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
