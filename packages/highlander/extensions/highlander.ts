/**
 * Highlander — search and read past session JSONL logs. 🔪
 *
 * Actions:
 *   search  — BM25 across all session indexes
 *   grep    — find entries within a session (by ID or "self" for current session)
 *   view    — read entries from a session (by ID or "self")
 *   list    — browse past sessions
 *   self    — search the CURRENT live session's entries
 *
 * Also accepts an entries[] array for ad-hoc BM25 over arbitrary text.
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
	type SessionViewEntry,
} from "../../shared/src/session-view.js";

// =============================================================================
// Types
// =============================================================================

type SessionInfo = {
	id: string; cwd: string; name: string;
	created: string; modified: string; messageCount: number;
	firstMessage: string; allMessagesText: string;
	parentSession?: string; jsonlFile?: string;
};

type SessionIndex = Record<string, { mtimeMs: number; info: SessionInfo }>;

type AdhocEntry = { index?: number; label?: string; text: string };

// =============================================================================
// Index scanning
// =============================================================================

const SESSIONS_DIR = path.join(os.homedir(), ".pi", "agent", "sessions");

function listProjectDirs(): string[] {
	try { return fs.readdirSync(SESSIONS_DIR).filter(d => d.startsWith("--")); }
	catch { return []; }
}

function readSessionIndex(projectDir: string): SessionIndex {
	try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, projectDir, ".session-index.json"), "utf8")); }
	catch { return {}; }
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
// Current session detection
// =============================================================================

function getCurrentSessionFile(): string | null {
	const envPath = process.env.PI_SESSION_FILE || process.env.PI_SESSION_PATH;
	if (envPath) return envPath;

	// Fallback: find the most recently modified jsonl across all project dirs
	try {
		const dirs = listProjectDirs();
		let latest: { file: string; mtime: number } | null = null;
		for (const dir of dirs) {
			const dirPath = path.join(SESSIONS_DIR, dir);
			const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".jsonl") && !f.startsWith("."));
			for (const f of files) {
				const full = path.join(dirPath, f);
				const stat = fs.statSync(full);
				if (!latest || stat.mtimeMs > latest.mtime) {
					latest = { file: full, mtime: stat.mtimeMs };
				}
			}
		}
		return latest?.file ?? null;
	} catch { return null; }
}

function resolveSessionFile(sessionId: string | undefined): string | null {
	if (!sessionId || sessionId === "self") return getCurrentSessionFile();
	const info = resolveSessionInfo(sessionId);
	return info?.jsonlFile ?? null;
}

// =============================================================================
// Snippet extraction
// =============================================================================

function extractSnippets(text: string, queryTerms: string[], maxSnippets = 3, ctx = 120): string[] {
	const lower = text.toLowerCase();
	const snippets: { pos: number; text: string }[] = [];
	for (const term of queryTerms) {
		let from = 0;
		while (from < lower.length && snippets.length < maxSnippets * 2) {
			const idx = lower.indexOf(term, from);
			if (idx === -1) break;
			const s = Math.max(0, idx - ctx);
			const e = Math.min(text.length, idx + term.length + ctx);
			snippets.push({ pos: idx, text: text.slice(s, e).replace(/\n/g, " ").trim() });
			from = idx + term.length;
		}
	}
	snippets.sort((a, b) => a.pos - b.pos);
	const deduped: string[] = [];
	let lastEnd = -Infinity;
	for (const s of snippets) {
		if (s.pos - lastEnd > ctx) { deduped.push("..." + s.text + "..."); lastEnd = s.pos + ctx; }
		if (deduped.length >= maxSnippets) break;
	}
	return deduped;
}

// =============================================================================
// Ad-hoc BM25 over arbitrary entries
// =============================================================================

function bm25OverEntries(entries: AdhocEntry[], query: string, topK = 20): AdhocEntry[] {
	const docs: Bm25Doc[] = entries.map((e, i) => ({
		id: String(i),
		fields: { label: e.label || "", text: e.text },
	}));
	const index = buildBm25Index(docs, { label: 1.5, text: 1.0 });
	const hits = searchBm25(index, query, topK);
	return hits.map(h => entries[parseInt(h.id)]).filter(Boolean);
}

// =============================================================================
// BM25 session index (cached)
// =============================================================================

let cachedIndex: { index: Bm25Index; sessions: SessionInfo[]; builtAt: number } | null = null;
const INDEX_TTL = 30_000;

function buildSessionsIndex(projectFilter?: string, since?: string): { index: Bm25Index; sessions: SessionInfo[] } {
	const now = Date.now();
	if (cachedIndex && now - cachedIndex.builtAt < INDEX_TTL && !projectFilter && !since) {
		return { index: cachedIndex.index, sessions: cachedIndex.sessions };
	}
	const sessions: SessionInfo[] = [];
	const docs: Bm25Doc[] = [];
	for (const dir of listProjectDirs()) {
		if (projectFilter && !dir.toLowerCase().includes(projectFilter.toLowerCase())) continue;
		for (const entry of Object.values(readSessionIndex(dir))) {
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
	if (!projectFilter && !since) cachedIndex = { ...result, builtAt: now };
	return result;
}

// =============================================================================
// Actions
// =============================================================================

function doSearch(args: { query: string; project?: string; since?: string; limit?: number }): string {
	const { index, sessions } = buildSessionsIndex(args.project, args.since);
	const hits = searchBm25(index, args.query, args.limit ?? 10);
	const queryTerms = tokenize(args.query);
	if (!hits.length) return "No matching sessions found.";

	const sessionMap = new Map(sessions.map(s => [s.id, s]));
	const lines: string[] = [`Found ${hits.length} matching sessions:\n`];
	for (const hit of hits) {
		const info = sessionMap.get(hit.id);
		if (!info) continue;
		const date = new Date(info.created).toLocaleDateString();
		lines.push(`━━━ [${hit.score.toFixed(2)}] ${info.name || "CWD"} · ${date} · ${info.messageCount} msgs · ${info.id.slice(0, 8)} · ${info.modified} ━━━`);
		lines.push(`  cwd: ${info.cwd.replace(os.homedir(), "~")}`);
		for (const snip of extractSnippets(info.allMessagesText || "", queryTerms, 2, 100))
			lines.push(`  > ${snip}`);
		lines.push(`  → highlander({ action: "grep", session: "${info.id.slice(0, 8)}", query: "..." })`);
		lines.push("");
	}
	return lines.join("\n");
}

function doView(args: { session?: string; start?: number; end?: number }): string {
	const file = resolveSessionFile(args.session);
	if (!file) return args.session ? `Session '${args.session}' not found.` : "No current session detected.";
	const entries = readMeaningfulSessionEntriesFromFile(file);
	if (!entries.length) return "Session has no meaningful entries.";

	const sliced = sliceSessionViewEntries(entries, args.start ?? -20, args.end ?? 0);
	const header = `File: ${file.split("/").pop()}\nEntries: ${entries.length} total, showing ${sliced.length}\n\n`;

	const body = sliced.map(e => {
		const ts = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() + " " : "";
		const text = e.text.length > 500 ? e.text.slice(0, 500) + "..." : e.text;
		return `[#${e.index}] ${ts}${e.label}\n${text}`;
	}).join("\n\n");

	const footer = entries.length > sliced.length
		? `\n--- ${entries.length - sliced.length} more entries. Use start/end to navigate.`
		: "";
	return header + body + footer;
}

function doGrep(args: { session?: string; query: string; limit?: number; entries?: AdhocEntry[] }): string {
	// Ad-hoc mode: BM25 over provided entries array
	if (args.entries?.length) {
		const hits = bm25OverEntries(args.entries, args.query, args.limit ?? 10);
		if (!hits.length) return "No matching entries.";
		return hits.map(e => {
			const text = e.text.length > 300 ? e.text.slice(0, 300) + "..." : e.text;
			return `[#${e.index ?? "?"}] ${e.label || "entry"}\n  ${text.replace(/\n/g, " ")}`;
		}).join("\n\n");
	}

	// Session mode: grep entries from a session file
	const file = resolveSessionFile(args.session);
	if (!file) return args.session ? `Session '${args.session}' not found.` : "No current session detected.";

	const entries = readMeaningfulSessionEntriesFromFile(file);
	const queryTerms = tokenize(args.query);
	if (!queryTerms.length) return "Empty query.";
	const limit = args.limit ?? 10;

	const matches = entries.filter(e => {
		const lower = e.text.toLowerCase();
		return queryTerms.some(t => lower.includes(t));
	}).slice(0, limit);

	if (!matches.length) return `No entries matching '${args.query}'.`;

	const lines: string[] = [`Found ${matches.length} matching entries:\n`];
	for (const e of matches) {
		const ts = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() + " " : "";
		const text = e.text.length > 300 ? e.text.slice(0, 300) + "..." : e.text;
		lines.push(`[#${e.index}] ${ts}${e.label}`);
		lines.push(`  ${text.replace(/\n/g, " ")}`);
		lines.push(`  → highlander({ action: "view", session: "${args.session || "self"}", start: ${e.index - 2}, end: ${e.index + 3} })`);
		lines.push("");
	}
	return lines.join("\n");
}

function doSelf(args: { query: string; limit?: number }): string {
	const file = getCurrentSessionFile();
	if (!file) return "No current session detected.";
	return doGrep({ session: "self", query: args.query, limit: args.limit });
}

function doList(args: { project?: string; since?: string; limit?: number }): string {
	const sessions: SessionInfo[] = [];
	for (const dir of listProjectDirs()) {
		if (args.project && !dir.toLowerCase().includes(args.project.toLowerCase())) continue;
		for (const e of Object.values(readSessionIndex(dir))) {
			if (args.since && e.info.created < args.since) continue;
			sessions.push(e.info);
		}
	}
	sessions.sort((a, b) => b.modified.localeCompare(a.modified));
	const top = sessions.slice(0, args.limit ?? 20);
	if (!top.length) return "No sessions found.";

	return `\n${top.length} sessions (newest first):\n\n` + top.map(s => {
		const d = new Date(s.modified).toLocaleString();
		return `  ${s.name || "CWD"} · ${d} · ${s.messageCount} msgs · ${s.id.slice(0, 8)}\n    cwd: ${s.cwd.replace(os.homedir(), "~")}\n    ${(s.firstMessage || "").slice(0, 100).replace(/\n/g, " ")}`;
	}).join("\n");
}

// =============================================================================
// Extension registration
// =============================================================================

export default function register(pi: ExtensionAPI) {
	pi.tool({
		name: "highlander",
		description:
			"Search and read past session JSONL logs — mesh_view for dead sessions. 🔪\n" +
			"search = BM25 across sessions, grep = find entries in one session, view = read entries,\n" +
			"list = browse sessions, self = BM25 search the CURRENT live session.\n" +
			"Also accepts entries[] for ad-hoc BM25 over arbitrary text arrays.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("search"), Type.Literal("view"),
				Type.Literal("grep"), Type.Literal("list"), Type.Literal("self"),
			], { description: "search=Bm25 across sessions, grep=find entries, view=read, list=browse, self=search current session" }),
			query: Type.Optional(Type.String({ description: "Search query (search/grep/self)" })),
			session: Type.Optional(Type.String({ description: "Session ID, partial ID, or 'self' (view/grep). Omit = auto-detect current." })),
			project: Type.Optional(Type.String({ description: "Filter by project path substring" })),
			since: Type.Optional(Type.String({ description: "Only sessions after this date (ISO)" })),
			start: Type.Optional(Type.Number({ description: "Entry window start (default -20). Negative=offset from end." })),
			end: Type.Optional(Type.Number({ description: "Entry window end (default 0=last)." })),
			limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
			entries: Type.Optional(Type.Array(Type.Object({ index: Type.Optional(Type.Number()), label: Type.Optional(Type.String()), text: Type.String() })), {
				description: "Ad-hoc entries for BM25 (action=grep only). Pass any array of {text} objects.",
			}),
		}),
		execute: async (args) => {
			switch (args.action) {
				case "search": return args.query ? doSearch(args as any) : "Error: 'query' required";
				case "view": return doView(args as any);
				case "grep": return args.query ? doGrep(args as any) : "Error: 'query' required";
				case "list": return doList(args as any);
				case "self": return args.query ? doSelf(args as any) : "Error: 'query' required";
				default: return `Unknown action: ${args.action}`;
			}
		},
	});
	
}
