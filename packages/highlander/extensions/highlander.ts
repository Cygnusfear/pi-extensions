/**
 * Hindsight — search and read past session JSONL logs.
 *
 * Provides:
 *   highlander({ action: "search", query, project?, since?, limit? })
 *     BM25 search across all session indexes (cross-project by default)
 *     Returns ranked sessions with snippet context showing WHERE the query matched
 *
 *   highlander({ action: "view", session, start?, end?, lines? })
 *     Read entries from a specific session — like mesh_view for dead sessions
 *     Entry numbers are shown so you can drill into specific ranges
 *
 *   highlander({ action: "grep", session, query })
 *     Search within a specific session's entries — find exact entry numbers
 *
 *   highlander({ action: "list", project?, since?, limit? })
 *     List past sessions with metadata
 *
 * Uses session-view for entry projection and shared BM25 for search.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildBm25Index, searchBm25, tokenize, type Bm25Index, type Bm25Doc } from "../../shared/src/bm25.js";
import {
	readMeaningfulSessionEntriesFromFile,
	sliceSessionViewEntries,
	formatSessionViewEntries,
	type SessionViewEntry,
} from "../../shared/src/session-view.js";

// =============================================================================
// Session index types
// =============================================================================

type SessionInfo = {
	id: string;
	cwd: string;
	name: string;
	created: string;
	modified: string;
	messageCount: number;
	firstMessage: string;
	allMessagesText: string;
	parentSession?: string;
	jsonlFile?: string; // resolved path to the JSONL
};

type SessionIndex = Record<string, { mtimeMs: number; info: SessionInfo }>;

// =============================================================================
// Index scanning
// =============================================================================

const SESSIONS_DIR = path.join(os.homedir(), ".pi", "agent", "sessions");

function listProjectDirs(): string[] {
	try {
		return fs.readdirSync(SESSIONS_DIR).filter((d) => d.startsWith("--"));
	} catch {
		return [];
	}
}

function readSessionIndex(projectDir: string): SessionIndex {
	const indexPath = path.join(SESSIONS_DIR, projectDir, ".session-index.json");
	try {
		return JSON.parse(fs.readFileSync(indexPath, "utf8"));
	} catch {
		return {};
	}
}

function resolveSessionInfo(sessionId: string): (SessionInfo & { jsonlFile: string }) | null {
	for (const dir of listProjectDirs()) {
		const index = readSessionIndex(dir);
		for (const [filename, entry] of Object.entries(index)) {
			if (entry.info.id === sessionId || entry.info.id.startsWith(sessionId) || filename.includes(sessionId)) {
				return { ...entry.info, jsonlFile: path.join(SESSIONS_DIR, dir, filename) };
			}
		}
	}
	return null;
}

// =============================================================================
// Snippet extraction — find where in the text the query matched
// =============================================================================

function extractSnippets(text: string, queryTerms: string[], maxSnippets = 3, contextChars = 120): string[] {
	const lower = text.toLowerCase();
	const snippets: { pos: number; text: string }[] = [];

	for (const term of queryTerms) {
		let searchFrom = 0;
		while (searchFrom < lower.length) {
			const idx = lower.indexOf(term, searchFrom);
			if (idx === -1) break;

			const start = Math.max(0, idx - contextChars);
			const end = Math.min(text.length, idx + term.length + contextChars);
			const snippet = text.slice(start, end).replace(/\n/g, " ").trim();
			snippets.push({ pos: idx, text: snippet });
			searchFrom = idx + term.length;

			if (snippets.length >= maxSnippets * 2) break; // over-collect, then dedupe
		}
	}

	// Dedupe overlapping snippets, keep best ones
	snippets.sort((a, b) => a.pos - b.pos);
	const deduped: string[] = [];
	let lastEnd = -Infinity;
	for (const s of snippets) {
		if (s.pos - lastEnd > contextChars) {
			deduped.push("..." + s.text + "...");
			lastEnd = s.pos + contextChars;
		}
		if (deduped.length >= maxSnippets) break;
	}

	return deduped;
}

// =============================================================================
// BM25 index building
// =============================================================================

let cachedIndex: { index: Bm25Index; sessions: SessionInfo[]; builtAt: number } | null = null;
const INDEX_TTL = 30_000;

function buildSessionsIndex(projectFilter?: string, since?: string): { index: Bm25Index; sessions: SessionInfo[] } {
	const now = Date.now();
	if (cachedIndex && now - cachedIndex.builtAt < INDEX_TTL && !projectFilter && !since) {
		return { index: cachedIndex.index, sessions: cachedIndex.sessions };
	}

	const dirs = listProjectDirs();
	const sessions: SessionInfo[] = [];
	const docs: Bm25Doc[] = [];

	for (const dir of dirs) {
		if (projectFilter && !dir.toLowerCase().includes(projectFilter.toLowerCase())) continue;

		const index = readSessionIndex(dir);
		for (const [filename, entry] of Object.entries(index)) {
			const info = entry.info;
			if (!info?.id) continue;
			if (since && info.created < since) continue;

			sessions.push(info);
			docs.push({
				id: info.id,
				fields: {
					name: info.name || "",
					firstMessage: info.firstMessage || "",
					allMessagesText: (info.allMessagesText || "").slice(0, 50000),
				},
			});
		}
	}

	const bm25 = buildBm25Index(docs, { name: 3.0, firstMessage: 2.0, allMessagesText: 1.0 });
	const result = { index: bm25, sessions };
	if (!projectFilter && !since) {
		cachedIndex = { ...result, builtAt: now };
	}
	return result;
}

// =============================================================================
// Actions
// =============================================================================

function doSearch(args: { query: string; project?: string; since?: string; limit?: number }): string {
	const limit = args.limit ?? 10;
	const { index, sessions } = buildSessionsIndex(args.project, args.since);
	const hits = searchBm25(index, args.query, limit);
	const queryTerms = tokenize(args.query);

	if (hits.length === 0) return "No matching sessions found.";

	const sessionMap = new Map(sessions.map((s) => [s.id, s]));
	const lines: string[] = [];
	lines.push(`Found ${hits.length} matching sessions:
`);

	for (const hit of hits) {
		const info = sessionMap.get(hit.id);
		if (!info) continue;
		const date = new Date(info.created).toLocaleDateString();
		const cwd = info.cwd.replace(os.homedir(), "~");

		lines.push(`━━━ [${hit.score.toFixed(2)}] ${info.name || "CWD"} · ${date} · ${info.messageCount} msgs · ${info.id.slice(0, 8)} ━━━`);
		lines.push(`  cwd: ${cwd}`);

		// Show snippets where the query terms matched
		const snippets = extractSnippets(info.allMessagesText || "", queryTerms, 2, 100);
		for (const snippet of snippets) {
			lines.push(`  > ${snippet}`);
		}
		lines.push(`  → highlander({ action: "view", session: "${info.id.slice(0, 8)}" })`);
		lines.push("");
	}

	return lines.join("\n");
}

function doView(args: { session: string; start?: number; end?: number; lines?: number }): string {
	const info = resolveSessionInfo(args.session);
	if (!info) return `Session '${args.session}' not found.`;

	const entries = readMeaningfulSessionEntriesFromFile(info.jsonlFile);
	if (entries.length === 0) return "Session has no meaningful entries.";

	const start = args.start ?? -20;
	const end = args.end ?? 0;
	const sliced = sliceSessionViewEntries(entries, start, end);

	// Format with clear entry indices for drill-down
	const header = [
		`Session: ${info.jsonlFile.split("/").pop()}`,
		`Name: ${info.name || "CWD"} · cwd: ${info.cwd.replace(os.homedir(), "~")}`,
		`Entries: ${entries.length} total, showing ${sliced.length} (offset ${start} to ${end})`,
		`Created: ${new Date(info.created).toLocaleString()} · Modified: ${new Date(info.modified).toLocaleString()}`,
		"",
	].join("\n");

	const formatted = sliced.map((e) => {
		const ts = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "";
		const entryHeader = `[#${e.index}]${ts ? " " + ts : ""} ${e.label}`;
		// Truncate long entries for readability, but show enough
		const text = e.text.length > 500 ? e.text.slice(0, 500) + "..." : e.text;
		return entryHeader + "\n" + text;
	}).join("\n\n");

	const footer = entries.length > sliced.length
		? `\n--- \n${entries.length - sliced.length} more entries. Use start/end to navigate.`
		: "";

	return header + formatted + footer;
}

function doGrep(args: { session: string; query: string; limit?: number }): string {
	const info = resolveSessionInfo(args.session);
	if (!info) return `Session '${args.session}' not found.`;

	const entries = readMeaningfulSessionEntriesFromFile(info.jsonlFile);
	const queryTerms = tokenize(args.query);
	if (queryTerms.length === 0) return "Empty query.";

	const limit = args.limit ?? 10;
	const matches: SessionViewEntry[] = [];

	for (const entry of entries) {
		const lower = entry.text.toLowerCase();
		if (queryTerms.some((t) => lower.includes(t))) {
			matches.push(entry);
			if (matches.length >= limit) break;
		}
	}

	if (matches.length === 0) return `No entries matching '${args.query}' in session ${args.session}.`;

	const lines: string[] = [];
	lines.push(`Found ${matches.length} matching entries in ${info.name || "session"}:\n`);

	for (const entry of matches) {
		const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "";
		const text = entry.text.length > 300 ? entry.text.slice(0, 300) + "..." : entry.text;
		lines.push(`[#${entry.index}] ${ts} ${entry.label}`);
		lines.push(`  ${text.replace(/\n/g, " ")}`);
		lines.push(`  → highlander({ action: "view", session: "${args.session}", start: ${entry.index - 2}, end: ${entry.index + 3} })`);
		lines.push("");
	}

	return lines.join("\n");
}

function doList(args: { project?: string; since?: string; limit?: number }): string {
	const limit = args.limit ?? 20;
	const dirs = listProjectDirs();
	const sessions: SessionInfo[] = [];

	for (const dir of dirs) {
		if (args.project && !dir.toLowerCase().includes(args.project.toLowerCase())) continue;
		const index = readSessionIndex(dir);
		for (const entry of Object.values(index)) {
			if (args.since && entry.info.created < args.since) continue;
			sessions.push(entry.info);
		}
	}

	sessions.sort((a, b) => b.modified.localeCompare(a.modified));
	const top = sessions.slice(0, limit);

	if (top.length === 0) return "No sessions found.";

	const lines: string[] = [`\n${top.length} sessions (newest first):\n`];
	for (const s of top) {
		const date = new Date(s.modified).toLocaleString();
		const cwd = s.cwd.replace(os.homedir(), "~");
		lines.push(`  ${s.name || "CWD"} · ${date} · ${s.messageCount} msgs · ${s.id.slice(0, 8)}`);
		lines.push(`    cwd: ${cwd}`);
		lines.push(`    ${(s.firstMessage || "").slice(0, 100).replace(/\n/g, " ")}`);
	}

	return lines.join("\n");
}

// =============================================================================
// Extension registration
// =============================================================================

export default function register(pi: ExtensionAPI) {
	pi.tool({
		name: "highlander",
		description:
			"Search and read past session JSONL logs — mesh_view for dead sessions. " +
			"Use 'search' to find sessions by content (BM25), 'grep' to find entries within a session, " +
			"'view' to read entries by index, 'list' to browse sessions.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("search"),
				Type.Literal("view"),
				Type.Literal("grep"),
				Type.Literal("list"),
			], {
				description: "'search'=BM25 across sessions, 'grep'=find entries in one session, 'view'=read entries, 'list'=browse",
			}),
			query: Type.Optional(Type.String({ description: "Search query (for action=search or action=grep)" })),
			session: Type.Optional(Type.String({ description: "Session ID or partial ID (for action=view or action=grep)" })),
			project: Type.Optional(Type.String({ description: "Filter by project path substring" })),
			since: Type.Optional(Type.String({ description: "Only sessions after this date (ISO string)" })),
			start: Type.Optional(Type.Number({ description: "Entry window start (default -20). Negative = offset from end." })),
			end: Type.Optional(Type.Number({ description: "Entry window end (default 0 = last entry)." })),
			limit: Type.Optional(Type.Number({ description: "Max results, default 10 (search/grep) or 20 (list)" })),
		}),
		execute: async (args) => {
			switch (args.action) {
				case "search":
					if (!args.query) return "Error: 'query' is required for action=search";
					return doSearch(args as any);
				case "view":
					if (!args.session) return "Error: 'session' is required for action=view";
					return doView(args as any);
				case "grep":
					if (!args.session || !args.query) return "Error: 'session' and 'query' required for action=grep";
					return doGrep(args as any);
				case "list":
					return doList(args as any);
				default:
					return `Unknown action: ${args.action}`;
			}
		},
	});
}
