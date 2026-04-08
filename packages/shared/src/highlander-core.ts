import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildBm25Index, searchBm25, tokenize, type Bm25Doc, type Bm25Index } from "./bm25.js";
import { readMeaningfulSessionEntriesFromFile, sliceSessionViewEntries } from "./session-view.js";

export type SessionInfo = {
	id: string;
	cwd: string;
	name: string;
	created: string;
	modified: string;
	messageCount: number;
	firstMessage: string;
	allMessagesText: string;
	parentSession?: string;
	jsonlFile?: string;
};

type SessionIndex = Record<string, { mtimeMs: number; info: SessionInfo }>;

export type AdhocEntry = { index?: number; label?: string; text: string };

export type HighlanderArgs = {
	action: "search" | "view" | "grep" | "list" | "self";
	query?: string;
	session?: string;
	project?: string;
	since?: string;
	start?: number;
	end?: number;
	limit?: number;
	entries?: AdhocEntry[];
};

export type HighlanderOptions = {
	getCurrentSessionFile?: () => string | null | undefined;
};

const SESSIONS_DIR = path.join(os.homedir(), ".pi", "agent", "sessions");

function listProjectDirs(): string[] {
	try {
		return fs.readdirSync(SESSIONS_DIR).filter((d) => d.startsWith("--"));
	} catch {
		return [];
	}
}

function readSessionIndex(projectDir: string): SessionIndex {
	try {
		return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, projectDir, ".session-index.json"), "utf8"));
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

function getFallbackCurrentSessionFile(): string | null {
	const envPath = process.env.PI_SESSION_FILE || process.env.PI_SESSION_PATH;
	if (envPath) return envPath;

	try {
		const dirs = listProjectDirs();
		let latest: { file: string; mtime: number } | null = null;
		for (const dir of dirs) {
			const dirPath = path.join(SESSIONS_DIR, dir);
			const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl") && !f.startsWith("."));
			for (const f of files) {
				const full = path.join(dirPath, f);
				const stat = fs.statSync(full);
				if (!latest || stat.mtimeMs > latest.mtime) {
					latest = { file: full, mtime: stat.mtimeMs };
				}
			}
		}
		return latest?.file ?? null;
	} catch {
		return null;
	}
}

function getCurrentSessionFile(options?: HighlanderOptions): string | null {
	const explicit = options?.getCurrentSessionFile?.();
	if (explicit) return explicit;
	return getFallbackCurrentSessionFile();
}

function resolveSessionFile(sessionId: string | undefined, options?: HighlanderOptions): string | null {
	if (!sessionId || sessionId === "self") return getCurrentSessionFile(options);
	const info = resolveSessionInfo(sessionId);
	return info?.jsonlFile ?? null;
}

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
	for (const snippet of snippets) {
		if (snippet.pos - lastEnd > ctx) {
			deduped.push("..." + snippet.text + "...");
			lastEnd = snippet.pos + ctx;
		}
		if (deduped.length >= maxSnippets) break;
	}
	return deduped;
}

function bm25OverEntries(entries: AdhocEntry[], query: string, topK = 20): AdhocEntry[] {
	const docs: Bm25Doc[] = entries.map((entry, i) => ({
		id: String(i),
		fields: { label: entry.label || "", text: entry.text },
	}));
	const index = buildBm25Index(docs, { label: 1.5, text: 1.0 });
	const hits = searchBm25(index, query, topK);
	return hits.map((hit) => entries[parseInt(hit.id)]).filter(Boolean);
}

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

function doSearch(args: { query: string; project?: string; since?: string; limit?: number }): string {
	const { index, sessions } = buildSessionsIndex(args.project, args.since);
	const hits = searchBm25(index, args.query, args.limit ?? 10);
	const queryTerms = tokenize(args.query);
	if (!hits.length) return "No matching sessions found.";

	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const lines: string[] = [`Found ${hits.length} matching sessions:\n`];
	for (const hit of hits) {
		const info = sessionMap.get(hit.id);
		if (!info) continue;
		const date = new Date(info.created).toLocaleDateString();
		lines.push(`━━━ [${hit.score.toFixed(2)}] ${info.name || "CWD"} · ${date} · ${info.messageCount} msgs · ${info.id.slice(0, 8)} · ${info.modified} ━━━`);
		lines.push(`  cwd: ${info.cwd.replace(os.homedir(), "~")}`);
		for (const snippet of extractSnippets(info.allMessagesText || "", queryTerms, 2, 100)) {
			lines.push(`  > ${snippet}`);
		}
		lines.push(`  → highlander({ action: "grep", session: "${info.id.slice(0, 8)}", query: "..." })`);
		lines.push("");
	}
	return lines.join("\n");
}

