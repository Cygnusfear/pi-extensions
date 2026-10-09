/**
 * prompt-compliance.ts (extension)
 *
 * Classifies the agent's message to the Hooman against the paragraphs of the
 * contract in prompts/default.md and steers a warning back when the message
 * looks like it violates one.
 *
 * The warning is a steer, not a block: it lands at the agent's next reasoning
 * step so the agent can correct itself. Nothing here can fail a turn — a
 * missing classifier, a provider error, or a contract that no longer matches
 * the registry leaves the checker silent and the session untouched.
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildRulePack, type RulePack } from "../src/compliance-rules.ts";
import { COMPLIANCE_FIXTURES } from "../src/compliance-fixtures.ts";
import {
	aggregateObservations,
	appendObservation,
	complianceStateDir,
	neverHitRules,
	readObservations,
	renderDailyReport,
	reportPath,
	writeReport,
} from "../src/compliance-stats.ts";
import {
	buildClassifierState,
	buildQuestions,
	COMPLIANCE_CLASSIFIER,
	COMPLIANCE_VIOLATION_THRESHOLD,
	ComplianceCooldown,
	agentTurnText,
	evaluateCalibration,
	extractAgentMessage,
	findLastMessageText,
	textFingerprint,
	formatWarning,
	resolveClassifierHost,
	selectViolations,
	type ClassifierQuestion,
	type Violation,
} from "../src/prompt-compliance.ts";

/** Bounded wait for one classification; a hung provider must not leak a promise per turn. */
const CLASSIFIER_TIMEOUT_MS = 15_000;

/**
 * Key holding the teardown of the live registration.
 *
 * A reload must replace the checker, never stack a second copy of it: two
 * copies would classify every message twice, warn twice, and double the spend.
 */
const REGISTRATION_KEY = "__piPromptComplianceTeardown";

/** Verdicts kept for `/compliance audit`. */
const AUDIT_LIMIT = 20;

/**
 * One small file, overwritten at every turn boundary, recording what the
 * checker saw and what it decided.
 *
 * When a session produces no checks, this is the difference between "the
 * extension never loaded" and "it ran and skipped for this reason".
 */
function writeDiagnostics(record: Record<string, unknown>): void {
	void fs
		.mkdir(complianceStateDir(), { recursive: true })
		.then(() =>
			fs.writeFile(
				path.join(complianceStateDir(), `last-check-${process.pid}.json`),
				JSON.stringify({ ...record, pid: process.pid }, null, 2),
				"utf8",
			),
		)
		.catch(() => undefined);
}

interface AuditRecord {
	readonly turnIndex: number;
	readonly messageChars: number;
	readonly candidates: readonly Violation[];
	readonly cited: readonly string[];
	readonly note: string;
}

function readMessages(event: unknown): unknown[] {
	if (!event || typeof event !== "object") return [];
	const context = (event as { context?: unknown }).context;
	if (!context || typeof context !== "object") return [];
	const candidate = context as { contextMessages?: unknown; llmMessages?: unknown };
	if (Array.isArray(candidate.llmMessages)) return candidate.llmMessages;
	if (Array.isArray(candidate.contextMessages)) return candidate.contextMessages;
	return [];
}

