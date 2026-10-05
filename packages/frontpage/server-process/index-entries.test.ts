import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { listFrontpages } from "./index-entries.ts";
import { moveArtifactsAside, readLifecycle, writeLifecycle } from "./lifecycle.ts";

let dir = "";
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), "frontpage-index-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const day = 86_400_000;
const spec = (slug: string, byline?: string) => JSON.stringify({ slug, createdAt: 1_700_000_000_000, spec: { slug, title: slug, byline } });

async function page(slug: string, modified: number, meta?: string): Promise<void> {
	await writeFile(path.join(dir, slug + ".html"), "<h1>" + slug + "</h1>", "utf8");
	if (meta !== undefined) await writeFile(path.join(dir, slug + ".meta.json"), meta, "utf8");
	await utimes(path.join(dir, slug + ".html"), new Date(modified), new Date(modified));
	if (meta !== undefined) await utimes(path.join(dir, slug + ".meta.json"), new Date(modified), new Date(modified));
}

describe("index entries", () => {
	test("the most recently changed document comes first", async () => {
		await page("stale", Date.now() - 3 * day, spec("stale"));
		await page("fresh", Date.now() - 60_000, spec("fresh"));
		const entries = await listFrontpages(dir);
		expect(entries.map((e) => e.slug)).toEqual(["fresh", "stale"]);
	});

	test("each entry carries when it changed, when it was created and who wrote it", async () => {
		await page("doc", Date.now() - 60_000, spec("doc", "Margaret Void Maudlin"));
		const [entry] = await listFrontpages(dir);
		expect(entry?.author).toBe("Margaret Void Maudlin");
		expect(entry?.created).toBe(1_700_000_000_000);
		expect(entry!.modified).toBeGreaterThan(Date.now() - 5 * 60_000);
	});

	test("a document with content but no metadata is still listed, without an author", async () => {
		await page("bare", Date.now(), undefined);
		const [entry] = await listFrontpages(dir);
		expect(entry?.slug).toBe("bare");
		expect(entry?.servable).toBe(true);
		expect(entry?.problem).toBeUndefined();
		expect(entry?.author).toBeUndefined();
	});

	test("names each way an artifact cannot be treated as an ordinary page", async () => {
		await page("broken", Date.now(), "{ not json");
		await page("orphan", Date.now(), spec("orphan"));
		await rm(path.join(dir, "orphan.html"));
		await writeFile(path.join(dir, ".html"), "<h1>none</h1>", "utf8");
		const entries = await listFrontpages(dir);
		const bySlug = new Map(entries.map((e) => [e.slug, e]));
		expect(bySlug.get("broken")?.problem).toBe("metadata is not readable");
		expect(bySlug.get("orphan")?.problem).toBe("metadata with no page content");
		expect(bySlug.get("")?.problem).toBe("name cannot be used as a page address");
		expect(bySlug.get("orphan")?.servable).toBe(false);
	});

	test("a purged page is still listed, with the rule that purged it", async () => {
		await page("gone", Date.now() - day, spec("gone", "Margaret Void Maudlin"));
		await writeFile(path.join(dir, "gone.lifecycle.json"), JSON.stringify({ status: "purged", reason: "leftover", by: "Saul Accretion Sandage" }), "utf8");
		await moveArtifactsAside(dir, "gone");
		const entries = await listFrontpages(dir);
		const gone = entries.find((e) => e.slug === "gone");
		expect(gone).toBeDefined();
		expect(gone?.author).toBe("Margaret Void Maudlin");
		expect((await readLifecycle(dir, "gone")).status).toBe("purged");
	});

	test("a document that says it is called something else says so", async () => {
		await page("file-name", Date.now(), JSON.stringify({ slug: "other-name", spec: { title: "File name" } }));
		const [entry] = await listFrontpages(dir);
		expect(entry?.problem).toBe("metadata names it other-name");
	});
});
