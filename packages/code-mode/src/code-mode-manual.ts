import { Buffer } from "node:buffer";

/** Maximum UTF-8 size of one on-demand code-mode manual page. */
export const CODE_MODE_MANUAL_MAX_BYTES = 14 * 1024;

/** Maximum UTF-8 size of the declaration reference injected into an RLM prompt. */
export const CODE_MODE_COMPACT_REFERENCE_MAX_BYTES = 16 * 1024;

export const CODE_MODE_MANUAL_TOPIC_IDS = [
	"core",
	"async",
	"records",
	"analysis",
	"session",
	"runbooks",
	"rlm",
	"runtime",
	"teams",
	"mesh",
] as const;

export type CodeModeManualTopicId = (typeof CODE_MODE_MANUAL_TOPIC_IDS)[number];
export type CodeModeDeclarationKind = "function" | "const";

export interface CodeModeManualPage {
	readonly id: CodeModeManualTopicId;
	readonly title: string;
	readonly content: string;
}

export interface CodeModeDeclaration {
	readonly name: string;
	readonly kind: CodeModeDeclarationKind;
	readonly topic: CodeModeManualTopicId;
	/** Exact declaration text, without the preceding documentation comments. */
	readonly source: string;
}

export interface CodeModeManual {
	readonly pages: readonly CodeModeManualPage[];
	/** Top-level sandbox declarations, grouped by callable/namespace name. */
	readonly declarations: ReadonlyMap<string, CodeModeDeclaration>;
}

const MARKER = /^\/\/ @code-mode-manual ([a-z-]+) \| (.+)$/gm;
const DECLARATION_START =
	/^declare\s+(function|const)\s+([A-Za-z_$][\w$]*)\b/gm;

function isCodeModeManualTopicId(
	value: string,
): value is CodeModeManualTopicId {
	return (CODE_MODE_MANUAL_TOPIC_IDS as readonly string[]).includes(value);
}

/**
 * Find the top-level semicolon that terminates a declaration. Semicolons inside
 * object types, tuples, callbacks, strings, and comments do not terminate it.
 */
function findDeclarationEnd(source: string, start: number): number {
	let parens = 0;
	let brackets = 0;
	let braces = 0;
	let quote: '"' | "'" | "`" | undefined;
	let escaped = false;
	let lineComment = false;
	let blockComment = false;
	let commentQuote: '"' | "`" | undefined;
	let commentEscaped = false;

	for (let index = start; index < source.length; index++) {
		const char = source[index];
		const next = source[index + 1];

		if (lineComment) {
			if (char === "\n") lineComment = false;
			continue;
		}
		if (blockComment) {
			if (commentQuote) {
				if (commentEscaped) commentEscaped = false;
				else if (char === "\\") commentEscaped = true;
				else if (char === commentQuote) commentQuote = undefined;
				continue;
			}
			if (char === '"' || char === "`") {
				commentQuote = char;
				continue;
			}
			if (char === "*" && next === "/") {
				// Glob prose such as `"**/*.ts"` is protected by commentQuote;
				// real line-terminal or inline delimiters, including `**/`, close.
				blockComment = false;
				index++;
			}
			continue;
		}
		if (quote) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === quote) quote = undefined;
			continue;
		}
		if (char === "/" && next === "/") {
			lineComment = true;
			index++;
			continue;
		}
		if (char === "/" && next === "*") {
			blockComment = true;
			commentQuote = undefined;
			commentEscaped = false;
			index++;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}

		if (char === "(") parens++;
		else if (char === ")") parens--;
		else if (char === "[") brackets++;
		else if (char === "]") brackets--;
		else if (char === "{") braces++;
		else if (char === "}") braces--;
		else if (char === ";" && parens === 0 && brackets === 0 && braces === 0)
			return index + 1;

		if (parens < 0 || brackets < 0 || braces < 0) {
			throw new Error(`Malformed code-mode declaration near byte ${start}.`);
		}
	}
	throw new Error(`Unterminated code-mode declaration near byte ${start}.`);
}

function extractDeclarations(
	source: string,
	topic: CodeModeManualTopicId,
): CodeModeDeclaration[] {
	const declarations: CodeModeDeclaration[] = [];
	for (const match of source.matchAll(DECLARATION_START)) {
		const start = match.index ?? 0;
		const end = findDeclarationEnd(source, start);
		declarations.push({
			name: match[2],
			kind: match[1] as CodeModeDeclarationKind,
			topic,
			source: source.slice(start, end).trim(),
		});
	}
	return declarations;
}

function addDeclaration(
	index: Map<string, CodeModeDeclaration>,
	declaration: CodeModeDeclaration,
): void {
	const existing = index.get(declaration.name);
	if (!existing) {
		index.set(declaration.name, declaration);
		return;
	}
	if (
		existing.kind !== "function" ||
		declaration.kind !== "function" ||
		existing.topic !== declaration.topic
	) {
		throw new Error(`Duplicate code-mode declaration: ${declaration.name}.`);
	}
	// Function overloads are one logical tool and must remain exact as a group.
	index.set(declaration.name, {
		...existing,
		source: `${existing.source}\n${declaration.source}`,
	});
}

