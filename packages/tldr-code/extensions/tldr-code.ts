/**
 * TLDR Code Analysis extension for pi
 *
 * Wraps llm-tldr (https://github.com/parcadei/llm-tldr) to provide
 * structural code analysis, semantic search, and call graph tracing.
 *
 * Requires: `uv tool install llm-tldr` (or `pip install llm-tldr`)
 *
 * Features:
 * - Semantic code search (natural language → code)
 * - Call graph analysis (who calls what)
 * - Code structure extraction (functions, classes, imports)
 * - Dead code detection
 * - Architecture layer analysis
 *
 * Auto-indexes the project on first use if no index exists.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createDep } from "../../shared/src/tool-availability";

// =============================================================================
// Constants
// =============================================================================

const SUBPROCESS_TIMEOUT_MS = 60_000;
const INDEX_TIMEOUT_MS = 300_000; // 5 min for indexing
const MAX_BUFFER = 10 * 1024 * 1024;

// Env vars that fix macOS issues with llm-tldr
const TLDR_ENV: Record<string, string> = {
	TLDR_MAX_WORKERS: "1", // ProcessPoolExecutor + tree-sitter segfaults with multiple workers on macOS
	TLDR_AUTO_DOWNLOAD: "1", // Don't prompt for model download
};

// =============================================================================
// Binary resolution
// =============================================================================

const dep = createDep({ binary: "llm-tldr", install: "Install: uv tool install llm-tldr", name: "llm-tldr" });

function findBinary(): string | null {
	if (dep.ok) return dep.resolved;
	// Also check alias
	try {
		const resolved = execSync("which tldr-code", { encoding: "utf-8", timeout: 5_000 }).trim();
		if (resolved) return resolved;
	} catch {}
	return null;
}

// =============================================================================
// Index state detection
// =============================================================================

interface IndexState {
	indexed: boolean;
	unitCount: number;
	model: string | null;
	languages: string[];
}

function checkIndex(projectPath: string): IndexState {
	const metadataPath = path.join(projectPath, ".tldr", "cache", "semantic", "metadata.json");
	if (!fs.existsSync(metadataPath)) {
		return { indexed: false, unitCount: 0, model: null, languages: [] };
	}

	try {
		const raw = fs.readFileSync(metadataPath, "utf-8");
		const meta = JSON.parse(raw);
		const units = meta.units ?? [];
		const model = meta.model ?? null;

		// Detect languages from file paths
		const langs = new Set<string>();
		for (const u of units) {
			const file = u.file ?? "";
			if (file.endsWith(".rs")) langs.add("rust");
			else if (file.endsWith(".ts") || file.endsWith(".tsx")) langs.add("typescript");
			else if (file.endsWith(".js") || file.endsWith(".jsx")) langs.add("javascript");
			else if (file.endsWith(".py")) langs.add("python");
			else if (file.endsWith(".go")) langs.add("go");
		}

		return {
			indexed: units.length > 0,
			unitCount: units.length,
			model,
			languages: [...langs],
		};
	} catch {
		return { indexed: false, unitCount: 0, model: null, languages: [] };
	}
}

// =============================================================================
// Command runner
// =============================================================================

interface TldrResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

function runTldr(args: string[], cwd: string, timeoutMs = SUBPROCESS_TIMEOUT_MS): Promise<TldrResult> {
	const bin = findBinary();
	if (!bin) { dep.guard(); return Promise.resolve({ stdout: "", stderr: "", exitCode: 1 }); }

	return new Promise((resolve) => {
		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let settled = false;

		const env = { ...process.env, ...TLDR_ENV };

		const child = spawn(bin, args, {
			cwd,
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				try { child.kill("SIGKILL"); } catch { /* */ }
				resolve({
					stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
					stderr: "Timed out",
					exitCode: 1,
				});
			}
		}, timeoutMs);

		child.stdout!.on("data", (chunk: Buffer) => {
			if (Buffer.concat(stdoutChunks).length < MAX_BUFFER) stdoutChunks.push(chunk);
		});

		child.stderr!.on("data", (chunk: Buffer) => {
			if (Buffer.concat(stderrChunks).length < MAX_BUFFER) stderrChunks.push(chunk);
		});

		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ stdout: "", stderr: err.message, exitCode: 1 });
		});

		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
				stderr: Buffer.concat(stderrChunks).toString("utf-8"),
				exitCode: code ?? 1,
			});
		});
	});
}

