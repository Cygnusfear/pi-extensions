/**
 * Host binding override resolution (kal-0q4nb1ae).
 *
 * A host extension that registers sandbox fns under a built-in's name - Read,
 * Write, Edit, Bash, Glob, Grep, List - is stating that the capability is its own.
 * This module makes that structural instead of an accident of spread order: the
 * built-in for a claimed name is SUPPRESSED and never reaches the vm context, so a
 * later change to merge order cannot quietly re-shadow a host, and the suppression
 * is reported rather than silent.
 *
 * Claimed names are derived from the built-in object actually constructed, never
 * from a hand-maintained list: a copied list drifts the first time a tool is added
 * to sandbox-tools.ts, and the drift is invisible until an override stops working.
 */

export interface ResolvedSandboxBindings {
	/** Built-ins minus claimed names, plus every host binding. This is what the vm context gets. */
	bindings: Record<string, unknown>;
	/** Built-in names suppressed because a host binding claimed them, sorted. */
	suppressed: string[];
}

/**
 * Resolve built-ins against host-provided bindings under the same names.
 *
 * A name counts as claimed only when the host entry exists AND is callable. A
 * present-but-undefined value is therefore not a claim: treating it as one would
 * let a typo (`{ Read: undefined }`) delete a capability outright, which is a worse
 * failure than the shadowing this API exists to prevent.
 *
 * Other extensions' registrations (model-router's $.model, runbooks, git-ai,
 * context) are ordinary entries in the same map and pass through untouched; the
 * only built-ins suppressed are the ones a host actually names.
 */
export function resolveSandboxBindings(
	builtins: Record<string, unknown>,
	hostBindings: Record<string, unknown>,
): ResolvedSandboxBindings {
	const builtinNames = new Set(Object.keys(builtins));
	// A built-in name is claimed only by a callable host value.
	const claimed = new Set(
		Object.entries(hostBindings)
			.filter(([name, value]) => builtinNames.has(name) && typeof value === "function")
			.map(([name]) => name),
	);

	const bindings: Record<string, unknown> = {};
	const suppressed: string[] = [];
	for (const [name, value] of Object.entries(builtins)) {
		if (claimed.has(name)) {
			suppressed.push(name);
			continue;
		}
		bindings[name] = value;
	}
	// Non-colliding host entries are applied as-is, so objects like model-router's
	// `$.model` keep working. The one refusal is a non-callable value landing on a
	// built-in name: `{ Read: undefined }` or a half-wired binding must not silently
	// delete a capability, which is worse than the shadowing this module arbitrates.
	for (const [name, value] of Object.entries(hostBindings)) {
		if (builtinNames.has(name) && typeof value !== "function") continue;
		bindings[name] = value;
	}
	suppressed.sort();
	return { bindings, suppressed };
}
