/**
 * compliance-rules.ts
 *
 * The contract is the rules. Every paragraph of prompts/default.md becomes one
 * rule whose criterion is derived from that paragraph's own words, so an edit
 * is in force on the next check with no code change and no restart.
 *
 * There is deliberately nothing else here: no list of what is judged, no
 * hand-written criteria, no exemptions. Anything of that kind would be a second
 * configuration that can disagree with the file the Hooman edits.
 */

import { createHash } from "node:crypto";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const HEADING_RE = /^#{1,6}\s+/;
const FENCE_RE = /^\s*```/;
const BULLET_RE = /^-\s+\S/;

/** One paragraph of the contract, addressable by a stable identity. */
export interface ContractParagraph {
	/**
	 * Stable rule identity: a hash of the paragraph's exact text.
	 *
	 * Positional IDs shift the moment a paragraph is inserted or removed, which
	 * silently re-attributes history and warnings. A hash does not: an edited
	 * paragraph is a different rule, and that is the honest reading.
	 */
	readonly id: string;
	/** 1-based position among the contract's paragraphs, for display only. */
	readonly ordinal: number;
	/** Full paragraph text, whitespace-normalized. Sent verbatim as the criterion. */
	readonly text: string;
	/** Short leading clause, used when citing the rule in a warning. */
	readonly label: string;
}

/** A rule: a paragraph plus the criterion the classifier is asked against. */
export interface CheckableRule extends ContractParagraph {
	/** What the message does when it breaks this paragraph. */
	readonly violation: string;
}

export interface RulePack {
	readonly rules: readonly CheckableRule[];
}

/** Stable 10-hex identity for a paragraph's text. */
export function paragraphHash(text: string): string {
	return createHash("sha256")
		.update(text.replace(/\s+/g, " ").trim())
		.digest("hex")
		.slice(0, 10);
}

/** Leading clause of a paragraph, cut on a word boundary. */
export function buildRuleLabel(text: string, max = 72): string {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= max) return normalized;
	const cut = normalized.slice(0, max);
	const boundary = cut.lastIndexOf(" ");
	return `${(boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * Criterion derived from a paragraph, so an edit needs no code change.
 *
 * Polarity-aware on purpose: these directives are written as prohibitions, so
 * the criterion describes doing the forbidden thing, and the paragraph's own
 * words travel with the question.
 */
export function violationCriterion(paragraph: ContractParagraph): string {
	return `The message does, advises, or proposes exactly what this paragraph forbids, or fails the standard it sets: "${paragraph.text}"`;
}

/**
 * Slice the contract into paragraphs.
 *
 * Blank lines separate paragraphs, except inside fenced code blocks, which stay
 * attached to the paragraph that introduces them. Each top-level bullet is its
 * own rule. Headings and frontmatter are structure, not rules.
 */
export function parseContractParagraphs(
	source: string,
): readonly ContractParagraph[] {
	const body = source.replace(FRONTMATTER_RE, "");
	const blocks: string[] = [];
	let current: string[] = [];
	let inFence = false;

	const flush = (): void => {
		const text = current.join("\n").replace(/\s+/g, " ").trim();
		if (text.length > 0) blocks.push(text);
		current = [];
	};

	for (const line of body.split(/\r?\n/)) {
		if (FENCE_RE.test(line)) {
			inFence = !inFence;
			current.push(line);
			continue;
		}
		if (inFence) {
			current.push(line);
			continue;
		}
		if (HEADING_RE.test(line) || line.trim().length === 0) {
			flush();
			continue;
		}
		if (BULLET_RE.test(line)) {
			flush();
			current.push(line);
			continue;
		}
		current.push(line);
	}
	flush();

	const seen = new Set<string>();
	const paragraphs: ContractParagraph[] = [];
	for (const [index, text] of blocks.entries()) {
		const id = paragraphHash(text);
		if (seen.has(id)) continue;
		seen.add(id);
		paragraphs.push({
			id,
			ordinal: index + 1,
			text,
			label: buildRuleLabel(text),
		});
	}
	return paragraphs;
}

/**
 * Build the pack from the contract as it stands right now.
 *
 * Every paragraph is a rule; the criterion is derived from the paragraph. Call
 * this again when the file changes and the rules follow.
 */
export function buildRulePack(source: string): RulePack {
	const rules = parseContractParagraphs(source).map((paragraph) => ({
		...paragraph,
		violation: violationCriterion(paragraph),
	}));
	if (rules.length === 0) {
		throw new Error("The contract has no paragraphs to judge.");
	}
	return { rules };
}
