import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { composePromptLayers, stripPromptFrontmatter } from "../src/compose.ts";
import {
	canonicalAssetPayload,
	decodeCanonicalAgentAssets,
	encodeCanonicalResourceSegment,
	sha256Hex,
} from "../src/index.ts";
import type {
	CanonicalAgentHarnessAssetsV1,
	ManualAssetV1,
	PromptTemplateAssetV1,
	ResourceManifestEntryV1,
	SkillAssetV1,
	ToolContractV1,
} from "../src/types.ts";

export interface DeclaredDirectoryV1 {
	readonly rootId: string;
	readonly path: string;
}
export interface DeclaredSourceV1 extends DeclaredDirectoryV1 {
	readonly logicalPath: `resource://${string}`;
	readonly stripFrontmatter?: boolean;
}
export interface CanonicalBuildProfileV1 {
	readonly schemaVersion: 1;
	readonly brainId: string;
	readonly upstream: CanonicalAgentHarnessAssetsV1["upstream"];
	readonly workspaceRootId: string;
	readonly logicalCwd: CanonicalAgentHarnessAssetsV1["logicalCwd"];
	readonly documentationPaths: {
		readonly readme: string;
		readonly docs: string;
		readonly examples: string;
	};
	readonly projectContext: readonly DeclaredSourceV1[];
	readonly appendPrompts: readonly DeclaredSourceV1[];
	readonly skillDirectories: readonly DeclaredDirectoryV1[];
	readonly promptTemplatePaths: readonly DeclaredDirectoryV1[];
	readonly manuals: readonly ({ readonly id: string } & DeclaredSourceV1)[];
	readonly tools: readonly ToolContractV1[];
}
export type CanonicalSourceRoots = Readonly<Record<string, string>>;
export function verifyGitHead(root: string, expected: string): void {
	const actual = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
	if (actual !== expected)
		throw new Error(`canonical_assets_revision_mismatch:${expected}:${actual}`);
}
export interface DiscoveredSkill {
	readonly name: string;
	readonly description: string;
	readonly filePath: string;
	readonly disableModelInvocation?: boolean;
}
export interface DiscoveredPromptTemplate {
	readonly name: string;
	readonly description?: string;
	readonly content: string;
	readonly filePath: string;
}
export interface PiResourceBuildAdapter {
	readonly buildSystemPrompt: (options: {
		selectedTools: string[];
		toolSnippets: Record<string, string>;
		promptGuidelines: string[];
		appendSystemPrompt?: string;
		cwd: string;
		documentationPaths: CanonicalBuildProfileV1["documentationPaths"];
		contextFiles: Array<{ path: string; content: string }>;
		skills: SkillAssetV1[];
	}) => string;
	readonly loadSkillsFromDir: (options: { dir: string; source: string }) => {
		skills: DiscoveredSkill[];
		diagnostics: Array<{ severity?: string; message?: string }>;
	};
	readonly loadPromptTemplates: (options: {
		cwd: string;
		agentDir: string;
		promptPaths: string[];
		includeDefaults: boolean;
	}) => DiscoveredPromptTemplate[];
}
function inside(root: string, file: string): boolean {
	const rel = relative(resolve(root), resolve(file));
	return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}
