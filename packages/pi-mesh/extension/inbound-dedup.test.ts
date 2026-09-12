import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

	describe("across a restart", () => {
		test("surfaced ids survive, because the replay happens on the restart", () => {
			const path = join(mkdtempSync(join(tmpdir(), "surfaced-")), "surfaced.json");
			const before = createSurfacedDeliveryGuard({ path: () => path });
			before.remember("delivery-1");

			// A restarted session builds a fresh guard with empty memory over the same file.
			const afterRestart = createSurfacedDeliveryGuard({ path: () => path });
			expect(afterRestart.has("delivery-1")).toBe(true);
			expect(afterRestart.has("never-seen")).toBe(false);
		});

		test("stays in memory when no path is available", () => {
			const guard = createSurfacedDeliveryGuard({ path: () => undefined });
			guard.remember("x");
			expect(guard.has("x")).toBe(true);
		});

		test("an unreadable history costs only suppressions, never correctness", () => {
			const path = join(mkdtempSync(join(tmpdir(), "surfaced-bad-")), "surfaced.json");
			writeFileSync(path, "{ not json");
			const guard = createSurfacedDeliveryGuard({ path: () => path });
			expect(guard.has("anything")).toBe(false);
			guard.remember("anything");
			expect(guard.has("anything")).toBe(true);
		});
	});
});
