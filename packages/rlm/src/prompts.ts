import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_ITERATIONS } from "./constants";
import type { RlmOptions } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.resolve(__dirname, "../prompts");
const codeModeDeclarationsPath = path.resolve(__dirname, "../../code-mode/extensions/code-mode-declarations.md");

function readPrompt(name: string): string {
	return fs.readFileSync(path.join(promptsDir, name), "utf-8");
}

function readCodeModeDeclarations(): string {
	try {
		return fs.readFileSync(codeModeDeclarationsPath, "utf-8");
	} catch {
		return "";
	}
}

export function buildSystemPrompt(opts: RlmOptions): string {
	return readPrompt("rlm-system.md")
		.replaceAll("{tools}", [...opts.tools, "rlm"].join(", "))
		.replaceAll("{maxIterations}", String(opts.maxIterations ?? DEFAULT_MAX_ITERATIONS))
		.replaceAll("{maxDepth}", String(opts.maxDepth ?? DEFAULT_MAX_DEPTH))
		.replaceAll("{requiredKeys}", opts.requiredKeys?.length ? opts.requiredKeys.join(", ") : "none")
		.replaceAll("{codeModeDeclarations}", readCodeModeDeclarations());
}
