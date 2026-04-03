/**
 * Foresight extension for pi — single Foresight memory backend.
 *
 * Uses the Foresight CLI for all memory operations.
 * Uses Foresight's native fact types: world, experience, opinion, observation.
 *
 * Requires: Foresight binary + memory DB env.
 * Prefers MEMORY_DATABASE_URL.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { keyHint } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import * as path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { safeJsonParse } from "@pi-extensions/shared/safe-json";
import { foresightRetainFireAndForget, FORESIGHT_FACT_TYPES } from "@pi-extensions/shared/foresight-write";
import { foresightRecall, foresightUnfold, foresightContext } from "@pi-extensions/shared/foresight-read";
import { FS_ENV, FORESIGHT_BIN, FORESIGHT_BIN_EXISTS } from "@pi-extensions/shared/foresight-env";

// =============================================================================
// Config
// =============================================================================

/** Default bank = repo folder name. Override with FORESIGHT_BANK env var. */
const DEFAULT_BANK = process.env.FORESIGHT_BANK || path.basename(process.cwd());

// =============================================================================
// Types
// =============================================================================

interface RecallDetails {
	query: string;
	bank: string;
	resultCount: number;
	exit: "ok" | "error";
	error?: string;
	summaryLines: string[];
	fullText: string;
}

interface UnfoldDetails {
	nodeId: string;
	depth: string;
	factType: string;
	exit: "ok" | "error";
	error?: string;
	summaryLines: string[];
	fullText: string;
}

interface ContextDetails {
	task: string;
	bank: string;
	nodeCount: number;
	exit: "ok" | "error";
	error?: string;
	summaryLines: string[];
	fullText: string;
}

interface CreateDetails {
	nodeId: string;
	bank: string;
	factType: string;
	oneLiner: string;
	exit: "ok" | "error";
	error?: string;
}

interface SubscribeDetails {
	subscriptionId: string;
	watching: string;
	exit: "ok" | "error";
	error?: string;
}

interface UnsubscribeDetails {
	subscriptionId: string;
	exit: "ok" | "error";
	error?: string;
}

interface CheckUpdatesDetails {
	updateCount: number;
	exit: "ok" | "error";
	error?: string;
	summaryLines: string[];
	fullText: string;
}

// =============================================================================
// Foresight CLI helpers
// =============================================================================

/** Run a foresight CLI command and return stdout */
function foresightRun(args: string[]): Promise<string> {
	if (!FORESIGHT_BIN_EXISTS) {
		return Promise.reject(new Error(`Foresight binary '${FORESIGHT_BIN}' not found on PATH`));
	}
	return new Promise((resolve, reject) => {
		const child = spawn(FORESIGHT_BIN, args, {
			stdio: ["pipe", "pipe", "pipe"],
			// RUST_LOG must be warn — info/debug leak log lines to stdout and corrupt JSON output
			env: { ...process.env, ...FS_ENV, RUST_LOG: "warn" },
		});

		let out = "";
		let err = "";
		child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
		child.stderr?.on("data", (d: Buffer) => { err += d.toString(); });

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`foresight timeout`));
		}, 15_000);

		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) resolve(out.trim());
			else reject(new Error(err || `foresight exit ${code}`));
		});
		child.on("error", (e) => {
			clearTimeout(timer);
			reject(e);
		});
	});
}

