import { buildIdentityBlock } from "./compose.ts";
import {
	encodeCanonicalResourceSegment,
	isCanonicalResourceUri,
} from "./resource-uri.ts";
import type {
	CanonicalAgentHarnessAssetsV1,
	CanonicalRuntimeIdentity,
	MaterializedCanonicalAssets,
} from "./types.ts";

export {
	encodeCanonicalResourceSegment,
	isCanonicalResourceUri,
} from "./resource-uri.ts";
export type * from "./types.ts";

export const CANONICAL_ASSET_LIMITS = Object.freeze({
	artifactBytes: 5 * 1024 * 1024,
	staticSystemPromptBytes: 256 * 1024,
	resourceBytes: 512 * 1024,
	skills: 64,
	promptTemplates: 256,
	manuals: 32,
	tools: 64,
	resourceManifestEntries: 512,
	jsonDepth: 32,
	jsonNodes: 10_000,
});

const encoder = new TextEncoder();
const RESOURCE_KINDS = new Set(["skill", "prompt-template", "manual"]);

function object(value: unknown, name: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`canonical_assets_invalid:${name}`);
	}
	return value as Record<string, unknown>;
}

function exact(
	value: Record<string, unknown>,
	keys: readonly string[],
	name: string,
): void {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	if (
		actual.length !== expected.length ||
		actual.some((key, index) => key !== expected[index])
	) {
		throw new Error(`canonical_assets_invalid:${name}_keys`);
	}
}

function text(
	value: unknown,
	name: string,
	maxBytes = Number.POSITIVE_INFINITY,
): string {
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		encoder.encode(value).byteLength > maxBytes
	) {
		throw new Error(`canonical_assets_invalid:${name}`);
	}
	return value;
}

function list(value: unknown, name: string, max: number): unknown[] {
	if (!Array.isArray(value) || value.length > max)
		throw new Error(`canonical_assets_invalid:${name}`);
	return value;
}

function digest(value: unknown, name: string): string {
	const result = text(value, name);
	if (!/^[a-f0-9]{64}$/.test(result))
		throw new Error(`canonical_assets_invalid:${name}`);
	return result;
}

function resourceUri(value: unknown, name: string): string {
	const result = text(value, name);
	if (!isCanonicalResourceUri(result)) {
		throw new Error(`canonical_assets_invalid:${name}`);
	}
	return result;
}

function unique(values: readonly string[], name: string): void {
	if (new Set(values).size !== values.length)
		throw new Error(`canonical_assets_invalid:duplicate_${name}`);
}

function validateJsonShape(value: unknown): void {
	const seen = new Set<object>();
	const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
	let nodes = 0;
	while (stack.length > 0) {
		const current = stack.pop();
		if (
			!current ||
			++nodes > CANONICAL_ASSET_LIMITS.jsonNodes ||
			current.depth > CANONICAL_ASSET_LIMITS.jsonDepth
		) {
			throw new Error("canonical_assets_invalid:json_shape");
		}
		const item = current.value;
		if (
			item === null ||
			typeof item === "string" ||
			typeof item === "boolean"
		) {
			continue;
		}
		if (typeof item === "number") {
			if (!Number.isFinite(item))
				throw new Error("canonical_assets_invalid:json_shape");
			continue;
		}
		if (typeof item !== "object" || seen.has(item))
			throw new Error("canonical_assets_invalid:json_shape");
		seen.add(item);
		if (!Array.isArray(item)) {
			const prototype = Object.getPrototypeOf(item);
			if (prototype !== Object.prototype && prototype !== null)
				throw new Error("canonical_assets_invalid:json_shape");
		}
		for (const child of Object.values(item as Record<string, unknown>)) {
			stack.push({ value: child, depth: current.depth + 1 });
		}
	}
}

function stable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stable);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(
		Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => [key, stable((value as Record<string, unknown>)[key])]),
	);
}

export function canonicalAssetPayload(
	value: CanonicalAgentHarnessAssetsV1,
): string {
	validateJsonShape(value);
	const { bundleDigest: _, ...payload } = value;
	return JSON.stringify(stable(payload));
}

export async function sha256Hex(value: string): Promise<string> {
	const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
	return [...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function deepFreeze<T>(value: T): T {
	if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const item of Object.values(value as Record<string, unknown>))
			deepFreeze(item);
	}
	return value;
}