function unique(values: readonly string[], name: string): void {
	if (new Set(values).size !== values.length)
		throw new Error(`canonical_assets_duplicate:${name}`);
}
async function declaredPath(
	entry: DeclaredDirectoryV1,
	roots: CanonicalSourceRoots,
): Promise<string> {
	const root = roots[entry.rootId];
	if (!root) throw new Error(`canonical_assets_unknown_root:${entry.rootId}`);
	if (
		entry.path.length === 0 ||
		entry.path.startsWith("/") ||
		entry.path.split(/[\\/]/).includes("..")
	)
		throw new Error(`canonical_assets_undeclared_path:${entry.path}`);
	const file = resolve(root, entry.path);
	if (!inside(root, file))
		throw new Error(`canonical_assets_undeclared_path:${entry.path}`);
	const [physicalRoot, physicalFile] = await Promise.all([
		realpath(root),
		realpath(file),
	]);
	if (!inside(physicalRoot, physicalFile))
		throw new Error(`canonical_assets_undeclared_path:${entry.path}`);
	return physicalFile;
}
async function source(
	entry: DeclaredSourceV1,
	roots: CanonicalSourceRoots,
): Promise<string> {
	const raw = await readFile(await declaredPath(entry, roots), "utf8");
	const content = entry.stripFrontmatter
		? stripPromptFrontmatter(raw)
		: raw.trim();
	if (!content) throw new Error(`canonical_assets_empty:${entry.logicalPath}`);
	return content;
}
function skillUri(name: string): `resource://${string}` {
	return `resource://skills/${encodeCanonicalResourceSegment(name)}/SKILL.md`;
}
function templateUri(name: string): `resource://${string}` {
	return `resource://prompt-templates/${encodeCanonicalResourceSegment(name)}.md`;
}
export async function compileCanonicalAgentAssets(
	profile: CanonicalBuildProfileV1,
	roots: CanonicalSourceRoots,
	adapter: PiResourceBuildAdapter,
): Promise<CanonicalAgentHarnessAssetsV1> {
	if (profile.schemaVersion !== 1)
		throw new Error("canonical_profile_unsupported_version");
	if (
		profile.logicalCwd !== "/workspace" &&
		!profile.logicalCwd.startsWith("/workspace/")
	)
		throw new Error("canonical_profile_invalid_cwd");
	unique(
		profile.projectContext.map((v) => v.logicalPath),
		"context",
	);
	unique(
		profile.appendPrompts.map((v) => v.logicalPath),
		"append",
	);
	unique(
		profile.tools.map((v) => v.name),
		"tool",
	);
	const declaredWorkspaceRoot = roots[profile.workspaceRootId];
	if (!declaredWorkspaceRoot)
		throw new Error("canonical_assets_unknown_workspace_root");
	const workspaceRoot = await realpath(declaredWorkspaceRoot);
	const resourceManifest: ResourceManifestEntryV1[] = [];
	const contexts: Array<{ path: string; content: string }> = [];
	for (const item of profile.projectContext) {
		const content = await source(item, roots);
		contexts.push({ path: item.logicalPath, content });
	}
	const append: string[] = [];
	for (const item of profile.appendPrompts) {
		append.push(await source(item, roots));
	}
	const skills: SkillAssetV1[] = [];
	for (const declaredDir of profile.skillDirectories) {
		const dir = await declaredPath(declaredDir, roots);
		const result = adapter.loadSkillsFromDir({ dir, source: "fleet-profile" });
		const errors = result.diagnostics.filter((d) => d.severity === "error");
		if (errors.length)
			throw new Error(
				"canonical_assets_skill_diagnostic:" +
					errors.map((e) => e.message).join(";"),
			);
		for (const item of result.skills) {
			const physicalFile = await realpath(item.filePath);
			if (!inside(dir, physicalFile))
				throw new Error(`canonical_assets_skill_escape:${item.filePath}`);
			const raw = await readFile(physicalFile, "utf8");
			skills.push({
				name: item.name,
				description: item.description,
				content: raw,
				filePath: skillUri(item.name),
				...(item.disableModelInvocation
					? { disableModelInvocation: true }
					: {}),
			});
			resourceManifest.push({
				logicalPath: skillUri(item.name),
				sha256: await sha256Hex(raw),
				kind: "skill",
				content: raw,
			});
		}
	}
	unique(
		skills.map((v) => v.name),
		"skill",
	);
	const templateRoots = await Promise.all(
		profile.promptTemplatePaths.map((item) => declaredPath(item, roots)),
	);
	const templates = adapter.loadPromptTemplates({
		cwd: workspaceRoot,
		agentDir: workspaceRoot,
		promptPaths: templateRoots,
		includeDefaults: false,
	});
	const promptTemplates: PromptTemplateAssetV1[] = templates.map((item) => {
		if (!item.content.trim())
			throw new Error(`canonical_assets_empty_template:${item.name}`);
		return {
			name: item.name,
			description: item.description,
			content: item.content,
		};
	});
	for (const item of templates) {
		const physicalFile = await realpath(item.filePath);
		if (!templateRoots.some((root) => inside(root, physicalFile)))
			throw new Error(`canonical_assets_template_escape:${item.filePath}`);
		resourceManifest.push({
			logicalPath: templateUri(item.name),
			sha256: await sha256Hex(item.content),
			kind: "prompt-template",
			content: item.content,
		});
	}
	unique(
		promptTemplates.map((v) => v.name),
		"template",
	);
	const manuals: ManualAssetV1[] = [];
	for (const item of profile.manuals) {
		const content = await source(item, roots);
		manuals.push({
			id: item.id,
			content,
			filePath: item.logicalPath,
		});
		resourceManifest.push({
			logicalPath: item.logicalPath,
			sha256: await sha256Hex(content),
			kind: "manual",
			content,
		});
	}
	unique(
		manuals.map((v) => v.id),
		"manual",
	);
	unique(
		resourceManifest.map((v) => v.logicalPath),
		"source",
	);
	const toolSnippets = Object.fromEntries(
		profile.tools.flatMap((tool) =>
			tool.promptSnippet === undefined ? [] : [[tool.name, tool.promptSnippet]],
		),
	);
	const promptGuidelines = profile.tools.flatMap((t) => t.promptGuidelines);
	const appendSystemPrompt = composePromptLayers(append);
	const staticSystemPrompt = adapter.buildSystemPrompt({
		selectedTools: profile.tools.map((t) => t.name),
		toolSnippets,
		promptGuidelines,
		...(appendSystemPrompt ? { appendSystemPrompt } : {}),
		cwd: profile.logicalCwd,
		documentationPaths: profile.documentationPaths,
		contextFiles: contexts,
		skills,
	});
	if (
		Object.values(roots).some((root) =>
			staticSystemPrompt.includes(resolve(root)),
		) ||
		staticSystemPrompt.includes("/Users/")
	)
		throw new Error("canonical_assets_host_path_in_prompt");
	const draft = {
		schemaVersion: 1 as const,
		brainId: profile.brainId,
		upstream: profile.upstream,
		logicalCwd: profile.logicalCwd,
		staticSystemPrompt,
		resources: { skills, promptTemplates, manuals },
		tools: [...profile.tools],
		resourceManifest: resourceManifest.sort((a, b) =>
			a.logicalPath < b.logicalPath
				? -1
				: a.logicalPath > b.logicalPath
					? 1
					: 0,
		),
		bundleDigest: "0".repeat(64),
	};
	const serialized = JSON.stringify(draft);
	if (Object.values(roots).some((root) => serialized.includes(resolve(root))))
		throw new Error("canonical_assets_host_path_in_artifact");
	for (const [name, value] of Object.entries(process.env)) {
		if (
			value &&
			value.length >= 12 &&
			/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name) &&
			serialized.includes(value)
		)
			throw new Error(`canonical_assets_secret_value:${name}`);
	}
	const artifact = {
		...draft,
		bundleDigest: await sha256Hex(canonicalAssetPayload(draft)),
	};
	return decodeCanonicalAgentAssets(artifact);
}
