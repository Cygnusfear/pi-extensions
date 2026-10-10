/**
 * decider.ts
 *
 * Calling a decision (classifier) model from an extension.
 *
 * The host plumbing is fussy and both consumers need exactly the same shape, so
 * it lives here once: resolve the catalog entry the way each host needs it, call
 * the model with typed questions, and never throw — a decision model is an
 * additional check, never the only one, so its absence must degrade to the
 * caller's own logic instead of breaking a turn.
 *
 * Verified against the live catalog and the extension host, 2026-10-09/10.
 */

/** The classifier this fleet uses. Output is free; input is ~$0.02–0.04 per 1M tokens. */
export const DECIDER_MODEL = {
	provider: "openrouter",
	id: "perplexity/pplx-decider-v1.1-27b",
} as const;

/**
 * Complete descriptor, used when the session's registry cannot hand the catalog
 * entry back: \`classify\` asserts the model type before dispatch, so a bare
 * \`{ provider, id }\` is rejected as "not a classifier model".
 */
export const DECIDER_DESCRIPTOR = {
	...DECIDER_MODEL,
	type: "classifier",
	api: "typesafe-system-one",
	baseUrl: "https://openrouter.ai/api/v1",
};

export type DeciderQuestion =
	| {
			readonly type: "bool";
			readonly instructions: string;
			readonly criteria: { readonly true: string; readonly false: string };
	  }
	| {
			readonly type: "choice";
			readonly instructions: string;
			readonly criteria: Readonly<Record<string, string>>;
	  }
	| {
			readonly type: "score";
			readonly instructions: string;
			readonly criteria: readonly string[];
	  };

export interface DeciderAnswer {
	readonly type?: string;
	readonly probability?: number;
	readonly label?: string;
	readonly score?: number;
}

export interface DeciderResult {
	readonly answers?: Readonly<Record<string, DeciderAnswer>>;
	readonly stopReason?: string;
	readonly errorMessage?: string;
	readonly usage?: {
		readonly input?: number;
		readonly cost?: { readonly total?: number };
	};
}

export type DeciderSource =
	| "findOfType"
	| "getModelOfType"
	| "getAvailableOfType"
	| "descriptor"
	| "none";

export interface ResolvedDecider {
	readonly model: unknown;
	readonly source: DeciderSource;
}

export interface DeciderHost {
	classify(
		model: unknown,
		context: { readonly state: Record<string, unknown>; readonly questions: Readonly<Record<string, DeciderQuestion>> },
		options?: { readonly signal?: AbortSignal },
	): Promise<DeciderResult>;
	/** Resolve the catalog entry, when the host can look models up. */
	resolveDecider?(provider: string, id: string): Promise<ResolvedDecider>;
}

/**
 * Reach the decision model through a session's model registry.
 *
 * The pinned pi types predate classifier models, so the capability is probed
 * structurally: a host without it returns null and the caller keeps its own
 * logic.
 */
export function resolveDeciderHost(registry: unknown): DeciderHost | null {
	if (!registry || typeof registry !== "object") return null;
	const candidate = registry as Record<string, unknown>;
	if (typeof candidate.classify !== "function") return null;
	const classify = candidate.classify as DeciderHost["classify"];

	const call = (method: string, ...args: unknown[]): unknown => {
		const fn = candidate[method];
		if (typeof fn !== "function") return undefined;
		return (fn as (...inner: unknown[]) => unknown).call(registry, ...args);
	};

	return {
		classify: (model, context, options) => classify.call(registry, model, context, options),
		resolveDecider: async (provider, id) => {
			for (const method of ["findOfType", "getModelOfType"] as const) {
				try {
					const found = call(method, "classifier", provider, id);
					if (found) return { model: found, source: method };
				} catch {
					// Fall through to the next lookup.
				}
			}
			try {
				const list = (await call("getAvailableOfType", "classifier", provider)) as
					| readonly { id?: unknown }[]
					| undefined;
				const found = list?.find((entry) => entry?.id === id);
				if (found) return { model: found, source: "getAvailableOfType" };
			} catch {
				// Fall through to the descriptor.
			}
			return { model: DECIDER_DESCRIPTOR, source: "descriptor" };
		},
	};
}

/** A bounded wait, so a hung provider cannot leak a promise per call. */
export function deciderSignal(ms: number): AbortSignal | undefined {
	return AbortSignal.timeout?.(ms);
}

/**
 * Ask the model, never throwing.
 *
 * Returns undefined when there is no host, no answer, or an error — the caller
 * decides what its own logic does in that case.
 */
export async function askDecider(
	host: DeciderHost | null,
	state: Record<string, unknown>,
	questions: Readonly<Record<string, DeciderQuestion>>,
	options: { readonly timeoutMs?: number } = {},
): Promise<DeciderResult | undefined> {
	if (!host) return undefined;
	const resolved = host.resolveDecider
		? await host.resolveDecider(DECIDER_MODEL.provider, DECIDER_MODEL.id)
		: ({ model: DECIDER_DESCRIPTOR, source: "descriptor" } as ResolvedDecider);
	try {
		const result = await host.classify(
			resolved.model,
			{ state, questions },
			{ signal: deciderSignal(options.timeoutMs ?? 15_000) },
		);
		if (result?.errorMessage || result?.stopReason === "error") return undefined;
		return result;
	} catch {
		return undefined;
	}
}

/** Probabilities at or above the threshold, strongest first. */
export function decideAboveThreshold(
	result: DeciderResult | undefined,
	threshold: number,
	keys: readonly string[],
): readonly string[] {
	if (!result?.answers) return [];
	return keys
		.filter((key) => (result.answers?.[key]?.probability ?? 0) >= threshold)
		.sort(
			(left, right) =>
				(result.answers?.[right]?.probability ?? 0) - (result.answers?.[left]?.probability ?? 0),
		);
}
