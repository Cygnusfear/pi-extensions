import { findLatestPerFamily, type ModelLike } from "@pi-extensions/shared/model-utils";

export const MODEL_HINTS_HEADING = "## Latest available models";

/**
 * Apply the model-hints extension's deterministic prompt transformation.
 *
 * This is intentionally runtime-neutral: local pi and workerd adapters must
 * call this same function so the extension has one behavioral source.
 */
export function applyModelHints(systemPrompt: string, models: readonly ModelLike[]): string {
	if (models.length === 0) return systemPrompt;

	const latest = findLatestPerFamily([...models]);
	if (latest.size === 0) return systemPrompt;

	const lines = Array.from(latest.values())
		.sort((a, b) => `${a.provider}/${a.id}`.localeCompare(`${b.provider}/${b.id}`))
		.map((model) => `- ${model.provider}/${model.id} (${model.name})`);

	const hint = [
		"",
		MODEL_HINTS_HEADING,
		"When delegating to workers or switching models, prefer these (newest per family):",
		...lines,
	].join("\n");

	return systemPrompt + hint;
}
