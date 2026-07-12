import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../..");
const guidanceFiles = [
	"packages/code-mode/extensions/code-mode-prompt.md",
	"packages/code-mode/extensions/code-mode-declarations.md",
	"skills/environment/SKILL.md",
	"packages/teams/README.md",
	"docs/walkthrough.md",
	"docs/demo-script.md",
];

describe("Teams wake guidance", () => {
	test("background terminal examples use host-owned wake", () => {
		const text = guidanceFiles
			.map((file) => fs.readFileSync(path.join(root, file), "utf8"))
			.join("\n");
		expect(text).toContain('teams.on("fixer", "terminal")');
		expect(text).toContain(".wake(");
		expect(text).not.toContain(
			'teams.on("refactor", "completed")\n  .preventDefault()',
		);
		expect(text).not.toContain(
			'teams.on({ type: "terminal" })\n  .preventDefault()',
		);
		expect(text).not.toContain("there is NO `.wake()` method");
	});

	test("guidance names console.wake as generic, not Teams, background wake", () => {
		const prompt = fs.readFileSync(
			path.join(root, "packages/code-mode/extensions/code-mode-prompt.md"),
			"utf8",
		);
		expect(prompt).toContain(
			"Teams worker events have a durable host-owned wake API",
		);
		expect(prompt).toContain(
			"Never combine `.preventDefault()` with `.then(...)` or `.each(...)` plus `console.wake()` for a Teams terminal event.",
		);
	});
});
