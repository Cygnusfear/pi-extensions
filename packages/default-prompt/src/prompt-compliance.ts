export interface Violation {
	readonly id: string;
	readonly label: string;
	readonly probability: number;
	readonly violation: string;
}

/**
 * Tools that publish the agent's words to the Hooman instead of putting them in
 * the message body. In this environment an agent often speaks through
 * `explain` rather than writing prose directly, and the words it authored are
 * still what the contract governs.
 */
export const COMMUNICATION_TOOLS = [
	"explain",
	"notify",
	"mesh_tell",
	"mesh_chat",
	"mesh_broadcast",
	"mesh_interrupt",
] as const;

const COMMUNICATION_TEXT_FIELDS = [
	"text",
	"message",
	"content",
	"body",
	"subject",
] as const;

/** Words inside one argument, including the bridge's structured message form. */
function textFromValue(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (!value || typeof value !== "object") return "";
	const record = value as Record<string, unknown>;
	const parts: string[] = [];
	for (const field of ["subject", "text", "message", "body", "content"]) {
		const inner = record[field];
		if (typeof inner === "string" && inner.trim().length > 0) parts.push(inner.trim());
	}
	return parts.join(" — ");
}

function toolCallText(block: { name?: unknown; arguments?: unknown }): string {
	const name = typeof block.name === "string" ? block.name : "";
	if (!(COMMUNICATION_TOOLS as readonly string[]).includes(name)) return "";
	const args = block.arguments;
	if (!args || typeof args !== "object") return "";
	for (const field of COMMUNICATION_TEXT_FIELDS) {
		const text = textFromValue((args as Record<string, unknown>)[field]);
		if (text.length > 0) return text;
	}
	return "";
}

/**
 * prompt-compliance.ts
 *
 * Engine behind the compliance checker: turn a contract paragraph pack into
 * classifier questions, read the answers back as violations, and render a
 * warning the agent can act on.
 *
 * Everything here is pure so the behaviour that matters — which rules are
 * asked, which answers count as violations, what the agent is told, how often
 * it is told — is decided without a provider in the loop.
 */

import type { CheckableRule } from "./compliance-rules.ts";

/** The classifier the checker asks. Output cost is zero; input is billed per token. */
export const COMPLIANCE_CLASSIFIER = {
	provider: "openrouter",
	id: "perplexity/pplx-decider-v1.1-27b",
} as const;

/**
 * Complete descriptor for the classifier, used when the session's registry
 * cannot hand the catalog entry back.
 *
 * \`classify\` asserts the model type before dispatching, so a bare
 * \`{ provider, id }\` is rejected as "not a classifier model" on hosts that skip
 * the catalog lookup. This mirrors the registered catalog entry, verified
 * against the live catalog; the registry lookup is still tried first so the
 * entry stays authoritative when it is reachable.
 */
export const COMPLIANCE_CLASSIFIER_DESCRIPTOR = {
	...COMPLIANCE_CLASSIFIER,
	type: "classifier",
	api: "typesafe-system-one",
	baseUrl: "https://openrouter.ai/api/v1",
};


/**
 * Probability at or above which an answer counts as a violation.
 *
 * Measured on the fixture set in compliance-fixtures.ts against the shipped
 * rule pack: the planted violations scored 0.99+, while messages with nothing
 * to report stayed below 0.5 for every rule except one absence-shaped rule that
 * has since moved out of scope. 0.9 keeps every planted violation and leaves no
 * verdict on the clean fixtures; \`/compliance threshold\` moves it at runtime.
 */
export const COMPLIANCE_VIOLATION_THRESHOLD = 0.9;

/** Longest agent message sent to the classifier. */
export const MAX_AGENT_MESSAGE_CHARS = 8 * 1024;

/** Longest hooman request sent with it, for tone and scope questions. */
export const MAX_HOOMAN_REQUEST_CHARS = 2 * 1024;

/** Turns a rule stays quiet after it was cited. */
export const RULE_COOLDOWN_TURNS = 12;

/** Warnings this session may emit before it stops warning entirely. */
export const SESSION_WARNING_BUDGET = 40;

export type ClassifierQuestion =
	| {
			readonly type: "bool";
			readonly instructions: string;
			readonly criteria: { readonly true: string; readonly false: string };
	  }
	| {
			readonly type: "choice";
			readonly instructions: string;
			readonly criteria: Readonly<Record<string, string>>;
	  }
	| {
			readonly type: "score";
			readonly instructions: string;
			readonly criteria: readonly string[];
	  };

