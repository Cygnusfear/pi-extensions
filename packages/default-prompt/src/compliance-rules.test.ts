import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildRulePack,
	paragraphHash,
	parseContractParagraphs,
	violationCriterion,
} from "./compliance-rules.ts";
import { COMPLIANCE_FIXTURES } from "./compliance-fixtures.ts";

const contractPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"prompts",
	"default.md",
);
const contract = readFileSync(contractPath, "utf8");

describe("the contract is the configuration", () => {
	test("every paragraph is a rule, with a criterion derived from its own words", () => {
		const pack = buildRulePack(contract);
		const paragraphs = parseContractParagraphs(contract);
		expect(pack.rules.length).toBe(paragraphs.length);
		expect(pack.rules.length).toBeGreaterThan(0);
		for (const rule of pack.rules) {
			expect(rule.violation).toBe(violationCriterion(rule));
			expect(rule.violation).toContain(rule.text);
		}
	});

	test("nothing filters what gets judged: no list of checkable or exempt rules exists", () => {
		// The module's whole surface: parse, hash, label, criterion, build.
		const pack = buildRulePack(contract);
		expect(pack.rules.length).toBe(parseContractParagraphs(contract).length);
		expect(Object.keys(pack)).toEqual(["rules"]);
	});

	test("editing any paragraph changes its rule, with no other file to touch", () => {
		const edited = contract.replace(
			"NEVER WRITE LIKE TOLSTOY",
			"NEVER WRITE LIKE TOLSTOY, EVER, EVEN IN A HURRY",
		);
		const before = buildRulePack(contract).rules.find((rule) =>
			rule.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		const after = buildRulePack(edited).rules.find((rule) =>
			rule.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		expect(after?.text).toContain("EVER, EVEN IN A HURRY");
		expect(after?.violation).toContain("EVER, EVEN IN A HURRY");
		expect(after?.id).not.toBe(before?.id);
	});

	test("several sources are one rule set: the same paragraph in two files is one rule", () => {
		const shared = "- ALWAYS USE BUN, NEVER NPM.\n";
		const pack = buildRulePack(shared, "## Repo rules\n\n" + shared + "- EDIT THE RULES FILE FREELY.\n");
		expect(pack.rules.filter((rule) => rule.text.includes("ALWAYS USE BUN")).length).toBe(1);
		expect(pack.rules.some((rule) => rule.text.includes("EDIT THE RULES FILE FREELY"))).toBe(true);
	});

	test("a paragraph added today is judged today", () => {
		const edited = contract + "\n\n- A BRAND NEW RULE THE HOOMAN JUST WROTE.\n";
		const added = buildRulePack(edited).rules.find((rule) =>
			rule.text.includes("A BRAND NEW RULE"),
		);
		expect(added).toBeDefined();
		expect(added?.violation).toContain("A BRAND NEW RULE THE HOOMAN JUST WROTE");
	});

	test("a rule id does not move when a paragraph is inserted above it", () => {
		const target = parseContractParagraphs(contract).find((paragraph) =>
			paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		const inserted = contract.replace(
			"## Prime directives\n",
			"## Prime directives\n\n- A NEW RULE ABOVE EVERYTHING ELSE.\n",
		);
		const same = parseContractParagraphs(inserted).find((paragraph) =>
			paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		expect(same?.id).toBe(target?.id);
		expect(same?.ordinal).toBeGreaterThan(target?.ordinal ?? 0);
	});
});

describe("contract parsing", () => {
	test("each prime-directive bullet is its own paragraph", () => {
		const tolstoy = parseContractParagraphs(contract).find((paragraph) =>
			paragraph.text.includes("NEVER WRITE LIKE TOLSTOY"),
		);
		expect(tolstoy).toBeDefined();
		expect(tolstoy?.text.length).toBeLessThan(400);
	});

	test("frontmatter and headings are structure, not rules", () => {
		const paragraphs = parseContractParagraphs(contract);
		expect(paragraphs.some((paragraph) => paragraph.text.startsWith("---"))).toBe(false);
		expect(paragraphs.some((paragraph) => paragraph.text.startsWith("##"))).toBe(false);
	});

	test("a fenced example stays attached to the rule that introduces it", () => {
		const asd = parseContractParagraphs(contract).find((paragraph) =>
			paragraph.text.includes("Awaiting your call on whether"),
		);
		expect(asd?.text).toContain("R4-1");
	});

	test("ids are content hashes and are distinct", () => {
		const paragraphs = parseContractParagraphs(contract);
		const ids = paragraphs.map((paragraph) => paragraph.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const paragraph of paragraphs) {
			expect(paragraph.id).toMatch(/^[0-9a-f]{10}$/);
			expect(paragraph.id).toBe(paragraphHash(paragraph.text));
		}
	});
});

describe("calibration fixtures", () => {
	test("every expectation names exactly one live rule", () => {
		const rules = buildRulePack(contract).rules;
		for (const fixture of COMPLIANCE_FIXTURES) {
			for (const needle of fixture.expectRules) {
				const matches = rules.filter((rule) => rule.text.includes(needle));
				expect(matches.length).toBe(1);
			}
			expect(fixture.agentMessage.length).toBeGreaterThan(0);
		}
	});
});
