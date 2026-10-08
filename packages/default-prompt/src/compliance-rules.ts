/**
 * compliance-rules.ts
 *
 * Derives the compliance rule pack from the contract itself.
 *
 * The contract (prompts/default.md) is the single source of truth for what the
 * agent must do. This module slices it into IDed paragraphs so a classifier can
 * point at the exact paragraph an agent message violates, and so the rule pack
 * can never silently drift away from the text that is actually injected into
 * the agent's system prompt.
 *
 * Registration is explicit: every paragraph must be registered in
 * ./compliance-registry.ts as either checkable (with the phrasing that
 * describes a violation of it) or out of scope (with a reason). A paragraph
 * that is neither, or a registry entry that matches no paragraph, throws —
 * silently skipping a rule is the one failure mode this module exists to
 * prevent.
 */

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const HEADING_RE = /^#{1,6}\s+/;
const FENCE_RE = /^\s*```/;
const BULLET_RE = /^-\s+\S/;

/** One paragraph of the contract, addressable by a stable ordinal ID. */
export interface ContractParagraph {
	/** Positional rule ID, e.g. `P07`. Matches the ordinal in the contract. */
	readonly id: string;
	/** 1-based position among the contract's paragraphs. */
	readonly ordinal: number;
	/** Full paragraph text, whitespace-normalized. Used verbatim as classifier criteria. */
	readonly text: string;
	/** Short leading clause, used when citing the rule in a warning. */
	readonly label: string;
}

/** A paragraph the classifier can judge from an agent's user-facing message. */
export interface CheckableRule extends ContractParagraph {
	/** What the message does when it violates this paragraph. */
	readonly violation: string;
}

/** A paragraph the classifier must not judge from a user-facing message. */
export interface SkippedParagraph extends ContractParagraph {
	/** Why this paragraph is not message-checkable. */
	readonly reason: string;
}

export interface RulePack {
	readonly rules: readonly CheckableRule[];
	readonly skipped: readonly SkippedParagraph[];
}

/** How one contract paragraph is treated by the checker. */
export interface RuleRegistration {
	/** Present when checkable: the violation phrasing handed to the classifier. */
	readonly violation?: string;
	/** Present when not checkable: the reason it is out of scope. */
	readonly outOfScope?: string;
}

/** Every contract paragraph, keyed by {@link paragraphFingerprint}. */
export type RuleRegistry = Readonly<Record<string, RuleRegistration>>;

/** Length of the normalized prefix that identifies a paragraph across edits. */
export const FINGERPRINT_LENGTH = 48;

/**
 * Normalized identity of a paragraph: case-folded, whitespace-collapsed prefix.
 *
 * Stable when a paragraph is reordered or its tail is edited, and different for
 * every paragraph in the shipped contract (asserted by tests).
 */
export function paragraphFingerprint(
	text: string,
	length: number = FINGERPRINT_LENGTH,
): string {
	return text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, length);
}

/** `P01`, `P02`, … zero-padded so IDs sort and compare as text. */
export function formatRuleId(ordinal: number): string {
	return `P${String(ordinal).padStart(2, "0")}`;
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
 * Slice the contract into paragraphs.
 *
 * Blank lines separate paragraphs, except inside fenced code blocks, which stay
 * attached to the paragraph that introduces them. Headings and frontmatter are
 * structure, not rules, and are dropped.
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
		// Each top-level bullet is its own rule; the contract's prime directives
		// are a run of bullets with no blank lines between them.
		if (BULLET_RE.test(line)) {
			flush();
			current.push(line);
			continue;
		}
		current.push(line);
	}
	flush();

	return blocks.map((text, index) => ({
		id: formatRuleId(index + 1),
		ordinal: index + 1,
		text,
		label: buildRuleLabel(text),
	}));
}

/**
 * Pair every contract paragraph with its registration.
 *
 * Throws when a paragraph is unregistered, when a registration matches no
 * paragraph, or when a registration neither describes a violation nor an
 * out-of-scope reason. Tests call this against the shipped contract so drift
 * fails the build; the extension calls it inside a guard and stays silent
 * rather than checking against a half-known contract.
 */
export function buildRulePack(
	source: string,
	registry: RuleRegistry,
): RulePack {
	const paragraphs = parseContractParagraphs(source);
	const rules: CheckableRule[] = [];
	const skipped: SkippedParagraph[] = [];
	const consumed = new Set<string>();

	for (const paragraph of paragraphs) {
		const fingerprint = paragraphFingerprint(paragraph.text);
		const registration = registry[fingerprint];

		if (!registration) {
			throw new Error(
				`Contract paragraph ${paragraph.id} is unregistered: ${JSON.stringify(paragraph.text.slice(0, 80))}. Register it in compliance-registry.ts as checkable or out of scope.`,
			);
		}
		if (consumed.has(fingerprint)) {
			throw new Error(
				`Contract paragraphs share fingerprint ${JSON.stringify(fingerprint)}; they cannot be registered separately. Lengthen FINGERPRINT_LENGTH.`,
			);
		}
		consumed.add(fingerprint);

		const { violation, outOfScope } = registration;
		if (Boolean(violation) === Boolean(outOfScope)) {
			throw new Error(
				`Contract paragraph ${paragraph.id} must set exactly one of violation or outOfScope.`,
			);
		}

		if (violation) {
			rules.push({ ...paragraph, violation });
		} else {
			skipped.push({ ...paragraph, reason: outOfScope as string });
		}
	}

	for (const fingerprint of Object.keys(registry)) {
		if (!consumed.has(fingerprint)) {
			throw new Error(
				`Rule registration ${JSON.stringify(fingerprint)} matches no contract paragraph; it is stale.`,
			);
		}
	}

	if (rules.length === 0) {
		throw new Error("The rule pack has no checkable rules.");
	}

	return { rules, skipped };
}
