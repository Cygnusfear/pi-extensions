import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildRulePack,
	buildRuntimeRulePack,
	paragraphHash,
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

	test("rule ids are content-derived and distinct, so registrations cannot collide", () => {
		const paragraphs = parseContractParagraphs(contract);
		const ids = paragraphs.map((paragraph) => paragraph.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const paragraph of paragraphs) {
			expect(paragraph.id).toMatch(/^[0-9a-f]{10}$/);
			expect(paragraph.id).toBe(paragraphHash(paragraph.text));
		}
	});

	test("every checkable rule carries violation phrasing and a citation label", () => {
		const pack = buildRulePack(contract, COMPLIANCE_REGISTRY);
		for (const rule of pack.rules) {
			expect(rule.violation.length).toBeGreaterThan(10);
			expect(rule.label.length).toBeGreaterThan(0);
			expect(rule.id).toMatch(/^[0-9a-f]{10}$/);
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
	const fingerprint = paragraphHash(first.text);

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

	test("a rule id does not move when a paragraph is inserted above it", () => {
		const before = parseContractParagraphs(contract);
		const target = before.find((paragraph) => paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"));
		const inserted = contract.replace("## Prime directives\n", "## Prime directives\n\n- A NEW RULE ABOVE EVERYTHING ELSE.\n");
		const after = parseContractParagraphs(inserted);
		const same = after.find((paragraph) => paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"));
		expect(target?.id).toBe(same?.id);
		// Position is what moved; identity is what did not.
		expect(same?.ordinal).toBeGreaterThan(target?.ordinal ?? 0);
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

describe("live contract edits", () => {
	const edited = `${contract}\n\n- A BRAND NEW RULE THAT NOBODY HAS REGISTERED YET.\n`;

	test("a paragraph nobody registered is still checked, against its own text", () => {
		const built = buildRuntimeRulePack(edited, COMPLIANCE_REGISTRY);
		expect(built.unregistered.map((paragraph) => paragraph.text)).toContain(
			"- A BRAND NEW RULE THAT NOBODY HAS REGISTERED YET.",
		);
		const rule = built.pack.rules.find((candidate) =>
			candidate.text.includes("A BRAND NEW RULE"),
		);
		expect(rule?.violation).toContain("does or advises what this paragraph forbids");
	});

	test("the strict builder still refuses the same file, so the registry has to catch up", () => {
		expect(() => buildRulePack(edited, COMPLIANCE_REGISTRY)).toThrow(/unregistered/);
	});

	test("a registration with no paragraph is reported, not fatal", () => {
		const built = buildRuntimeRulePack(contract.slice(contract.indexOf("## Prime directives")), {
			...COMPLIANCE_REGISTRY,
			"a paragraph that was deleted": { violation: "something" },
		});
		expect(built.staleKeys).toContain("a paragraph that was deleted");
		expect(built.pack.rules.length).toBeGreaterThan(0);
	});

	test("registered paragraphs keep their curated wording", () => {
		const built = buildRuntimeRulePack(contract, COMPLIANCE_REGISTRY);
		const tolstoy = built.pack.rules.find((rule) => rule.text.includes("NEVER WRITE LIKE TOLSTOY"));
		expect(tolstoy?.violation).toContain("long narrative");
		expect(built.unregistered.length).toBe(0);
	});
});