function boundedSignal(signal: AbortSignal | undefined): AbortSignal | undefined {
	const timeout = AbortSignal.timeout?.(CLASSIFIER_TIMEOUT_MS);
	if (!timeout) return signal;
	if (!signal) return timeout;
	const any = (AbortSignal as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
	return any ? any([signal, timeout]) : signal;
}

/**
 * The model that wrote the message, for per-model hit tracking.
 *
 * Read from the message itself — an assistant message carries the provider and
 * model that produced it — because the session's current model is not
 * guaranteed to be set at a turn boundary.
 */
function agentModelId(message: unknown, ctx: unknown): string {
	if (message && typeof message === "object") {
		const candidate = message as { provider?: unknown; model?: unknown };
		if (
			typeof candidate.provider === "string" &&
			typeof candidate.model === "string"
		) {
			return `${candidate.provider}/${candidate.model}`;
		}
	}
	const sessionModel = (ctx as { model?: { provider?: unknown; id?: unknown } }).model;
	if (
		sessionModel &&
		typeof sessionModel.provider === "string" &&
		typeof sessionModel.id === "string"
	) {
		return `${sessionModel.provider}/${sessionModel.id}`;
	}
	return "unknown";
}

export default function promptComplianceExtension(pi: ExtensionAPI) {
	const lifecycle: Record<string, unknown> = { pid: process.pid, key: REGISTRATION_KEY };
	const previous = (globalThis as Record<string, unknown>)[REGISTRATION_KEY];
	lifecycle.previousFound = typeof previous === "function";
	if (typeof previous === "function") {
		try {
			(previous as () => void)();
			lifecycle.tornDown = true;
		} catch {
			lifecycle.tornDown = false;
		}
	}
	void fs
		.mkdir(complianceStateDir(), { recursive: true })
		.then(() =>
			fs.appendFile(
				path.join(complianceStateDir(), "registrations.jsonl"),
				`${JSON.stringify({ ...lifecycle, ts: Date.now() })}\n`,
				"utf8",
			),
		)
		.catch(() => undefined);

	let enabled = true;
	let threshold = COMPLIANCE_VIOLATION_THRESHOLD;
	let cached: {
		mtimeMs: number;
		pack: RulePack;
		questions: Record<string, ClassifierQuestion>;
	} | null = null;
	let contractError: string | null = null;
	let unavailableReported = false;
	const cooldown = new ComplianceCooldown();
	const audit: AuditRecord[] = [];
	let dailyReportChecked = false;
	/** Fingerprint of the last judged message, so a boundary cannot re-charge for it. */
	let lastJudged = "";

	// The contract is read fresh whenever the file changes (see loadPack), so an
	// edit takes effect on the next check. PI_COMPLIANCE_CONTRACT points the
	// checker at a different contract file.
	const contractPath =
		process.env.PI_COMPLIANCE_CONTRACT ??
		path.resolve(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
			"prompts",
			"default.md",
		);

	const loadPack = async (): Promise<typeof cached> => {
		if (!existsSync(contractPath)) {
			contractError = `contract not found at ${contractPath}`;
			return null;
		}
		const stat = await fs.stat(contractPath);
		if (cached && cached.mtimeMs === stat.mtimeMs) return cached;
		const source = await fs.readFile(contractPath, "utf8");
		const pack = buildRulePack(source);
		cached = {
			mtimeMs: stat.mtimeMs,
			pack,
			questions: buildQuestions(pack.rules),
		};
		contractError = null;
		return cached;
	};

	const record = (entry: AuditRecord): void => {
		audit.push(entry);
		if (audit.length > AUDIT_LIMIT) audit.shift();
	};

	const disposers: Array<() => void> = [];
	(globalThis as Record<string, unknown>)[REGISTRATION_KEY] = () => {
		for (const dispose of disposers) {
			if (typeof dispose !== "function") continue;
			try {
				dispose();
			} catch {
				// A handler that is already gone is not an error.
			}
		}
	};

	pi.registerCommand("compliance", {
		description:
			"Contract checker: /compliance on|off|status|audit|calibrate|threshold <0-1>",
		handler: async (args, ctx) => {
			const [verb, value] = args.trim().toLowerCase().split(/\s+/);
			switch (verb) {
				case "on":
				case "off": {
					enabled = verb === "on";
					ctx.ui.notify(
						enabled
							? `Contract checker: on (threshold ${threshold})`
							: "Contract checker: off — no classifier calls will be made",
						"info",
					);
					return;
				}
				case "threshold": {
					const parsed = Number.parseFloat(value ?? "");
					if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
						ctx.ui.notify("Usage: /compliance threshold <0-1>", "warning");
						return;
					}
					threshold = parsed;
					ctx.ui.notify(`Contract checker threshold: ${threshold}`, "info");
					return;
				}
				case "calibrate": {
					const loaded = await loadPack().catch(() => null);
					const host = resolveClassifierHost(ctx.modelRegistry as unknown);
					if (!loaded || !host) {
						ctx.ui.notify(
							loaded
								? "Contract checker: no classifier API in this build"
								: "Contract checker: contract unavailable",
							"warning",
						);
						return;
					}
					const runs = await Promise.all(
						COMPLIANCE_FIXTURES.map(async (fixture) => {
							const result = await host.classify(
								COMPLIANCE_CLASSIFIER,
								{
									state: buildClassifierState(
										fixture.agentMessage,
										fixture.hoomanRequest,
										0,
									),
									questions: loaded.questions,
								},
								{ signal: boundedSignal(ctx.signal) },
							);
							return {
								name: fixture.name,
								expectRules: fixture.expectRules,
								result,
								cost: result?.usage?.cost?.total ?? 0,
							};
						}),
					);
					const report = evaluateCalibration(runs, loaded.pack.rules, threshold);
					const detail = report.entries.map((entry) => {
						if (entry.unmatched.length > 0) {
							return `${entry.fixture}: STALE FIXTURE (${entry.unmatched.join(" | ")})`;
						}
						if (entry.failed) return `${entry.fixture}: classifier error`;
						if (entry.expected.length === 0) {
							return `${entry.fixture}: ${entry.fired.length === 0 ? "clean" : `FALSE POSITIVE ${entry.fired.join(",")}`}`;
						}
						return `${entry.fixture}: ${
							entry.missed.length === 0
								? `caught ${entry.fired.join(",")}`
								: `MISSED ${entry.missed.join(",")} (fired ${entry.fired.join(",") || "nothing"})`
						}`;
					});
					ctx.ui.notify(
						[
							`Calibration @ threshold ${threshold}: ${report.plantedCaught}/${report.plantedTotal} planted caught, ${report.cleanFlagged}/${report.cleanTotal} clean flagged, ${report.adjacentCitations} adjacent citations${report.failures > 0 ? `, ${report.failures} problems` : ""}`,
							...detail,
							`Cost: $${report.cost.toFixed(5)}`,
						].join("\n"),
						report.cleanFlagged > 0 || report.failures > 0 ? "warning" : "info",
					);
					return;
				}
				case "report": {
					const days = Math.min(30, Math.max(1, Number.parseInt(value ?? "1", 10) || 1));
					const loaded = await loadPack().catch(() => null);
					const rules = loaded?.pack.rules ?? [];
					const ruleIds = rules.map((rule) => rule.id);
					const observations = await readObservations();
					const stats = aggregateObservations(
						observations,
						Date.now() - days * 24 * 60 * 60 * 1000,
					);
					const labels = Object.fromEntries(rules.map((rule) => [rule.id, rule.label]));
					const report = renderDailyReport(stats, ruleIds, labels, {
						days,
						generatedAt: Date.now(),
						topRules: 5,
					});
					const target = await writeReport(report, new Date());
					const never = neverHitRules(stats, ruleIds);
					const top = Object.entries(stats.ruleHits)
						.sort((left, right) => right[1] - left[1])
						.slice(0, 3)
						.map(([id, count]) => `${id} ${count}`)
						.join(", ");
					ctx.ui.notify(
						[
							`Contract hits (last ${days}d): ${stats.checks} checks across ${stats.models.length} model(s), ${stats.cost.toFixed(4)}`,
							top.length > 0 ? `Most fired: ${top}` : "No rule fired in this window",
							`Never fired: ${never.length} of ${ruleIds.length} rules — ${never.slice(0, 8).join(", ")}${never.length > 8 ? " …" : ""}`,
							`Report: ${target}`,
						].join("\n"),
						"info",
					);
					return;
				}
				case "audit": {
					if (audit.length === 0) {
						ctx.ui.notify("Contract checker: no verdicts recorded yet", "info");
						return;
					}
					const lines = audit.map((entry) => {
						const cited = entry.cited.length > 0 ? entry.cited.join(", ") : "none";
						const top = entry.candidates
							.slice(0, 3)
							.map((violation) => `${violation.id} ${violation.probability.toFixed(2)}`)
							.join(" ");
						return `turn ${entry.turnIndex}: cited ${cited}${top ? ` | top ${top}` : ""} (${entry.note})`;
					});
					ctx.ui.notify(["Contract checker audit:", ...lines].join("\n"), "info");
					return;
				}
				default: {
					const pack = cached?.pack ?? null;
					ctx.ui.notify(
						[
							`Contract checker: ${enabled ? "on" : "off"} | threshold ${threshold}`,
							pack
								? `Rules: ${pack.rules.length}, every one derived from the contract file`
								: "Rules: not loaded yet",
							`Warnings this session: ${cooldown.warningCount}`,
							contractError ? `Contract error: ${contractError}` : null,
							"Usage: /compliance on|off|status|audit|calibrate|threshold <0-1>",
						]
							.filter((line): line is string => Boolean(line))
							.join("\n"),
						"info",
					);
				}
			}
		},
	});

	// The pinned pi types predate the unsubscribe contract, so the disposer is
	// taken structurally: a host that returns nothing simply has nothing to release.
	const disposeTurnEnd = pi.on("turn_end", async (event, ctx) => {
		const registry = ctx.modelRegistry as unknown as Record<string, unknown>;
		const registryMethods = [
			...Object.keys(registry ?? {}),
			...Object.getOwnPropertyNames(Object.getPrototypeOf(registry ?? {})),
		]
			.filter((key) => typeof registry?.[key] === "function")
			.slice(0, 40);
		const diag: Record<string, unknown> = {
			ts: Date.now(),
			turn: (event as { turnIndex?: number }).turnIndex,
			enabled,
			messageRole: (event as { message?: { role?: unknown } }).message?.role,
			contractPath,
			registryMethods,
		};
		const finish = (decision: string, extra: Record<string, unknown> = {}): void => {
			writeDiagnostics({ ...diag, decision, ...extra });
		};

		if (!enabled) {
			finish("disabled");
			return;
		}

		let pack: RulePack;
		let questions: Record<string, ClassifierQuestion>;
		try {
			const loaded = await loadPack();
			if (!loaded) {
				finish("contract unavailable", { contractError });
				return;
			}
			pack = loaded.pack;
			questions = loaded.questions;
		} catch (error) {
			contractError = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(
				`Contract checker disabled: ${contractError}`,
				"warning",
			);
			enabled = false;
			finish("contract failed", { contractError });
			return;
		}

		const agentMessage = agentTurnText(event.message, readMessages(event));
		const fingerprint = textFingerprint(agentMessage);
		if (agentMessage.length > 0 && fingerprint === lastJudged) {
			diag.messageChars = agentMessage.length;
			finish("already judged at an earlier boundary");
			return;
		}
		lastJudged = fingerprint;
		diag.messageChars = agentMessage.length;
		diag.messageSource =
			extractAgentMessage(event.message).length > 0 ? "final-message" : "turn-transcript";
		if (agentMessage.length === 0) {
			finish("no agent text in this message");
			return;
		}

		const host = resolveClassifierHost(ctx.modelRegistry as unknown);
		if (!host) {
			if (!unavailableReported) {
				unavailableReported = true;
				ctx.ui.notify(
					"Contract checker inactive: this pi build exposes no classifier API",
					"warning",
				);
			}
			enabled = false;
			finish("no classifier API in this build");
			return;
		}

		const transcript = readMessages(event);
		const hoomanRequest = findLastMessageText(transcript, "user");
		const hoomanMessages = transcript.filter(
			(candidate) =>
				candidate !== null &&
				typeof candidate === "object" &&
				(candidate as { role?: unknown }).role === "user",
		).length;
		const model = agentModelId(event.message, ctx);
		const classifierId = `${COMPLIANCE_CLASSIFIER.provider}/${COMPLIANCE_CLASSIFIER.id}`;

		let result = null;
		let failed = false;
		let failureNote: string | undefined;
		const resolved = host.resolveClassifier
			? await host.resolveClassifier(COMPLIANCE_CLASSIFIER)
			: { model: COMPLIANCE_CLASSIFIER, source: "none" as const };
		try {
			result = await host.classify(
				resolved.model,
				{
					state: buildClassifierState(
						agentMessage,
						hoomanRequest,
						event.turnIndex,
						hoomanMessages <= 1,
					),
					questions,
				},
				// Deliberately not ctx.signal: a turn boundary is exactly where that signal fires.
				{ signal: boundedSignal(undefined) },
			);
		} catch (error) {
			failed = true;
			failureNote = error instanceof Error ? error.message : String(error);
			record({
				turnIndex: event.turnIndex,
				messageChars: agentMessage.length,
				candidates: [],
				cited: [],
				note: `classifier failed: ${error instanceof Error ? error.message : String(error)}`,
			});
		}

		const classifierError =
			failed || Boolean(result?.errorMessage) || result?.stopReason === "error";
		const candidates = classifierError
			? []
			: selectViolations(result, pack.rules, threshold);
		const cited = cooldown.select(event.turnIndex, candidates);
		const cost = result?.usage?.cost?.total ?? 0;

		await appendObservation({
			ts: Date.now(),
			model,
			classifier: classifierId,
			ok: !classifierError,
			fired: candidates.map((violation) => ({
				id: violation.id,
				p: violation.probability,
			})),
			cited: cited.map((violation) => violation.id),
			cost,
			turn: event.turnIndex,
			chars: agentMessage.length,
			usageReported: result?.usage !== undefined,
			classifierSource: resolved.source,
			pid: process.pid,
			...(classifierError
				? {
						note: (result?.errorMessage ?? failureNote ?? "classifier error").slice(
							0,
							200,
						),
					}
				: {}),
		}).catch(() => undefined);

		if (candidates.length > 0) {
			record({
				turnIndex: event.turnIndex,
				messageChars: agentMessage.length,
				candidates,
				cited: cited.map((violation) => violation.id),
				note: cited.length === 0 ? "within cooldown" : "warned",
			});
		} else {
			record({
				turnIndex: event.turnIndex,
				messageChars: agentMessage.length,
				candidates: [],
				cited: [],
				note: classifierError ? "classifier error" : "clean",
			});
		}

		if (cited.length > 0) {
			pi.sendMessage(
				{
					customType: "prompt-compliance",
					content: formatWarning(cited),
					display: true,
					details: {
						threshold,
						model,
						violations: cited.map((violation) => ({
							id: violation.id,
							label: violation.label,
							probability: violation.probability,
						})),
					},
				},
				// Delivered with the next turn, not mid-work: a note that interrupts an
				// edit while the work is correct reads as noise, and noise is how a real
				// finding later gets ignored. The agent reads it as it composes again.
				{ deliverAs: "nextTurn" },
			);
		}

		if (!dailyReportChecked && !classifierError) {
			dailyReportChecked = true;
			try {
				const today = new Date();
				const target = reportPath(today);
				if (!existsSync(target)) {
					const observations = await readObservations();
					const ruleIds = pack.rules.map((rule) => rule.id);
					const stats = aggregateObservations(
						observations,
						Date.now() - 24 * 60 * 60 * 1000,
					);
					const labels = Object.fromEntries(
						pack.rules.map((rule) => [rule.id, rule.label]),
					);
					const report = renderDailyReport(stats, ruleIds, labels, {
						days: 1,
						generatedAt: Date.now(),
						topRules: 5,
					});
					const written = await writeReport(report, today);
					ctx.ui.notify(
						`Contract daily report: ${stats.checks} checks, ${neverHitRules(stats, ruleIds).length} rules never fired — ${written}`,
						"info",
					);
				}
			} catch {
				// A report that cannot be written must never disturb a session.
			}
		}

		finish("checked", {
			model,
			classifierSource: resolved.source,
			rules: pack.rules.length,
			classifierError,
			fired: candidates.map((violation) => violation.id),
			cited: cited.map((violation) => violation.id),
			cost,
		});
		});
	if (typeof disposeTurnEnd === "function") {
		disposers.push(disposeTurnEnd as unknown as () => void);
	}
}
