/**
 * Robust JSON parsing with automatic repair of malformed data.
 *
 * Wraps JSON.parse with jsonrepair as a fallback. Handles:
 * - Single quotes instead of double quotes
 * - Missing quotes around keys
 * - Trailing commas
 * - Truncated JSON
 * - Python constants (None, True, False)
 * - Comments, fenced code blocks, JSONP notation
 *
 * Use this for any untrusted or network-sourced JSON.
 */

import { jsonrepair } from "jsonrepair";

function extractFencedJson(text: string): string | null {
	const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	return match?.[1]?.trim() || null;
}

function extractBalancedJsonFromIndex(text: string, start: number): string | null {
	const open = text[start];
	if (open !== "{" && open !== "[") return null;

	const close = open === "{" ? "}" : "]";
	let depth = 0;
	let inString = false;
	let quote = "";
	let escaped = false;

	for (let i = start; i < text.length; i++) {
		const ch = text[i];

		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === quote) {
				inString = false;
				quote = "";
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			inString = true;
			quote = ch;
			continue;
		}

		if (ch === open) depth += 1;
		if (ch === close) {
			depth -= 1;
			if (depth === 0) {
				return text.slice(start, i + 1).trim();
			}
		}
	}

	return null;
}

function extractBalancedJsonCandidates(text: string): string[] {
	const candidates: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (ch !== "{" && ch !== "[") continue;

		const candidate = extractBalancedJsonFromIndex(text, i);
		if (!candidate || seen.has(candidate)) continue;

		seen.add(candidate);
		candidates.push(candidate);
	}

	return candidates;
}

function candidateJsonTexts(text: string): string[] {
	const normalized = text.replace(/^\uFEFF/, "").trim();
	const candidates: string[] = [];
	const fenced = extractFencedJson(normalized);
	if (fenced && !candidates.includes(fenced)) candidates.push(fenced);
	for (const candidate of extractBalancedJsonCandidates(normalized)) {
		if (!candidates.includes(candidate)) candidates.push(candidate);
	}
	if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
	return candidates.filter(Boolean);
}

/**
 * Parse JSON with automatic repair fallback.
 *
 * First attempts native JSON.parse (fast path).
 * On failure, runs jsonrepair then parses the repaired string.
 * If both fail, throws the original parse error.
 */
export function safeJsonParse<T = unknown>(text: string): T {
	let originalError: unknown;
	const candidates = candidateJsonTexts(text);

	for (const candidate of candidates) {
		try {
			return JSON.parse(candidate) as T;
		} catch (error) {
			if (originalError === undefined) originalError = error;
		}
	}

	for (const candidate of candidates) {
		try {
			return JSON.parse(jsonrepair(candidate)) as T;
		} catch {
			// Keep trying other candidates.
		}
	}

	throw originalError ?? new Error("Invalid JSON");
}

/**
 * Like fetch().json() but resilient to malformed responses.
 *
 * Reads the body as text and runs safeJsonParse.
 * Use this instead of `res.json()` for external APIs.
 */
export async function safeResponseJson<T = unknown>(res: Response): Promise<T> {
	const text = await res.text();
	return safeJsonParse<T>(text);
}