/** Fire-and-forget foresight CLI call — silent unless spawn itself fails */
function foresightFireAndForget(args: string[], label: string): void {
	if (!FORESIGHT_BIN_EXISTS) return;
	try {
		const child = spawn(FORESIGHT_BIN, args, {
			stdio: "ignore",
			detached: true,
			env: { ...process.env, ...FS_ENV },
		});

		child.once("error", (error) => {
			console.error(`[foresight] failed to launch ${label}: ${error.message}`);
		});

		child.unref();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[foresight] failed to start ${label}: ${message}`);
	}
}

/** Fire-and-forget session file ingest — used on session end/switch */
function ingestSessionFile(sessionFile: string | undefined): void {
	if (!sessionFile || sessionFile.length === 0) return;
	if (!existsSync(sessionFile)) return;
	foresightFireAndForget(["session-ingest-file", sessionFile], `session ingest for ${sessionFile}`);
}

/** Check if Foresight is reachable (health check via CLI) */
async function isForesightAvailable(): Promise<boolean> {
	try {
		await foresightRun(["health"]);
		return true;
	} catch {
		return false;
	}
}

/** Ensure the default bank exists (create if missing) */
async function ensureBank(bankId: string): Promise<void> {
	try {
		await foresightRun(["bank", "create", bankId, "--name", bankId]);
	} catch {
		// Bank likely already exists — that's fine
	}
}

// =============================================================================
// Helpers
// =============================================================================

function factTypeEmoji(factType: string): string {
	const map: Record<string, string> = {
		world: "🌍", experience: "🔧", observation: "👁️", opinion: "💭",
		// consolidation types
		minute_summary: "⏱️", hour_summary: "🕐",
		day_summary: "📆", week_summary: "🗓️",
	};
	return map[factType] || "🧠";
}

function parseJsonOrFreeformArgs<T extends Record<string, any>>(
	raw: string,
	primaryKey: keyof T,
): T {
	const input = raw.trim();
	if (!input) return {} as T;

	try {
		const parsed = safeJsonParse<T>(input);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed;
		}
	} catch {
		// Fall back to freeform input.
	}

	return { [primaryKey]: input } as T;
}

function renderRecallPlainText(query: string, bank: string, data: { results: Array<{ one_liner: string; summary?: string; score: number; fact_type: string; node_id: string }>; total: number; backends_failed: string[] }): string {
	const lines = [`🧠 recall "${query}" (bank: ${bank})`, `${data.total} memories`];
	for (const r of data.results) {
		const preview = r.summary && r.summary !== r.one_liner ? ` — ${r.summary.slice(0, 120)}` : "";
		lines.push(`${factTypeEmoji(r.fact_type)} [${r.score.toFixed(2)}] ${r.one_liner}${preview}`);
		lines.push(`   ${r.node_id}`);
	}
	if (data.backends_failed.length > 0) {
		lines.push(`⚠️ backends down: ${data.backends_failed.join(", ")}`);
	}
	return lines.join("\n");
}

function renderContextPlainText(task: string, bank: string, data: { nodes: Array<{ one_liner: string; summary?: string; score: number; fact_type: string; node_id: string }>; total_nodes: number; backends_failed?: string[] }): string {
	const lines = [`🧠 context "${task}" (bank: ${bank})`, `${data.total_nodes} memories`];
	for (const r of data.nodes) {
		const preview = r.summary && r.summary !== r.one_liner ? ` — ${r.summary.slice(0, 120)}` : "";
		lines.push(`${factTypeEmoji(r.fact_type)} [${(r.score || 0).toFixed(2)}] ${r.one_liner}${preview}`);
		lines.push(`   ${r.node_id}`);
	}
	if (data.backends_failed && data.backends_failed.length > 0) {
		lines.push(`⚠️ backends down: ${data.backends_failed.join(", ")}`);
	}
	return lines.join("\n");
}

// =============================================================================
// Extension
// =============================================================================

export default function foresightExtension(pi: ExtensionAPI) {

	// =========================================================================
	// Startup: check availability and ensure bank
	// =========================================================================

	let available = false;
	let startupDone = false;

	const startup = (async () => {
		if (!FORESIGHT_BIN_EXISTS) {
			console.error(`[foresight] Binary '${FORESIGHT_BIN}' not found on PATH — extension dormant`);
			return;
		}
		available = await isForesightAvailable();
		if (!available) {
			console.error("[foresight] Foresight CLI not reachable — extension dormant");
			return;
		}
		await ensureBank(DEFAULT_BANK);
		startupDone = true;
	})();

	pi.registerCommand("recall", {
		description: "Search memory: /recall <query> or /recall {\"query\":\"...\",\"limit\":5,\"bank\":\"other-repo\"}",
		handler: async (args, ctx) => {
			const parsed = parseJsonOrFreeformArgs<{ query?: string; limit?: number; factType?: string; minScore?: number; bank?: string }>(args ?? "", "query");
			const query = (parsed.query || "").trim();
			if (!query) {
				ctx.ui.notify("Usage: /recall <query> or /recall {\"query\":\"...\",\"limit\":5}", "warning");
				return;
			}

			const bank = parsed.bank || DEFAULT_BANK;
			try {
				const data = await foresightRecall(bank, query, parsed.limit || 10, parsed.factType, parsed.minScore);
				pi.sendMessage(
					{ customType: "foresight", content: renderRecallPlainText(query, bank, data), display: true },
					{ triggerTurn: false },
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Recall failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("memory-context", {
		description: "Get task context from memory: /memory-context <task> or /memory-context {\"task\":\"...\",\"maxNodes\":5,\"bank\":\"other-repo\"}",
		handler: async (args, ctx) => {
			const parsed = parseJsonOrFreeformArgs<{ task?: string; maxNodes?: number; bank?: string }>(args ?? "", "task");
			const task = (parsed.task || "").trim();
			if (!task) {
				ctx.ui.notify("Usage: /memory-context <task> or /memory-context {\"task\":\"...\",\"maxNodes\":5}\nUse /cmd.context for the loaded prompt/context window view.", "warning");
				return;
			}

			const bank = parsed.bank || DEFAULT_BANK;
			try {
				const contextJson = await foresightContext(bank, task, parsed.maxNodes || 10);
				const data = safeJsonParse<any>(contextJson);
				pi.sendMessage(
					{ customType: "foresight", content: renderContextPlainText(task, bank, data), display: true },
					{ triggerTurn: false },
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Context failed: ${message}`, "error");
			}
		},
	});

	// =========================================================================
	// Auto-context: inject recent memories at session start
	// =========================================================================

	let memoriesBlock: string | null = null;

	// Phase 1: fetch recent memories at load via foresight CLI
	startup.then(async () => {
		if (!available) return;
		try {
			const raw = await foresightRun(["memories", DEFAULT_BANK, "--limit", "15", "--json"]);
			const data = safeJsonParse<any>(raw);
			const memories = (data.items || []).slice(0, 15);
			if (memories.length > 0) {
				const lines = memories.map((m: any) =>
					`- [${m.fact_type || "world"}] ${(m.text || "").slice(0, 120)}`
				).join("\n");
				memoriesBlock = `\n\n<recent_memories bank="${DEFAULT_BANK}" source="foresight">\n${lines}\n</recent_memories>`;
			}
		} catch { /* silent */ }
	});

	pi.on("before_agent_start", async (event: any, _ctx: any) => {
		// Never block session creation on foresight startup — the health check +
		// ensureBank + memories fetch can take 3-15s which delays session file
		// creation and makes workers appear dead.  If memories are ready, inject
		// them; otherwise skip and let the agent use memory tools later.
		if (!startupDone) return;
		let extra = "";
		if (memoriesBlock) {
			extra += memoriesBlock;
			memoriesBlock = null;
		}
		if (!extra) return;
		return { systemPrompt: event.systemPrompt + extra };
	});

	// =========================================================================
	// Live session ingest + semantic refresh
	// - session file ingest happens when a session ends or switches away
	// - semantic refresh still happens on turn 3 for in-session recall
	// =========================================================================

	let turnCount = 0;
	const turnContent: string[] = [];

	pi.on("session_start", async (event: any, _ctx: any) => {
		if (!available) return;
		if (!event.previousSessionFile) return;
		ingestSessionFile(event.previousSessionFile);
	});

	pi.on("session_shutdown", async (_event: any, ctx: any) => {
		if (!available) return;
		ingestSessionFile(ctx.sessionManager.getSessionFile());
	});

	pi.on("turn_end", async (event: any, _ctx: any) => {
		if (!available) return;
		try {
			turnCount++;
			const msg = event.message;
			if (!msg || typeof msg !== "object" || !msg.content) return;

			const assistantText = Array.isArray(msg.content)
				? msg.content.map((c: any) => c.text || "").join("\n")
				: typeof msg.content === "string" ? msg.content : "";

			// ── Semantic refresh at turn 3 ──
			if (assistantText.length >= 50) {
				if (turnCount === 3 && turnContent.length > 0) {
					const query = turnContent.join(" ").slice(0, 200);
					try {
						const raw = await foresightRun(["recall", DEFAULT_BANK, query, "--json", "--limit", "10"]);
						const data = safeJsonParse<any>(raw);
						const results = data.results || [];
						if (results.length > 0) {
							const lines = results.map((r: any) =>
								`- [${r.fact_type || "world"}] ${(r.text || "").slice(0, 120)}`
							).join("\n");
							memoriesBlock = `\n\n<relevant_memories bank="${DEFAULT_BANK}" source="foresight">\n${lines}\n</relevant_memories>`;
						}
					} catch { /* silent */ }
				}
				turnContent.push(assistantText.slice(0, 300));
			}
		} catch { /* silent — never break the session */ }
	});

	// =========================================================================
	// recall — primary search
	// =========================================================================

	pi.registerTool({
		name: "recall",
		label: "Foresight Search",
		description:
			"Search Foresight semantic memory. Returns ranked memory nodes from the knowledge graph. " +
			"Use for recalling past decisions, learnings, patterns, entities, and events across all sessions. " +
			"Defaults to the current repo's bank. Use 'bank' to query a different repo's memories.",
		parameters: Type.Object({
			query: Type.String({ description: "Search query text" }),
			limit: Type.Optional(Type.Number({ description: "Max results (default: 10)", default: 10, minimum: 1, maximum: 50 })),
			factType: Type.Optional(StringEnum([...FORESIGHT_FACT_TYPES], { description: "Filter by fact type: world (knowledge), experience (learned from doing), opinion (judgments/decisions), observation (events/changes)" })),
			minScore: Type.Optional(Type.Number({ description: "Minimum similarity score 0.0-1.0 (default: 0.0)", default: 0.0 })),
			bank: Type.Optional(Type.String({ description: "Memory bank to search (default: current repo name). Use to query other repos." })),
		}),

		async execute(_toolCallId, params: any, _signal) {
			const bank = params.bank || DEFAULT_BANK;
			try {
				const data = await foresightRecall(
					bank, params.query, params.limit || 10,
					params.factType, params.minScore,
				);

				const summaryLines = data.results.map(r => {
					const title = r.one_liner.slice(0, 90) + (r.one_liner.length > 90 ? "…" : "");
					const preview = r.summary ? ` — ${r.summary.slice(0, 120)}${r.summary.length > 120 ? "…" : ""}` : "";
					return `${factTypeEmoji(r.fact_type)} ${title}${preview}`;
				});
				const fullText = data.results.map(r => {
					const summary = r.summary ? `\n   ${r.summary}` : "";
					return `${factTypeEmoji(r.fact_type)} [${r.score.toFixed(2)}] ${r.one_liner}\n   ${r.node_id} | ${r.fact_type}${summary}`;
				}).join("\n\n");

				if (data.backends_failed.length > 0) {
					summaryLines.push(`⚠️ backends down: ${data.backends_failed.join(", ")}`);
				}

				return {
					content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
					details: {
						query: params.query,
						bank,
						resultCount: data.total,
						exit: "ok",
						summaryLines,
						fullText,
					} satisfies RecallDetails,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text" as const, text: `Recall error: ${message}` }],
					details: { query: params.query, bank, resultCount: 0, exit: "error", error: message, summaryLines: [], fullText: "" } satisfies RecallDetails,
					isError: true,
				};
			}
		},

		renderCall(args: any, theme: any) {
			const parts = [`🧠 recall`];
			if (args.factType) parts.push(`[${args.factType}]`);
			if (args.bank) parts.push(`(${args.bank})`);
			return new Text(
				`${theme.fg("toolTitle", theme.bold(parts.join(" ")))} ${theme.fg("muted", args.query ?? "")}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const details = result.details as RecallDetails | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.exit === "error") {
				return new Text(theme.fg("error", `Error: ${details.error ?? "search failed"}`), 0, 0);
			}

			let text = theme.fg("success", "✓");
			text += ` ${details.resultCount} memories`;
			if (details.bank !== DEFAULT_BANK) text += ` (${details.bank})`;

			if (expanded && details.fullText) {
				text += "\n\n" + details.fullText;
			} else if (details.summaryLines?.length) {
				for (const line of details.summaryLines) {
					text += `\n  ${theme.fg("dim", line)}`;
				}
				text += `\n  ${theme.fg("dim", `(${keyHint("expandTools", "to expand")})`)}`;
			}

			return new Text(text, 0, 0);
		},
	});

	// =========================================================================
	// memory_unfold — get full detail on a memory
	// =========================================================================

	pi.registerTool({
		name: "memory_unfold",
		label: "Foresight Unfold",
		description:
			"Unfold a Foresight memory node to see more detail. Use after recall/memory_context to drill into a specific node. " +
			"IMPORTANT: Pass the full node_id from recall results. For Foresight this is usually prefixed like 'fs:...'. Do NOT truncate. " +
			"Depths: summary (brief), full (complete synthesis), raw (with source content).",
		parameters: Type.Object({
			nodeId: Type.String({ description: "Full node ID from recall results — pass the complete ID including its prefix, usually 'fs:...'. Do NOT truncate." }),
			depth: Type.Optional(StringEnum(["summary", "full", "raw"], { description: "Detail level (default: full)" })),
			bank: Type.Optional(Type.String({ description: "Memory bank (default: current repo name)" })),
		}),

		async execute(_toolCallId, params: any, _signal) {
			const bank = params.bank || DEFAULT_BANK;
			try {
				const data = await foresightUnfold(bank, params.nodeId, params.depth || "full");

				const header = `${factTypeEmoji(data.fact_type)} ${data.one_liner.slice(0, 100)}\n${data.fact_type} | ${data.edge_count} edges | ${data.access_count} accesses`;
				const body = data.full_synthesis || data.summary;

				return {
					content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
					details: {
						nodeId: data.id,
						depth: params.depth || "full",
						factType: data.fact_type,
						exit: "ok",
						summaryLines: [header.split("\n")[0]],
						fullText: `${header}\n\n${body}`,
					} satisfies UnfoldDetails,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text" as const, text: `Unfold error: ${message}` }],
					details: { nodeId: params.nodeId, depth: params.depth || "full", factType: "", exit: "error", error: message, summaryLines: [], fullText: "" } satisfies UnfoldDetails,
					isError: true,
				};
			}
		},

		renderCall(args: any, theme: any) {
			return new Text(
				`${theme.fg("toolTitle", theme.bold("🔍 unfold"))} ${theme.fg("muted", `${(args.nodeId ?? "").slice(0, 8)}… (${args.depth || "full"})`)}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const details = result.details as UnfoldDetails | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.exit === "error") {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			let text = theme.fg("success", "✓");
			text += ` ${details.factType}`;

			if (expanded && details.fullText) {
				text += "\n\n" + details.fullText;
			} else if (details.summaryLines?.length) {
				for (const line of details.summaryLines) {
					text += `\n  ${line}`;
				}
				text += `\n  ${theme.fg("dim", `(${keyHint("expandTools", "to expand")})`)}`;
			}

			return new Text(text, 0, 0);
		},
	});

	// =========================================================================
	// memory_context — get context for current task
	// =========================================================================

	pi.registerTool({
		name: "memory_context",
		label: "Foresight Context",
		description:
			"Get relevant memories for a task or topic. Returns context-ranked nodes from the knowledge graph. " +
			"Use at the start of work to load relevant background, or when you need to understand prior decisions. " +
			"Defaults to the current repo's bank. Use 'bank' to query a different repo's memories.",
		parameters: Type.Object({
			task: Type.String({ description: "Task or topic description" }),
			maxNodes: Type.Optional(Type.Number({ description: "Max nodes (default: 10)", default: 10 })),
			bank: Type.Optional(Type.String({ description: "Memory bank to search (default: current repo name)" })),
		}),

		async execute(_toolCallId, params: any, _signal) {
			const bank = params.bank || DEFAULT_BANK;
			try {
				const contextJson = await foresightContext(bank, params.task, params.maxNodes || 10);
				const contextData = safeJsonParse<any>(contextJson);

				const summaryLines = (contextData.nodes || []).map((r: any) => {
					const title = (r.one_liner || "").slice(0, 90) + ((r.one_liner || "").length > 90 ? "…" : "");
					const preview = r.summary ? ` — ${r.summary.slice(0, 120)}${r.summary.length > 120 ? "…" : ""}` : "";
					return `${factTypeEmoji(r.fact_type)} ${title}${preview}`;
				});
				const fullText = (contextData.nodes || []).map((r: any) => {
					const summary = r.summary ? `\n   ${r.summary}` : "";
					return `${factTypeEmoji(r.fact_type)} [${(r.score || 0).toFixed(2)}] ${r.one_liner}\n   ${r.node_id} | ${r.fact_type}${summary}`;
				}).join("\n\n");

				if (contextData.backends_failed?.length > 0) {
					summaryLines.push(`⚠️ backends down: ${contextData.backends_failed.join(", ")}`);
				}

				return {
					content: [{ type: "text" as const, text: contextJson }],
					details: {
						task: params.task,
						bank,
						nodeCount: contextData.total_nodes || 0,
						exit: "ok",
						summaryLines,
						fullText,
					} satisfies ContextDetails,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text" as const, text: `Context error: ${message}` }],
					details: { task: params.task, bank, nodeCount: 0, exit: "error", error: message, summaryLines: [], fullText: "" } satisfies ContextDetails,
					isError: true,
				};
			}
		},

		renderCall(args: any, theme: any) {
			const parts = [`🧠 context`];
			if (args.bank) parts.push(`(${args.bank})`);
			return new Text(
				`${theme.fg("toolTitle", theme.bold(parts.join(" ")))} ${theme.fg("muted", args.task ?? "")}`,
				0, 0,
			);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const details = result.details as ContextDetails | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.exit === "error") {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			let text = theme.fg("success", "✓");
			text += ` ${details.nodeCount} memories`;
			if (details.bank !== DEFAULT_BANK) text += ` (${details.bank})`;

			if (expanded && details.fullText) {
				text += "\n\n" + details.fullText;
			} else if (details.summaryLines?.length) {
				for (const line of details.summaryLines) {
					text += `\n  ${theme.fg("dim", line)}`;
				}
				text += `\n  ${theme.fg("dim", `(${keyHint("expandTools", "to expand")})`)}`;
			}

			return new Text(text, 0, 0);
		},
	});

	// =========================================================================
	// memory_create — store a new memory via retain
	// =========================================================================

	pi.registerTool({
		name: "memory_create",
		label: "Foresight Create",
		description:
			"Create a new memory in Foresight's knowledge graph. Use to persist important decisions, learnings, " +
			"patterns, or events that should be remembered across sessions.\n" +
			"Fact types: world (general knowledge), experience (learned from doing), opinion (judgments/decisions), observation (events/changes).",
		parameters: Type.Object({
			factType: StringEnum([...FORESIGHT_FACT_TYPES], { description: "Fact type: world (knowledge), experience (learned from doing), opinion (judgments/decisions), observation (events/changes)" }),
			oneLiner: Type.String({ description: "Brief one-line summary" }),
			summary: Type.String({ description: "Medium summary (2-3 sentences)" }),
			fullSynthesis: Type.Optional(Type.String({ description: "Complete detailed content (defaults to summary)" })),
			entityName: Type.Optional(Type.String({ description: "Entity name (for entity-related memories)" })),
			sessionId: Type.Optional(Type.String({ description: "Session ID" })),
			repo: Type.Optional(Type.String({ description: "Source repository" })),
			bank: Type.Optional(Type.String({ description: "Memory bank to write to (default: current repo name)" })),
		}),

		async execute(_toolCallId, params: any, _signal) {
			await startup;
			const bank = params.bank || DEFAULT_BANK;

			if (!available) {
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ error: "Foresight not available" }) }],
					details: { nodeId: "", bank, factType: params.factType, oneLiner: params.oneLiner, exit: "error" as const, error: "Foresight binary not available" } satisfies CreateDetails,
					isError: true,
				};
			}

			// Ensure the target bank exists if writing to a non-default bank
			if (bank !== DEFAULT_BANK) {
				await ensureBank(bank);
			}

			// Fire-and-forget — never block the agent waiting for foresight CLI
			foresightRetainFireAndForget(bank, {
				factType: params.factType,
				oneLiner: params.oneLiner,
				summary: params.summary,
				fullSynthesis: params.fullSynthesis,
				entityName: params.entityName,
				sessionId: params.sessionId,
				repo: params.repo,
			});

			const nodeId = `fs:pending-${Date.now()}`;

			return {
				content: [{ type: "text" as const, text: JSON.stringify({ node_id: nodeId, fact_type: params.factType, one_liner: params.oneLiner }) }],
				details: {
					nodeId,
					bank,
					factType: params.factType,
					oneLiner: params.oneLiner,
					exit: "ok",
				} satisfies CreateDetails,
			};
		},

		renderCall(args: any, theme: any) {
			const emoji = factTypeEmoji(args.factType);
			const parts = [`${emoji} create ${args.factType}`];
			if (args.bank) parts.push(`(${args.bank})`);
			return new Text(
				`${theme.fg("toolTitle", theme.bold(parts.join(" ")))} ${theme.fg("muted", (args.oneLiner ?? "").slice(0, 60))}`,
				0, 0,
			);
		},

		renderResult(result: any, _options: any, theme: any) {
			const details = result.details as CreateDetails | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.exit === "error") {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			return new Text(
				`${theme.fg("success", "✓")} ${factTypeEmoji(details.factType)} ${details.oneLiner}\n  ${theme.fg("dim", details.nodeId.slice(0, 8) + "…")}`,
				0, 0,
			);
		},
	});

	// =========================================================================
	// memory_status — health + stats
	// =========================================================================

	pi.registerTool({
		name: "memory_status",
		label: "Foresight Status",
		description: "Get Foresight database status — node count and health.",
		parameters: Type.Object({}),

		async execute(_toolCallId, _params: any, _signal) {
			await startup;
			try {
				const healthRaw = await foresightRun(["health"]);
				const memoriesRaw = await foresightRun(["memories", DEFAULT_BANK, "--limit", "1", "--json"]);
				const memoriesData = safeJsonParse<any>(memoriesRaw);

				const status = {
					backend: "foresight",
					bank: DEFAULT_BANK,
					health: healthRaw.includes("healthy") ? "healthy" : healthRaw,
					total_memories: memoriesData.total ?? 0,
				};

				return {
					content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
					details: { nodeCount: memoriesData.total ?? -1, exit: "ok" as const },
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text" as const, text: `Foresight error: ${message}` }],
					details: { nodeCount: 0, exit: "error" as const, error: message },
					isError: true,
				};
			}
		},

		renderCall(_args: any, theme: any) {
			return new Text(theme.fg("toolTitle", theme.bold("🧠 memory status")), 0, 0);
		},

		renderResult(result: any, { expanded }: any, theme: any) {
			const details = result.details as { nodeCount: number; exit: string; error?: string } | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.exit === "error") {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			let text = `${theme.fg("success", "✓")} 🧠 Foresight backend (${DEFAULT_BANK})`;
			if (expanded) {
				try {
					const content = result.content?.[0]?.text;
					if (content) text += "\n\n" + content;
				} catch {}
			}
			return new Text(text, 0, 0);
		},
	});

	// =========================================================================
	// Pub/Sub stubs — Foresight doesn't have native pub/sub yet
	// We stub these so existing instructions/skills don't break.
	// =========================================================================

	pi.registerTool({
		name: "memory_subscribe",
		label: "Foresight Subscribe",
		description:
			"Subscribe to a memory node, entity, or topic. You'll be notified when new related nodes are created. " +
			"Use to stay informed about evolving topics across sessions and agents.",
		parameters: Type.Object({
			nodeId: Type.Optional(Type.String({ description: "Node UUID to watch for related nodes" })),
			entity: Type.Optional(Type.String({ description: "Entity name to watch (e.g. 'Foresight', 'LOCOMO eval')" })),
			topic: Type.Optional(Type.String({ description: "Topic/search query to watch (semantic matching)" })),
			subscriber: Type.Optional(Type.String({ description: "Subscriber identifier (defaults to current session)" })),
		}),

		async execute(_toolCallId, params: any, _signal) {
			// Stub: acknowledge but no-op (Foresight doesn't have pub/sub yet)
			const watching = params.nodeId
				? `node:${params.nodeId.slice(0, 8)}…`
				: params.entity
					? `entity:${params.entity}`
					: `topic:${params.topic}`;

			return {
				content: [{ type: "text" as const, text: JSON.stringify({ status: "acknowledged", note: "Pub/sub not available with Foresight backend — subscription noted but no live notifications" }) }],
				details: {
					subscriptionId: `stub-${Date.now()}`,
					watching,
					exit: "ok",
				} satisfies SubscribeDetails,
			};
		},

		renderCall(args: any, theme: any) {
			const target = args.nodeId
				? `node ${(args.nodeId ?? "").slice(0, 8)}…`
				: args.entity
					? `entity "${args.entity}"`
					: `topic "${args.topic}"`;
			return new Text(
				`${theme.fg("toolTitle", theme.bold("📡 subscribe"))} ${theme.fg("muted", target)}`,
				0, 0,
			);
		},

		renderResult(result: any, _options: any, theme: any) {
			const details = result.details as SubscribeDetails | undefined;
			if (!details) return new Text("", 0, 0);

			return new Text(
				`${theme.fg("dim", "⚡")} watching ${details.watching} ${theme.fg("dim", "(stub — no live notifications)")}`,
				0, 0,
			);
		},
	});

	pi.registerTool({
		name: "memory_unsubscribe",
		label: "Foresight Unsubscribe",
		description: "Remove a memory subscription. Stop receiving notifications for a previously subscribed node/entity/topic.",
		parameters: Type.Object({
			subscriptionId: Type.String({ description: "Subscription ID to remove (from memory_subscribe result)" }),
		}),

		async execute(_toolCallId, params: any, _signal) {
			return {
				content: [{ type: "text" as const, text: JSON.stringify({ status: "acknowledged" }) }],
				details: { subscriptionId: params.subscriptionId, exit: "ok" } satisfies UnsubscribeDetails,
			};
		},

		renderCall(args: any, theme: any) {
			return new Text(
				`${theme.fg("toolTitle", theme.bold("📡 unsubscribe"))} ${theme.fg("muted", (args.subscriptionId ?? "").slice(0, 8) + "…")}`,
				0, 0,
			);
		},

		renderResult(_result: any, _options: any, theme: any) {
			return new Text(`${theme.fg("success", "✓")} unsubscribed`, 0, 0);
		},
	});

	pi.registerTool({
		name: "memory_check_updates",
		label: "Foresight Check Updates",
		description:
			"Check for new notifications from memory subscriptions. Returns unread updates about nodes/entities/topics " +
			"you're watching. Marks returned notifications as read.",
		parameters: Type.Object({
			subscriber: Type.Optional(Type.String({ description: "Subscriber identifier (defaults to all)" })),
		}),

		async execute(_toolCallId, _params: any, _signal) {
			return {
				content: [{ type: "text" as const, text: JSON.stringify({ updates: [], note: "Pub/sub not available with Foresight backend" }) }],
				details: {
					updateCount: 0,
					exit: "ok",
					summaryLines: [],
					fullText: "",
				} satisfies CheckUpdatesDetails,
			};
		},

		renderCall(_args: any, theme: any) {
			return new Text(theme.fg("toolTitle", theme.bold("📡 check updates")), 0, 0);
		},

		renderResult(_result: any, _options: any, theme: any) {
			return new Text(`${theme.fg("dim", "no updates (Foresight backend)")}`, 0, 0);
		},
	});
}
