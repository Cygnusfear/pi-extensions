/**
 * Bundles the tldraw client shell for the frontpage server to serve.
 *
 * Output:
 *   packages/frontpage/dist-client/bundle.js
 *   packages/frontpage/dist-client/bundle.css
 *
 * Run with: bun run build-client (or bun run scripts/build-client.ts)
 *
 * Run automatically on extension load when dist-client/bundle.js is missing
 * (see extensions/frontpage.ts ensureClientBundleBuilt).
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { clientReleaseId } from "../server-process/client-release.ts";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const ENTRY = path.join(ROOT, "client", "tldraw-shell.tsx");
const OUT = path.join(ROOT, "dist-client");

if (!fs.existsSync(ENTRY)) {
	console.error(`Entry not found: ${ENTRY}`);
	process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const result = await Bun.build({
	entrypoints: [ENTRY],
	outdir: OUT,
	target: "browser",
	format: "esm",
	minify: true,
	sourcemap: "external",
	// Inline tldraw's CSS into the JS bundle is messy; instead we depend on
	// the loader plugin behavior of Bun to emit a separate .css. The shell
	// HTML loads /client/bundle.css explicitly.
	loader: {
		".css": "css",
	},
	naming: {
		entry: "bundle.[ext]",
		asset: "[name].[ext]",
	},
});

if (!result.success) {
	console.error("Client build failed:");
	for (const log of result.logs) {
		console.error(`  ${log.message}`);
	}
	process.exit(1);
}

const script = result.outputs.find(output => path.basename(output.path) === "bundle.js");
const style = result.outputs.find(output => path.basename(output.path) === "bundle.css");
if (!script || !style) throw new Error("Client build must emit both bundle.js and bundle.css");
const id = clientReleaseId(new Uint8Array(await script.arrayBuffer()), new Uint8Array(await style.arrayBuffer()));
const publication = path.join(OUT, "release-id." + process.pid + ".tmp");
try {
	fs.writeFileSync(publication, id + String.fromCharCode(10));
	fs.renameSync(publication, path.join(OUT, "release-id"));
} finally { fs.rmSync(publication, { force: true }); }

const bytes = result.outputs.reduce((sum, o) => sum + (o.size ?? 0), 0);
console.log(`✅ Built ${result.outputs.length} output(s), ${(bytes / 1024).toFixed(1)}KB total`);
for (const o of result.outputs) {
	console.log(`   ${path.relative(ROOT, o.path)}  ${(o.size / 1024).toFixed(1)}KB`);
}
