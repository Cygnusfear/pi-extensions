import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildRulePack,
	paragraphFingerprint,
	parseContractParagraphs,
	type CheckableRule,
} from "./compliance-rules.ts";
import { COMPLIANCE_REGISTRY } from "./compliance-registry.ts";

const contractPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"prompts",
	"default.md",
);
const contract = readFileSync(contractPath, "utf8");

describe("contract coverage", () => {
	test("every contract paragraph is registered, so no rule is silently unchecked", () => {
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		const paragraphs = parseContractParagraphs(contract);
		expect(pack.rules.length + pack.skipped.length).toBe(paragraphs.length);
		expect(pack.rules.length).toBeGreaterThan(0);
	});

	test("paragraph fingerprints are distinct, so registrations cannot collide", () => {
		const fingerprints = parseContractParagraphs(contract).map((paragraph) =>
			paragraphFingerprint(paragraph.text),
		);
		expect(new Set(fingerprints).size).toBe(fingerprints.length);
	});

	test("every checkable rule carries violation phrasing and a citation label", () => {
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		for (const rule of pack.rules) {
			expect(rule.violation.length).toBeGreaterThan(10);
			expect(rule.label.length).toBeGreaterThan(0);
			expect(rule.id).toMatch(/^P\d{2,}$/);
		}
		expect(new Set(pack.rules.map((rule) => rule.id)).size).toBe(pack.rules.length);
	});

	test("every out-of-scope paragraph records why it is not judged", () => {
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		for (const skipped of pack.skipped) {
			expect(skipped.reason.length).toBeGreaterThan(10);
		}
	});
});

describe("drift detection", () => {
	const first = parseContractParagraphs(contract)[0];
	const fingerprint = paragraphFingerprint(first.text);

	test("an unregistered paragraph fails the build", () => {
		expect(() => buildRulePack(contract, {})).toThrow(/unregistered/);
	});

	test("a registration that matches no paragraph fails the build", () => {
		expect(() =>
			buildRulePack(contract, {
				...COMPLIANCE_REGISTRY,
				"a paragraph that was deleted from the contract": {
					violation: "something",
				},
			}),
		).toThrow(/stale/);
	});

	test("a registration must describe a violation or an out-of-scope reason, never both", () => {
		expect(() =>
			buildRulePack(contract, {
				...COMPLIANCE_REGISTRY,
				[fingerprint]: { violation: "x", outOfScope: "y" },
			}),
		).toThrow(/exactly one of violation or outOfScope/);
	});
});

describe("contract parsing", () => {
	test("each prime-directive bullet is its own paragraph", () => {
		const paragraphs = parseContractParagraphs(contract);
		const tolstoy = paragraphs.find((paragraph) =>
			paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		expect(tolstoy).toBeDefined();
		expect(tolstoy?.text.length).toBeLessThan(200);
	});

	test("frontmatter and headings are structure, not rules", () => {
		const paragraphs = parseContractParagraphs(contract);
		expect(paragraphs.some((paragraph) => paragraph.text.startsWith("---"))).toBe(false);
		expect(paragraphs.some((paragraph) => paragraph.text.startsWith("##"))).toBe(false);
	});

	test("a fenced example stays attached to the rule that introduces it", () => {
		const paragraphs = parseContractParagraphs(contract);
		const asd = paragraphs.find((paragraph) =>
			paragraph.text.includes("Awaiting your call on whether"),
		);
		expect(asd?.text).toContain("R4-1");
	});

	test("rule IDs follow contract order", () => {
		const paragraphs = parseContractParagraphs(contract);
		expect(paragraphs[0].id).toBe("P01");
		expect(paragraphs[1].ordinal).toBe(2);
	});
});

describe("rule pack shape", () => {
	// Assertions key off rule text, not ordinals: the contract is edited often and
	// inserting a paragraph renumbers everything after it.
	test("message-level rules are checked and action-level rules are not", () => {
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		const checkable = (needle: string): boolean =>
			(pack.rules as readonly CheckableRule[]).some((rule) =>
				rule.text.includes(needle),
			);
		const skipped = (needle: string): boolean =>
			pack.skipped.some((paragraph) => paragraph.text.includes(needle));

		expect(checkable("NEVER WRITE LIKE TOLSTOY")).toBe(true);
		expect(checkable("NEVER TALK ABOUT AN UNVERIFIED CONTEXT WINDOW")).toBe(true);
		expect(checkable("OK GATING IS ILLEGAL")).toBe(true);
		expect(checkable("Bun supremacy") || checkable("bun supremacy")).toBe(true);
		expect(skipped("REBASE BEFORE A MERGE")).toBe(true);
		expect(skipped("SRP")).toBe(true);
	});
});
