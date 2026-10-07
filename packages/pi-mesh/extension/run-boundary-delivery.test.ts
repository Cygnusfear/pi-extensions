import { describe, expect, test } from "bun:test";
import { createRunBoundaryDelivery } from "./run-boundary-delivery.ts";

describe("createRunBoundaryDelivery", () => {
	test("hands a delivery over immediately when no run is live", () => {
		const delivered: string[] = [];
		const queue = createRunBoundaryDelivery(() => false);
		queue.send(() => delivered.push("a"));
		expect(delivered).toEqual(["a"]);
	});

	test("arms a delivery aimed at a live run and releases it at the settled boundary", () => {
		const delivered: string[] = [];
		let live = true;
		const queue = createRunBoundaryDelivery(() => live);

		queue.send(() => delivered.push("hooman text"));
		// Nothing reaches pi while the run is live — pi would park it in that run's own
		// queue, which an aborted run never drains. That is the stranded-tell bug.
		expect(delivered).toEqual([]);

		live = false;
		queue.drain();
		expect(delivered).toEqual(["hooman text"]);
	});

	test("releases armed deliveries in arrival order", () => {
		const delivered: string[] = [];
		const queue = createRunBoundaryDelivery(() => true);
		queue.send(() => delivered.push("first"));
		queue.send(() => delivered.push("second"));
		queue.drain();
		expect(delivered).toEqual(["first", "second"]);
	});

	test("delivers each message once — a later drain is a no-op", () => {
		const delivered: string[] = [];
		const queue = createRunBoundaryDelivery(() => true);
		queue.send(() => delivered.push("a"));
		queue.drain();
		queue.drain();
		expect(delivered).toEqual(["a"]);
	});
});
