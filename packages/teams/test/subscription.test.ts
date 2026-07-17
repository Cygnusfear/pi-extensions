// Unit tests for packages/teams/subscription.ts
// Runs against a fake TeamLeader so we can deterministically fire events
// and verify dispatch order, DOM-style propagation, timeout/abort, terminal
// short-circuit, and listener error isolation.

import {
	TeamsSubscription,
	buildPredicate,
	wrapPollEvent,
	type TeamsEvent,
} from "/Users/alexander/Projects/pi-extensions/packages/teams/subscription.ts";
import type { PollEvent, WorkerHandle } from "/Users/alexander/Projects/pi-extensions/packages/teams/types.ts";

// ────────────────────────────────────────────────────────────────────
// Test harness
// ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, cond: unknown, detail?: string) {
	if (cond) {
		passed++;
		console.log("  ✓", name);
	} else {
		failed++;
		failures.push(name + (detail ? " — " + detail : ""));
		console.log("  ✗", name, detail ? "— " + detail : "");
	}
}

function section(name: string) {
	console.log("\n▸", name);
}

// Build a minimal fake leader that mimics the real fan-out + preventDefault
// short-circuit so we can verify subscription behavior end-to-end.
class FakeLeader {
	private listeners = new Set<(event: TeamsEvent) => void>();
	private workers = new Map<string, WorkerHandle>();
	private retainedTerminalEvents: PollEvent[] = [];
	/** Most recent default-action run. Used to verify preventDefault suppressed it. */
	defaultActionRanFor: PollEvent | null = null;
	wakes: Array<{ event: PollEvent; content: string }> = [];

	subscribeToEvents(listener: (event: TeamsEvent) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	getWorker(name: string): WorkerHandle | undefined {
		return this.workers.get(name);
	}

	setWorker(w: WorkerHandle) {
		this.workers.set(w.name, w);
	}

	setRetainedTerminalEvent(event: PollEvent) {
		this.retainedTerminalEvents.push(event);
	}

	getCurrentTerminalEvent(name: string, type: PollEvent["type"] | "terminal"): PollEvent | null {
		for (let i = this.retainedTerminalEvents.length - 1; i >= 0; i--) {
			const event = this.retainedTerminalEvents[i]!;
			if (event.worker.name === name && (type === "terminal" || type === event.type)) return event;
		}
		return null;
	}

	wakeFromSubscription(event: PollEvent, content: string) {
		this.wakes.push({ event, content });
	}

	listenerCount(): number {
		return this.listeners.size;
	}

	// Mimics leader.notifyLLM's listener fan-out with propagation + default action.
	emit(event: PollEvent) {
		const wrapped = wrapPollEvent(event);
		for (const listener of [...this.listeners]) {
			try {
				listener(wrapped);
			} catch (err) {
				console.warn("  ! listener threw:", (err as Error).message);
			}
			if (wrapped.propagationStopped) break;
		}
		if (wrapped.defaultPrevented) return;
		// Default action runs only if not prevented.
		this.defaultActionRanFor = event;
	}
}

function makeWorker(name: string, status: WorkerHandle["status"] = "running"): WorkerHandle {
	return {
		workerInstanceId: name + "-wi",
		name,
		pid: 12345,
		ticketId: "tt-" + name,
		sessionDir: "/tmp",
		sessionFile: "/tmp/" + name + ".jsonl",
		worktreePath: null,
		status,
		spawnedAt: Date.now(),
		lastActivityAt: Date.now(),
		lastProcessActivityAt: Date.now(),
		hasActiveChildProcess: false,
		activeChildProcessCount: 0,
		lastSeenCommentCount: 0,
		routeState: "linked",
		lastNote: "done-note-" + name,
	};
}

function completedEvent(name: string): PollEvent {
	return { type: "completed", worker: makeWorker(name, "done"), result: "result-" + name };
}

function commentEvent(name: string, comment: string): PollEvent {
	return { type: "comment", worker: makeWorker(name, "running"), comment };
}

// Helper: create a subscription using the same constructor args that
// teams/index.ts uses. (leader, filter, predicate)
function newSub(leader: FakeLeader, target: string | Parameters<typeof buildPredicate>[0], type?: string) {
	const { filter, predicate } = buildPredicate(target as any, type as any);
	return new TeamsSubscription(leader as any, filter, predicate);
}

// ────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────

async function run() {
	section("wrapPollEvent — DOM flags with defineProperty");
	{
		const e = wrapPollEvent(completedEvent("a"));
		assert("initial defaultPrevented=false", e.defaultPrevented === false);
		assert("initial propagationStopped=false", e.propagationStopped === false);
		e.preventDefault();
		assert("post-preventDefault reads true", e.defaultPrevented === true, "got " + e.defaultPrevented);
		e.stopPropagation();
		assert("post-stopPropagation reads true", e.propagationStopped === true);
		assert("type field preserved", e.type === "completed");
		assert("worker field preserved", (e as any).worker?.name === "a");
	}

	section("buildPredicate — overload forms");
	{
		const { filter: f1, predicate: p1 } = buildPredicate("fixer");
		assert("string target sets name only", f1.name === "fixer" && f1.type === undefined);
		assert("matches by name", p1(completedEvent("fixer")));
		assert("rejects wrong name", !p1(completedEvent("other")));

		const { filter: f2, predicate: p2 } = buildPredicate("fixer", "completed");
		assert("string+type sets both", f2.name === "fixer" && f2.type === "completed");
		assert("matches correct type", p2(completedEvent("fixer")));
		assert("rejects wrong type", !p2(commentEvent("fixer", "hi")));

		const { predicate: p3 } = buildPredicate({ name: "oracle", comment: "DONE:" });
		assert("comment substring matches", p3(commentEvent("oracle", "DONE: all good")));
		assert("comment substring rejects non-match", !p3(commentEvent("oracle", "wip")));
		assert("comment substring rejects non-comment events", !p3(completedEvent("oracle")));

		const { predicate: p4 } = buildPredicate({ name: "oracle", comment: /DONE:|FINAL:/ });
		assert("regex matches DONE", p4(commentEvent("oracle", "DONE: ship it")));
		assert("regex matches FINAL", p4(commentEvent("oracle", "FINAL: report")));
		assert("regex rejects wip", !p4(commentEvent("oracle", "wip")));

		const { predicate: p5 } = buildPredicate({ predicate: (e) => e.type === "stuck" });
		assert("custom predicate runs", p5({ type: "stuck", worker: makeWorker("x"), idleSeconds: 99 } as PollEvent));
		assert("custom predicate rejects non-match", !p5(completedEvent("x")));
	}

	section("TeamsSubscription — one-shot await");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w1", "completed");
		assert("listener registered", leader.listenerCount() === 1);

		const p = Promise.resolve().then(() => sub);
		leader.emit(completedEvent("other")); // wrong worker → no match
		leader.emit(commentEvent("w1", "still going")); // wrong type → no match
		leader.emit(completedEvent("w1")); // match!

		const event = await p;
		assert("resolved with correct type", event.type === "completed");
		assert("auto-unsubscribed", leader.listenerCount() === 0);
	}

