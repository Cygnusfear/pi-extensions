import { describe, expect, test } from "bun:test";
import { createSurfacedDeliveryGuard } from "./inbound-dedup.ts";

describe("surfaced delivery guard", () => {
	test("a first delivery is not a duplicate, the second one is", () => {
		const guard = createSurfacedDeliveryGuard();
		expect(guard.has("d-1")).toBe(false);
		guard.remember("d-1");
		expect(guard.has("d-1")).toBe(true);
		expect(guard.has("d-2")).toBe(false);
	});

	test("distinct deliveries never mask each other", () => {
		const guard = createSurfacedDeliveryGuard();
		guard.remember("a");
		guard.remember("b");
		expect(guard.has("a")).toBe(true);
		expect(guard.has("b")).toBe(true);
		expect(guard.size()).toBe(2);
	});

	test("it stays bounded, forgetting the oldest first", () => {
		const guard = createSurfacedDeliveryGuard(3);
		for (const id of ["1", "2", "3", "4"]) guard.remember(id);
		expect(guard.size()).toBe(3);
		expect(guard.has("1")).toBe(false); // evicted, may surface again
		expect(guard.has("4")).toBe(true);
	});

	test("remembering the same id twice does not consume extra room", () => {
		const guard = createSurfacedDeliveryGuard(2);
		guard.remember("x");
		guard.remember("x");
		guard.remember("y");
		expect(guard.size()).toBe(2);
		expect(guard.has("x")).toBe(true);
	});
});
