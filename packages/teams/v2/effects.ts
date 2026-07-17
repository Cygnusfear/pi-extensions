import type { AttemptIdentity, JsonValue, LifecycleFact, LifecycleProjection } from "./state.ts";
import { createEffectId, createLeaderEventId, type SessionFactWriter } from "./session-facts.ts";

export interface EffectRequest {
	identity: AttemptIdentity;
	effectKind: string;
	normalizedInputs: JsonValue;
	sourceLeaderEpoch?: string;
}

export interface EffectExecutionResult<T> {
	effectId: string;
	status: "completed" | "already_completed";
	value?: T;
}

export function pendingEffects(projection: LifecycleProjection): Array<{ effectId: string; attemptId: string; kind: string; normalizedInputs: JsonValue }> {
	return [...projection.effects.values()]
		// A failed execution is still requested-without-completion. Reconcile it
		// after restart just like a crash between request and completion.
		.filter((effect) => effect.phase !== "completed")
		.map((effect) => ({
			effectId: effect.effectId,
			attemptId: effect.attemptId,
			kind: effect.kind,
			normalizedInputs: effect.normalizedInputs,
		}));
}

/**
 * Runs an effect only after its deterministic request fact is durable. Callers
 * fold every returned fact into the runtime projection through onFact.
 */
export async function executeDurableEffect<T>(
	writer: SessionFactWriter,
	projection: LifecycleProjection,
	request: EffectRequest,
	run: (effectId: string) => Promise<T>,
	onFact: (fact: LifecycleFact) => void,
): Promise<EffectExecutionResult<T>> {
	const effectId = createEffectId(request.identity, request.effectKind, request.normalizedInputs);
	const existing = projection.effects.get(effectId);
	if (existing?.phase === "completed") return { effectId, status: "already_completed" };
	const attempt = projection.attempts.get(request.identity.attemptId);
	if (attempt?.protocolViolation) throw new Error(`Unsafe effect ${request.effectKind} blocked by protocol violation on ${request.identity.attemptId}`);

	const requestedEventId = createLeaderEventId(request.identity, "effect_requested", effectId);
	const requested: LifecycleFact = {
		schemaVersion: 4,
		...request.identity,
		eventId: requestedEventId,
		kind: "effect_requested",
		...(request.sourceLeaderEpoch ? { sourceLeaderEpoch: request.sourceLeaderEpoch } : {}),
		occurredAt: Date.now(),
		payload: { effectId, effectKind: request.effectKind, normalizedInputs: request.normalizedInputs },
	};
	writer.appendFact(requested);
	onFact(requested);

	try {
		const value = await run(effectId);
		const completed: LifecycleFact = {
			schemaVersion: 4,
			...request.identity,
			eventId: createLeaderEventId(request.identity, "effect_completed", requestedEventId),
			kind: "effect_completed",
			...(request.sourceLeaderEpoch ? { sourceLeaderEpoch: request.sourceLeaderEpoch } : {}),
			occurredAt: Date.now(),
			payload: { effectId },
		};
		writer.appendFact(completed);
		onFact(completed);
		return { effectId, status: "completed", value };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const failed: LifecycleFact = {
			schemaVersion: 4,
			...request.identity,
			eventId: createLeaderEventId(request.identity, "effect_failed", requestedEventId),
			kind: "effect_failed",
			...(request.sourceLeaderEpoch ? { sourceLeaderEpoch: request.sourceLeaderEpoch } : {}),
			occurredAt: Date.now(),
			// Error text is diagnostic and can vary across identical retries. Keep
			// authoritative identity stable so a second failure is an exact duplicate.
			payload: { effectId, error: "effect execution failed" },
			diagnostics: { error: message },
		};
		writer.appendFact(failed);
		onFact(failed);
		throw error;
	}
}