export async function decodeCanonicalAgentAssets(
	value: unknown,
): Promise<CanonicalAgentHarnessAssetsV1> {
	validateJsonShape(value);
	const serialized = JSON.stringify(value);
	if (
		encoder.encode(serialized).byteLength > CANONICAL_ASSET_LIMITS.artifactBytes
	) {
		throw new Error("canonical_assets_too_large");
	}
	if (/(?:\/Users\/|\/home\/|\/var\/folders\/|[A-Za-z]:\\\\)/.test(serialized))
		throw new Error("canonical_assets_host_path");

	const root = object(value, "root");
	exact(
		root,
		[
			"schemaVersion",
			"brainId",
			"upstream",
			"logicalCwd",
			"staticSystemPrompt",
			"resources",
			"tools",
			"resourceManifest",
			"bundleDigest",
		],
		"root",
	);
	if (root.schemaVersion !== 1)
		throw new Error("canonical_assets_unsupported_version");
	if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(text(root.brainId, "brainId"))) {
		throw new Error("canonical_assets_invalid:brainId");
	}

	const upstream = object(root.upstream, "upstream");
	exact(upstream, ["piAgentCommit", "piExtensionsRevision"], "upstream");
	if (!/^[a-f0-9]{40}$/.test(text(upstream.piAgentCommit, "piAgentCommit"))) {
		throw new Error("canonical_assets_invalid:piAgentCommit");
	}
	if (
		!/^[a-f0-9]{40}$/.test(
			text(upstream.piExtensionsRevision, "piExtensionsRevision"),
		)
	) {
		throw new Error("canonical_assets_invalid:piExtensionsRevision");
	}

	const logicalCwd = text(root.logicalCwd, "logicalCwd");
	if (
		!/^\/workspace(?:\/[A-Za-z0-9._-]+)*$/.test(logicalCwd) ||
		logicalCwd.split("/").some((segment) => segment === "." || segment === "..")
	) {
		throw new Error("canonical_assets_invalid:logicalCwd");
	}
	text(
		root.staticSystemPrompt,
		"staticSystemPrompt",
		CANONICAL_ASSET_LIMITS.staticSystemPromptBytes,
	);

	const resources = object(root.resources, "resources");
	exact(resources, ["skills", "promptTemplates", "manuals"], "resources");
	type ExpectedManifest = {
		readonly kind: "skill" | "prompt-template" | "manual";
		readonly content: string;
	};
	const expectedManifest = new Map<string, ExpectedManifest>();
	const registerExpectedManifest = (
		logicalPath: string,
		expected: ExpectedManifest,
	): void => {
		if (expectedManifest.has(logicalPath))
			throw new Error("canonical_assets_duplicate:resource_source");
		expectedManifest.set(logicalPath, expected);
	};
	const skillNames: string[] = [];
	for (const [index, item] of list(
		resources.skills,
		"skills",
		CANONICAL_ASSET_LIMITS.skills,
	).entries()) {
		const skill = object(item, `skill${index}`);
		const allowed = [
			"name",
			"description",
			"content",
			"filePath",
			"disableModelInvocation",
		];
		if (Object.keys(skill).some((key) => !allowed.includes(key)))
			throw new Error("canonical_assets_invalid:skill_keys");
		const name = text(skill.name, "skill.name");
		skillNames.push(name);
		text(skill.description, "skill.description");
		const content = text(
			skill.content,
			"skill.content",
			CANONICAL_ASSET_LIMITS.resourceBytes,
		);
		const filePath = resourceUri(skill.filePath, "skill.filePath");
		const expectedPath = `resource://skills/${encodeCanonicalResourceSegment(name)}/SKILL.md`;
		if (filePath !== expectedPath)
			throw new Error("canonical_assets_invalid:skill.filePath");
		registerExpectedManifest(expectedPath, { kind: "skill", content });
		if (
			skill.disableModelInvocation !== undefined &&
			typeof skill.disableModelInvocation !== "boolean"
		) {
			throw new Error("canonical_assets_invalid:skill.disableModelInvocation");
		}
	}
	unique(skillNames, "skill");

	const templateNames: string[] = [];
	for (const [index, item] of list(
		resources.promptTemplates,
		"promptTemplates",
		CANONICAL_ASSET_LIMITS.promptTemplates,
	).entries()) {
		const template = object(item, `template${index}`);
		const allowed = ["name", "description", "content"];
		if (Object.keys(template).some((key) => !allowed.includes(key)))
			throw new Error("canonical_assets_invalid:template_keys");
		const name = text(template.name, "template.name");
		templateNames.push(name);
		if (
			template.description !== undefined &&
			typeof template.description !== "string"
		) {
			throw new Error("canonical_assets_invalid:template.description");
		}
		const content = text(
			template.content,
			"template.content",
			CANONICAL_ASSET_LIMITS.resourceBytes,
		);
		registerExpectedManifest(
			`resource://prompt-templates/${encodeCanonicalResourceSegment(name)}.md`,
			{ kind: "prompt-template", content },
		);
	}
	unique(templateNames, "template");

	const manualIds: string[] = [];
	for (const [index, item] of list(
		resources.manuals,
		"manuals",
		CANONICAL_ASSET_LIMITS.manuals,
	).entries()) {
		const manual = object(item, `manual${index}`);
		exact(manual, ["id", "content", "filePath"], "manual");
		manualIds.push(text(manual.id, "manual.id"));
		const content = text(
			manual.content,
			"manual.content",
			CANONICAL_ASSET_LIMITS.resourceBytes,
		);
		const filePath = resourceUri(manual.filePath, "manual.filePath");
		registerExpectedManifest(filePath, { kind: "manual", content });
	}
	unique(manualIds, "manual");

	const toolNames: string[] = [];
	for (const [index, item] of list(
		root.tools,
		"tools",
		CANONICAL_ASSET_LIMITS.tools,
	).entries()) {
		const tool = object(item, `tool${index}`);
		const allowed = [
			"name",
			"description",
			"parameters",
			"promptSnippet",
			"promptGuidelines",
		];
		if (Object.keys(tool).some((key) => !allowed.includes(key)))
			throw new Error("canonical_assets_invalid:tool_keys");
		toolNames.push(text(tool.name, "tool.name"));
		text(tool.description, "tool.description");
		object(tool.parameters, "tool.parameters");
		if (tool.promptSnippet !== undefined)
			text(tool.promptSnippet, "tool.promptSnippet");
		for (const guideline of list(
			tool.promptGuidelines,
			"tool.promptGuidelines",
			64,
		)) {
			text(guideline, "tool.promptGuideline");
		}
	}
	unique(toolNames, "tool");

	const resourcePaths: string[] = [];
	for (const [index, item] of list(
		root.resourceManifest,
		"resourceManifest",
		CANONICAL_ASSET_LIMITS.resourceManifestEntries,
	).entries()) {
		const resource = object(item, `resource${index}`);
		exact(
			resource,
			["logicalPath", "sha256", "kind", "content"],
			"resourceManifestEntry",
		);
		const logicalPath = resourceUri(
			resource.logicalPath,
			"resource.logicalPath",
		);
		resourcePaths.push(logicalPath);
		const declaredDigest = digest(resource.sha256, "resource.sha256");
		const content = text(
			resource.content,
			"resource.content",
			CANONICAL_ASSET_LIMITS.resourceBytes,
		);
		if ((await sha256Hex(content)) !== declaredDigest)
			throw new Error("canonical_assets_resource_digest_mismatch");
		if (
			typeof resource.kind !== "string" ||
			!RESOURCE_KINDS.has(resource.kind)
		) {
			throw new Error("canonical_assets_invalid:resource.kind");
		}
		const expected = expectedManifest.get(logicalPath);
		if (!expected)
			throw new Error("canonical_assets_unexpected_resource_manifest_entry");
		if (resource.kind !== expected.kind || content !== expected.content)
			throw new Error("canonical_assets_resource_relation_mismatch");
		expectedManifest.delete(logicalPath);
	}
	unique(resourcePaths, "resource");
	let previousPath: string | undefined;
	for (const path of resourcePaths) {
		if (previousPath !== undefined && previousPath >= path)
			throw new Error("canonical_assets_invalid:resource_order");
		previousPath = path;
	}
	if (expectedManifest.size !== 0)
		throw new Error("canonical_assets_missing_resource_manifest_entry");

	const artifact = root as unknown as CanonicalAgentHarnessAssetsV1;
	const expected = digest(root.bundleDigest, "bundleDigest");
	const actual = await sha256Hex(canonicalAssetPayload(artifact));
	if (actual !== expected) throw new Error("canonical_assets_digest_mismatch");
	return deepFreeze(structuredClone(artifact));
}

export function materializeCanonicalAgentAssets(
	assets: CanonicalAgentHarnessAssetsV1,
	identity: CanonicalRuntimeIdentity,
): MaterializedCanonicalAssets {
	if (
		identity.brainId !== assets.brainId ||
		typeof identity.clock?.iso !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(identity.clock.iso) ||
		new Date(identity.clock.iso).toISOString() !== identity.clock.iso ||
		typeof identity.clock?.local !== "string" ||
		identity.clock.local.length === 0 ||
		encoder.encode(identity.clock.local).byteLength > 256
	)
		throw new Error("canonical_assets_runtime_identity_mismatch");
	return {
		systemPrompt: `${assets.staticSystemPrompt}\n\n${buildIdentityBlock(identity.brainId, identity.clock)}`,
		resources: {
			skills: structuredClone([...assets.resources.skills]),
			promptTemplates: structuredClone([...assets.resources.promptTemplates]),
		},
		tools: assets.tools,
		logicalCwd: assets.logicalCwd,
	};
}
