import { describe, expect, test } from "bun:test";
import { resolveSandboxBindings } from "./sandbox-bindings.ts";

/**
 * kal-0q4nb1ae: a host extension may take over built-in sandbox names, and every
 * other extension's bindings must survive that change untouched.
 */

const builtins = () => ({
	Read: () => "builtin-read",
	Write: () => "builtin-write",
	Edit: () => "builtin-edit",
	Bash: () => "builtin-bash",
	Glob: () => "builtin-glob",
	Grep: () => "builtin-grep",
	List: () => "builtin-list",
	WebFetch: () => "builtin-webfetch",
});

describe("resolveSandboxBindings (kal-0q4nb1ae)", () => {
	test("a host binding under a built-in name suppresses that built-in and wins", () => {
		const host = { Read: () => "hand-read", Bash: () => "hand-bash" };
		const r = resolveSandboxBindings(builtins(), host);
		expect(r.suppressed).toEqual(["Bash", "Read"]);
		expect((r.bindings.Read as () => string)()).toBe("hand-read");
		expect((r.bindings.Bash as () => string)()).toBe("hand-bash");
	});

	test("unclaimed built-ins are left in place", () => {
		const r = resolveSandboxBindings(builtins(), { Read: () => "hand-read" });
		expect(r.suppressed).toEqual(["Read"]);
		for (const name of ["Write", "Edit", "Glob", "Grep", "List", "WebFetch"]) {
			expect((r.bindings[name] as () => string)()).toBe("builtin-" + name.toLowerCase());
		}
	});

	test("other extensions' registrations pass through untouched", () => {
		// model-router's $.model-style entries, runbooks, git-ai, context — they share
		// the same map and must not be disturbed by a host claiming built-in names.
		const host = {
			Read: () => "hand-read",
			"$.model": { provider: "x", id: "y" },
			runbookRun: () => "rb",
			"git-ai": () => "ga",
		};
		const r = resolveSandboxBindings(builtins(), host);
		expect(r.suppressed).toEqual(["Read"]);
		expect(r.bindings.runbookRun).toBe(host.runbookRun);
		expect(r.bindings["git-ai"]).toBe(host["git-ai"]);
		expect(r.bindings["$.model"]).toEqual({ provider: "x", id: "y" });
	});

	test("a non-callable value on a built-in name cannot delete the tool", () => {
		const r = resolveSandboxBindings(builtins(), { Read: undefined });
		expect(r.suppressed).toEqual([]);
		expect(typeof r.bindings.Read).toBe("function");
		expect((r.bindings.Read as () => string)()).toBe("builtin-read");
		// a half-wired non-function value is refused for the same reason
		const r2 = resolveSandboxBindings(builtins(), { Read: "not-a-function" as unknown as () => string });
		expect(r2.suppressed).toEqual([]);
		expect((r2.bindings.Read as () => string)()).toBe("builtin-read");
	});

	test("precedence is deterministic across repeated resolution", () => {
		const host = { Bash: () => "hand-bash", Read: () => "hand-read" };
		const a = resolveSandboxBindings(builtins(), host);
		const b = resolveSandboxBindings(builtins(), host);
		expect(a.suppressed).toEqual(b.suppressed);
		expect(Object.keys(a.bindings).sort()).toEqual(Object.keys(b.bindings).sort());
	});

	test("a claimed built-in is absent from the merged output, not merely shadowed", () => {
		// The difference matters: "absent" means code-mode never attached an
		// fs-backed implementation at all, so no later merge step can resurrect it.
		const r = resolveSandboxBindings(builtins(), { Read: () => "hand-read" });
		expect(Object.prototype.hasOwnProperty.call(r.bindings, "Read")).toBe(true);
		expect((r.bindings.Read as () => string)()).toBe("hand-read");
		expect(r.suppressed).toContain("Read");
		expect(r.bindings.Read).not.toBe(builtins().Read);
	});
});
