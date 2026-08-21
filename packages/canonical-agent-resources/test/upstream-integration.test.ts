import { afterAll, expect, setDefaultTimeout, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	type CanonicalBuildProfileV1,
	compileCanonicalAgentAssets,
	verifyGitHead,
} from "../node/compile.ts";
import { decodeCanonicalAgentAssets } from "../src/index.ts";

setDefaultTimeout(15_000);
const piRoot = process.env.PI_AGENT_SOURCE_ROOT;
if (!piRoot) throw new Error("PI_AGENT_SOURCE_ROOT is required");
const piHead = execFileSync("git", ["-C", piRoot, "rev-parse", "HEAD"], {
	encoding: "utf8",
}).trim();
verifyGitHead(piRoot, piHead);
const core = join(piRoot, "packages/coding-agent/src/core");
const [{ buildSystemPrompt }, { loadSkillsFromDir }, { loadPromptTemplates }] =
	await Promise.all([
		import(pathToFileURL(join(core, "system-prompt.ts")).href),
		import(pathToFileURL(join(core, "skills.ts")).href),
		import(pathToFileURL(join(core, "prompt-templates.ts")).href),
	]);
const root = await mkdtemp(join(tmpdir(), "canonical-upstream-"));
afterAll(() => rm(root, { recursive: true, force: true }));

test("compiles through the reviewed Pi source seam", async () => {
	await mkdir(join(root, "skills", "asd-ste100-skill"), { recursive: true });
	await mkdir(join(root, "prompts"), { recursive: true });
	await writeFile(join(root, "AGENTS.md"), "# Rules\n\nStay bounded.\n");
	await writeFile(join(root, "default.md"), "Approved static layer.\n");
	await writeFile(
		join(root, "skills", "asd-ste100-skill", "SKILL.md"),
		"---\nname: Simplified Technical English (ASD-STE100)\ndescription: Write in the reviewed ASD-STE100 shape\n---\nUse short, explicit procedural sentences.\n",
	);
	await writeFile(
		join(root, "prompts", "ship.md"),
		"---\ndescription: Ship safely\n---\nShip safely.\n",
	);
	const profile: CanonicalBuildProfileV1 = {
		schemaVersion: 1,
		brainId: "coordinator",
		upstream: {
			piAgentCommit: piHead,
			piExtensionsRevision: "1".repeat(40),
		},
		workspaceRootId: "workspace",
		logicalCwd: "/workspace",
		documentationPaths: {
			readme: "resource://pi/README.md",
			docs: "resource://pi/docs",
			examples: "resource://pi/examples",
		},
		projectContext: [
			{
				rootId: "workspace",
				path: "AGENTS.md",
				logicalPath: "resource://workspace/AGENTS.md",
			},
		],
		appendPrompts: [
			{
				rootId: "workspace",
				path: "default.md",
				logicalPath: "resource://workspace/default.md",
			},
		],
		skillDirectories: [{ rootId: "workspace", path: "skills" }],
		promptTemplatePaths: [{ rootId: "workspace", path: "prompts" }],
		manuals: [],
		tools: [],
	};
	const artifact = await compileCanonicalAgentAssets(
		profile,
		{ workspace: root },
		{ buildSystemPrompt, loadSkillsFromDir, loadPromptTemplates },
	);
	const decoded = await decodeCanonicalAgentAssets(artifact);
	expect(decoded.upstream.piAgentCommit).toBe(piHead);
	expect(decoded.staticSystemPrompt).toContain("resource://pi/README.md");
	expect(decoded.staticSystemPrompt).toContain(
		"resource://workspace/AGENTS.md",
	);
	expect(decoded.staticSystemPrompt).not.toContain(root);
	expect(decoded.resources.skills).toEqual([
		{
			name: "Simplified Technical English (ASD-STE100)",
			description: "Write in the reviewed ASD-STE100 shape",
			content:
				"---\nname: Simplified Technical English (ASD-STE100)\ndescription: Write in the reviewed ASD-STE100 shape\n---\nUse short, explicit procedural sentences.\n",
			filePath:
				"resource://skills/Simplified%20Technical%20English%20%28ASD-STE100%29/SKILL.md",
		},
	]);
	expect(decoded.resources.promptTemplates).toEqual([
		{
			name: "ship",
			description: "Ship safely",
			content: "Ship safely.",
		},
	]);
});
