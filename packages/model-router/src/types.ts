/**
 * model-router types.
 *
 * A "role" is a named intent (review, fix, scribe, etc.) backed by an ordered
 * list of concrete model IDs in team-templates.json. The router resolves at
 * call time by filtering for availability + health, walking the list in order,
 * and optionally deduping by provider for DEI.
 */

/** A single resolved model returned by the router. */
export interface ResolvedModel {
	/** Full model ID including provider, e.g. "openai-codex/gpt-5.4" */
	id: string;
	/** Provider name, e.g. "openai-codex" */
	provider: string;
	/** Model ID without provider, e.g. "gpt-5.4" */
	modelId: string;
	/** Why this model was skipped (only set when included in excluded/skipped list) */
	skipReason?: string;
}

/** Result of a resolve() call. */
export interface ResolveResult {
	/** Successfully resolved models in preference order. */
	resolved: ResolvedModel[];
	/** Models from the role list that were skipped and why. */
	skipped: ResolvedModel[];
	/** The role name that was resolved. */
	role: string;
	/** How many were requested. */
	count: number;
}

/** Options for resolve(). */
export interface ResolveOptions {
	/** Role name from team-templates.json (e.g. "review", "fix"). */
	role: string;
	/** How many models to return. Default: 1. */
	count?: number;
	/**
	 * Dedup by provider so you get distinct providers (DEI).
	 * Default: true. Set false to allow same-provider duplicates.
	 */
	dedupProviders?: boolean;
}

/** An entry in the liveness store. */
export interface LivenessEntry {
	/** Full "provider/model" ID. */
	id: string;
	/** Why it was marked unhealthy. */
	reason: string;
	/** ISO timestamp when it was marked. */
	markedAt: string;
	/** Seconds until it auto-expires. Default 1800 (30 min). */
	ttlSeconds: number;
}

/** Model-like interface — what the registry provides. */
export interface AvailableModel {
	provider: string;
	id: string;
}