	section("TeamsSubscription — .preventDefault() chain suppresses default action");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w2", "completed").preventDefault();

		leader.emit(completedEvent("w2"));
		assert("default action was NOT run", leader.defaultActionRanFor === null, "leader fired default: " + leader.defaultActionRanFor?.type);

		const event = await sub;
		assert("resolved defaultPrevented=true", event.defaultPrevented === true);
	}

	section("TeamsSubscription — WITHOUT preventDefault, default action runs");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w3", "completed");
		leader.emit(completedEvent("w3"));
		const event = await sub;
		assert("resolved defaultPrevented=false", event.defaultPrevented === false);
		assert("default action ran", leader.defaultActionRanFor?.type === "completed");
	}

	section("TeamsSubscription — host-owned .wake() is synchronous and composes with preventDefault");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "wake", "completed")
			.wake((event) => `wake:${event.worker.name}:${event.type}`);
		leader.emit(completedEvent("wake"));
		assert("host wake sent during dispatch", leader.wakes.length === 1 && leader.wakes[0]?.content === "wake:wake:completed");
		assert("host wake does not need a promise continuation", leader.wakes[0]?.event.type === "completed");
		assert("wake automatically suppresses the duplicate default action", leader.defaultActionRanFor === null);
		await sub;
	}

	section("buildPredicate — terminal alias matches every terminal outcome only");
	{
		const { predicate } = buildPredicate("terminal-worker", "terminal");
		assert("terminal matches completed", predicate(completedEvent("terminal-worker")));
		assert("terminal matches warning", predicate({ type: "warning", worker: makeWorker("terminal-worker", "warning"), reason: "warn" }));
		assert("terminal matches failed", predicate({ type: "failed", worker: makeWorker("terminal-worker", "failed"), reason: "fail" }));
		assert("terminal rejects comments", !predicate(commentEvent("terminal-worker", "still running")));
	}

	section("TeamsSubscription — retained terminal event replays for typed and aggregate filters");
	{
		const leader = new FakeLeader();
		leader.setRetainedTerminalEvent(completedEvent("replay"));
		const completed = newSub(leader, "replay", "completed");
		const terminal = newSub(leader, "replay", "terminal");
		assert("typed replay resolves", (await completed).type === "completed");
		assert("terminal replay resolves", (await terminal).type === "completed");
	}

	section("TeamsSubscription — terminal filter has a compatibility fallback for pre-ledger worker snapshots");
	{
		const leader = new FakeLeader();
		leader.setWorker(makeWorker("legacy-warning", "warning"));
		const terminal = newSub(leader, "legacy-warning", "terminal");
		assert("restored warning resolves terminal filter", (await terminal).type === "warning");
	}

	section("TeamsSubscription — .stopPropagation() blocks later listeners");
	{
		const leader = new FakeLeader();
		const subA = newSub(leader, "w4", "completed").stopPropagation();
		let bFired = false;
		const subB = newSub(leader, "w4", "completed").each(() => { bFired = true; });
		leader.emit(completedEvent("w4"));
		await subA;
		assert("subB did NOT fire (propagation stopped)", bFired === false);
		subB.unsubscribe();
	}

	section("TeamsSubscription — .each() streams multiple events");
	{
		const leader = new FakeLeader();
		const received: string[] = [];
		const sub = newSub(leader, { name: "w5", type: "comment" }).each((e) => {
			received.push((e as any).comment);
		});
		leader.emit(commentEvent("w5", "first"));
		leader.emit(commentEvent("w5", "second"));
		leader.emit(commentEvent("other", "noise"));
		leader.emit(commentEvent("w5", "third"));
		assert("each received 3 matches", received.length === 3, "got " + received.length);
		assert("each received in order", received.join(",") === "first,second,third");
		assert("still subscribed (streaming mode)", leader.listenerCount() === 1);
		sub.unsubscribe();
		assert("unsubscribe removes listener", leader.listenerCount() === 0);
	}

	section("TeamsSubscription — listener error in each() does not break pipeline");
	{
		const leader = new FakeLeader();
		let b = 0;
		const subA = newSub(leader, "w6", "completed").each(() => { throw new Error("bad"); });
		const subB = newSub(leader, "w6", "completed").each(() => { b++; });
		leader.emit(completedEvent("w6"));
		assert("subB still fired", b === 1);
		subA.unsubscribe();
		subB.unsubscribe();
	}

	section("TeamsSubscription — .timeout() rejects cleanly");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "never", "completed").timeout(50);
		let rejected = false;
		try {
			await sub;
		} catch (err) {
			rejected = (err as Error).message.includes("timeout");
		}
		assert("rejected with timeout error", rejected);
		assert("listener cleaned up after timeout", leader.listenerCount() === 0);
	}

	section("TeamsSubscription — terminal state short-circuit via checkCurrent");
	{
		const leader = new FakeLeader();
		leader.setWorker(makeWorker("already-done", "done"));
		const sub = newSub(leader, "already-done", "completed");
		const event = await sub;
		assert("resolved synthetically", event.type === "completed");
		assert("auto-unsubscribed after synthetic", leader.listenerCount() === 0);
	}

	section("TeamsSubscription — matchCurrent:false disables synthetic");
	{
		const leader = new FakeLeader();
		leader.setWorker(makeWorker("already-done2", "done"));
		const { filter, predicate } = buildPredicate({ name: "already-done2", type: "completed", matchCurrent: false });
		const sub = new TeamsSubscription(leader as any, filter, predicate).timeout(50);
		let rejected = false;
		try { await sub; } catch (err) { rejected = (err as Error).message.includes("timeout"); }
		assert("did not synthesize, timed out instead", rejected);
	}

	section("TeamsSubscription — unsubscribe() is idempotent");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w7", "completed");
		sub.unsubscribe();
		sub.unsubscribe();
		sub.cancel();
		assert("no throw on double unsubscribe", true);
	}

	section("TeamsSubscription — Promise.race between two subs");
	{
		const leader = new FakeLeader();
		const a = newSub(leader, "racer-a", "completed");
		const b = newSub(leader, "racer-b", "completed");
		setTimeout(() => leader.emit(completedEvent("racer-b")), 10);
		const winner = await Promise.race([a, b]);
		assert("race winner is b", (winner as any).worker.name === "racer-b");
		a.unsubscribe();
	}

	// ────────────────────────────────────────────────────────────────
	console.log("\n" + "━".repeat(60));
	console.log(`RESULT: ${passed} passed, ${failed} failed`);
	if (failed > 0) {
		console.log("\nFailures:");
		for (const f of failures) console.log("  •", f);
		process.exit(1);
	}
}

run().catch((err) => {
	console.error("runner threw:", err);
	process.exit(2);
});
