import type {
	AgentHarnessResources,
	PromptTemplate,
	Skill,
} from "@earendil-works/pi-agent-core";

export type CanonicalResourceKind = "skill" | "prompt-template" | "manual";
export interface ResourceManifestEntryV1 {
	readonly logicalPath: string;
	readonly sha256: string;
	readonly kind: CanonicalResourceKind;
	/** Exact canonical content whose UTF-8 SHA-256 is declared above. */
	readonly content: string;
}
export interface SkillAssetV1 extends Skill {
	readonly filePath: string;
	readonly content: string;
}
export interface PromptTemplateAssetV1 extends PromptTemplate {
	readonly content: string;
}
export interface ManualAssetV1 {
	readonly id: string;
	readonly content: string;
	readonly filePath: string;
}
export interface ToolContractV1 {
	readonly name: string;
	readonly description: string;
	readonly parameters: Readonly<Record<string, unknown>>;
	readonly promptSnippet?: string;
	readonly promptGuidelines: readonly string[];
}
export interface CanonicalAgentHarnessAssetsV1 {
	readonly schemaVersion: 1;
	readonly brainId: string;
	readonly upstream: {
		readonly piAgentCommit: string;
		readonly piExtensionsRevision: string;
	};
	readonly logicalCwd: "/workspace" | `/workspace/${string}`;
	readonly staticSystemPrompt: string;
	readonly resources: {
		readonly skills: readonly SkillAssetV1[];
		readonly promptTemplates: readonly PromptTemplateAssetV1[];
		readonly manuals: readonly ManualAssetV1[];
	};
	readonly tools: readonly ToolContractV1[];
	/** Verifiable identities and content hashes for materialized resources only. */
	readonly resourceManifest: readonly ResourceManifestEntryV1[];
	readonly bundleDigest: string;
}
export interface CanonicalRuntimeIdentity {
	readonly brainId: string;
	readonly clock: { readonly iso: string; readonly local: string };
}
export interface MaterializedCanonicalAssets {
	readonly systemPrompt: string;
	readonly resources: AgentHarnessResources<
		SkillAssetV1,
		PromptTemplateAssetV1
	>;
	readonly tools: readonly ToolContractV1[];
	readonly logicalCwd: string;
}
