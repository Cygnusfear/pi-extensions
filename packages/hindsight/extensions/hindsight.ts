/**
 * Hindsight — search across dead session JSONL logs.
 *
 * Provides:
 *   hindsight({ action: "search", query, project?, since?, limit? })
 *     BM25 search across all session indexes (cross-project by default)
 *
 *   hindsight({ action: "view", session, start?, end? })
 *     Read entries from a specific session — like mesh_view for dead sessions
 *
 *   hindsight({ action: "list", project?, since?, limit? })
 *     List past sessions with metadata
 *
 * Uses session-view for entry projection and shared BM25 for search.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildBm25Index, searchBm25, type Bm25Index, type Bm25Doc } from "../../shared/src/bm25.js";
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

function findSessionFile(sessionId: string): string | null {
	for (const dir of listProjectDirs()) {
		const index = readSessionIndex(dir);
		for (const [filename, entry] of Object.entries(index)) {
			if (entry.info.id === sessionId) {
				return path.join(SESSIONS_DIR, dir, filename);
			}
		}
	}
	return null;
}

function findSessionFilePartial(partial: string): string | null {
	for (const dir of listProjectDirs()) {
		const index = readSessionIndex(dir);
		for (const [filename, entry] of Object.entries(index)) {
			if (entry.info.id.startsWith(partial) || filename.includes(partial)) {
				return path.join(SESSIONS_DIR, dir, filename);
			}
		}
	}
	return null;
}

// =============================================================================
// BM25 index building
// =============================================================================

let cachedIndex: { index: Bm25Index; sessions: SessionInfo[]; builtAt: number } | null = null;
const INDEX_TTL = 30_000; // rebuild every 30s

function buildSessionsIndex(projectFilter?: string, since?: string): { index: Bm25Index; sessions: SessionInfo[] } {
	const now = Date.now();
	if (cachedIndex && now - cachedIndex.builtAt < INDEX_TTL && !projectFilter && !since) {
		return { index: cachedIndex.index, sessions: cachedIndex.sessions };
	}

	const dirs = listProjectDirs();
	const sessions: SessionInfo[] = [];
	const docs: Bm25Doc[] = [];

	for (const dir of dirs) {
		// Optional project filter
		if (projectFilter && !dir.toLowerCase().includes(projectFilter.toLowerCase())) continue;

		const index = readSessionIndex(dir);
		for (const entry of Object.values(index)) {
			const info = entry.info;
			if (!info?.id) continue;

			// Optional time filter
			if (since && info.created < since) continue;

			sessions.push(info);
			docs.push({
				id: info.id,
				fields: {
					name: info.name || "",
					firstMessage: info.firstMessage || "",
					allMessagesText: (info.allMessagesText || "").slice(0, 50000), // cap to avoid huge docs
				},
			});
		}
	}

	const bm25 = buildBm25Index(docs, {
		name: 3.0,
		firstMessage: 2.0,
		allMessagesText: 1.0,
	});

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

	if (hits.length === 0) {
		return "No matching sessions found.";
	}

	const sessionMap = new Map(sessions.map((s) => [s.id, s]));
	const lines: string[] = [];
	lines.push(`Found ${hits.length} matching sessions:\n`);

	for (const hit of hits) {
		const info = sessionMap.get(hit.id);
		if (!info) continue;
		const date = new Date(info.created).toLocaleDateString();
		const preview = (info.firstMessage || "").slice(0, 120).replace(/\n/g, " ");
		lines.push(`  [${hit.score.toFixed(2)}] ${info.name || "CWD"} · ${date} · ${info.messageCount} msgs · ${info.id.slice(0, 8)}`);
		lines.push(`    ${preview}...`);
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

	// Sort by modified desc
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

function doView(args: { session: string; start?: number; end?: number; filter?: string }): string {
	let sessionFile = findSessionFile(args.session) ?? findSessionFilePartial(args.session);
	if (!sessionFile) {
		return `Session '${args.session}' not found.`;
	}

	const entries = readMeaningfulSessionEntriesFromFile(sessionFile);
	if (entries.length === 0) {
		return "Session has no meaningful entries.";
	}

	const start = args.start ?? -20;
	const end = args.end ?? 0;
	const sliced = sliceSessionViewEntries(entries, start, end);

	let formatted = formatSessionViewEntries(sliced);
	formatted = `Session: ${sessionFile.split("/").pop()}\nEntries: ${entries.length} total, showing ${sliced.length} (${start} to ${end})\n\n${formatted}`;

	return formatted;
}

// =============================================================================
// Extension registration
// =============================================================================

export default function register(pi: ExtensionAPI) {
	// hindsight tool
	pi.tool({
		name: "hindsight",
		description:
			"Search and read past session JSONL logs — mesh_view for dead sessions. " +
			"Use 'search' to find sessions by content, 'view' to read entries, 'list' to browse.",
		parameters: Type.Object({
			action: Type.Union([Type.Literal("search"), Type.Literal("view"), Type.Literal("list")], {
				description: "'search' = BM25 search across sessions, 'view' = read session entries, 'list' = browse sessions",
			}),
			query: Type.Optional(Type.String({ description: "Search query (for action=search)" })),
			session: Type.Optional(Type.String({ description: "Session ID or partial ID (for action=view)" })),
			project: Type.Optional(Type.String({ description: "Filter by project path substring" })),
			since: Type.Optional(Type.String({ description: "Only sessions after this date (ISO string)" })),
			start: Type.Optional(Type.Number({ description: "Entry window start offset from end, default -20 (for action=view)" })),
			end: Type.Optional(Type.Number({ description: "Entry window end offset from end, default 0 (for action=view)" })),
			limit: Type.Optional(Type.Number({ description: "Max results, default 10 (search) or 20 (list)" })),
		}),
		execute: async (args) => {
			switch (args.action) {
				case "search":
					if (!args.query) return "Error: 'query' is required for action=search";
					return doSearch(args as any);
				case "view":
					if (!args.session) return "Error: 'session' is required for action=view";
					return doView(args as any);
				case "list":
					return doList(args as any);
				default:
					return `Unknown action: ${args.action}`;
			}
		},
	});
}
