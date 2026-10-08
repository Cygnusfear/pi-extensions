/**
 * compliance-stats.ts
 *
 * Which rules fire, on which model, and which never fire at all.
 *
 * Every completed check appends one observation — the models involved, the rule
 * IDs that fired, and the cost. Message text is never written: the log is
 * aggregate evidence, not a transcript. A daily report turns that log into the
 * redundancy signal: rules that are hit constantly in one model's hand, and
 * rules that no message has tripped.
 *
 * A rule that never fires is a candidate to re-read, not a candidate to delete:
 * a rule can be doing its job by preventing the behaviour it names. The report
 * says so where the numbers are shown.
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Directory holding observations and generated reports.
 *
 * Resolved per call so a session can redirect it (PI_COMPLIANCE_STATE_DIR) and
 * so tests never write into the live state directory.
 */
export function complianceStateDir(): string {
	return (
		process.env.PI_COMPLIANCE_STATE_DIR ??
		path.join(os.homedir(), ".pi", "agent", "compliance")
	);
}

/** Append-only observation log. */
export function observationsFile(): string {
	return path.join(complianceStateDir(), "observations.jsonl");
}

/** Log is rotated past this size, keeping one previous file. */
export const OBSERVATIONS_MAX_BYTES = 4 * 1024 * 1024;

/** One completed check. */
export interface ComplianceObservation {
	/** Epoch milliseconds. */
	readonly ts: number;
	/** Model that wrote the message, as `provider/id`. */
	readonly model: string;
	/** Classifier that judged it, as `provider/id`. */
	readonly classifier: string;
	/** False when the classifier failed; the check is counted, the verdict is not. */
	readonly ok: boolean;
	/** Rules at or above the threshold, with their probabilities. */
	readonly fired: readonly { readonly id: string; readonly p: number }[];
	/** Rule IDs actually warned about. */
	readonly cited: readonly string[];
	/** Provider-reported cost for this check. */
	readonly cost: number;
}

export interface ModelStats {
	readonly model: string;
	readonly checks: number;
	/** Checks with at least one rule at or above the threshold. */
	readonly flagged: number;
	readonly cost: number;
	/** Rule ID to times fired, descending by count when rendered. */
	readonly ruleHits: Readonly<Record<string, number>>;
}

