import { Buffer } from "node:buffer";

/** Maximum UTF-8 size of one on-demand code-mode manual page. */
export const CODE_MODE_MANUAL_MAX_BYTES = 14 * 1024;

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

export interface CodeModeManualPage {
	readonly id: CodeModeManualTopicId;
	readonly title: string;
	readonly content: string;
}

export interface CodeModeManual {
	readonly pages: readonly CodeModeManualPage[];
}

const MARKER = /^\/\/ @code-mode-manual ([a-z-]+) \| (.+)$/gm;

function isCodeModeManualTopicId(value: string): value is CodeModeManualTopicId {
	return (CODE_MODE_MANUAL_TOPIC_IDS as readonly string[]).includes(value);
}

/** Parse the single authoritative declarations document into bounded manual pages. */
export function buildCodeModeManual(source: string): CodeModeManual {
	const markers = [...source.matchAll(MARKER)];
	if (markers.length !== CODE_MODE_MANUAL_TOPIC_IDS.length) {
		throw new Error(
			`Expected ${CODE_MODE_MANUAL_TOPIC_IDS.length} code-mode manual topics; found ${markers.length}.`,
		);
	}

	const pages: CodeModeManualPage[] = [];
	const seen = new Set<string>();
	for (let index = 0; index < markers.length; index++) {
		const marker = markers[index];
		const id = marker[1];
		const title = marker[2].trim();
		if (!isCodeModeManualTopicId(id)) throw new Error(`Unknown code-mode manual topic: ${id}.`);
		if (seen.has(id)) throw new Error(`Duplicate code-mode manual topic: ${id}.`);
		seen.add(id);

		const contentStart = (marker.index ?? 0) + marker[0].length;
		const contentEnd = index + 1 < markers.length ? markers[index + 1].index ?? source.length : source.length;
		const content = source.slice(contentStart, contentEnd).trim();
		if (content.length === 0) throw new Error(`Code-mode manual topic ${id} is empty.`);

		const text = `## Code-mode manual — ${title}\n\n${content}`;
		const bytes = Buffer.byteLength(text, "utf8");
		if (bytes > CODE_MODE_MANUAL_MAX_BYTES) {
			throw new Error(
				`Code-mode manual topic ${id} is ${bytes} bytes; maximum is ${CODE_MODE_MANUAL_MAX_BYTES}.`,
			);
		}
		pages.push({ id, title, content });
	}

	for (const id of CODE_MODE_MANUAL_TOPIC_IDS) {
		if (!seen.has(id)) throw new Error(`Code-mode manual topic ${id} is missing.`);
	}
	return { pages };
}

/** Resolve the code-mode manual through the existing man() namespace. */
export function formatCodeModeManualPage(manual: CodeModeManual, name: string): string | undefined {
	if (name === "code-mode" || name === "code-mode/index") {
		const entries = manual.pages.map((page) => `- \`code-mode/${page.id}\` — ${page.title}`);
		return [
			"## Code-mode manual",
			"",
			"Read one bounded page with `man(\"code-mode/<topic>\")`.",
			"",
			...entries,
		].join("\n");
	}

	if (!name.startsWith("code-mode/")) return undefined;
	const topic = name.slice("code-mode/".length);
	const page = manual.pages.find((candidate) => candidate.id === topic);
	return page ? `## Code-mode manual — ${page.title}\n\n${page.content}` : undefined;
}

/** Keep the runtime composition boundary testable and byte-accountable. */
export function composeCodeModeSystemPrompt(
	baseSystemPrompt: string,
	instructions: string,
	toolReference: string,
): string {
	return [baseSystemPrompt, instructions, toolReference].filter(Boolean).join("\n\n");
}
