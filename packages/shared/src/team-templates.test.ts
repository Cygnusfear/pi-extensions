import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// All tests run against a throwaway HOME so they never touch the real
// ~/.pi/agent/team-templates.json. The module computes its path from
// os.homedir() at import time, so each scenario re-imports with a cache-bust
// query to re-bind the path to the temp HOME.
const ORIG_HOME = process.env.HOME;
let tmpHome: string;

function templatesPath(): string {
	return path.join(tmpHome, ".pi", "agent", "team-templates.json");
}

function writeTemplates(text: string): void {
	fs.mkdirSync(path.dirname(templatesPath()), { recursive: true });
	fs.writeFileSync(templatesPath(), text);
}

async function freshModule() {
	return await import("./team-templates.ts?bust=" + Math.random());
}

beforeEach(() => {
	tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "team-templates-test-"));
	process.env.HOME = tmpHome;
});

afterEach(() => {
	if (ORIG_HOME === undefined) delete process.env.HOME;
	else process.env.HOME = ORIG_HOME;
	try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
});

describe("loadTeamTemplates", () => {
	test("missing file → built-in defaults (all roles), never empty", async () => {
		const m = await freshModule();
		const t = m.loadTeamTemplates();
		expect(Object.keys(t)).toContain("review");
		expect(Object.keys(t).length).toBeGreaterThanOrEqual(7);
		expect(t).toBe(m.DEFAULT_TEAM_TEMPLATES);
	});

	test("valid file → parsed file is authoritative (no merge with defaults)", async () => {
		const m = await freshModule();
		writeTemplates(JSON.stringify({ review: { model: "x/y", prompt: "p" } }));
		const t = m.loadTeamTemplates();
		expect(Object.keys(t)).toEqual(["review"]);
		expect(t.review.model).toBe("x/y");
	});

	test("corrupt JSON (trailing comma) → recovered in memory, NOT silent-empty", async () => {
		const m = await freshModule();
		writeTemplates('{ "review": { "model": "x/y", }, }');
		const t = m.loadTeamTemplates();
		expect(t.review).toBeDefined();
		expect(t.review.model).toBe("x/y");
	});

	test("unparseable garbage → built-in defaults, never empty", async () => {
		const m = await freshModule();
		writeTemplates("}}}not json at all<<<");
		const t = m.loadTeamTemplates();
		expect(t).toBe(m.DEFAULT_TEAM_TEMPLATES);
	});

	test("non-object JSON (array) → built-in defaults", async () => {
		const m = await freshModule();
		writeTemplates("[1,2,3]");
		const t = m.loadTeamTemplates();
		expect(t).toBe(m.DEFAULT_TEAM_TEMPLATES);
	});
});

describe("ensureTeamTemplatesFile", () => {
	test("seeds the default set when the file is missing", async () => {
		const m = await freshModule();
		expect(fs.existsSync(templatesPath())).toBe(false);
		m.ensureTeamTemplatesFile();
		expect(fs.existsSync(templatesPath())).toBe(true);
		const written = JSON.parse(fs.readFileSync(templatesPath(), "utf-8"));
		expect(Object.keys(written)).toContain("review");
	});

	test("does not overwrite an existing file (idempotent)", async () => {
		const m = await freshModule();
		writeTemplates(JSON.stringify({ custom: { model: "z/z" } }));
		m.ensureTeamTemplatesFile();
		const after = JSON.parse(fs.readFileSync(templatesPath(), "utf-8"));
		expect(Object.keys(after)).toEqual(["custom"]);
	});
});

describe("role helpers", () => {
	test("resolveTemplate / loadRoleModels / loadAllRoles over a file", async () => {
		const m = await freshModule();
		writeTemplates(JSON.stringify({
			review: { model: ["a/b", "c/d"], prompt: "r" },
			scribe: { model: "e/f" },
			noModel: { prompt: "x" },
		}));
		expect(m.resolveTemplate("review")?.prompt).toBe("r");
		expect(m.resolveTemplate("missing")).toBeUndefined();
		expect(m.loadRoleModels("review")).toEqual(["a/b", "c/d"]);
		expect(m.loadRoleModels("scribe")).toEqual(["e/f"]);
		expect(m.loadRoleModels("noModel")).toBeNull();
		expect(m.loadRoleModels("absent")).toBeNull();
		const roles = m.loadAllRoles();
		expect(roles.review).toEqual(["a/b", "c/d"]);
		expect(roles.scribe).toEqual(["e/f"]);
		expect(roles.noModel).toBeUndefined();
	});
});
