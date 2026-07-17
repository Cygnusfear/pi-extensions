// Round 2 red team — iteration safety, subscribe/unsubscribe during dispatch,
// timeout-match race, stopImmediatePropagation, multi-sub fan-out.
import { TeamsSubscription, buildPredicate } from "../subscription.ts";
import type { PollEvent } from "../types.ts";
import {
	SubscriptionFakeLeader as FakeLeader,
	commentSubscriptionEvent as commentEvent,
	completedSubscriptionEvent as completedEvent,
	makeSubscriptionWorker as makeWorker,
	newTestSubscription as newSub,
	runSubscriptionHarness,
} from "./subscription-harness.ts";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(name: string, cond: unknown, detail?: string) {
	if (cond) { passed++; console.log("  ✓", name); }
	else { failed++; failures.push(name + (detail ? " — " + detail : "")); console.log("  ✗", name, detail ? "— " + detail : ""); }
}
function section(name: string) { console.log("\n▸", name); }

async function run() {
	section("Iteration safety — listener unsubscribes self during dispatch");
	{
		const leader = new FakeLeader();
		let aFired = 0, bFired = 0;
		const subA = newSub(leader, "w1", "completed").each(() => { aFired++; subA.unsubscribe(); });
		const subB = newSub(leader, "w1", "completed").each(() => { bFired++; });
		leader.emit(completedEvent("w1"));
		assert("A fired once", aFired === 1);
		assert("B still fired after A unsubscribed itself", bFired === 1);
		assert("A is unsubscribed", leader.listeners.size === 1);
		// Emit again — only B should fire
		leader.emit(completedEvent("w1"));
		assert("A did not fire again", aFired === 1);
		assert("B fired again", bFired === 2);
		subB.unsubscribe();
	}

	section("Iteration safety — listener unsubscribes ANOTHER listener during dispatch");
	{
		const leader = new FakeLeader();
		let aFired = 0, bFired = 0, cFired = 0;
		const subA = newSub(leader, "w2", "completed").each(() => { aFired++; subB.unsubscribe(); });
		const subB = newSub(leader, "w2", "completed").each(() => { bFired++; });
		const subC = newSub(leader, "w2", "completed").each(() => { cFired++; });
		leader.emit(completedEvent("w2"));
		assert("A fired", aFired === 1);
		// B was unsubscribed DURING dispatch, before it fired. Live Set iteration:
		// if A removes B from the set, B won't be visited.
		assert("B did NOT fire (removed during dispatch)", bFired === 0, "bFired=" + bFired);
		assert("C fired normally", cFired === 1);
		subA.unsubscribe(); subC.unsubscribe();
	}

	section("Iteration safety — listener subscribes NEW listener during dispatch");
	{
		const leader = new FakeLeader();
		let aFired = 0, newFired = 0;
		// Danger: if A adds a new listener mid-dispatch and Set iteration is live,
		// the new listener COULD fire on the same event. Verify current behavior.
		const subA = newSub(leader, "w3", "completed").each(() => {
			aFired++;
			if (aFired === 1) {
				// Subscribe a NEW listener mid-dispatch
				newSub(leader, "w3", "completed").each(() => { newFired++; });
			}
		});
		leader.emit(completedEvent("w3"));
		assert("A fired once", aFired === 1);
		assert("DOM semantics: new listener did NOT fire on current event", newFired === 0, "newFired=" + newFired);
		// Re-emit — new listener should fire on the NEXT event
		leader.emit(completedEvent("w3"));
		assert("new listener fires on next emit", newFired === 1, "newFired=" + newFired);
	}

	section("stopImmediatePropagation is a real alias");
	{
		const leader = new FakeLeader();
		let aFired = false, bFired = false;
		const subA = newSub(leader, "w4", "completed").each((e) => { aFired = true; e.stopImmediatePropagation(); });
		const subB = newSub(leader, "w4", "completed").each(() => { bFired = true; });
		leader.emit(completedEvent("w4"));
		assert("A fired", aFired);
		assert("B blocked by stopImmediatePropagation", bFired === false);
		subA.unsubscribe(); subB.unsubscribe();
	}

	section("Timeout + match race — match should win if synchronous");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w5", "completed").timeout(50);
		// Emit synchronously before the timeout fires
		leader.emit(completedEvent("w5"));
		// Wait past the timeout — should not reject because we already resolved
		await new Promise((r) => setTimeout(r, 100));
		const event = await sub;
		assert("resolved cleanly despite timeout set", event.type === "completed");
		assert("listener cleaned up", leader.listeners.size === 0);
	}

	section("Many concurrent subscriptions — fan-out integrity");
	{
		const leader = new FakeLeader();
		const N = 50;
		let fired = 0;
		const subs: any[] = [];
		for (let i = 0; i < N; i++) {
			subs.push(newSub(leader, "w6", "completed").each(() => { fired++; }));
		}
		assert("all " + N + " listeners registered", leader.listeners.size === N);
		leader.emit(completedEvent("w6"));
		assert("all " + N + " fired once", fired === N, "fired=" + fired);
		for (const s of subs) s.unsubscribe();
		assert("all unsubscribed", leader.listeners.size === 0);
	}

	section(".catch() on timeout works");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "never", "completed").timeout(30);
		let caught = false;
		await sub.then(
			() => {},
			(err) => { caught = err.message.includes("timeout"); },
		);
		assert("catch branch fired", caught);
	}

	section("Multiple .timeout() calls — last wins");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "never", "completed").timeout(500).timeout(30);
		const start = Date.now();
		try { await sub; } catch {}
		const elapsed = Date.now() - start;
		assert("timed out on shorter timeout (30ms, not 500ms)", elapsed < 200, "elapsed=" + elapsed + "ms");
	}

	section("Re-await a settled subscription — replay result");
	{
		const leader = new FakeLeader();
		const sub = newSub(leader, "w7", "completed");
		leader.emit(completedEvent("w7"));
		const first = await sub;
		const second = await sub;
		assert("first and second receive same event", first === second || (first as any).worker.name === (second as any).worker.name);
	}

	section("Unsubscribe during one-shot handler does not double-fire");
	{
		const leader = new FakeLeader();
		let count = 0;
		const sub = newSub(leader, "w8", "completed");
		sub.then(() => { count++; });
		leader.emit(completedEvent("w8"));
		leader.emit(completedEvent("w8")); // second emit — sub already settled
		leader.emit(completedEvent("w8")); // third
		await sub;
		assert("one-shot fired exactly once", count === 1, "count=" + count);
	}

	section("Filter with empty object — matches everything");
	{
		const leader = new FakeLeader();
		const received: string[] = [];
		const sub = newSub(leader, {}).each((e) => { received.push(e.type); });
		leader.emit(completedEvent("x"));
		leader.emit(commentEvent("y", "hi"));
		leader.emit({ type: "stuck", worker: makeWorker("z"), idleSeconds: 10 } as PollEvent);
		assert("empty filter caught all 3", received.length === 3, "got " + JSON.stringify(received));
		sub.unsubscribe();
	}

	section("Synthetic event for already-failed worker");
	{
		const leader = new FakeLeader();
		leader.setWorker({ ...makeWorker("dead", "failed"), spawnError: "process exited 1" } as any);
		const sub = newSub(leader, "dead", "failed");
		const event = await sub;
		assert("resolved synthetically on failed status", event.type === "failed");
	}

	// ─── Worker disposal kills subscriptions silently ────────────────
	{
		const leader = new FakeLeader();
		leader.setWorker(makeWorker("w1", "running"));
		const { filter, predicate } = buildPredicate("w1", "completed");
		const sub = new TeamsSubscription(leader, filter, predicate);
		sub.timeout(5000);

		// Kill the worker — should dispose the subscription without rejection
		leader.killWorker("w1");

		// The subscription should be disposed; no more listeners
		assert("disposal: no listeners remain", leader.listeners.size === 0);
		assert("disposal: no disposal callbacks remain", leader.disposalCallbacks.size === 0);

		// The promise should never resolve or reject (silently gone)
		let settled = false;
		sub.then(() => { settled = true; }, () => { settled = true; });
		await new Promise(r => setTimeout(r, 50));
		assert("disposal: promise did not settle after kill", !settled);
	}

	// ─── Disposal + timeout: disposal wins, no timeout spam ──────────
	{
		const leader = new FakeLeader();
		leader.setWorker(makeWorker("w2", "running"));
		const { filter, predicate } = buildPredicate("w2", "completed");
		const sub = new TeamsSubscription(leader, filter, predicate);
		sub.timeout(100);

		// Kill the worker before timeout fires
		leader.killWorker("w2");

		// Wait past the timeout — should NOT reject
		let rejected = false;
		sub.then(() => {}, () => { rejected = true; });
		await new Promise(r => setTimeout(r, 150));
		assert("disposal beats timeout: no rejection", !rejected);
	}

}

runSubscriptionHarness("subscription.round2.test", 28, run, () => ({ passed, failed, failures }));
