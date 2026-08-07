import { afterEach, describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import {
	cachedToolReference,
	formatManPage,
	rebuildCachedReference,
	TOOL_REFERENCE_MAX_BYTES,
	toolRefMap,
	SANDBOX_TO_TOOL_NAME,
} from "./tool-reference.ts";

const initialReferences = new Map(toolRefMap);

afterEach(() => {
	toolRefMap.clear();
	for (const [name, reference] of initialReferences)
		toolRefMap.set(name, reference);
	rebuildCachedReference();
});

describe("cached tool reference", () => {
	test("bounds every-turn text while retaining overflowed details for man", () => {
		const description = "verbose extension tool ".repeat(4_000);
		toolRefMap.set("verbose_extension_tool", {
			name: "verbose_extension_tool",
			description,
			snippet: "",
			guidelines: [],
			params: "",
		});

		rebuildCachedReference();

		expect(Buffer.byteLength(cachedToolReference, "utf8")).toBeLessThanOrEqual(
			TOOL_REFERENCE_MAX_BYTES,
		);
		expect(cachedToolReference).toContain(
			"Additional tool references are available locally through man(name).",
		);
		expect(formatManPage("verbose_extension_tool")).toContain(description);
	});

	test("SANDBOX_TO_TOOL_NAME maps every documented search sandbox fn to its tool (rg/fd parity)", () => {
		// rg and fd are both real documented sandbox fns; man("fd") resolves to find,
		// so man("rg") must resolve to grep (regression for the omitted rg entry).
		expect(SANDBOX_TO_TOOL_NAME.rg).toBe("grep");
		expect(SANDBOX_TO_TOOL_NAME.fd).toBe("find");
		expect(SANDBOX_TO_TOOL_NAME.Grep).toBe("grep");
	});
});