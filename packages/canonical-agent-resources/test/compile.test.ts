import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
	type CanonicalBuildProfileV1,
	compileCanonicalAgentAssets,
	type PiResourceBuildAdapter,
	verifyGitHead,
} from "../node/compile.ts";
import {
	canonicalAssetPayload,
	decodeCanonicalAgentAssets,
	materializeCanonicalAgentAssets,
	sha256Hex,
} from "../src/index.ts";
import type { CanonicalAgentHarnessAssetsV1 } from "../src/types.ts";

setDefaultTimeout(15_000);
const cleanup: string[] = [];
afterEach(async () => {
	await Promise.all(
		cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })),
	);
});
async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "canonical-assets-"));
	cleanup.push(root);
	await mkdir(join(root, "skills", "example"), { recursive: true });
	await mkdir(join(root, "prompts"), { recursive: true });
	await writeFile(
		join(root, "AGENTS.md"),
		"# Project rules\n\nKeep state durable.\n",
	);
	await writeFile(
		join(root, "default.md"),
		"---\ntitle: layer\n---\nStatic approved layer.\n",
	);
	await writeFile(join(root, "manual.md"), "# Manual\n\nBounded help.\n");
	await writeFile(
		join(root, "skills", "example", "SKILL.md"),
		"---\nname: example\ndescription: Example skill\n---\nUse this skill exactly.\n",
	);
	await writeFile(
		join(root, "prompts", "ship safely (reviewed).md"),
		"---\ndescription: Ship safely\n---\nShip $ARGUMENTS safely.\n",
	);
	return root;
}
async function adapter(): Promise<PiResourceBuildAdapter> {
	return {
		buildSystemPrompt: (options) =>
			[
				`Available tools:\n${options.selectedTools.length > 0 ? options.selectedTools.join("\n") : "(none)"}`,
				options.cwd,
				options.documentationPaths.readme,
				options.documentationPaths.docs,
				options.documentationPaths.examples,
				...options.contextFiles.flatMap((item) => [item.path, item.content]),
				options.appendSystemPrompt ?? "",
			].join("\n"),
		loadSkillsFromDir: ({ dir }) => ({
			skills: [
				{
					name: "Simplified Technical English (ASD-STE100)",
					description: "Example skill",
					filePath: join(dir, "example", "SKILL.md"),
				},
			],
			diagnostics: [],
		}),
		loadPromptTemplates: ({ promptPaths }) =>
			promptPaths.flatMap((dir) =>
				readdirSync(dir)
					.filter((name) => name.endsWith(".md"))
					.sort()
					.map((name) => {
						const filePath = join(dir, name);
						const raw = readFileSync(filePath, "utf8");
						const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
						const description = frontmatter?.[1]?.match(
							/^description:\s*(.+)$/m,
						)?.[1];
						return {
							name: basename(name, ".md"),
							...(description === undefined ? {} : { description }),
							content: frontmatter?.[2] ?? raw,
							filePath,
						};
					}),
			),
	};
}
function profile(): CanonicalBuildProfileV1 {
	return {
		schemaVersion: 1,
		brainId: "coordinator",
		upstream: {
			piAgentCommit: "db545784820d3116319998476f24203fa3779d0b",
			piExtensionsRevision: "1111111111111111111111111111111111111111",
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
				logicalPath: "resource://pi-extensions/default.md",
				stripFrontmatter: true,
			},
		],
		skillDirectories: [{ rootId: "workspace", path: "skills" }],
		promptTemplatePaths: [{ rootId: "workspace", path: "prompts" }],
		manuals: [
			{
				id: "operator",
				rootId: "workspace",
				path: "manual.md",
				logicalPath: "resource://pi-extensions/manual.md",
			},
		],
		tools: [],
	};
}
async function redigest(
	value: Omit<CanonicalAgentHarnessAssetsV1, "bundleDigest"> & {
		readonly bundleDigest?: string;
	},
): Promise<CanonicalAgentHarnessAssetsV1> {
	const draft = {
		...value,
		bundleDigest: "0".repeat(64),
	} satisfies CanonicalAgentHarnessAssetsV1;
	return {
		...draft,
		bundleDigest: await sha256Hex(canonicalAssetPayload(draft)),
	};
}

