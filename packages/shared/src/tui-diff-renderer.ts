/**
 * Beautiful TUI diff renderer with Shiki syntax highlighting.
 *
 * Uses Shiki for syntax-colored code, theme colors for diff markers.
 * Shiki is eagerly initialized on first import — by the time any edit
 * tool runs, it's ready. If not, falls back to plain text.
 */

import { createHighlighter, type Highlighter, type ThemedToken } from "shiki";
import * as Diff from "diff";

// ---------------------------------------------------------------------------
// Singleton Shiki highlighter — eagerly loaded on import
// ---------------------------------------------------------------------------

const COMMON_LANGS = [
	"typescript",
	"javascript",
	"tsx",
	"jsx",
	"rust",
	"python",
	"json",
	"css",
	"html",
	"markdown",
	"yaml",
	"toml",
	"bash",
	"go",
	"c",
	"cpp",
	"java",
	"ruby",
	"swift",
	"kotlin",
	"sql",
	"xml",
	"scss",
	"less",
	"lua",
	"php",
	"dockerfile",
	"make",
];

const SHIKI_THEME = "github-dark";

let _hl: Highlighter | null = null;

// Fire-and-forget: start loading Shiki on first import.
// By the time a tool's renderResult runs, this is done.
createHighlighter({ themes: [SHIKI_THEME], langs: COMMON_LANGS })
	.then((h) => {
		_hl = h;
	})
	.catch(() => {
		/* Shiki unavailable — plain text fallback */
	});