export interface ClassifierContext {
	readonly state: Record<string, unknown>;
	readonly questions: Readonly<Record<string, ClassifierQuestion>>;
}

export interface ClassifierAnswer {
	readonly type?: string;
	readonly probability?: number;
	readonly label?: string;
	readonly score?: number;
}

/** Only the fields the checker reads; provider errors are reported, not thrown. */
export interface ClassifierResult {
	readonly answers?: Readonly<Record<string, ClassifierAnswer>>;
	readonly stopReason?: string;
	readonly errorMessage?: string;
	/** Provider-reported usage, billed to the session. */
	readonly usage?: {
		readonly input?: number;
		readonly cost?: { readonly total?: number };
	};
}

export interface ClassifierModelRef {
	readonly provider: string;
	readonly id: string;
}

/** Where a usable classifier entry came from, for diagnostics. */
export type ClassifierSource =
	| "findOfType"
	| "getModelOfType"
	| "getAvailableOfType"
	| "descriptor"
	| "none";

export interface ResolvedClassifier {
	readonly model: unknown;
	readonly source: ClassifierSource;
}

/** The classifier capability an extension host may expose. */
export interface ClassifierHost {
	classify(
		model: unknown,
		context: ClassifierContext,
		options?: { readonly signal?: AbortSignal },
	): Promise<ClassifierResult>;
	/**
	 * Resolve the catalog entry for a classifier.
	 *
	 * A bare \`{ provider, id }\` is not enough for every host: this one validates
	 * the entry and answers "not a classifier model" when the lookup misses. The
	 * resolver tries every lookup the host offers and reports which one worked.
	 */
	resolveClassifier?(ref: ClassifierModelRef): Promise<ResolvedClassifier>;
}

/**
 * Reach the classifier through the session's model registry.
 *
 * Extensions in this repo are pinned to a pi version whose types predate
 * classifiers, so the capability is probed structurally and reported as absent
 * rather than assumed. A host without it leaves the checker switched off.
 */
export function resolveClassifierHost(registry: unknown): ClassifierHost | null {
	if (!registry || typeof registry !== "object") return null;
	const candidate = registry as Record<string, unknown>;
	if (typeof candidate.classify !== "function") return null;
	const classify = candidate.classify as ClassifierHost["classify"];

	const call = (method: string, ...args: unknown[]): unknown => {
		const fn = candidate[method];
		if (typeof fn !== "function") return undefined;
		return (fn as (...inner: unknown[]) => unknown).call(registry, ...args);
	};

	return {
		classify: (model, context, options) =>
			classify.call(registry, model, context, options),
		resolveClassifier: async (ref) => {
			for (const method of ["findOfType", "getModelOfType"] as const) {
				try {
					const found = call(method, "classifier", ref.provider, ref.id);
					if (found) return { model: found, source: method };
				} catch {
					// Fall through to the next lookup.
				}
			}
			try {
				const list = (await call("getAvailableOfType", "classifier", ref.provider)) as
					| readonly { id?: unknown }[]
					| undefined;
				const found = list?.find((entry) => entry?.id === ref.id);
				if (found) return { model: found, source: "getAvailableOfType" };
			} catch {
				// Fall through to the bare reference.
			}
			return { model: COMPLIANCE_CLASSIFIER_DESCRIPTOR, source: "descriptor" };
		},
	};
}

function textOfContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (!block || typeof block !== "object") continue;
		const candidate = block as {
			type?: unknown;
			text?: unknown;
			name?: unknown;
			arguments?: unknown;
		};
		if (candidate.type === "text" && typeof candidate.text === "string") {
			parts.push(candidate.text);
			continue;
		}
		if (candidate.type === "toolCall") {
			const published = toolCallText(candidate);
			if (published.length > 0) parts.push(published);
		}
	}
	return parts.join("\n\n");
}

function truncated(text: string, limit: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= limit) return trimmed;
	return `${trimmed.slice(0, limit)}\n…[truncated]`;
}

/**
 * Text of an assistant message, or an empty string when the message carries
 * none. User and tool messages are not agent speech and are refused.
 */
export function extractAgentMessage(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const candidate = message as { role?: unknown; content?: unknown };
	if (candidate.role !== "assistant") return "";
	return textOfContent(candidate.content).trim();
}

/**
 * The agent's words for this turn.
 *
 * A turn frequently ends on a tool call - \`done\`, a ticket write, a render -
 * with the agent's actual message to the Hooman sent earlier in the same turn.
 * Judging only the final message would skip exactly those turns, so when the
 * final message carries no text this walks back to the last assistant message
 * with text, stopping at the Hooman's own message that opened the turn.
 */
