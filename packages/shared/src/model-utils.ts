/**
 * Shared model resolution utilities.
 *
 * Used by model-shortcuts (slash commands) and model-hints (system prompt injection).
 */

export interface ModelLike {
	id: string;
	name: string;
	provider: string;
}

export interface RegistryLike {
	getAll(): ModelLike[];
	getAvailable(): ModelLike[];
}

// Model families — regex → human label
export const FAMILY_PATTERNS: [RegExp, string][] = [
	[/^claude-opus-/, "claude-opus"],
	[/^claude-sonnet-/, "claude-sonnet"],
	[/^claude-haiku-/, "claude-haiku"],
	[/^gpt-.*-codex$/, "gpt-codex"],
	[/^gpt-5/, "gpt-5"],
	[/^gpt-4/, "gpt-4"],
	[/^o[1-9]/, "o-series"],
	[/^gemini-2/, "gemini-2"],
	[/^gemini-1/, "gemini-1"],
	[/^glm-5v/, "glm-5v"],
	[/^glm-5\.1/, "glm-5.1"],
	[/^glm-5\.2/, "glm-5.2"],
	[/^glm-5-turbo/, "glm-5-turbo"],
	[/^glm-5$/, "glm-5"],
	[/^glm-4.7$/, "glm-4.7"],
	[/^k\d+p/, "kimi-k"],
];

/** Get the family label for a model ID, or null if unrecognized. */
export function getFamily(modelId: string): string | null {
	for (const [re, family] of FAMILY_PATTERNS) {
		if (re.test(modelId)) return family;
	}
	return null;
}

/**
 * Extract a comparable version number from a model ID.
 *
 * Returns null for dated/pinned models (20250514), -latest aliases,
 * and -thinking variants — those shouldn't be picked as "latest".
 */
export function extractVersion(modelId: string): number | null {
	if (/\d{8}/.test(modelId)) return null;
	if (modelId.endsWith("-latest")) return null;
	if (modelId.endsWith("-thinking")) return null;

	// claude-opus-4-6 → 4.6, gpt-5.3-codex → 5.3
	const match = modelId.match(/(\d+)[-.](\d+)/);
	if (match) return parseFloat(`${match[1]}.${match[2]}`);

	// k2p6 → 2.6
	const kMatch = modelId.match(/k(\d+)p(\d+)/);
	if (kMatch) return parseFloat(kMatch[1] + "." + kMatch[2]);

	// Single version: claude-haiku-4 → 4
	const single = modelId.match(/-(\d+)(?:-|$)/);
	if (single) return parseInt(single[1]);

	return null;
}

/**
 * Should this model be excluded from "latest" selection?
 *
 * Separate from extractVersion: a model can have no parseable version
 * (e.g. `glm-5v-turbo`, `glm-4.5-air`) yet still be the sole member of
 * its family and therefore a valid "latest" pick. Only dated pins,
 * `-latest` aliases, and `-thinking` variants are excluded outright.
 */
export function isExcludedFromLatest(modelId: string): boolean {
	if (/\d{8}/.test(modelId)) return true;
	if (modelId.endsWith("-latest")) return true;
	if (modelId.endsWith("-thinking")) return true;
	return false;
}

export interface LatestModel {
	provider: string;
	id: string;
	name: string;
	family: string;
	version: number;
}

/**
 * Find the latest (highest version) model per provider+family.
 *
 * @param models - Array of models to scan
 * @returns Map keyed by "provider/family" → latest model info
 */
export function findLatestPerFamily(models: ModelLike[]): Map<string, LatestModel> {
	const latest = new Map<string, LatestModel>();

	for (const m of models) {
		const family = getFamily(m.id);
		if (!family) continue;

		const version = extractVersion(m.id);
		if (version === null) continue;

		const key = `${m.provider}/${family}`;
		const current = latest.get(key);
		if (!current || version > current.version) {
			latest.set(key, { provider: m.provider, id: m.id, name: m.name, family, version });
		}
	}

	return latest;
}

/**
 * Find the single latest model matching a provider + family regex.
 *
 * A model is excluded from selection if it's a dated pin, a `-latest`
 * alias, or a `-thinking` variant (see isExcludedFromLatest). Among the
 * remaining matches, the highest version wins. If no match has a
 * comparable version (variant families like `glm-5v-turbo`), the
 * lexicographically-largest ID is returned as a deterministic fallback.
 */
export function findLatest(models: ModelLike[], provider: string, family: RegExp): ModelLike | null {
	let best: ModelLike | null = null;
	let bestVersion = -1;
	let fallback: ModelLike | null = null;

	for (const m of models) {
		if (m.provider !== provider) continue;
		if (!family.test(m.id)) continue;
		if (isExcludedFromLatest(m.id)) continue;

		const v = extractVersion(m.id);
		if (v !== null) {
			if (v > bestVersion) {
				bestVersion = v;
				best = m;
			}
		} else if (fallback === null || m.id > fallback.id) {
			// Unversioned variant — deterministic fallback for singleton families.
			fallback = m;
		}
	}

	return best ?? fallback;
}
