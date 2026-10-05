/**
 * Reconcile the store against itself.
 *
 * The index reports every artifact that cannot be treated as an ordinary
 * current page. This command turns those reports into exactly two outcomes:
 *
 *   - a document that still carries its own spec but no page is re-rendered
 *     from that spec, by the same function that produced the original, so
 *     nothing is invented and nothing existing is overwritten;
 *   - anything else is reported and left alone, because the honest answer to
 *     lost metadata is a decision, not a reconstruction.
 *
 * Usage:
 *   bun run scripts/reconcile.ts [--store <dir>] [--apply]
 */
import { assignIds, render, type FrontpageSpec } from "../extensions/render.ts";
import { listFrontpages, metaFile, readIndexMeta, htmlFile } from "../server-process/index-entries.ts";
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const storeAt = argv.indexOf("--store");
const STORE = storeAt >= 0 ? path.resolve(argv[storeAt + 1] ?? "") : path.join(os.homedir(), ".agent", "frontpage");

const entries = await listFrontpages(STORE);
const flagged = entries.filter((entry) => entry.problem !== undefined);
console.log("store:", STORE);
console.log("artifacts:", entries.length, "| need attention:", flagged.length);

let written = 0;
let manual = 0;
for (const entry of flagged) {
	if (entry.problem !== "metadata with no page content") {
		manual++;
		console.log("  MANUAL  " + entry.slug + ": " + entry.problem + " - nothing was changed");
		continue;
	}
	const meta = await readIndexMeta(STORE, entry.slug);
	if (meta.state !== "ok") {
		manual++;
		console.log("  MANUAL  " + entry.slug + ": no readable spec to re-render from - nothing was changed");
		continue;
	}
	const raw = JSON.parse(await fsp.readFile(metaFile(STORE, entry.slug), "utf8")) as { spec?: FrontpageSpec };
	if (!raw.spec || !Array.isArray(raw.spec.sections)) {
		manual++;
		console.log("  MANUAL  " + entry.slug + ": stored metadata carries no sections - nothing was changed");
		continue;
	}
	const html = render(assignIds(raw.spec));
	const target = htmlFile(STORE, entry.slug);
	const digest = createHash("sha256").update(html).digest("hex");
	if (!apply) {
		console.log("  RENDER  " + entry.slug + ": " + raw.spec.sections.length + " sections -> " + html.length + " bytes sha256 " + digest);
		continue;
	}
	// Never overwrite: this command exists to restore a missing page, not to
	// replace one that is there.
	if (await fsp.stat(target).then(() => true, () => false)) {
		manual++;
		console.log("  SKIP    " + entry.slug + ": a page already exists - nothing was changed");
		continue;
	}
	await fsp.writeFile(target, html, "utf8");
	written++;
	console.log("  WROTE   " + entry.slug + ": " + raw.spec.sections.length + " sections -> " + html.length + " bytes sha256 " + digest);
}
console.log(apply ? "written: " + written + " | needs a decision: " + manual : "dry run - pass --apply to write the rendered pages");
if (!apply && written === 0) console.log("(dry run writes nothing; the RENDER lines above are what --apply would create)");
process.exit(0);
