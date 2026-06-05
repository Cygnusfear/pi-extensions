import fs from "node:fs";
import { safeJsonParse } from "./safe-json.js";

export type SessionViewEntry = {
	index: number;
	timestamp?: string;
	label: string;
	text: string;
	type: string;
};

type SessionEntryLike = Record<string, unknown>;

function normalizeText(text: string): string {
	return text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stringifyUnknown(value: unknown): string {
	if (typeof value === "string") return value;
	if (value === undefined) return "";
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function extractMessageText(message: Record<string, unknown>): string {
	const role = String(message.role ?? "message");
	const content = message.content;

	if (Array.isArray(content)) {
		const textBlocks = content
			.map((block) => {
				if (!block || typeof block !== "object") return "";
				const record = block as Record<string, unknown>;
				if (record.type === "text" && typeof record.text === "string") return record.text;
				return "";
			})
			.filter(Boolean)
			.join("\n\n");
		if (textBlocks.trim()) return normalizeText(textBlocks);
	}

	if (typeof content === "string" && content.trim()) return normalizeText(content);

	if (role === "toolCall") {
		const toolName = typeof message.toolName === "string" ? message.toolName : "tool";
		const argsText = stringifyUnknown(message.arguments ?? message.args ?? message.input);
		return normalizeText(argsText ? `${toolName}\n${argsText}` : toolName);
	}

	if (role === "toolResult") {
		const toolName = typeof message.toolName === "string" ? message.toolName : "tool";
		const resultText = stringifyUnknown(message.result ?? message.output ?? message.details);
		return normalizeText(resultText ? `${toolName}\n${resultText}` : toolName);
	}

	if (typeof message.text === "string" && message.text.trim()) return normalizeText(message.text);

	return "";
}

function extractCustomText(entry: SessionEntryLike): string {
	if (typeof entry.content === "string" && entry.content.trim()) return normalizeText(entry.content);
	if (entry.data !== undefined) return normalizeText(stringifyUnknown(entry.data));
	return "";
}

function shouldIncludeCustomEntry(entry: SessionEntryLike): boolean {
	const customType = typeof entry.customType === "string" ? entry.customType : "";
	if (!customType) return true;
	if (customType === "teams-worker-heartbeat") return false;
	if (customType.startsWith("ad:terminal-title")) return false;
	if (customType.startsWith("ad:session-title")) return false;
	return true;
}

function projectSessionEntry(entry: SessionEntryLike, index: number): SessionViewEntry | null {
	const type = typeof entry.type === "string" ? entry.type : "unknown";
	const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : undefined;

	if (type === "message" && entry.message && typeof entry.message === "object") {
		const message = entry.message as Record<string, unknown>;
		const role = String(message.role ?? "message");
		const label = role === "toolCall"
			? `tool call${typeof message.toolName === "string" ? ` · ${message.toolName}` : ""}`
			: role === "toolResult"
				? `tool result${typeof message.toolName === "string" ? ` · ${message.toolName}` : ""}`
				: role;
		const text = extractMessageText(message);
		if (!text) return null;
		return { index, timestamp, label, text, type };
	}

	if (type === "custom_message" || type === "custom") {
		if (!shouldIncludeCustomEntry(entry)) return null;
		const customType = typeof entry.customType === "string" ? entry.customType : type;
		const text = extractCustomText(entry);
		if (!text) return null;
		return { index, timestamp, label: customType, text, type };
	}

	return null;
}

export function projectMeaningfulSessionEntries(
	entries: unknown[],
	indexOffset = 0,
): SessionViewEntry[] {
	const projected: SessionViewEntry[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry || typeof entry !== "object") continue;
		const view = projectSessionEntry(entry as SessionEntryLike, indexOffset + i);
		if (view) projected.push(view);
	}
	return projected;
}

/**
 * Build a bounded tail snapshot of a session branch — the cheap "what is this
 * session doing right now" window used by mesh tell receipts. Slices the raw
 * branch tail BEFORE projecting so the cost is O(window), not O(session-length):
 * we never project the whole branch. Absolute branch indices are preserved via
 * the projection offset, so a reader sees true positions.
 */
export function buildSessionTailSnapshot(
	branch: unknown[],
	tailRaw = 40,
	windowN = 15,
): { entries: SessionViewEntry[]; text: string; total: number; windowFrom: number } {
	const offset = Math.max(0, branch.length - tailRaw);
	const tail = branch.slice(offset);
	const projected = projectMeaningfulSessionEntries(tail, offset);
	const entries = windowN > 0 ? projected.slice(-windowN) : projected;
	return {
		entries,
		text: formatSessionViewEntries(entries),
		total: projected.length,
		windowFrom: entries[0]?.index ?? offset,
	};
}

export function readMeaningfulSessionEntriesFromFile(sessionFile: string): SessionViewEntry[] {
	let raw: string;
	try {
		raw = fs.readFileSync(sessionFile, "utf8");
	} catch {
		return [];
	}
	const entries: unknown[] = [];
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			entries.push(safeJsonParse(trimmed));
		} catch {
			// Skip malformed lines.
		}
	}
	return projectMeaningfulSessionEntries(entries);
}

export function resolveRelativeWindow(total: number, start = -20, end = 0): { startIndex: number; endIndex: number } {
	if (total <= 0) return { startIndex: 0, endIndex: -1 };
	const newest = total - 1;
	const toIndex = (value: number) => {
		if (!Number.isFinite(value)) return newest;
		if (value <= 0) return newest + value;
		return value;
	};
	let startIndex = Math.max(0, Math.min(newest, toIndex(start)));
	let endIndex = Math.max(0, Math.min(newest, toIndex(end)));
	if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
	return { startIndex, endIndex };
}

export function sliceSessionViewEntries(entries: SessionViewEntry[], start = -20, end = 0): SessionViewEntry[] {
	if (entries.length === 0) return [];
	const { startIndex, endIndex } = resolveRelativeWindow(entries.length, start, end);
	return entries.slice(startIndex, endIndex + 1);
}

export function formatSessionViewEntries(entries: SessionViewEntry[]): string {
	if (entries.length === 0) return "(no meaningful entries in that window)";
	return entries
		.map((entry) => {
			const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "";
			const header = `[#${entry.index}]${ts ? ` ${ts}` : ""} ${entry.label}`;
			return `${header}\n${entry.text}`;
		})
		.join("\n\n");
}