export interface ComplianceStats {
	readonly checks: number;
	readonly failures: number;
	readonly cost: number;
	readonly models: readonly ModelStats[];
	/** Rule ID to times fired across every model. */
	readonly ruleHits: Readonly<Record<string, number>>;
	/** Rule ID to model to times fired. */
	readonly ruleHitsByModel: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

function increment(
	counts: Record<string, number>,
	key: string,
	by = 1,
): void {
	counts[key] = (counts[key] ?? 0) + by;
}

/** Aggregate observations newer than `sinceMs` into per-model and per-rule counts. */
export function aggregateObservations(
	observations: readonly ComplianceObservation[],
	sinceMs: number,
): ComplianceStats {
	const perModel = new Map<
		string,
		{ checks: number; flagged: number; cost: number; ruleHits: Record<string, number> }
	>();
	const ruleHits: Record<string, number> = {};
	const ruleHitsByModel: Record<string, Record<string, number>> = {};
	let checks = 0;
	let failures = 0;
	let cost = 0;

	for (const observation of observations) {
		if (observation.ts < sinceMs) continue;
		const entry = perModel.get(observation.model) ?? {
			checks: 0,
			flagged: 0,
			cost: 0,
			ruleHits: {},
		};
		perModel.set(observation.model, entry);
		entry.cost += observation.cost;
		cost += observation.cost;

		if (!observation.ok) {
			failures += 1;
			continue;
		}

		checks += 1;
		entry.checks += 1;
		ruleHitsByModel[observation.model] ??= {};
		const fired = new Set(observation.fired.map((violation) => violation.id));
		if (fired.size > 0) entry.flagged += 1;
		for (const id of fired) {
			increment(entry.ruleHits, id);
			increment(ruleHits, id);
			increment(ruleHitsByModel[observation.model], id);
		}
	}

	const models = [...perModel.entries()]
		.map(([model, entry]) => ({ model, ...entry }))
		.sort((left, right) => right.checks - left.checks);

	return { checks, failures, cost, models, ruleHits, ruleHitsByModel };
}

/** Rule IDs from `allRuleIds` with no hit in the window. */
export function neverHitRules(
	stats: ComplianceStats,
	allRuleIds: readonly string[],
): readonly string[] {
	return allRuleIds.filter((id) => (stats.ruleHits[id] ?? 0) === 0);
}

function percent(part: number, total: number): string {
	if (total === 0) return "0%";
	return `${((part / total) * 100).toFixed(1)}%`;
}

/** Biggest rule counts first, stable on ties. */
export function topRuleHits(
	stats: ComplianceStats,
	limit: number,
): readonly (readonly [string, number])[] {
	return Object.entries(stats.ruleHits)
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.slice(0, limit);
}

function rankedHits(hits: Readonly<Record<string, number>>, limit: number): string[] {
	return Object.entries(hits)
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.slice(0, limit)
		.map(([id, count]) => `${id} (${count})`);
}

/**
 * Human-readable daily report.
 *
 * `ruleLabels` maps rule IDs to the contract paragraph's leading clause so the
 * report names rules the way the contract does.
 */
export function renderDailyReport(
	stats: ComplianceStats,
	allRuleIds: readonly string[],
	ruleLabels: Readonly<Record<string, string>>,
	options: { readonly days: number; readonly generatedAt: number; readonly topRules?: number },
): string {
	const top = options.topRules ?? 5;
	const label = (id: string): string => ruleLabels[id] ?? id;
	const never = neverHitRules(stats, allRuleIds);
	const lines: string[] = [
		`# Contract compliance — last ${options.days === 1 ? "24 hours" : `${options.days} days`}`,
		"",
		`Generated ${new Date(options.generatedAt).toISOString()} · ${stats.checks} checks · ${stats.models.length} model${stats.models.length === 1 ? "" : "s"} · $${stats.cost.toFixed(4)}${stats.failures > 0 ? ` · ${stats.failures} classifier failures` : ""}`,
		"",
		"## Most fired rules",
		"",
	];
	const topRules = topRuleHits(stats, top);
	if (topRules.length === 0) {
		lines.push("No rule fired in this window.", "");
	} else {
		for (const [id, count] of topRules) {
			const perModel = Object.entries(stats.ruleHitsByModel)
				.map(([model, hits]) => ({ model, count: hits[id] ?? 0 }))
				.filter((entry) => entry.count > 0)
				.sort((left, right) => right.count - left.count)
				.map((entry) => `${entry.model} ${entry.count}`)
				.join(", ");
			lines.push(
				`- **${id}** — ${label(id)}: ${count} hits (${percent(count, stats.checks)} of checks) across ${perModel}`,
			);
		}
		lines.push("");
	}

	lines.push("## Per model", "");
	if (stats.models.length === 0) {
		lines.push("No checks in this window.", "");
	}
	for (const model of stats.models) {
		const modelTop = rankedHits(model.ruleHits, top);
		const modelNever = allRuleIds.filter((id) => (model.ruleHits[id] ?? 0) === 0).length;
		lines.push(
			`### ${model.model} — ${model.checks} checks, ${model.flagged} flagged, ${model.cost.toFixed(4)}`,
			"",
			modelTop.length > 0 ? `Fired: ${modelTop.join(", ")}` : "Fired: nothing",
			`Never fired here: ${modelNever} of ${allRuleIds.length} rules`,
			"",
		);
	}

	lines.push(
		"## Rules never fired anywhere",
		"",
		never.length === 0
			? "Every rule fired at least once in this window."
			: `${never.length} of ${allRuleIds.length}: ${never.join(", ")}`,
		"",
		"> A rule that never fires is a candidate to re-read, not to delete. It may be",
		"> doing its job by preventing the behaviour it names. Check it against a model",
		"> that is prone to the behaviour before calling it redundant.",
		"",
		`Observations: ${observationsFile()}`,
		"",
	);
	return lines.join("\n");
}

/** Read the observation log, skipping lines that do not parse. */
export function parseObservations(text: string): readonly ComplianceObservation[] {
	const observations: ComplianceObservation[] = [];
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		try {
			const parsed = JSON.parse(trimmed) as ComplianceObservation;
			if (typeof parsed?.ts === "number" && typeof parsed?.model === "string") {
				observations.push({
					ts: parsed.ts,
					model: parsed.model,
					classifier: parsed.classifier ?? "",
					ok: parsed.ok !== false,
					fired: Array.isArray(parsed.fired) ? parsed.fired : [],
					cited: Array.isArray(parsed.cited) ? parsed.cited : [],
					cost: typeof parsed.cost === "number" ? parsed.cost : 0,
				});
			}
		} catch {
			// A truncated tail from an interrupted write is not worth failing a report.
		}
	}
	return observations;
}

/** Append one observation, rotating the log when it grows past the cap. */
export async function appendObservation(
	observation: ComplianceObservation,
	file: string = observationsFile(),
): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true });
	try {
		const stat = await fs.stat(file);
		if (stat.size > OBSERVATIONS_MAX_BYTES) {
			await fs.rename(file, `${file}.1`).catch(() => undefined);
		}
	} catch {
		// No log yet.
	}
	await fs.appendFile(file, `${JSON.stringify(observation)}\n`, "utf8");
}

/** Observations from the log, newest window only. Missing file reads as empty. */
export async function readObservations(
	file: string = observationsFile(),
): Promise<readonly ComplianceObservation[]> {
	if (!existsSync(file)) return [];
	const text = await fs.readFile(file, "utf8");
	return parseObservations(text);
}

/** Path of the report for a day, used to keep the daily report to one per day. */
export function reportPath(day: Date, dir: string = complianceStateDir()): string {
	return path.join(dir, `report-${day.toISOString().slice(0, 10)}.md`);
}

/** Write a report file and return its path. */
export async function writeReport(
	content: string,
	day: Date,
	dir: string = complianceStateDir(),
): Promise<string> {
	await fs.mkdir(dir, { recursive: true });
	const target = reportPath(day, dir);
	await fs.writeFile(target, content, "utf8");
	return target;
}
