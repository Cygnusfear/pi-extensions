import { Buffer } from "node:buffer";

/** Maximum UTF-8 size of one on-demand prompt-manual response. */
export const PROMPT_MANUAL_MAX_BYTES = 14 * 1024;

export const PROMPT_MANUAL_TOPIC_IDS = [
	"workspace-status",
	"notifications-media",
	"memory-records",
	"shell",
	"planning",
	"production",
	"communication",
	"tickets",
] as const;

export type PromptManualTopicId = (typeof PROMPT_MANUAL_TOPIC_IDS)[number];
export type PromptManualTopic = "index" | PromptManualTopicId;

export interface PromptManualPage {
	readonly id: PromptManualTopicId;
	readonly title: string;
	readonly content: string;
}

export type PromptManualLookup =
	| { readonly ok: true; readonly text: string }
	| { readonly ok: false; readonly error: string };

const MARKER = /^<!-- prompt-manual: ([a-z-]+) \| (.+) -->$/gm;

function isPromptManualTopicId(value: string): value is PromptManualTopicId {
	return (PROMPT_MANUAL_TOPIC_IDS as readonly string[]).includes(value);
}

/**
 * Parse the versioned, marker-delimited manual. Markers deliberately make the
 * source structure explicit: an edited manual cannot silently omit, duplicate,
 * or oversize a topic.
 */
export function parsePromptManual(source: string): readonly PromptManualPage[] {
	const markers = [...source.matchAll(MARKER)];
	if (markers.length !== PROMPT_MANUAL_TOPIC_IDS.length) {
		throw new Error(
			`Expected ${PROMPT_MANUAL_TOPIC_IDS.length} prompt-manual topics; found ${markers.length}.`,
		);
	}

	const pages: PromptManualPage[] = [];
	const seen = new Set<string>();
	for (let index = 0; index < markers.length; index++) {
		const marker = markers[index];
		const id = marker[1];
		const title = marker[2].trim();
		if (!isPromptManualTopicId(id)) {
			throw new Error(`Unknown prompt-manual topic: ${id}.`);
		}
		if (seen.has(id)) throw new Error(`Duplicate prompt-manual topic: ${id}.`);
		seen.add(id);

		const contentStart = (marker.index ?? 0) + marker[0].length;
		const contentEnd = index + 1 < markers.length ? markers[index + 1].index ?? source.length : source.length;
		const content = source.slice(contentStart, contentEnd).trim();
		if (content.length === 0) throw new Error(`Prompt-manual topic ${id} is empty.`);

		const text = `## Prompt manual — ${title}\n\n${content}`;
		const bytes = Buffer.byteLength(text, "utf8");
		if (bytes > PROMPT_MANUAL_MAX_BYTES) {
			throw new Error(
				`Prompt-manual topic ${id} is ${bytes} bytes; maximum is ${PROMPT_MANUAL_MAX_BYTES}.`,
			);
		}
		pages.push({ id, title, content });
	}

	for (const id of PROMPT_MANUAL_TOPIC_IDS) {
		if (!seen.has(id)) throw new Error(`Prompt-manual topic ${id} is missing.`);
	}
	return pages;
}

export function lookupPromptManual(source: string, topic: string): PromptManualLookup {
	if (topic === "index") {
		try {
			const pages = parsePromptManual(source);
			const entries = pages.map((page) => `- \`${page.id}\` — ${page.title}`);
			return {
				ok: true,
				text: [
					"## Prompt manual",
					"",
					"Read one relevant bounded topic with `prompt_manual({ topic: \"<topic>\" })`.",
					"",
					...entries,
				].join("\n"),
			};
		} catch (error) {
			return { ok: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	if (!isPromptManualTopicId(topic)) {
		return {
			ok: false,
			error: `Unknown prompt-manual topic ${JSON.stringify(topic)}. Call prompt_manual({ topic: "index" }) first.`,
		};
	}

	try {
		const page = parsePromptManual(source).find((candidate) => candidate.id === topic);
		if (!page) return { ok: false, error: `Prompt-manual topic ${topic} is unavailable.` };
		return { ok: true, text: `## Prompt manual — ${page.title}\n\n${page.content}` };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}
