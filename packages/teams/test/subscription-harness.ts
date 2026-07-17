import { TeamsSubscription, buildPredicate, wrapPollEvent, type TeamsEvent } from "../subscription.ts";
import type { PollEvent, WorkerHandle } from "../types.ts";

/** One production-shaped TeamLeader test double shared by both subscription harnesses. */
export class SubscriptionFakeLeader {
	listeners = new Set<(event: TeamsEvent) => void>();
	disposalCallbacks = new Map<string, Set<() => void>>();
	private workers = new Map<string, WorkerHandle>();
	private retainedTerminalEvents: PollEvent[] = [];
	defaultActionRanFor: PollEvent | null = null;
	wakes: Array<{ event: PollEvent; content: string }> = [];

	subscribeToEvents(listener: (event: TeamsEvent) => void): () => void {
		this.listeners.add(listener);
		return () => { this.listeners.delete(listener); };
	}

	subscribeToWorkerDisposal(workerName: string, cb: () => void): () => void {
		let callbacks = this.disposalCallbacks.get(workerName);
		if (!callbacks) { callbacks = new Set(); this.disposalCallbacks.set(workerName, callbacks); }
		callbacks.add(cb);
		return () => {
			callbacks!.delete(cb);
			if (callbacks!.size === 0) this.disposalCallbacks.delete(workerName);
		};
	}

	killWorker(workerName: string): void {
		const callbacks = this.disposalCallbacks.get(workerName);
		if (callbacks) {
			for (const cb of callbacks) cb();
			this.disposalCallbacks.delete(workerName);
		}
	}

	getWorker(name: string): WorkerHandle | undefined { return this.workers.get(name); }
	getCurrentAttemptId(name: string): string | undefined { return this.workers.get(name)?.workerInstanceId; }
	setWorker(worker: WorkerHandle): void { this.workers.set(worker.name, worker); }

	setRetainedTerminalEvent(event: PollEvent): void { this.retainedTerminalEvents.push(event); }
	getCurrentTerminalEvent(name: string, type: PollEvent["type"] | "terminal", attemptId?: string): PollEvent | null {
		for (let i = this.retainedTerminalEvents.length - 1; i >= 0; i--) {
			const event = this.retainedTerminalEvents[i]!;
			const eventAttemptId = event.attemptId ?? event.worker.workerInstanceId;
			if (event.worker.name === name && (!attemptId || eventAttemptId === attemptId) && (type === "terminal" || type === event.type)) return event;
		}
		return null;
	}

	wakeFromSubscription(event: PollEvent, content: string): void { this.wakes.push({ event, content }); }
	listenerCount(): number { return this.listeners.size; }

	/** TeamLeader.notifyLLM-compatible snapshot dispatch with default-action tracking. */
	emit(event: PollEvent): TeamsEvent {
		const wrapped = wrapPollEvent(event);
		for (const listener of [...this.listeners]) {
			if (!this.listeners.has(listener)) continue;
			try { listener(wrapped); } catch (error) {
				console.warn("  ! listener threw:", error instanceof Error ? error.message : String(error));
			}
			if (wrapped.propagationStopped) break;
		}
		if (!wrapped.defaultPrevented) this.defaultActionRanFor = event;
		return wrapped;
	}
}

export function makeSubscriptionWorker(name: string, status: WorkerHandle["status"] = "running"): WorkerHandle {
	return {
		workerInstanceId: name + "-wi", name, pid: 1, ticketId: "t-" + name,
		sessionDir: "/tmp", sessionFile: "/tmp/" + name + ".jsonl", worktreePath: null,
		status, spawnedAt: Date.now(), lastActivityAt: Date.now(), lastProcessActivityAt: Date.now(),
		hasActiveChildProcess: false, activeChildProcessCount: 0, lastSeenCommentCount: 0,
		routeState: "linked", lastNote: "done-note-" + name,
	};
}

export function completedSubscriptionEvent(name: string): PollEvent {
	return { type: "completed", worker: makeSubscriptionWorker(name, "done"), result: "result-" + name };
}

export function commentSubscriptionEvent(name: string, comment: string): PollEvent {
	return { type: "comment", worker: makeSubscriptionWorker(name), comment };
}

export function newTestSubscription(leader: SubscriptionFakeLeader, target: Parameters<typeof buildPredicate>[0], type?: Parameters<typeof buildPredicate>[1]): TeamsSubscription {
	const { filter, predicate } = buildPredicate(target as never, type as never);
	return new TeamsSubscription(leader as never, filter, predicate);
}

export interface HarnessCounts { passed: number; failed: number; failures: string[] }

/** Keep an OS handle alive and fail loudly if a standalone async harness stalls. */
export function runSubscriptionHarness(
	name: string,
	expectedAssertions: number,
	run: () => Promise<void>,
	counts: () => HarnessCounts,
	timeoutMs = 10_000,
): void {
	const watchdog = setTimeout(() => {
		console.error(`HARNESS TIMEOUT: ${name} did not finish within ${timeoutMs}ms`);
		process.exit(2);
	}, timeoutMs);

	void run().then(() => {
		clearTimeout(watchdog);
		const result = counts();
		const total = result.passed + result.failed;
		console.log("\n" + "━".repeat(60));
		console.log(`RESULT: ${result.passed} passed, ${result.failed} failed`);
		if (total !== expectedAssertions) {
			console.error(`HARNESS INCOMPLETE: expected ${expectedAssertions} assertions, observed ${total}`);
			process.exit(2);
		}
		if (result.failed > 0) {
			console.log("\nFailures:");
			for (const failure of result.failures) console.log("  •", failure);
			process.exit(1);
		}
	}).catch((error) => {
		clearTimeout(watchdog);
		console.error("runner threw:", error);
		process.exit(2);
	});
}
