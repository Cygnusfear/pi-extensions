import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TeamTemplate {
	worktree?: boolean;
	model?: string;
	prompt?: string;
	freeform?: boolean; // When true, skip GUARD PROTOCOL — coordinator controls ticket lifecycle
}

const CONFIG_PATH = path.join(os.homedir(), ".pi", "agent", "team-templates.json");

let cachedTemplates: Record<string, TeamTemplate> | null = null;
let cachedMtime = 0;

export function loadTemplates(): Record<string, TeamTemplate> {
	try {
		const stat = fs.statSync(CONFIG_PATH);
		if (cachedTemplates && stat.mtimeMs === cachedMtime) return cachedTemplates;
		const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
		cachedTemplates = JSON.parse(raw);
		cachedMtime = stat.mtimeMs;
		return cachedTemplates!;
	} catch {
		return {};
	}
}

export function resolveTemplate(templateName: string): TeamTemplate | undefined {
	const templates = loadTemplates();
	return templates[templateName];
}

export function listTemplates(): Array<{ name: string } & TeamTemplate> {
	const templates = loadTemplates();
	return Object.entries(templates).map(([name, t]) => ({ name, ...t }));
}