/** Parse the single authoritative declarations document into bounded manual pages and an exact tool index. */
export function buildCodeModeManual(source: string): CodeModeManual {
	const markers = [...source.matchAll(MARKER)];
	if (markers.length !== CODE_MODE_MANUAL_TOPIC_IDS.length) {
		throw new Error(
			`Expected ${CODE_MODE_MANUAL_TOPIC_IDS.length} code-mode manual topics; found ${markers.length}.`,
		);
	}

	const pages: CodeModeManualPage[] = [];
	const declarations = new Map<string, CodeModeDeclaration>();
	const seen = new Set<string>();
	for (let index = 0; index < markers.length; index++) {
		const marker = markers[index];
		const id = marker[1];
		const title = marker[2].trim();
		if (!isCodeModeManualTopicId(id))
			throw new Error(`Unknown code-mode manual topic: ${id}.`);
		if (seen.has(id))
			throw new Error(`Duplicate code-mode manual topic: ${id}.`);
		seen.add(id);

		const contentStart = (marker.index ?? 0) + marker[0].length;
		const contentEnd =
			index + 1 < markers.length
				? (markers[index + 1].index ?? source.length)
				: source.length;
		const rawContent = source.slice(contentStart, contentEnd);
		const content = rawContent.trim();
		if (content.length === 0)
			throw new Error(`Code-mode manual topic ${id} is empty.`);

		const text = `## Code-mode manual — ${title}\n\n${content}`;
		const bytes = Buffer.byteLength(text, "utf8");
		if (bytes > CODE_MODE_MANUAL_MAX_BYTES) {
			throw new Error(
				`Code-mode manual topic ${id} is ${bytes} bytes; maximum is ${CODE_MODE_MANUAL_MAX_BYTES}.`,
			);
		}
		pages.push({ id, title, content });
		for (const declaration of extractDeclarations(rawContent, id)) {
			addDeclaration(declarations, declaration);
		}
	}

	for (const id of CODE_MODE_MANUAL_TOPIC_IDS) {
		if (!seen.has(id))
			throw new Error(`Code-mode manual topic ${id} is missing.`);
	}
	return { pages, declarations };
}

function exactReferenceEntry(declaration: CodeModeDeclaration): string {
	return [
		`// ${declaration.name} — details: await man("code-mode/${declaration.topic}")`,
		declaration.source,
	].join("\n");
}

function onDemandReferenceEntry(
	name: string,
	declaration?: CodeModeDeclaration,
): string {
	return declaration
		? `// ${name} — exact declaration: await man("code-mode/${declaration.topic}")`
		: `// ${name} — runtime-registered tool; exact schema: await man("${name}")`;
}

function renderCompactReference(
	names: readonly string[],
	entries: ReadonlyMap<string, string>,
): string {
	return [
		"Code-mode declarations for this RLM's allowed surface:",
		"```typescript",
		...names.map((name) => entries.get(name) ?? ""),
		"```",
	].join("\n\n");
}

/**
 * Build a bounded RLM declaration reference from the same source as man().
 * Exact declarations are preferred. If a broad namespace set crosses the hard
 * ceiling, the largest blocks become explicit on-demand pointers; declarations
 * are never text-truncated into invalid TypeScript.
 */
export function buildCompactCodeModeReference(
	manual: CodeModeManual,
	allowedNames: Iterable<string>,
	maxBytes = CODE_MODE_COMPACT_REFERENCE_MAX_BYTES,
): string {
	if (!Number.isInteger(maxBytes) || maxBytes < 1) {
		throw new Error(
			"Code-mode compact reference maximum must be a positive integer.",
		);
	}
	const names = [...new Set(["man", ...allowedNames])];
	const entries = new Map<string, string>();
	for (const name of names) {
		const declaration = manual.declarations.get(name);
		entries.set(
			name,
			declaration
				? exactReferenceEntry(declaration)
				: onDemandReferenceEntry(name),
		);
	}

	let rendered = renderCompactReference(names, entries);
	if (Buffer.byteLength(rendered, "utf8") <= maxBytes) return rendered;

	const candidates = names
		.map((name) => {
			const declaration = manual.declarations.get(name);
			const exact = entries.get(name) ?? "";
			const fallback = onDemandReferenceEntry(name, declaration);
			return {
				name,
				declaration,
				exactBytes: Buffer.byteLength(exact, "utf8"),
				fallback,
			};
		})
		.filter(
			(candidate) =>
				candidate.declaration &&
				candidate.exactBytes > Buffer.byteLength(candidate.fallback, "utf8"),
		)
		.sort(
			(left, right) =>
				right.exactBytes - left.exactBytes ||
				left.name.localeCompare(right.name),
		);

	for (const candidate of candidates) {
		entries.set(candidate.name, candidate.fallback);
		rendered = renderCompactReference(names, entries);
		if (Buffer.byteLength(rendered, "utf8") <= maxBytes) return rendered;
	}

	throw new Error(
		`Code-mode compact reference cannot fit within ${maxBytes} bytes, even with on-demand declarations.`,
	);
}

/** Resolve the code-mode manual through the existing man() namespace. */
export function formatCodeModeManualPage(
	manual: CodeModeManual,
	name: string,
): string | undefined {
	if (name === "code-mode" || name === "code-mode/index") {
		const entries = manual.pages.map(
			(page) => `- \`code-mode/${page.id}\` — ${page.title}`,
		);
		return [
			"## Code-mode manual",
			"",
			'Read one bounded page with `man("code-mode/<topic>")`.',
			"",
			...entries,
		].join("\n");
	}

	if (!name.startsWith("code-mode/")) return undefined;
	const topic = name.slice("code-mode/".length);
	const page = manual.pages.find((candidate) => candidate.id === topic);
	return page
		? `## Code-mode manual — ${page.title}\n\n${page.content}`
		: undefined;
}

/** Keep the runtime composition boundary testable and byte-accountable. */
export function composeCodeModeSystemPrompt(
	baseSystemPrompt: string,
	instructions: string,
	toolReference: string,
): string {
	return [baseSystemPrompt, instructions, toolReference]
		.filter(Boolean)
		.join("\n\n");
}
