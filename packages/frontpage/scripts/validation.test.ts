import { describe, expect, test } from "bun:test";
import {
	createFrontpageTestHarness,
	resultDetails,
	resultText,
} from "./frontpage-test-harness.ts";

interface ErrorDetails {
	error: string;
}

describe("frontpage defensive validation", () => {
	const harness = createFrontpageTestHarness();

	test("frontpage_create({}) returns isError tool_result instead of throwing", async () => {
		const result = await harness.execute("frontpage_create", "call-1", {});
		expect(result.isError).toBe(true);
		const text = resultText(result);
		expect(text).toContain("missing required parameter");
		expect(text).toContain("spec");
		expect(resultDetails<ErrorDetails>(result)).toMatchObject({
			error: "missing-parameter",
		});
	});

	test("frontpage_create with partial spec returns isError listing missing fields", async () => {
		const result = await harness.execute("frontpage_create", "call-2", {
			spec: { slug: "x", title: "y" },
		});
		expect(result.isError).toBe(true);
		const text = resultText(result);
		for (const field of ["thesis", "palette", "register", "sections"]) {
			expect(text).toContain(field);
		}
	});

	test("frontpage_update({}) returns isError tool_result", async () => {
		const result = await harness.execute("frontpage_update", "call-3", {});
		expect(result.isError).toBe(true);
		const text = resultText(result);
		for (const field of ["slug", "patch", "note"])
			expect(text).toContain(field);
	});

	test("frontpage_open({}) returns isError tool_result", async () => {
		const result = await harness.execute("frontpage_open", "call-4", {});
		expect(result.isError).toBe(true);
		expect(resultText(result)).toContain("slug");
	});

	test("frontpage_open with non-existent slug returns isError, not crash", async () => {
		const result = await harness.execute("frontpage_open", "call-5", {
			slug: "absolutely-does-not-exist-xyz",
		});
		expect(result.isError).toBe(true);
	});
});