function doView(args: { session?: string; start?: number; end?: number }, options?: HighlanderOptions): string {
	const file = resolveSessionFile(args.session, options);
	if (!file) return args.session ? `Session '${args.session}' not found.` : "No current session detected.";
	const entries = readMeaningfulSessionEntriesFromFile(file);
	if (!entries.length) return "Session has no meaningful entries.";

	const sliced = sliceSessionViewEntries(entries, args.start ?? -20, args.end ?? 0);
	const header = `File: ${file.split("/").pop()}\nEntries: ${entries.length} total, showing ${sliced.length}\n\n`;
	const body = sliced
		.map((entry) => {
			const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() + " " : "";
			const text = entry.text.length > 500 ? entry.text.slice(0, 500) + "..." : entry.text;
			return `[#${entry.index}] ${ts}${entry.label}\n${text}`;
		})
		.join("\n\n");
	const footer = entries.length > sliced.length
		? `\n--- ${entries.length - sliced.length} more entries. Use start/end to navigate.`
		: "";
	return header + body + footer;
}

function doGrep(
	args: { session?: string; query: string; limit?: number; entries?: AdhocEntry[] },
	options?: HighlanderOptions,
): string {
	if (args.entries?.length) {
		const hits = bm25OverEntries(args.entries, args.query, args.limit ?? 10);
		if (!hits.length) return "No matching entries.";
		return hits
			.map((entry) => {
				const text = entry.text.length > 300 ? entry.text.slice(0, 300) + "..." : entry.text;
				return `[#${entry.index ?? "?"}] ${entry.label || "entry"}\n  ${text.replace(/\n/g, " ")}`;
			})
			.join("\n\n");
	}

	const file = resolveSessionFile(args.session, options);
	if (!file) return args.session ? `Session '${args.session}' not found.` : "No current session detected.";

	const entries = readMeaningfulSessionEntriesFromFile(file);
	const queryTerms = tokenize(args.query);
	if (!queryTerms.length) return "Empty query.";
	const limit = args.limit ?? 10;

	const matches = entries
		.filter((entry) => {
			const lower = entry.text.toLowerCase();
			return queryTerms.some((term) => lower.includes(term));
		})
		.slice(0, limit);

	if (!matches.length) return `No entries matching '${args.query}'.`;

	const lines: string[] = [`Found ${matches.length} matching entries:\n`];
	for (const entry of matches) {
		const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() + " " : "";
		const text = entry.text.length > 300 ? entry.text.slice(0, 300) + "..." : entry.text;
		lines.push(`[#${entry.index}] ${ts}${entry.label}`);
		lines.push(`  ${text.replace(/\n/g, " ")}`);
		lines.push(`  → highlander({ action: "view", session: "${args.session || "self"}", start: ${entry.index - 2}, end: ${entry.index + 3} })`);
		lines.push("");
	}
	return lines.join("\n");
}

function doSelf(args: { query: string; limit?: number }, options?: HighlanderOptions): string {
	const file = getCurrentSessionFile(options);
	if (!file) return "No current session detected.";
	return doGrep({ session: "self", query: args.query, limit: args.limit }, options);
}

function doList(args: { project?: string; since?: string; limit?: number }): string {
	const sessions: SessionInfo[] = [];
	for (const dir of listProjectDirs()) {
		if (args.project && !dir.toLowerCase().includes(args.project.toLowerCase())) continue;
		for (const entry of Object.values(readSessionIndex(dir))) {
			if (args.since && entry.info.created < args.since) continue;
			sessions.push(entry.info);
		}
	}
	sessions.sort((a, b) => b.modified.localeCompare(a.modified));
	const top = sessions.slice(0, args.limit ?? 20);
	if (!top.length) return "No sessions found.";

	return `\n${top.length} sessions (newest first):\n\n` + top
		.map((session) => {
			const d = new Date(session.modified).toLocaleString();
			return `  ${session.name || "CWD"} · ${d} · ${session.messageCount} msgs · ${session.id.slice(0, 8)}\n    cwd: ${session.cwd.replace(os.homedir(), "~")}\n    ${(session.firstMessage || "").slice(0, 100).replace(/\n/g, " ")}`;
		})
		.join("\n");
}

export function createHighlanderExecutor(options?: HighlanderOptions) {
	return async (args: HighlanderArgs): Promise<string> => {
		switch (args.action) {
			case "search":
				return args.query ? doSearch(args) : "Error: 'query' required";
			case "view":
				return doView(args, options);
			case "grep":
				return args.query ? doGrep(args, options) : "Error: 'query' required";
			case "list":
				return doList(args);
			case "self":
				return args.query ? doSelf(args, options) : "Error: 'query' required";
			default:
				return `Unknown action: ${args.action}`;
		}
	};
}