/**
 * Run a tldr command and return parsed JSON, or the raw text on failure.
 */
async function runTldrJSON(args: string[], cwd: string, timeoutMs?: number): Promise<{ data: unknown; error?: string }> {
	const result = await runTldr(args, cwd, timeoutMs);
	if (result.exitCode !== 0 && !result.stdout.trim()) {
		return { data: null, error: result.stderr || `Exit code ${result.exitCode}` };
	}
	try {
		// Strip ANSI codes that llm-tldr sometimes emits
		const clean = result.stdout.replace(/\x1b\[[0-9;]*m/g, "");
		const data = JSON.parse(clean);
		return { data };
	} catch {
		return { data: null, error: result.stdout || result.stderr || "No output" };
	}
}

// =============================================================================
// Auto-indexing
// =============================================================================

async function ensureIndexed(projectPath: string, lang?: string): Promise<string | null> {
	const state = checkIndex(projectPath);
	if (state.indexed) return null;

	// Detect primary language
	const language = lang ?? detectPrimaryLanguage(projectPath);
	if (!language) return "Could not detect language. Pass --lang explicitly.";

	const result = await runTldr(
		["semantic", "index", "--lang", language, "--model", "all-MiniLM-L6-v2", projectPath],
		projectPath,
		INDEX_TIMEOUT_MS,
	);

	if (result.exitCode !== 0) {
		return `Indexing failed: ${result.stderr || result.stdout || "unknown error"}`;
	}

	return null; // success
}

function detectPrimaryLanguage(projectPath: string): string | null {
	// Check for Cargo.toml → rust
	if (fs.existsSync(path.join(projectPath, "Cargo.toml"))) return "rust";
	// Check for package.json/tsconfig.json → typescript
	if (fs.existsSync(path.join(projectPath, "tsconfig.json"))) return "typescript";
	if (fs.existsSync(path.join(projectPath, "package.json"))) return "typescript";
	// Check for go.mod → go
	if (fs.existsSync(path.join(projectPath, "go.mod"))) return "go";
	// Check for pyproject.toml/setup.py → python
	if (fs.existsSync(path.join(projectPath, "pyproject.toml"))) return "python";
	if (fs.existsSync(path.join(projectPath, "setup.py"))) return "python";
	return null;
}

// =============================================================================
// Public API (used by code-mode)
// =============================================================================

export interface TldrSemanticSearchResult {
	name: string;
	file: string;
	score: number;
	calls?: string[];
	called_by?: string[];
}

export function tldrSemanticSearchAPI(
	query: string,
	options: { path?: string; k?: number; expand?: boolean; model?: string; cwd?: string } = {},
): Promise<{ results: TldrSemanticSearchResult[]; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	const projectPath = options.path ?? cwd;
	const args = ["semantic", "search", query, "--path", projectPath];
	if (options.k) args.push("--k", String(options.k));
	if (options.expand) args.push("--expand");
	if (options.model) args.push("--model", options.model);

	return runTldrJSON(args, cwd).then(({ data, error }) => {
		if (error || !Array.isArray(data)) return { results: [], error: error ?? "Unexpected output" };
		return { results: data as TldrSemanticSearchResult[] };
	});
}

export function tldrStructureAPI(
	targetPath: string,
	options: { lang?: string; cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	const args = ["structure", targetPath];
	if (options.lang) args.push("--lang", options.lang);
	return runTldrJSON(args, cwd);
}

export function tldrCallsAPI(
	targetPath: string,
	options: { cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	return runTldrJSON(["calls", targetPath], cwd);
}

export function tldrExtractAPI(
	filePath: string,
	options: { cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	return runTldrJSON(["extract", filePath], cwd);
}

export function tldrDeadAPI(
	targetPath: string,
	options: { cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	return runTldrJSON(["dead", targetPath], cwd);
}

export function tldrArchAPI(
	targetPath: string,
	options: { cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	return runTldrJSON(["arch", targetPath], cwd);
}

export function tldrImpactAPI(
	funcName: string,
	targetPath: string,
	options: { cwd?: string } = {},
): Promise<{ data: unknown; error?: string }> {
	const cwd = options.cwd ?? process.cwd();
	return runTldrJSON(["impact", funcName, targetPath], cwd);
}

export function tldrIndexStatusAPI(projectPath: string): IndexState {
	return checkIndex(projectPath);
}

// =============================================================================
// Extension
// =============================================================================

export default function (pi: ExtensionAPI) {
	// Warn on session start if not indexed
	pi.on("session_start", async (_event, ctx) => {
		const bin = findBinary();
		if (!bin) return;

		const state = checkIndex(ctx.cwd);
		if (!state.indexed) {
			ctx.ui.setStatus("tldr", "⚠ tldr: not indexed");
		} else {
			ctx.ui.setStatus("tldr", `tldr: ${state.unitCount} units (${state.languages.join(", ")})`);
		}
	});

	// =========================================================================
	// Tool: tldr_semantic_search
	// =========================================================================

	pi.registerTool({
		name: "tldr_semantic_search",
		label: "TLDR Semantic Search",
		description:
			"Search code by natural language description. Finds functions/types by what they DO, not just name matching. " +
			"Uses embeddings to match queries like 'validate JWT tokens' to verify_access_token().",
		promptSnippet: "Search code semantically — find functions by behavior description, not just names",
		promptGuidelines: [
			"Use tldr_semantic_search when you need to find code by what it does rather than its exact name.",
			"Good queries describe behavior: 'ship destroyed becomes debris', 'validate user authentication'.",
			"Returns scored results with file paths and optional call graph expansion.",
			"If the project is not indexed, the tool will auto-index it (takes ~1 min).",
		],
		parameters: Type.Object({
			query: Type.String({ description: "Natural language description of the code you're looking for" }),
			path: Type.Optional(Type.String({ description: "Project path to search in (default: cwd)" })),
			k: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, default: 5, description: "Number of results" })),
			expand: Type.Optional(Type.Boolean({ default: false, description: "Include call graph expansion (callers/callees)" })),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const projectPath = params.path ?? ctx.cwd;

			// Auto-index if needed
			const state = checkIndex(projectPath);
			if (!state.indexed) {
				onUpdate?.({ content: [{ type: "text", text: "Project not indexed. Building semantic index..." }] });
				const err = await ensureIndexed(projectPath);
				if (err) throw new Error(`Auto-indexing failed: ${err}`);
				ctx.ui.setStatus("tldr", `tldr: indexed`);
			}

			const args = ["semantic", "search", params.query, "--path", projectPath];
			if (params.k) args.push("--k", String(params.k));
			if (params.expand) args.push("--expand");

			const { data, error } = await runTldrJSON(args, ctx.cwd);
			if (error) throw new Error(error);

			const results = data as TldrSemanticSearchResult[];
			if (!results || results.length === 0) {
				return {
					content: [{ type: "text", text: "No results found." }],
					details: { query: params.query, results: [] },
				};
			}

			// Format results
			const lines = results.map((r, i) => {
				let line = `${i + 1}. **${r.name}** (score: ${r.score.toFixed(3)})\n   ${r.file}`;
				if (r.calls?.length) line += `\n   calls: ${r.calls.join(", ")}`;
				if (r.called_by?.length) line += `\n   called by: ${r.called_by.join(", ")}`;
				return line;
			});

			const text = lines.join("\n\n");

			return {
				content: [{ type: "text", text }],
				details: { query: params.query, results },
			};
		},
	});

	// =========================================================================
	// Tool: tldr_structure
	// =========================================================================

	pi.registerTool({
		name: "tldr_structure",
		label: "TLDR Structure",
		description:
			"Show code structure — functions, classes, methods, and imports — for a file or directory. " +
			"Uses tree-sitter AST parsing. Faster than grep for getting an overview.",
		promptSnippet: "List functions, classes, and imports in a file or directory via AST parsing",
		parameters: Type.Object({
			path: Type.String({ description: "File or directory path to analyze" }),
			lang: Type.Optional(
				StringEnum(["rust", "typescript", "javascript", "python", "go", "java", "c", "cpp", "ruby"] as const, {
					description: "Language (auto-detected if omitted)",
				}),
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const args = ["structure", params.path];
			if (params.lang) args.push("--lang", params.lang);

			const { data, error } = await runTldrJSON(args, ctx.cwd);
			if (error) throw new Error(error);

			const result = data as { files?: Array<{ path: string; functions?: string[]; classes?: string[]; methods?: string[]; imports?: Array<{ module: string }> }> };
			const files = result?.files ?? [];

			if (files.length === 0) {
				return {
					content: [{ type: "text", text: "No code structure found." }],
					details: { path: params.path, files: [] },
				};
			}

			const lines: string[] = [];
			for (const f of files) {
				const fns = f.functions ?? [];
				const cls = f.classes ?? [];
				if (fns.length === 0 && cls.length === 0) continue;

				lines.push(`### ${f.path}`);
				for (const c of cls) lines.push(`  struct/class ${c}`);
				for (const fn of fns) lines.push(`  fn ${fn}`);
				lines.push("");
			}

			const text = lines.join("\n");
			const truncation = truncateHead(text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });

			return {
				content: [{ type: "text", text: truncation.content }],
				details: { path: params.path, fileCount: files.length },
			};
		},
	});

	// =========================================================================
	// Tool: tldr_calls
	// =========================================================================

	pi.registerTool({
		name: "tldr_calls",
		label: "TLDR Call Graph",
		description:
			"Build a cross-file call graph for a directory. Shows which functions call which other functions. " +
			"Essential for understanding control flow and impact analysis.",
		promptSnippet: "Build cross-file call graph — who calls what, across files",
		parameters: Type.Object({
			path: Type.String({ description: "Directory to build call graph for" }),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const { data, error } = await runTldrJSON(["calls", params.path], ctx.cwd);
			if (error) throw new Error(error);

			const result = data as { edges?: Array<{ from_file: string; from_func: string; to_file: string; to_func: string }> };
			const edges = result?.edges ?? [];

			if (edges.length === 0) {
				return {
					content: [{ type: "text", text: "No call edges found." }],
					details: { path: params.path, edges: [] },
				};
			}

			const lines = edges.map((e) => `${e.from_func} → ${e.to_func}  (${e.from_file} → ${e.to_file})`);
			const text = `${edges.length} call edges:\n\n${lines.join("\n")}`;
			const truncation = truncateHead(text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });

			return {
				content: [{ type: "text", text: truncation.content }],
				details: { path: params.path, edgeCount: edges.length },
			};
		},
	});

	// =========================================================================
	// Tool: tldr_extract
	// =========================================================================

	pi.registerTool({
		name: "tldr_extract",
		label: "TLDR Extract",
		description:
			"Extract full analysis of a single file — functions with signatures, imports, classes. " +
			"More detailed than structure: includes line numbers, parameters, return types, docstrings.",
		promptSnippet: "Full file analysis: function signatures, imports, classes with line numbers",
		parameters: Type.Object({
			file: Type.String({ description: "File path to extract" }),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const { data, error } = await runTldrJSON(["extract", params.file], ctx.cwd);
			if (error) throw new Error(error);

			const result = data as {
				file_path: string;
				language: string;
				imports?: Array<{ module: string }>;
				functions?: Array<{ name: string; line_number: number; signature: string; return_type?: string }>;
				classes?: Array<{ name: string; line_number: number }>;
			};

			const lines: string[] = [];
			lines.push(`**${result?.file_path ?? params.file}** (${result?.language ?? "unknown"})`);

			const imports = result?.imports ?? [];
			if (imports.length > 0) {
				lines.push("\n**Imports:**");
				for (const imp of imports) lines.push(`  ${imp.module}`);
			}

			const classes = result?.classes ?? [];
			if (classes.length > 0) {
				lines.push("\n**Types:**");
				for (const c of classes) lines.push(`  L${c.line_number}: ${c.name}`);
			}

			const fns = result?.functions ?? [];
			if (fns.length > 0) {
				lines.push("\n**Functions:**");
				for (const fn of fns) lines.push(`  L${fn.line_number}: ${fn.signature}`);
			}

			const text = lines.join("\n");
			return {
				content: [{ type: "text", text }],
				details: { file: params.file, data: result },
			};
		},
	});

	// =========================================================================
	// Tool: tldr_dead
	// =========================================================================

	pi.registerTool({
		name: "tldr_dead",
		label: "TLDR Dead Code",
		description: "Find unreachable (dead) functions — functions defined but never called from the analyzed directory.",
		promptSnippet: "Find unreachable/dead functions in a directory",
		parameters: Type.Object({
			path: Type.String({ description: "Directory to check for dead code" }),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const { data, error } = await runTldrJSON(["dead", params.path], ctx.cwd);
			if (error) throw new Error(error);

			const result = data as { dead_functions?: Array<{ file: string; function: string }> };
			const dead = result?.dead_functions ?? [];

			if (dead.length === 0) {
				return {
					content: [{ type: "text", text: "No dead code found." }],
					details: { path: params.path, count: 0 },
				};
			}

			const lines = dead.map((d) => `  ${d.file}  →  ${d.function}`);
			const text = `${dead.length} potentially dead functions:\n\n${lines.join("\n")}`;
			const truncation = truncateHead(text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });

			return {
				content: [{ type: "text", text: truncation.content }],
				details: { path: params.path, count: dead.length },
			};
		},
	});

	// =========================================================================
	// Tool: tldr_index
	// =========================================================================

	pi.registerTool({
		name: "tldr_index",
		label: "TLDR Index",
		description:
			"Build or rebuild the semantic search index for a project. " +
			"Required before using tldr_semantic_search. Indexes code structure into searchable embeddings.",
		promptSnippet: "Build/rebuild semantic search index for a project",
		parameters: Type.Object({
			path: Type.Optional(Type.String({ description: "Project root (default: cwd)" })),
			lang: Type.Optional(
				StringEnum(["rust", "typescript", "javascript", "python", "go", "all"] as const, {
					description: "Language to index (auto-detected if omitted)",
				}),
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const bin = findBinary();
			if (!bin) dep.guard();

			const projectPath = params.path ?? ctx.cwd;
			const language = params.lang ?? detectPrimaryLanguage(projectPath) ?? "all";

			onUpdate?.({ content: [{ type: "text", text: `Indexing ${projectPath} (${language})...` }] });

			const result = await runTldr(
				["semantic", "index", "--lang", language, "--model", "all-MiniLM-L6-v2", projectPath],
				ctx.cwd,
				INDEX_TIMEOUT_MS,
			);

			if (result.exitCode !== 0) {
				throw new Error(`Indexing failed: ${result.stderr || result.stdout || "unknown error"}`);
			}

			// Check new state
			const state = checkIndex(projectPath);
			ctx.ui.setStatus("tldr", `tldr: ${state.unitCount} units (${state.languages.join(", ")})`);

			const text = result.stdout.replace(/\x1b\[[0-9;]*m/g, "").trim() || `Indexed ${state.unitCount} code units`;

			return {
				content: [{ type: "text", text }],
				details: { unitCount: state.unitCount, languages: state.languages },
			};
		},
	});
}