describe("canonical agent assets compiler", () => {
	test("composes adapter output with only logical model-visible paths", async () => {
		const root = await fixture();
		const artifact = await compileCanonicalAgentAssets(
			profile(),
			{ workspace: root },
			await adapter(),
		);
		const decoded = await decodeCanonicalAgentAssets(artifact);
		expect(decoded.staticSystemPrompt).toContain("Available tools:\n(none)");
		expect(decoded.staticSystemPrompt).toContain(
			"resource://workspace/AGENTS.md",
		);
		expect(decoded.staticSystemPrompt).toContain("resource://pi/README.md");
		expect(decoded.staticSystemPrompt).toContain("Static approved layer.");
		expect(decoded.staticSystemPrompt).not.toContain(root);
		expect(decoded.resources.skills[0]).toMatchObject({
			name: "Simplified Technical English (ASD-STE100)",
			filePath:
				"resource://skills/Simplified%20Technical%20English%20%28ASD-STE100%29/SKILL.md",
		});
		expect(decoded.resources.promptTemplates[0]).toMatchObject({
			name: "ship safely (reviewed)",
			description: "Ship safely",
		});
		expect(
			decoded.resourceManifest.map((entry) => entry.logicalPath),
		).toContain(
			"resource://prompt-templates/ship%20safely%20%28reviewed%29.md",
		);
		expect(decoded.resources.manuals[0]).toEqual({
			id: "operator",
			content: "# Manual\n\nBounded help.",
			filePath: "resource://pi-extensions/manual.md",
		});
		expect(decoded.resourceManifest.length).toBe(3);
		expect(decoded.resourceManifest.map((entry) => entry.kind).sort()).toEqual([
			"manual",
			"prompt-template",
			"skill",
		]);
		expect(
			decoded.resourceManifest.some((entry) =>
				[
					"resource://pi-extensions/default.md",
					"resource://workspace/AGENTS.md",
				].includes(entry.logicalPath),
			),
		).toBe(false);
		expect(() =>
			materializeCanonicalAgentAssets(decoded, {
				brainId: "other",
				clock: { iso: "2026-08-20T00:00:00.000Z", local: "Aug 20" },
			}),
		).toThrow("canonical_assets_runtime_identity_mismatch");
		await expect(
			decodeCanonicalAgentAssets({
				...artifact,
				logicalCwd: "/workspace/../escape",
			}),
		).rejects.toThrow("canonical_assets_invalid:logicalCwd");
		await expect(
			decodeCanonicalAgentAssets({
				...artifact,
				staticSystemPrompt: "/home/operator/secret",
			}),
		).rejects.toThrow("canonical_assets_host_path");
	});
	test("preserves declared workspace documentation paths", async () => {
		const root = await fixture();
		const declared = profile();
		const artifact = await compileCanonicalAgentAssets(
			{ ...declared, documentationPaths: { readme: "/workspace/README.md", docs: "/workspace/docs", examples: "/workspace/packages/canonical-agent-resources" } },
			{ workspace: root },
			await adapter(),
		);
		const decoded = await decodeCanonicalAgentAssets(artifact);
		expect(decoded.staticSystemPrompt).toContain("/workspace/README.md");
		expect(decoded.staticSystemPrompt).toContain("/workspace/docs");
		expect(decoded.staticSystemPrompt).toContain("/workspace/packages/canonical-agent-resources");
	});
	test("rejects empty declared prompt templates", async () => {
		const root = await fixture();
		await writeFile(
			join(root, "prompts", "empty.md"),
			"---\ndescription: Empty\n---\n",
		);
		await expect(
			compileCanonicalAgentAssets(
				profile(),
				{ workspace: root },
				await adapter(),
			),
		).rejects.toThrow("canonical_assets_empty_template:empty");
	});
	test("rejects actual build secret values without rejecting variable names", async () => {
		const root = await fixture();
		const secret = "fleet-test-secret-value-9eaf2d";
		process.env.CANONICAL_TEST_API_KEY = secret;
		await writeFile(
			join(root, "AGENTS.md"),
			`Use CANONICAL_TEST_API_KEY, never print ${secret}.\n`,
		);
		try {
			await expect(
				compileCanonicalAgentAssets(
					profile(),
					{ workspace: root },
					await adapter(),
				),
			).rejects.toThrow("canonical_assets_secret_value:CANONICAL_TEST_API_KEY");
		} finally {
			delete process.env.CANONICAL_TEST_API_KEY;
		}
	});
	test("rejects physical checkout paths anywhere in resources", async () => {
		const root = await fixture();
		await writeFile(join(root, "manual.md"), `Do not expose ${root}.\n`);
		await expect(
			compileCanonicalAgentAssets(
				profile(),
				{ workspace: root },
				await adapter(),
			),
		).rejects.toThrow("canonical_assets_host_path_in_artifact");
	});
	test("rejects a mismatched reviewed Pi HEAD", async () => {
		const root = await mkdtemp(join(tmpdir(), "canonical-git-"));
		cleanup.push(root);
		await writeFile(join(root, "tracked.txt"), "reviewed\n");
		execFileSync("git", ["-C", root, "init", "--quiet"]);
		execFileSync("git", ["-C", root, "add", "tracked.txt"]);
		execFileSync("git", [
			"-C",
			root,
			"-c",
			"core.hooksPath=/dev/null",
			"-c",
			"user.name=Canonical Test",
			"-c",
			"user.email=canonical@example.invalid",
			"commit",
			"--quiet",
			"-m",
			"fixture",
		]);
		expect(() =>
			verifyGitHead(root, "0000000000000000000000000000000000000000"),
		).toThrow("canonical_assets_revision_mismatch");
	});
	test("strictly rejects unknown artifact fields and oversized prompt bytes", async () => {
		const root = await fixture();
		const artifact = await compileCanonicalAgentAssets(
			profile(),
			{ workspace: root },
			await adapter(),
		);
		await expect(
			decodeCanonicalAgentAssets({ ...artifact, unknown: true }),
		).rejects.toThrow("canonical_assets_invalid:root_keys");
		await expect(
			decodeCanonicalAgentAssets({
				...artifact,
				staticSystemPrompt: "x".repeat(257 * 1024),
			}),
		).rejects.toThrow("canonical_assets_invalid:staticSystemPrompt");
		for (const logicalPath of [
			"resource://skills/%2e%2e/SKILL.md",
			"resource://skills/%2F/SKILL.md",
			"resource://skills/%65xample/SKILL.md",
			"resource://skills/raw name/SKILL.md",
		]) {
			await expect(
				decodeCanonicalAgentAssets({
					...artifact,
					resourceManifest: [
						{ ...artifact.resourceManifest[0], logicalPath },
						...artifact.resourceManifest.slice(1),
					],
				}),
			).rejects.toThrow("canonical_assets_invalid:resource.logicalPath");
		}
	});
	test("rejects aggregate digest tampering", async () => {
		const root = await fixture();
		const artifact = await compileCanonicalAgentAssets(
			profile(),
			{ workspace: root },
			await adapter(),
		);
		await expect(
			decodeCanonicalAgentAssets({
				...artifact,
				staticSystemPrompt: `${artifact.staticSystemPrompt}tampered`,
			}),
		).rejects.toThrow("canonical_assets_digest_mismatch");
	});
	test("rejects redigested resource identity and provenance mismatches", async () => {
		const root = await fixture();
		const artifact = await compileCanonicalAgentAssets(
			profile(),
			{ workspace: root },
			await adapter(),
		);
		const skill = artifact.resources.skills[0];
		const skillSource = artifact.resourceManifest.find(
			(source) => source.kind === "skill",
		);
		const templateSource = artifact.resourceManifest.find(
			(source) => source.kind === "prompt-template",
		);
		if (!skill || !skillSource || !templateSource)
			throw new Error("invalid test fixture");

		const mismatchedSkillPath = await redigest({
			...artifact,
			resources: {
				...artifact.resources,
				skills: [
					{ ...skill, filePath: "resource://skills/other/SKILL.md" },
					...artifact.resources.skills.slice(1),
				],
			},
		});
		const missingSkillSource = await redigest({
			...artifact,
			resourceManifest: artifact.resourceManifest.filter(
				(source) => source.logicalPath !== skillSource.logicalPath,
			),
		});
		const wrongSkillDigest = await redigest({
			...artifact,
			resourceManifest: artifact.resourceManifest.map((source) =>
				source.logicalPath === skillSource.logicalPath
					? { ...source, sha256: "0".repeat(64) }
					: source,
			),
		});
		const forgedSkillContent = "forged canonical skill source";
		const forgedSkillSource = await redigest({
			...artifact,
			resourceManifest: await Promise.all(
				artifact.resourceManifest.map(async (source) =>
					source.logicalPath === skillSource.logicalPath
						? {
								...source,
								content: forgedSkillContent,
								sha256: await sha256Hex(forgedSkillContent),
							}
						: source,
				),
			),
		});
		const wrongTemplateKind = await redigest({
			...artifact,
			resourceManifest: artifact.resourceManifest.map((source) =>
				source.logicalPath === templateSource.logicalPath
					? { ...source, kind: "manual" as const }
					: source,
			),
		});
		const forgedPromptInputs = await Promise.all(
			[
				{
					logicalPath: "resource://pi-extensions/default.md",
					kind: "append-prompt",
				},
				{
					logicalPath: "resource://workspace/AGENTS.md",
					kind: "project-context",
				},
			].map(async ({ logicalPath, kind }) => {
				const content = `forged ${kind}`;
				return redigest({
					...artifact,
					resourceManifest: [
						...artifact.resourceManifest,
						{
							logicalPath,
							kind: kind as never,
							content,
							sha256: await sha256Hex(content),
						},
					],
				});
			}),
		);

		await expect(
			decodeCanonicalAgentAssets(mismatchedSkillPath),
		).rejects.toThrow("canonical_assets_invalid:skill.filePath");
		await expect(
			decodeCanonicalAgentAssets(missingSkillSource),
		).rejects.toThrow("canonical_assets_missing_resource_manifest_entry");
		await expect(decodeCanonicalAgentAssets(wrongSkillDigest)).rejects.toThrow(
			"canonical_assets_resource_digest_mismatch",
		);
		await expect(decodeCanonicalAgentAssets(forgedSkillSource)).rejects.toThrow(
			"canonical_assets_resource_relation_mismatch",
		);
		await expect(decodeCanonicalAgentAssets(wrongTemplateKind)).rejects.toThrow(
			"canonical_assets_resource_relation_mismatch",
		);
		for (const forgedPromptInput of forgedPromptInputs) {
			await expect(
				decodeCanonicalAgentAssets(forgedPromptInput),
			).rejects.toThrow("canonical_assets_invalid:resource.kind");
		}
	});
	test("rejects hostile JSON depth and node counts with stable errors", async () => {
		const root = await fixture();
		const artifact = await compileCanonicalAgentAssets(
			profile(),
			{ workspace: root },
			await adapter(),
		);
		let nested: Record<string, unknown> = {};
		for (let depth = 0; depth < 40; depth++) nested = { nested };
		for (const parameters of [
			nested,
			{ nodes: Array.from({ length: 10_001 }, () => null) },
		]) {
			await expect(
				decodeCanonicalAgentAssets({
					...artifact,
					tools: [
						{
							name: "hostile",
							description: "hostile",
							parameters,
							promptGuidelines: [],
						},
					],
				}),
			).rejects.toThrow("canonical_assets_invalid:json_shape");
		}
	});

	test("rejects sources outside the declared workspace", async () => {
		const root = await fixture();
		const invalid = {
			...profile(),
			projectContext: [
				{
					rootId: "workspace",
					path: "../outside.md",
					logicalPath: "resource://workspace/outside.md" as const,
				},
			],
		};
		await expect(
			compileCanonicalAgentAssets(
				invalid,
				{ workspace: root },
				await adapter(),
			),
		).rejects.toThrow("canonical_assets_undeclared_path");
		const outside = await fixture();
		await symlink(join(outside, "AGENTS.md"), join(root, "linked-agents.md"));
		const linked = {
			...profile(),
			projectContext: [
				{
					rootId: "workspace",
					path: "linked-agents.md",
					logicalPath: "resource://workspace/AGENTS.md" as const,
				},
			],
		};
		await expect(
			compileCanonicalAgentAssets(linked, { workspace: root }, await adapter()),
		).rejects.toThrow("canonical_assets_undeclared_path");
	});
});