export function agentTurnText(message: unknown, transcript: unknown): string {
	const direct = extractAgentMessage(message);
	if (direct.length > 0) return direct;
	if (!Array.isArray(transcript)) return "";
	for (let index = transcript.length - 1; index >= 0; index--) {
		const candidate = transcript[index];
		if (!candidate || typeof candidate !== "object") continue;
		const role = (candidate as { role?: unknown }).role;
		// Only the agent's own output belongs to this turn. Anything addressed to
		// the agent - the Hooman, a steer, a system note - ends the search, so the
		// words of an earlier turn are never re-judged at a later boundary.
		if (role !== "assistant" && role !== "toolResult") break;
		const text = extractAgentMessage(candidate);
		if (text.length > 0) return text;
	}
	return "";
}

/** Cheap identity for a piece of text, so the same words are not judged twice. */
export function textFingerprint(text: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index++) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return `${text.length}:${(hash >>> 0).toString(16)}`;
}

/** Text of the most recent message with the given role, oldest-to-newest scan. */
export function findLastMessageText(
	messages: unknown,
	role: string,
): string {
	if (!Array.isArray(messages)) return "";
	for (let index = messages.length - 1; index >= 0; index--) {
		const candidate = messages[index];
		if (!candidate || typeof candidate !== "object") continue;
		const record = candidate as { role?: unknown; content?: unknown };
		if (record.role !== role) continue;
		const text = textOfContent(record.content).trim();
		if (text.length > 0) return text;
	}
	return "";
}

/** One bool question per checkable rule, keyed by rule ID. */
export function buildQuestions(
	rules: readonly CheckableRule[],
): Record<string, ClassifierQuestion> {
	const questions: Record<string, ClassifierQuestion> = {};
	for (const rule of rules) {
		questions[rule.id] = {
			type: "bool",
			instructions: `Does the agent message violate this contract rule? Rule: "${rule.text}"`,
			criteria: {
				true: rule.violation,
				false: "The message does not do this; nothing in it matches the description.",
			},
		};
	}
	return questions;
}

/** The bounded, secret-free view of the turn handed to the classifier. */
export function buildClassifierState(
	agentMessage: string,
	hoomanRequest: string,
	turnIndex: number,
): Record<string, unknown> {
	return {
		turn_index: turnIndex,
		agent_message_to_hooman: truncated(agentMessage, MAX_AGENT_MESSAGE_CHARS),
		hooman_request_being_answered: truncated(
			hoomanRequest,
			MAX_HOOMAN_REQUEST_CHARS,
		),
	};
}

/**
 * Violations an answer set reports, strongest first.
 *
 * A provider error yields nothing: the checker never invents a violation and
 * never blocks a turn because a classifier was unavailable. Rules that share
 * one violation phrasing collapse to a single citation, so a contract that
 * states the same rule twice does not warn twice.
 */
export function selectViolations(
	result: ClassifierResult | null | undefined,
	rules: readonly CheckableRule[],
	threshold: number = COMPLIANCE_VIOLATION_THRESHOLD,
): readonly Violation[] {
	if (!result) return [];
	if (result.errorMessage || result.stopReason === "error") return [];
	const answers = result.answers;
	if (!answers) return [];

	const hits: Violation[] = [];
	for (const rule of rules) {
		const answer = answers[rule.id];
		if (!answer || typeof answer.probability !== "number") continue;
		if (answer.probability < threshold) continue;
		hits.push({
			id: rule.id,
			label: rule.label,
			probability: answer.probability,
			violation: rule.violation,
		});
	}
	hits.sort((left, right) => right.probability - left.probability);

	const seen = new Set<string>();
	return hits.filter((hit) => {
		if (seen.has(hit.violation)) return false;
		seen.add(hit.violation);
		return true;
	});
}

/** The steer message the agent receives. Short on purpose: it stays in context. */
export function formatWarning(violations: readonly Violation[]): string {
	const citations = violations
		.map((violation) => `- ${violation.id} — ${violation.label}`)
		.join("\n");
	return [
		"⚠️ Default-prompt contract check — your message to the Hooman may violate:",
		citations,
		"Re-read those paragraphs in your instructions and self-correct. No acknowledgement needed.",
	].join("\n");
}

