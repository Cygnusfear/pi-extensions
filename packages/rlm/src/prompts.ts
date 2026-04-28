import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_ITERATIONS } from "./constants";
import type { RlmOptions } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.resolve(__dirname, "../prompts");

function readPrompt(name: string): string {
	return fs.readFileSync(path.join(promptsDir, name), "utf-8");
}

export function buildSystemPrompt(opts: RlmOptions): string {
	return readPrompt("rlm-system.md")
		.replaceAll("{tools}", [...opts.tools, "rlm"].join(", "))
		.replaceAll("{maxIterations}", String(opts.maxIterations ?? DEFAULT_MAX_ITERATIONS))
		.replaceAll("{maxDepth}", String(opts.maxDepth ?? DEFAULT_MAX_DEPTH));
}

export function buildIterationPrompt(state: { iterationIndex: number; strikes: number; lastError: Error | null; lastStdout: string }): { role: "user"; content: string } {
	const template = readPrompt("rlm-iteration.md");
	let content = template
		.replaceAll("{iterationIndex}", String(state.iterationIndex))
		.replaceAll("{strikes}", String(state.strikes))
		.replaceAll("{lastError}", state.lastError ? state.lastError.message : "")
		.replaceAll("{lastStdout}", state.lastStdout || "");
	if (state.iterationIndex === 0) content = "Iteration 0. Write one executable JavaScript/TypeScript code block and call rlm.return({...}) with the final structured object.\n\n" + content;
	else if (state.strikes > 0) content = "Previous response had no executable code block. To return, write a JS code block calling rlm.return({...}).\n\n" + content;
	return { role: "user", content };
}
