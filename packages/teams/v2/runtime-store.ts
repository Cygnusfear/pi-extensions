import { attemptStatus, type AttemptState, type LifecycleFact, type LifecycleProjection, type WorkerState } from "./state.ts";
import { LifecycleAccumulator } from "./reducer.ts";
import { factsForSession, type SessionEntryLike } from "./session-facts.ts";

/**
 * In-memory projection over the coordinator session's canonical lifecycle facts.
 * Restore scans all entries once. Normal operation folds successful appends in O(1)
 * and never calls getEntries on the per-turn hot path.
 */
export class LifecycleRuntimeStore {
	private accumulator: LifecycleAccumulator;
	private restoredEntryCount = 0;

	constructor(readonly coordinatorSessionId: string, entries: readonly SessionEntryLike[] = []) {
		this.accumulator = new LifecycleAccumulator(coordinatorSessionId);
		this.restore(entries);
	}

	restore(entries: readonly SessionEntryLike[]): void {
		const next = new LifecycleAccumulator(this.coordinatorSessionId);
		for (const fact of factsForSession(entries, this.coordinatorSessionId)) next.append(fact);
		this.accumulator = next;
		this.restoredEntryCount = entries.length;
	}

	append(fact: LifecycleFact): "accepted" | "duplicate" | "conflict" | "foreign" {
		return this.accumulator.append(fact);
	}

	projection(): LifecycleProjection {
		return this.accumulator.current();
	}

	worker(workerId: string): WorkerState | undefined {
		return this.projection().workers.get(workerId);
	}

	workerByName(name: string): WorkerState | undefined {
		const matches = [...this.projection().workers.values()].filter((worker) => worker.name === name);
		return matches.at(-1);
	}

	attempt(attemptId: string): AttemptState | undefined {
		return this.projection().attempts.get(attemptId);
	}

	currentAttempt(workerIdOrName: string): AttemptState | undefined {
		const worker = this.worker(workerIdOrName) ?? this.workerByName(workerIdOrName);
		return worker?.currentAttemptId ? this.attempt(worker.currentAttemptId) : undefined;
	}

	history(input: { attemptId?: string; name?: string; status?: string; start?: number; end?: number }): AttemptState[] {
		let attempts = [...this.projection().attempts.values()];
		if (input.attemptId) attempts = attempts.filter((attempt) => attempt.attemptId === input.attemptId);
		if (input.name) attempts = attempts.filter((attempt) => attempt.name === input.name);
		if (input.status) {
			const canonicalStatus = input.status === "done"
				? "completed"
				: input.status === "quit"
					? "warning"
					: input.status;
			attempts = attempts.filter((attempt) => attemptStatus(attempt) === canonicalStatus);
		}
		const start = input.start ?? 0;
		const end = input.end ?? attempts.length;
		return attempts.slice(start < 0 ? Math.max(0, attempts.length + start) : start, end <= 0 ? attempts.length + end : end);
	}

	get restoredEntries(): number { return this.restoredEntryCount; }
}
