/**
 * FFF (Fast File Finder) extension for pi
 *
 * Wraps @ff-labs/fff-bun via a SUBPROCESS instead of loading the native Rust
 * library directly into the pi process.  This keeps the 10+ Rust worker threads
 * and notify-rs file-watcher threads out of pi's address space.
 *
 * The subprocess auto-exits after 5 minutes of inactivity.
 *
 * Falls back gracefully — if the server can't start, tools register but return
 * clear errors so agents use rg/fd instead.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import path from "node:path";
import fs from "node:fs";

// =============================================================================
// Subprocess client
// =============================================================================

const SERVER_SCRIPT = path.join(__dirname, "..", "server", "fff-server.ts");

let serverProcess: import("node:child_process").ChildProcess | null = null;
let stdoutBuffer = "";
let requestId = 0;
let pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
let serverReady = false;
let startError: string | null = null;
let currentBasePath = "";

function startServer(): boolean {
	if (serverProcess && !serverProcess.killed) return true;

	serverReady = false;
	startError = null;
	pendingRequests.clear();

	try {
		const { spawn } = require("node:child_process");
		const child = spawn("bun", ["run", SERVER_SCRIPT], {
			stdio: ["pipe", "pipe", "pipe"],
			env: { ...process.env },
		});

		child.on("error", (err: Error) => {
			startError = err.message;
			serverProcess = null;
			serverReady = false;
		});

		child.on("exit", (_code: number | null) => {
			serverProcess = null;
			serverReady = false;
			stdoutBuffer = "";
			// Reject all pending requests
			for (const { reject } of pendingRequests.values()) {
				reject(new Error("fff server exited"));
			}
			pendingRequests.clear();
		});

		// Read JSON line responses from stdout (manual line buffering)
		child.stdout!.on("data", (chunk: Buffer) => {
			stdoutBuffer += chunk.toString();
			let newlineIdx: number;
			while ((newlineIdx = stdoutBuffer.indexOf("\n")) !== -1) {
				const line = stdoutBuffer.slice(0, newlineIdx).trim();
				stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
				if (!line) continue;
				try {
					const msg = JSON.parse(line);
					const pending = pendingRequests.get(msg.id);
					if (pending) {
						pendingRequests.delete(msg.id);
						pending.resolve(msg);
					}
				} catch {
					// ignore malformed lines
				}
			}
		});

		// Log server stderr (startup messages, errors)
		child.stderr?.on("data", (chunk: Buffer) => {
			const text = chunk.toString().trim();
			if (text.includes("ready")) {
				serverReady = true;
			}
			if (text && !text.includes("ready")) {
				console.error(`[fff] ${text}`);
			}
		});

		serverProcess = child;
		return true;
	} catch (e) {
		startError = e instanceof Error ? e.message : String(e);
		return false;
	}
}

function stopServer() {
	if (serverProcess && !serverProcess.killed) {
		serverProcess.stdin?.end();
		serverProcess.kill();
	}
	serverProcess = null;
	serverReady = false;
	stdoutBuffer = "";
	currentBasePath = "";
}

async function rpc(method: string, params?: any, timeoutMs = 10_000): Promise<any> {
	if (!serverProcess || serverProcess.killed) {
		if (!startServer()) {
			return { ok: false, error: startError || "failed to start fff server" };
		}
		// Wait for ready
		const deadline = Date.now() + 3000;
		while (!serverReady && Date.now() < deadline) {
			await new Promise((r) => setTimeout(r, 50));
		}
		if (!serverReady) {
			return { ok: false, error: "fff server did not become ready" };
		}
	}

	const id = ++requestId;
	const line = JSON.stringify({ id, method, params }) + "\n";

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingRequests.delete(id);
			resolve({ ok: false, error: `fff rpc timeout (${method})` });
		}, timeoutMs);

		pendingRequests.set(id, {
			resolve: (v) => { clearTimeout(timer); resolve(v); },
			reject: (e) => { clearTimeout(timer); reject(e); },
		});

		try {
			serverProcess!.stdin!.write(line);
		} catch (e) {
			clearTimeout(timer);
			pendingRequests.delete(id);
			resolve({ ok: false, error: `write failed: ${e}` });
		}
	});
}

// =============================================================================
// Project root detection
// =============================================================================

function findProjectRoot(start: string): string {
	let dir = path.resolve(start);
	while (true) {
		if (fs.existsSync(path.join(dir, ".git"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return start;
		dir = parent;
	}
}

// =============================================================================
// Init helper — ensures server is running and initialized for the right project
// =============================================================================

async function ensureInit(cwd: string): Promise<string | null> {
	const basePath = findProjectRoot(cwd);
	if (serverProcess && !serverProcess.killed && basePath === currentBasePath) return null;

	// Different project or server not running — (re)init
	if (serverProcess && !serverProcess.killed && basePath !== currentBasePath) {
		await rpc("destroy");
	}

	const result = await rpc("init", { basePath, aiMode: true }, 15_000);
	if (!result.ok) return result.error || "fff init failed";

	currentBasePath = basePath;
	return null;
}

// =============================================================================
// Output formatting
// =============================================================================

function formatSearchResults(result: any): string {
	if (!result.items || result.items.length === 0) {
		return `0 results (${result.totalFiles ?? 0} indexed)`;
	}

	const lines: string[] = [];
	const top = result.items[0];
	const topScore = result.scores?.[0];

	if (topScore?.exactMatch) {
		lines.push(`→ ${top.relativePath} (exact match)`);
	} else if (!result.scores || result.scores.length < 2 || result.scores[0]?.total > result.scores[1]?.total * 2) {
		lines.push(`→ ${top.relativePath} (best match)`);
	}

	if (result.totalMatched > result.items.length) {
		lines.push(`${result.items.length}/${result.totalMatched} matches shown`);
	}

	for (const item of result.items) {
		const suffix = item.gitStatus !== "clean" && item.gitStatus !== ""
			? ` [${item.gitStatus}]`
			: "";
		lines.push(`${item.relativePath}${suffix}`);
	}

	return lines.join("\n");
}

function formatGrepResults(result: any, query: string): string {
	if (!result.items || result.items.length === 0) {
		return "0 matches";
	}

	const lines: string[] = [];
	let currentFile = "";

	for (const match of result.items) {
		if (match.relativePath !== currentFile) {
			currentFile = match.relativePath;
			if (lines.length > 0) lines.push("");
			lines.push(currentFile);
		}

		if (match.contextBefore?.length) {
			for (let i = 0; i < match.contextBefore.length; i++) {
				const ctxLine = match.lineNumber - match.contextBefore.length + i;
				lines.push(`${ctxLine}-${match.contextBefore[i]}`);
			}
		}

		lines.push(`${match.lineNumber}:${match.lineContent}`);

		if (match.contextAfter?.length) {
			for (let i = 0; i < match.contextAfter.length; i++) {
				lines.push(`${match.lineNumber + 1 + i}-${match.contextAfter[i]}`);
			}
		}
	}

	if (result.totalMatched > result.items.length) {
		lines.push("");
		lines.push(`(${result.totalMatched} total matches, showing first ${result.items.length})`);
	}

	if (result.regexFallbackError) {
		lines.push(`(regex error: ${result.regexFallbackError}, fell back to literal)`);
	}

	return lines.join("\n");
}

// =============================================================================
// Public API — used by code-mode sandbox
// =============================================================================

export interface FFFToolResult {
	text: string;
	error?: string;
	details?: Record<string, unknown>;
}

export async function fffFindAPI(query: string, opts: { maxResults?: number; cwd: string }): Promise<FFFToolResult> {
	const initErr = await ensureInit(opts.cwd);
	if (initErr) return { text: "", error: initErr };

	const result = await rpc("search", { query, options: { pageSize: opts.maxResults || 20 } });
	if (!result.ok) return { text: "", error: result.error };

	return {
		text: formatSearchResults(result.value),
		details: {
			count: result.value?.items?.length ?? 0,
			total: result.value?.totalMatched ?? 0,
			totalFiles: result.value?.totalFiles ?? 0,
		},
	};
}

export async function fffGrepAPI(query: string, opts: { mode?: string; maxResults?: number; context?: number; cwd: string }): Promise<FFFToolResult> {
	const initErr = await ensureInit(opts.cwd);
	if (initErr) return { text: "", error: initErr };

	const result = await rpc("liveGrep", {
		query,
		options: {
			mode: opts.mode || "plain",
			maxMatchesPerFile: 100,
			beforeContext: opts.context || 0,
			afterContext: opts.context || 0,
		},
	});
	if (!result.ok) return { text: "", error: result.error };

	return {
		text: formatGrepResults(result.value, query),
		details: {
			count: result.value?.totalMatched ?? 0,
			filesSearched: result.value?.totalFilesSearched ?? 0,
		},
	};
}

export async function fffMultiGrepAPI(patterns: string[], opts: { constraints?: string; maxResults?: number; context?: number; cwd: string }): Promise<FFFToolResult> {
	const initErr = await ensureInit(opts.cwd);
	if (initErr) return { text: "", error: initErr };

	if (!patterns || patterns.length === 0) return { text: "", error: "patterns array must have at least 1 element" };

	const escaped = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const regexQuery = escaped.join("|");
	const fullQuery = opts.constraints ? `${opts.constraints} ${regexQuery}` : regexQuery;

	const result = await rpc("liveGrep", {
		query: fullQuery,
		options: {
			mode: "regex",
			maxMatchesPerFile: 100,
			beforeContext: opts.context || 0,
			afterContext: opts.context || 0,
		},
	});
	if (!result.ok) return { text: "", error: result.error };

	return {
		text: formatGrepResults(result.value, patterns.join(", ")),
		details: {
			patterns,
			constraints: opts.constraints,
			count: result.value?.totalMatched ?? 0,
			filesSearched: result.value?.totalFilesSearched ?? 0,
		},
	};
}

// =============================================================================
// Extension
// =============================================================================

export default function fffExtension(pi: ExtensionAPI) {

	// =========================================================================
	// fff_find
	// =========================================================================

	pi.registerTool({
		name: "fff_find",
		label: "FFF Find",
		description:
			"Fast fuzzy file search by name with frecency ranking (recently/frequently used files first). " +
			"Searches FILE NAMES, not file contents — use fff_grep for content search. " +
			"Supports fuzzy matching, path prefixes ('src/'), and glob constraints ('*.{ts,tsx} !test/'). " +
			"Keep queries SHORT — 1-2 terms max. Multiple words narrow results (AND), not OR.",
		parameters: Type.Object({
			query: Type.String({ description: "Fuzzy search query. Short — 1-2 terms. Supports path prefixes and glob constraints." }),
			maxResults: Type.Optional(Type.Number({ description: "Max results (default 20)", default: 20 })),
			cwd: Type.Optional(Type.String({ description: "Working directory override" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = params.cwd || ctx.cwd;
			const result = await fffFindAPI(params.query, { maxResults: params.maxResults, cwd });

			if (result.error) {
				return {
					content: [{ type: "text" as const, text: `fff not available: ${result.error}` }],
					isError: true,
					details: undefined,
				};
			}

			return {
				content: [{ type: "text" as const, text: result.text }],
				details: result.details,
			};
		},

		renderCall(args: any, theme: any) {
			return new Text(
				`${theme.fg("toolTitle", theme.bold("🔍 fff find"))} ${theme.fg("muted", args.query ?? "")}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const text = result.content?.[0]?.text ?? "";
			if (result.isError) return new Text(theme.fg("error", text), 0, 0);

			const details = result.details;
			let out = `${theme.fg("success", "✓")} ${details?.count ?? 0} files`;
			if (details?.total > details?.count) {
				out += ` (${details.total} total)`;
			}

			if (expanded) {
				out += "\n\n" + text;
			} else {
				const lines = text.split("\n").slice(0, 8);
				for (const line of lines) {
					out += `\n  ${theme.fg("dim", line)}`;
				}
				if (text.split("\n").length > 8) {
					out += `\n  ${theme.fg("dim", "...")}`;
				}
			}
			return new Text(out, 0, 0);
		},
	});

	// =========================================================================
	// fff_grep
	// =========================================================================

	pi.registerTool({
		name: "fff_grep",
		label: "FFF Grep",
		description:
			"Search file contents with frecency-ranked results. Default search tool — faster and smarter than rg. " +
			"Search for BARE IDENTIFIERS only (e.g. 'InProgressQuote', 'ActorAuth'), NOT code syntax or regex. " +
			"Supports inline constraints: '*.rs query' (extension filter), 'src/ query' (directory filter), '!test/ query' (exclude). " +
			"Use mode 'regex' only when you truly need pattern matching. " +
			"After 2 greps, READ the code — don't keep grepping with variations.",
		parameters: Type.Object({
			query: Type.String({ description: "Search text with optional constraint prefixes. Use bare identifiers, not code syntax." }),
			mode: Type.Optional(Type.String({ description: "Search mode: 'plain' (default), 'regex', or 'fuzzy'" })),
			maxResults: Type.Optional(Type.Number({ description: "Max matching lines (default 30)", default: 30 })),
			context: Type.Optional(Type.Number({ description: "Context lines before/after each match (default 0)", default: 0 })),
			cwd: Type.Optional(Type.String({ description: "Working directory override" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = params.cwd || ctx.cwd;
			const result = await fffGrepAPI(params.query, {
				mode: params.mode,
				maxResults: params.maxResults,
				context: params.context,
				cwd,
			});

			if (result.error) {
				return {
					content: [{ type: "text" as const, text: `fff not available: ${result.error}` }],
					isError: true,
					details: undefined,
				};
			}

			return {
				content: [{ type: "text" as const, text: result.text }],
				details: result.details,
			};
		},

		renderCall(args: any, theme: any) {
			const mode = args.mode && args.mode !== "plain" ? ` [${args.mode}]` : "";
			return new Text(
				`${theme.fg("toolTitle", theme.bold(`🔍 fff grep${mode}`))} ${theme.fg("muted", args.query ?? "")}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const text = result.content?.[0]?.text ?? "";
			if (result.isError) return new Text(theme.fg("error", text), 0, 0);

			const details = result.details;
			let out = `${theme.fg("success", "✓")} ${details?.count ?? 0} matches`;
			if (details?.filesSearched) {
				out += ` across ${details.filesSearched} files`;
			}

			if (expanded) {
				out += "\n\n" + text;
			} else {
				const lines = text.split("\n").slice(0, 10);
				for (const line of lines) {
					out += `\n  ${theme.fg("dim", line)}`;
				}
				if (text.split("\n").length > 10) {
					out += `\n  ${theme.fg("dim", "...")}`;
				}
			}
			return new Text(out, 0, 0);
		},
	});

	// =========================================================================
	// fff_multi_grep
	// =========================================================================

	pi.registerTool({
		name: "fff_multi_grep",
		label: "FFF Multi Grep",
		description:
			"Search file contents for lines matching ANY of multiple patterns (OR logic). " +
			"Use when you need to find different name variants in one call: e.g. ['ActorAuth', 'actor_auth', 'ACTOR_AUTH']. " +
			"Faster than sequential greps. Patterns are literal text — no escaping needed. " +
			"Supports constraints via the 'constraints' parameter: '*.rs', 'src/', '!test/'.",
		parameters: Type.Object({
			patterns: Type.Array(Type.String(), { description: "Patterns to search for (OR logic). Include all naming variants." }),
			constraints: Type.Optional(Type.String({ description: "File constraints: '*.rs', 'src/', '!test/'. Separate with spaces." })),
			maxResults: Type.Optional(Type.Number({ description: "Max matching lines (default 30)", default: 30 })),
			context: Type.Optional(Type.Number({ description: "Context lines before/after each match (default 0)", default: 0 })),
			cwd: Type.Optional(Type.String({ description: "Working directory override" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = params.cwd || ctx.cwd;
			const result = await fffMultiGrepAPI(params.patterns, {
				constraints: params.constraints,
				maxResults: params.maxResults,
				context: params.context,
				cwd,
			});

			if (result.error) {
				return {
					content: [{ type: "text" as const, text: `fff not available: ${result.error}` }],
					isError: true,
					details: undefined,
				};
			}

			return {
				content: [{ type: "text" as const, text: result.text }],
				details: result.details,
			};
		},

		renderCall(args: any, theme: any) {
			const label = (args.patterns || []).slice(0, 3).join(", ");
			return new Text(
				`${theme.fg("toolTitle", theme.bold("🔍 fff multi_grep"))} ${theme.fg("muted", label)}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const text = result.content?.[0]?.text ?? "";
			if (result.isError) return new Text(theme.fg("error", text), 0, 0);

			const details = result.details;
			let out = `${theme.fg("success", "✓")} ${details?.count ?? 0} matches`;

			if (expanded) {
				out += "\n\n" + text;
			} else {
				const lines = text.split("\n").slice(0, 10);
				for (const line of lines) {
					out += `\n  ${theme.fg("dim", line)}`;
				}
				if (text.split("\n").length > 10) {
					out += `\n  ${theme.fg("dim", "...")}`;
				}
			}
			return new Text(out, 0, 0);
		},
	});

	// =========================================================================
	// Lifecycle
	// =========================================================================

	pi.on("session_shutdown", async () => {
		stopServer();
	});
}