/** Async init for callers that need to guarantee it's ready. */
export async function ensureHighlighter(): Promise<void> {
	if (_hl) return;
	try {
		_hl = await createHighlighter({ themes: [SHIKI_THEME], langs: COMMON_LANGS });
	} catch {
		/* noop */
	}
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const EXT_TO_LANG: Record<string, string> = {
	".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx",
	".mjs": "javascript", ".cjs": "javascript", ".mts": "typescript", ".cts": "typescript",
	".rs": "rust", ".py": "python", ".json": "json", ".jsonl": "json",
	".css": "css", ".scss": "scss", ".less": "less",
	".html": "html", ".htm": "html", ".xml": "xml",
	".md": "markdown", ".mdx": "markdown",
	".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
	".sh": "bash", ".bash": "bash", ".zsh": "bash",
	".go": "go", ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp", ".cc": "cpp",
	".java": "java", ".rb": "ruby", ".swift": "swift", ".kt": "kotlin",
	".sql": "sql", ".lua": "lua", ".php": "php",
};

export function detectLanguage(filePath?: string): string {
	if (!filePath) return "text";
	const basename = filePath.split("/").pop() || "";
	const lower = basename.toLowerCase();
	if (lower === "dockerfile") return "dockerfile";
	if (lower === "makefile" || lower === "gnumakefile") return "make";
	const dotIdx = basename.lastIndexOf(".");
	if (dotIdx === -1) return "text";
	const ext = basename.substring(dotIdx).toLowerCase();
	return EXT_TO_LANG[ext] || "text";
}

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

function hexToAnsiFg(hex: string): string {
	const h = hex.replace("#", "");
	const r = parseInt(h.substring(0, 2), 16);
	const g = parseInt(h.substring(2, 4), 16);
	const b = parseInt(h.substring(4, 6), 16);
	return `\x1b[38;2;${r};${g};${b}m`;
}

function hexToAnsiBg(hex: string): string {
	const h = hex.replace("#", "");
	const r = parseInt(h.substring(0, 2), 16);
	const g = parseInt(h.substring(2, 4), 16);
	const b = parseInt(h.substring(4, 6), 16);
	return `\x1b[48;2;${r};${g};${b}m`;
}

const RST = "\x1b[0m";
const BOLD = "\x1b[1m";
const ITALIC = "\x1b[3m";
const ULINE = "\x1b[4m";

// Subtle background tints — dark enough that syntax colors stay readable
const BG_ADDED = hexToAnsiBg("1a3a2a");
const BG_REMOVED = hexToAnsiBg("3a1a1a");
const BG_ADDED_HL = hexToAnsiBg("2a5a3a");
const BG_REMOVED_HL = hexToAnsiBg("5a2a2a");

// ---------------------------------------------------------------------------
// Theme color extraction
// ---------------------------------------------------------------------------

/** Colors extracted from the pi theme. */
export interface DiffColors {
	added: string;   // ANSI fg escape for added markers
	removed: string; // ANSI fg escape for removed markers
	context: string; // ANSI fg escape for context/line numbers
	dim: string;     // ANSI fg escape for dim elements
	accent: string;  // ANSI fg escape for file path
}

/** Extract raw ANSI escape codes from theme.fg() calls. */
export function extractThemeColors(theme: any): DiffColors {
	const extract = (colorName: string, fallback: string): string => {
		try {
			const wrapped: string = theme.fg(colorName, "\x01");
			const idx = wrapped.indexOf("\x01");
			return idx > 0 ? wrapped.substring(0, idx) : fallback;
		} catch {
			return fallback;
		}
	};

	return {
		added: extract("toolDiffAdded", hexToAnsiFg("3fb950")),
		removed: extract("toolDiffRemoved", hexToAnsiFg("f85149")),
		context: extract("toolDiffContext", hexToAnsiFg("C1C6B2")),
		dim: extract("dim", hexToAnsiFg("696969")),
		accent: extract("accent", hexToAnsiFg("7D56F4")),
	};
}

// ---------------------------------------------------------------------------
// Unified diff parser
// ---------------------------------------------------------------------------

interface DiffLine {
	type: "context" | "added" | "removed";
	content: string;
	oldNum?: number;
	newNum?: number;
}

interface DiffHunk {
	lines: DiffLine[];
}

interface ParsedFile {
	oldPath: string;
	newPath: string;
	hunks: DiffHunk[];
}

function parseUnifiedDiff(text: string): ParsedFile[] {
	const files: ParsedFile[] = [];
	const lines = text.split("\n");
	let i = 0;

	while (i < lines.length) {
		if (!lines[i]?.startsWith("--- ") || !lines[i + 1]?.startsWith("+++ ")) { i++; continue; }

		const oldPath = lines[i].replace(/^---\s+/, "").replace(/^a\//, "").replace(/\t.*$/, "");
		const newPath = lines[i + 1].replace(/^\+\+\+\s+/, "").replace(/^b\//, "").replace(/\t.*$/, "");
		i += 2;

		const hunks: DiffHunk[] = [];

		while (i < lines.length && !lines[i]?.startsWith("--- ")) {
			const hm = lines[i]?.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
			if (!hm) { i++; continue; }

			let oldNum = parseInt(hm[1]);
			let newNum = parseInt(hm[2]);
			i++;

			const hunkLines: DiffLine[] = [];
			while (i < lines.length) {
				const line = lines[i];
				if (line === undefined || line.startsWith("@@") || line.startsWith("--- ")) break;
				if (line.startsWith("+")) {
					hunkLines.push({ type: "added", content: line.substring(1), newNum: newNum++ });
				} else if (line.startsWith("-")) {
					hunkLines.push({ type: "removed", content: line.substring(1), oldNum: oldNum++ });
				} else if (line.startsWith("\\")) {
					// no newline marker
				} else {
					hunkLines.push({ type: "context", content: line.length > 0 ? line.substring(1) : "", oldNum: oldNum++, newNum: newNum++ });
				}
				i++;
			}
			hunks.push({ lines: hunkLines });
		}
		files.push({ oldPath, newPath, hunks });
	}
	return files;
}

// ---------------------------------------------------------------------------
// Shiki token → ANSI
// ---------------------------------------------------------------------------

function tokensToAnsi(tokens: ThemedToken[]): string {
	let out = "";
	for (const tok of tokens) {
		if (tok.color) out += hexToAnsiFg(tok.color);
		if (tok.fontStyle) {
			if (tok.fontStyle & 1) out += ITALIC;
			if (tok.fontStyle & 2) out += BOLD;
			if (tok.fontStyle & 4) out += ULINE;
		}
		out += tok.content + RST;
	}
	return out;
}

function highlightLine(code: string, lang: string): string {
	if (!_hl || lang === "text") return code;
	try {
		const result = _hl.codeToTokens(code, { lang: lang as any, theme: SHIKI_THEME });
		if (result.tokens.length > 0) return tokensToAnsi(result.tokens[0]);
	} catch { /* fallback */ }
	return code;
}

/**
 * Highlight a full block of code and return per-line ANSI strings.
 * Used for hash_read / file display.
 */
export function highlightCode(code: string, filePath?: string): string[] {
	const lang = detectLanguage(filePath);
	if (!_hl || lang === "text" || !COMMON_LANGS.includes(lang)) {
		return code.split("\n");
	}
	try {
		const result = _hl.codeToTokens(code, { lang: lang as any, theme: SHIKI_THEME });
		return result.tokens.map((lineTokens) => tokensToAnsi(lineTokens));
	} catch {
		return code.split("\n");
	}
}

// ---------------------------------------------------------------------------
// Word-level inline diff
// ---------------------------------------------------------------------------

function renderInlineChanges(
	oldContent: string,
	newContent: string,
	lang: string,
): { oldAnsi: string; newAnsi: string } {
	const parts = Diff.diffWords(oldContent, newContent);
	let oldAnsi = "";
	let newAnsi = "";

	for (const part of parts) {
		const hl = highlightLine(part.value, lang);
		if (part.removed) {
			oldAnsi += `${BG_REMOVED_HL}${hl}${RST}${BG_REMOVED}`;
		} else if (part.added) {
			newAnsi += `${BG_ADDED_HL}${hl}${RST}${BG_ADDED}`;
		} else {
			oldAnsi += hl;
			newAnsi += hl;
		}
	}
	return { oldAnsi, newAnsi };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BeautifulDiffOptions {
	filePath?: string;
	language?: string;
	colors?: DiffColors;
}

/**
 * Render a unified diff with Shiki syntax highlighting and theme colors.
 * Synchronous — uses the eagerly-loaded Shiki highlighter if available.
 */
export function renderBeautifulDiff(diffText: string, options: BeautifulDiffOptions = {}): string {
	if (!diffText?.trim()) return "";

	const files = parseUnifiedDiff(diffText);
	if (files.length === 0) return diffText;

	const c = options.colors ?? {
		added: hexToAnsiFg("3fb950"),
		removed: hexToAnsiFg("f85149"),
		context: hexToAnsiFg("C1C6B2"),
		dim: hexToAnsiFg("696969"),
		accent: hexToAnsiFg("7D56F4"),
	};

	const V = "│";
	const DOTS = "⋯";
	const out: string[] = [];

	for (const file of files) {
		const lang = options.language || detectLanguage(options.filePath || file.newPath);
		const displayPath = options.filePath || file.newPath || file.oldPath;

		// Count stats
		let adds = 0, dels = 0;
		for (const hunk of file.hunks) {
			for (const line of hunk.lines) {
				if (line.type === "added") adds++;
				if (line.type === "removed") dels++;
			}
		}

		// One-line header
		out.push(`${c.accent}${BOLD}${displayPath}${RST} ${c.dim}·${RST} ${c.added}+${adds}${RST} ${c.removed}-${dels}${RST}`);

		// Max line number width
		let maxNum = 0;
		for (const hunk of file.hunks)
			for (const ln of hunk.lines) {
				if (ln.oldNum && ln.oldNum > maxNum) maxNum = ln.oldNum;
				if (ln.newNum && ln.newNum > maxNum) maxNum = ln.newNum;
			}
		const w = String(maxNum).length;

		for (let hi = 0; hi < file.hunks.length; hi++) {
			if (hi > 0) {
				out.push(`${c.dim}  ${" ".repeat(w)} ${V} ${DOTS.repeat(Math.min(15, w + 10))}${RST}`);
			}

			const lines = file.hunks[hi].lines;
			let li = 0;

			while (li < lines.length) {
				const line = lines[li];

				if (line.type === "context") {
					const num = pad(line.newNum, w);
					const hl = highlightLine(line.content, lang);
					out.push(`${c.dim}  ${num} ${V}${RST} ${hl}`);
					li++;
					continue;
				}

				if (line.type === "removed") {
					const removed: DiffLine[] = [];
					while (li < lines.length && lines[li].type === "removed") { removed.push(lines[li]); li++; }
					const added: DiffLine[] = [];
					while (li < lines.length && lines[li].type === "added") { added.push(lines[li]); li++; }

					if (removed.length === added.length && removed.length <= 4) {
						for (let j = 0; j < removed.length; j++) {
							const oNum = pad(removed[j].oldNum, w);
							const nNum = pad(added[j].newNum, w);
							const { oldAnsi, newAnsi } = renderInlineChanges(removed[j].content, added[j].content, lang);
							out.push(`${BG_REMOVED}${c.removed}${BOLD}─${RST}${BG_REMOVED}${c.dim} ${oNum} ${V}${RST}${BG_REMOVED} ${oldAnsi}${RST}`);
							out.push(`${BG_ADDED}${c.added}${BOLD}+${RST}${BG_ADDED}${c.dim} ${nNum} ${V}${RST}${BG_ADDED} ${newAnsi}${RST}`);
						}
					} else {
						for (const r of removed) {
							const num = pad(r.oldNum, w);
							const hl = highlightLine(r.content, lang);
							out.push(`${BG_REMOVED}${c.removed}${BOLD}─${RST}${BG_REMOVED}${c.dim} ${num} ${V}${RST}${BG_REMOVED} ${hl}${RST}`);
						}
						for (const a of added) {
							const num = pad(a.newNum, w);
							const hl = highlightLine(a.content, lang);
							out.push(`${BG_ADDED}${c.added}${BOLD}+${RST}${BG_ADDED}${c.dim} ${num} ${V}${RST}${BG_ADDED} ${hl}${RST}`);
						}
					}
					continue;
				}

				if (line.type === "added") {
					const num = pad(line.newNum, w);
					const hl = highlightLine(line.content, lang);
					out.push(`${BG_ADDED}${c.added}${BOLD}+${RST}${BG_ADDED}${c.dim} ${num} ${V}${RST}${BG_ADDED} ${hl}${RST}`);
					li++;
				}
			}
		}
	}

	return out.join("\n");
}

function pad(n: number | undefined, width: number): string {
	return String(n ?? "").padStart(width);
}
