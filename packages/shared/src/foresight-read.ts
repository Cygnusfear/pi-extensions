/**
 * Memory reads through the Foresight CLI.
 */

import { spawn } from "node:child_process";
import { safeJsonParse } from "./safe-json.js";
import { FS_ENV, FORESIGHT_BIN } from "./foresight-env.js";
import { createDep } from "./tool-availability";

const dep = createDep({ binary: FORESIGHT_BIN, install: "Install: bun add -g foresight-memory", name: "foresight" });

const CLI_TIMEOUT_MS = 15_000;

function runCli(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!dep.ok) {
			reject(new Error(`Foresight binary '${FORESIGHT_BIN}' not found on PATH`));
			return;
		}

		const child = spawn(FORESIGHT_BIN, args, {
			stdio: ["pipe", "pipe", "pipe"],
			env: {
				...process.env,
				...FS_ENV,
				RUST_LOG: process.env.RUST_LOG || FS_ENV.RUST_LOG || "error",
			},
		});

		let out = "";
		let err = "";
		child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
		child.stderr?.on("data", (d: Buffer) => { err += d.toString(); });

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`foresight timeout after ${CLI_TIMEOUT_MS}ms`));
		}, CLI_TIMEOUT_MS);

		child.on("close", (code) => {
			clearTimeout(timer);
			if (code !== 0) {
				reject(new Error(err.trim() || `foresight exit ${code}`));
				return;
			}
			const trimmed = out.trim();
			if (!trimmed) {
				reject(new Error(`foresight produced no output (args: ${args.join(" ")})`));
				return;
			}
			resolve(trimmed);
		});
		child.on("error", (e) => {
			clearTimeout(timer);
			reject(e);
		});
	});
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryResult {
	node_id: string;
	one_liner: string;
	summary?: string;
	score: number;
	fact_type: string;
}

export interface UnfoldResult {
	id: string;
	fact_type: string;
	one_liner: string;
	summary: string;
	full_synthesis: string;
	source_repo: string;
	created_at: number;
	access_count: number;
	edge_count: number;
}

export interface RecallResponse {
	results: MemoryResult[];
	total: number;
	query: string;
	backends_reached: string[];
	backends_failed: string[];
}

// ─── Recall ──────────────────────────────────────────────────────────────────

export async function foresightRecall(
	bankId: string,
	query: string,
	limit: number,
	factType?: string,
	_minScore?: number,
): Promise<RecallResponse> {
	const args = ["recall", bankId, query, "--json", "--limit", String(limit)];
	if (factType) args.push("--fact-types", factType);

	const raw = await runCli(args);
	let data: any;
	try {
		data = safeJsonParse<any>(raw);
	} catch (parseErr) {
		const preview = raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
		throw new Error(`Foresight recall returned invalid JSON. Preview: ${preview}`);
	}

	const results = (data.results || []).map((r: any) => ({
		node_id: `fs:${r.id || ""}`,
		one_liner: r.text || "",
		summary: r.text || undefined,
		score: r.score ?? 0.5,
		fact_type: r.fact_type || "world",
	}));

	return {
		results,
		total: results.length,
		query,
		backends_reached: ["foresight"],
		backends_failed: [],
	};
}

// ─── Unfold ──────────────────────────────────────────────────────────────────

function isFullUuid(s: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function unfoldFromForesight(bankId: string, id: string): Promise<UnfoldResult> {
	const raw = await runCli(["memory", "show", bankId, id]);
	let data: any;
	try {
		data = safeJsonParse<any>(raw);
	} catch (parseErr) {
		const preview = raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
		throw new Error(`Foresight memory show returned invalid JSON. Preview: ${preview}`);
	}
	return {
		id: `fs:${data.id || id}`,
		fact_type: data.fact_type || "world",
		one_liner: data.text || "",
		summary: data.text || "",
		full_synthesis: data.text || "",
		source_repo: "",
		created_at: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
		access_count: data.access_count ?? 0,
		edge_count: data.link_count ?? 0,
	};
}

export async function foresightUnfold(
	bankId: string,
	rawNodeId: string,
	_depth: string = "full",
): Promise<UnfoldResult> {
	const id = rawNodeId.startsWith("fs:") ? rawNodeId.slice(3) : rawNodeId;

	if (!isFullUuid(id)) {
		throw new Error(`Invalid Foresight memory ID: ${rawNodeId}`);
	}

	return unfoldFromForesight(bankId, id);
}

// ─── Context ─────────────────────────────────────────────────────────────────

export async function foresightContext(
	bankId: string,
	task: string,
	maxNodes: number = 10,
): Promise<string> {
	const { results, backends_reached, backends_failed } = await foresightRecall(
		bankId, task, maxNodes,
	);

	return JSON.stringify({
		session_id: null,
		task,
		repo: null,
		nodes: results.map(r => ({
			node_id: r.node_id,
			one_liner: r.one_liner,
			summary: r.summary,
			score: r.score,
			fact_type: r.fact_type,
		})),
		total_nodes: results.length,
		backends_reached,
		backends_failed,
	});
}
