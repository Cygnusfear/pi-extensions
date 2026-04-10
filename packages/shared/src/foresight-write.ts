/**
 * Memory creation through the Foresight CLI.
 *
 * `foresightRetain` awaits the CLI and then fetches the newly created memory
 * to return the real database UUID instead of a fabricated placeholder.
 */

import { spawn } from "node:child_process";
import { FS_ENV, FORESIGHT_BIN } from "./foresight-env.js";
import { createDep } from "./tool-availability";

const dep = createDep({ binary: FORESIGHT_BIN, install: "Install: git clone + cargo install --path . (see github.com/cygnusfear/foresight)", name: "foresight" });
import { safeJsonParse } from "./safe-json.js";

/** Foresight's native fact types. */
export const FORESIGHT_FACT_TYPES = ["world", "experience", "opinion", "observation"] as const;
export type ForesightFactType = (typeof FORESIGHT_FACT_TYPES)[number];

export interface MemoryWriteParams {
	factType: ForesightFactType;
	oneLiner: string;
	summary: string;
	fullSynthesis?: string;
	entityName?: string;
	sessionId?: string;
	repo?: string;
}

export interface ForesightWriteResult {
	node_id: string;
	fact_type: string;
	one_liner: string;
}

const CLI_TIMEOUT_MS = 15_000;

/** Build the text blob that foresight retain ingests. */
function buildRetainText(params: MemoryWriteParams): string {
	const parts = [params.oneLiner];
	if (params.entityName) parts.push(`Entity: ${params.entityName}`);
	parts.push(params.summary);
	if (params.fullSynthesis && params.fullSynthesis !== params.summary) {
		parts.push(params.fullSynthesis);
	}
	return parts.join("\n\n");
}

/** Run a foresight CLI command, await it, return stdout. */
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
			if (code === 0) resolve(out.trim());
			else reject(new Error(err.trim() || `foresight exit ${code}`));
		});
		child.on("error", (e) => {
			clearTimeout(timer);
			reject(e);
		});
	});
}

/**
 * Store a memory via `foresight retain`, then fetch the latest memory
 * to return the real database UUID.
 *
 * Uses --fact-type with foresight's native types (world/experience/opinion/observation).
 */
export async function foresightRetain(
	bankId: string,
	params: MemoryWriteParams,
): Promise<ForesightWriteResult> {
	const text = buildRetainText(params);
	const retainArgs = ["retain", bankId, text, "--fact-type", params.factType];

	try {
		await runCli(retainArgs);
	} catch (retainErr) {
		// retain failed — return a pending ID so the caller knows it didn't land
		return {
			node_id: `pending:${Date.now()}`,
			fact_type: params.factType,
			one_liner: params.oneLiner,
		};
	}

	// Fetch the most recent memory to get the real UUID
	try {
		const raw = await runCli(["memories", bankId, "--limit", "1", "--json"]);
		const data = safeJsonParse<any>(raw);
		const latest = data?.items?.[0];
		if (latest?.id) {
			return {
				node_id: `fs:${latest.id}`,
				fact_type: params.factType,
				one_liner: params.oneLiner,
			};
		}
	} catch {
		// Query failed — still better than a fake ID
	}

	return {
		node_id: `pending:${Date.now()}`,
		fact_type: params.factType,
		one_liner: params.oneLiner,
	};
}

/**
 * Fire-and-forget write — used when you don't need the ID back.
 * (e.g. session ingest, background context saves)
 */
export function foresightRetainFireAndForget(
	bankId: string,
	params: MemoryWriteParams,
): void {
	if (!dep.ok) return;

	try {
		const text = buildRetainText(params);
		const args = ["retain", bankId, text, "--fact-type", params.factType];

		const child = spawn(FORESIGHT_BIN, args, {
			stdio: "ignore",
			detached: true,
			env: { ...process.env, ...FS_ENV },
		});

		child.on("error", () => {});
		child.unref();
	} catch {
		// Silent — never block the session
	}
}
