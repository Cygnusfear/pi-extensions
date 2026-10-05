import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { archiveDir, isWritable, moveArtifactsAside, readLifecycle, renderBanner, restoreArtifacts, writeLifecycle } from "./lifecycle.ts";

let dir = "";
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), "frontpage-lifecycle-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const exists = async (p: string) => stat(p).then(() => true, () => false);

describe("lifecycle", () => {
	test("a page with no rule is current and writable", async () => {
		const state = await readLifecycle(dir, "plain");
		expect(state.status).toBe("current");
		expect(isWritable(state)).toBe(true);
	});

	test("a rule that cannot be read never reads back as current", async () => {
		await writeFile(path.join(dir, "broken.lifecycle.json"), "{ not json", "utf8");
		const state = await readLifecycle(dir, "broken");
		expect(state.status).not.toBe("current");
		expect(isWritable(state)).toBe(false);
	});

	test("every state other than current refuses writes", async () => {
		for (const status of ["superseded", "archived", "purged"] as const) {
			await writeLifecycle(dir, "page", { status, reason: "because" });
			expect(isWritable(await readLifecycle(dir, "page"))).toBe(false);
		}
	});

	test("a rule survives a round trip", async () => {
		await writeLifecycle(dir, "page", { status: "superseded", supersededBy: "other", reason: "replaced", by: "Saul Accretion Sandage" });
		expect(await readLifecycle(dir, "page")).toMatchObject({ status: "superseded", supersededBy: "other", by: "Saul Accretion Sandage" });
	});

	test("purging moves the artifacts aside instead of deleting them", async () => {
		for (const suffix of [".html", ".meta.json", ".tldraw.json", ".canvas.png"]) {
			await writeFile(path.join(dir, "page" + suffix), "content of " + suffix, "utf8");
		}
		const moved = await moveArtifactsAside(dir, "page");
		expect(moved.sort()).toEqual([".canvas.png", ".html", ".meta.json", ".tldraw.json"]);
		expect(await exists(path.join(dir, "page.html"))).toBe(false);
		expect(await exists(archiveDir(dir, "page"))).toBe(true);
		expect(await readFile(path.join(archiveDir(dir, "page"), "page.html"), "utf8")).toBe("content of .html");
		// And the move is reversible, because a decision can be revisited.
		const restored = await restoreArtifacts(dir, "page");
		expect(restored.sort()).toEqual(moved.sort());
		expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe("content of .html");
	});

	test("a banner names the state and never claims the page is live", () => {
		const banner = renderBanner({ status: "purged", reason: "superseded by the v3 map" }, "old-map");
		expect(banner).toContain("purged");
		expect(banner).toContain("superseded by the v3 map");
	});
});