/**
 * Rate limiting for warnings.
 *
 * A checker that nags is a quota leak: every warning is permanent context. A
 * rule stays quiet for {@link RULE_COOLDOWN_TURNS} turns after it is cited, and
 * the session stops warning after {@link SESSION_WARNING_BUDGET} warnings.
 */
export class ComplianceCooldown {
	private readonly lastCited = new Map<string, number>();
	private warnings = 0;

	constructor(
		private readonly ruleCooldownTurns: number = RULE_COOLDOWN_TURNS,
		private readonly sessionWarningBudget: number = SESSION_WARNING_BUDGET,
	) {}

	/** Violations worth warning about now; the returned ones are recorded. */
	select(turnIndex: number, violations: readonly Violation[]): readonly Violation[] {
		if (this.warnings >= this.sessionWarningBudget) return [];
		const allowed = violations.filter((violation) => {
			const last = this.lastCited.get(violation.id);
			return last === undefined || turnIndex - last >= this.ruleCooldownTurns;
		});
		if (allowed.length === 0) return [];
		this.warnings += 1;
		for (const violation of allowed) this.lastCited.set(violation.id, turnIndex);
		return allowed;
	}

	get warningCount(): number {
		return this.warnings;
	}
}

/** Rules a fixture names, resolved to their current IDs; \`unmatched\` means the fixture is stale. */
export interface FixtureResolution {
	readonly ids: readonly string[];
	readonly unmatched: readonly string[];
}

/**
 * Resolve a fixture's expected rules by contract text.
 *
 * Fixtures name rules by a substring of the paragraph, never by ordinal: the
 * contract is edited often and every insertion renumbers the paragraphs after
 * it, which would silently turn a measurement into a lie.
 */
export function resolveFixtureRules(
	rules: readonly CheckableRule[],
	expectRules: readonly string[],
): FixtureResolution {
	const ids: string[] = [];
	const unmatched: string[] = [];
	for (const needle of expectRules) {
		const matches = rules.filter((rule) => rule.text.includes(needle));
		if (matches.length === 1) ids.push(matches[0].id);
		else unmatched.push(needle);
	}
	return { ids, unmatched };
}

/** One fixture's result in a calibration run. */
export interface CalibrationEntry {
	readonly fixture: string;
	readonly expected: readonly string[];
	readonly fired: readonly string[];
	readonly missed: readonly string[];
	readonly adjacent: readonly string[];
	readonly unmatched: readonly string[];
	readonly failed: boolean;
}

export interface CalibrationReport {
	readonly entries: readonly CalibrationEntry[];
	readonly plantedCaught: number;
	readonly plantedTotal: number;
	readonly cleanFlagged: number;
	readonly cleanTotal: number;
	readonly adjacentCitations: number;
	readonly failures: number;
	readonly cost: number;
}

export interface CalibrationRun {
	readonly name: string;
	readonly expectRules: readonly string[];
	readonly result: ClassifierResult | null | undefined;
	readonly cost: number;
}

/** Score fixture runs against the pack: recall, false positives, adjacent citations. */
export function evaluateCalibration(
	runs: readonly CalibrationRun[],
	rules: readonly CheckableRule[],
	threshold: number = COMPLIANCE_VIOLATION_THRESHOLD,
): CalibrationReport {
	const entries: CalibrationEntry[] = runs.map((run) => {
		const resolution = resolveFixtureRules(rules, run.expectRules);
		const fired = selectViolations(run.result, rules, threshold).map((violation) => violation.id);
		const failed = Boolean(run.result?.errorMessage) || run.result?.stopReason === "error";
		return {
			fixture: run.name,
			expected: resolution.ids,
			fired: failed ? [] : fired,
			missed: resolution.ids.filter((id) => !fired.includes(id)),
			adjacent: fired.filter((id) => !resolution.ids.includes(id)),
			unmatched: resolution.unmatched,
			failed,
		};
	});

	const planted = entries.filter((entry) => entry.expected.length > 0);
	const clean = entries.filter((entry) => entry.expected.length === 0 && entry.unmatched.length === 0);
	return {
		entries,
		plantedCaught: planted.filter((entry) => entry.missed.length === 0).length,
		plantedTotal: planted.length,
		cleanFlagged: clean.filter((entry) => entry.fired.length > 0).length,
		cleanTotal: clean.length,
		adjacentCitations: entries.reduce((total, entry) => total + entry.adjacent.length, 0),
		failures: entries.filter((entry) => entry.failed || entry.unmatched.length > 0).length,
		cost: runs.reduce((total, run) => total + run.cost, 0),
	};
}
