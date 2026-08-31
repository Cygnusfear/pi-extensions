import { describe, expect, test } from "bun:test";
import {
	createFrontpageTestHarness,
	type SpawnCall,
} from "./frontpage-test-harness.ts";

const minimalSpec = {
	slug: "open-default-test",
	title: "Open default test",
	thesis: "Verifies frontpage_create does not auto-open the file.",
	palette: "navy" as const,
	register: "nyt-editorial" as const,
	sections: [{ type: "lead" as const, text: "x" }],
};

function countOsOpens(calls: readonly SpawnCall[]): number {
	return calls.filter(
		({ command }) =>
			command === "open" || command === "xdg-open" || command === "start",
	).length;
}

describe("frontpage_create open default (opt-in)", () => {
	const harness = createFrontpageTestHarness();

	test("does NOT auto-open when open is omitted", async () => {
		harness.resetSpawnCalls();
		await harness.execute("frontpage_create", "c1", {
			spec: { ...minimalSpec, slug: "open-default-test-1" },
		});
		expect(countOsOpens(harness.spawnCalls)).toBe(0);
	});

	test("does NOT auto-open when open is explicitly false", async () => {
		harness.resetSpawnCalls();
		await harness.execute("frontpage_create", "c2", {
			spec: { ...minimalSpec, slug: "open-default-test-2" },
			open: false,
		});
		expect(countOsOpens(harness.spawnCalls)).toBe(0);
	});

	test("DOES open when open is explicitly true", async () => {
		harness.resetSpawnCalls();
		await harness.execute("frontpage_create", "c3", {
			spec: { ...minimalSpec, slug: "open-default-test-3" },
			open: true,
		});
		expect(countOsOpens(harness.spawnCalls)).toBe(1);
	});

	test("frontpage_open ALWAYS opens (single-purpose tool)", async () => {
		await harness.execute("frontpage_create", "c4a", {
			spec: { ...minimalSpec, slug: "open-default-test-4" },
		});
		harness.resetSpawnCalls();
		await harness.execute("frontpage_open", "c4b", {
			slug: "open-default-test-4",
		});
		expect(countOsOpens(harness.spawnCalls)).toBe(1);
	});
});
