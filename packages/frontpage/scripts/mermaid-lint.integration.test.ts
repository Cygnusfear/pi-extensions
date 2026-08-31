import { describe, expect, test } from "bun:test";
import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import {
	createFrontpageTestHarness,
	resultDetails,
	resultText,
} from "./frontpage-test-harness.ts";

interface MermaidFinding {
	sectionId: string;
	rule: string;
	level: "error" | "warning";
}

interface FrontpageResultDetails {
	mermaidFindings: MermaidFinding[];
}

function details(result: AgentToolResult<unknown>): FrontpageResultDetails {
	return resultDetails<FrontpageResultDetails>(result);
}

const baseSpec = {
	title: "T",
	thesis: "Y",
	palette: "navy" as const,
	register: "nyt-editorial" as const,
};

describe("frontpage_create surfaces mermaid lint findings", () => {
	const harness = createFrontpageTestHarness();

	test("backslash-n in mermaid label surfaces ERROR finding, page still written", async () => {
		const result = await harness.execute("frontpage_create", "c1", {
			spec: {
				...baseSpec,
				slug: "mermaid-lint-test-1",
				sections: [
					{ type: "mermaid", source: 'graph TD\n  A["line1\\nline2"] --> B' },
				],
			},
		});
		expect(result.isError).toBeFalsy();
		const text = resultText(result);
		expect(text).toContain("Frontpage written");
		expect(text).toContain("Mermaid lint:");
		expect(text).toContain("ERROR");
		expect(text).toContain("mermaid/literal-newline-in-label");
		expect(details(result).mermaidFindings).toHaveLength(1);
		expect(details(result).mermaidFindings[0]?.rule).toBe(
			"mermaid/literal-newline-in-label",
		);
		expect(details(result).mermaidFindings[0]?.level).toBe("error");
	});

	test("clean mermaid section produces no findings", async () => {
		const result = await harness.execute("frontpage_create", "c2", {
			spec: {
				...baseSpec,
				slug: "mermaid-lint-test-2",
				sections: [{ type: "mermaid", source: "graph TD\n  A --> B" }],
			},
		});
		expect(result.isError).toBeFalsy();
		expect(resultText(result)).not.toContain("Mermaid lint:");
		expect(details(result).mermaidFindings).toEqual([]);
	});

	test("multiple mermaid sections — findings attribute to specific section IDs", async () => {
		const result = await harness.execute("frontpage_create", "c3", {
			spec: {
				...baseSpec,
				slug: "mermaid-lint-test-3",
				sections: [
					{ type: "mermaid", source: "graph TD\n  A --> B" },
					{ type: "mermaid", source: "" },
					{ type: "mermaid", source: "graph\n  A --> B" },
				],
			},
		});
		expect(result.isError).toBeFalsy();
		const text = resultText(result);
		expect(text).toContain("1 error(s)");
		expect(text).toContain("1 warning(s)");
		expect(text).toContain("mermaid/empty");
		expect(text).toContain("mermaid/missing-direction");
		const findings = details(result).mermaidFindings;
		expect(findings).toHaveLength(2);
		expect(
			findings.every((finding) => typeof finding.sectionId === "string"),
		).toBe(true);
	});

	test("non-mermaid sections are not linted", async () => {
		const result = await harness.execute("frontpage_create", "c4", {
			spec: {
				...baseSpec,
				slug: "mermaid-lint-test-4",
				sections: [
					{ type: "lead", text: "no mermaid here" },
					{ type: "prose", body: "also nothing" },
				],
			},
		});
		expect(details(result).mermaidFindings).toEqual([]);
	});
});

describe("frontpage_update surfaces mermaid lint findings", () => {
	const harness = createFrontpageTestHarness();

	test("updating to a broken mermaid section surfaces the finding", async () => {
		await harness.execute("frontpage_create", "u1a", {
			spec: {
				...baseSpec,
				slug: "mermaid-lint-update-1",
				sections: [
					{ type: "mermaid", source: "graph TD\n  A --> B", id: "s1" },
				],
			},
		});
		const result = await harness.execute("frontpage_update", "u1b", {
			slug: "mermaid-lint-update-1",
			patch: [
				{
					op: "replace_section",
					section_id: "s1",
					new_section: {
						type: "mermaid",
						source: 'graph TD\n  A["broken\\nlabel"]',
					},
				},
			],
			note: "test",
		});
		expect(result.isError).toBeFalsy();
		const text = resultText(result);
		expect(text).toContain("Frontpage updated");
		expect(text).toContain("Mermaid lint:");
		expect(text).toContain("mermaid/literal-newline-in-label");
	});
});
