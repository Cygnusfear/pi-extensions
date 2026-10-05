import { describe, test, expect } from "bun:test";
import { injectBeforeBodyClose } from "../server-process/html-inject.ts";
import { withAnnotationLayer } from "../server-process/document-page.ts";
import { clientReleaseId, readClientRelease } from "../server-process/client-release.ts";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const SHIM = "<script>/*layout shim*/</script>";

describe("injectBeforeBodyClose — the script-leak regression", () => {
	test("injects before the LAST </body>, not the first", () => {
		const html = "<body>real</body>";
		expect(injectBeforeBodyClose(html, SHIM)).toBe("<body>real" + SHIM + "\n</body>");
	});

	test("THE BUG: a </body> inside an inline script string must NOT be the injection point", () => {
		// Mirrors the real page: zoom-pan.js's openInNewTab contains the literal
		// '</body></html>' inside the module <script>. A naive replace(/<\/body>/)
		// would inject the shim there and split the module script.
		const html =
			'<html><body><div class="container">content</div>' +
			"<script type=\"module\">\n" +
			"  function openInNewTab(){ const html='<!DOCTYPE html><body>'+svg+'</body></html>'; open(html); }\n" +
			"  mermaid.render(id, code);\n" +
			"</script>\n" +
			"</body></html>";
		const out = injectBeforeBodyClose(html, SHIM);

		// The shim must land AFTER the module script closes, not inside it.
		const shimPos = out.indexOf(SHIM);
		const scriptClosePos = out.indexOf("</script>");
		expect(shimPos).toBeGreaterThan(scriptClosePos);

		// The module script must remain intact — render call still inside it.
		const scriptOpen = out.indexOf('<script type="module">');
		const renderPos = out.indexOf("mermaid.render");
		expect(renderPos).toBeGreaterThan(scriptOpen);
		expect(renderPos).toBeLessThan(scriptClosePos);

		// Exactly one shim inserted.
		expect(out.split(SHIM).length - 1).toBe(1);
	});

	test("case-insensitive </BODY>", () => {
		expect(injectBeforeBodyClose("<BODY>x</BODY>", SHIM)).toBe("<BODY>x" + SHIM + "\n</BODY>");
	});

	test("no </body> at all → appends", () => {
		expect(injectBeforeBodyClose("<div>x</div>", SHIM)).toBe("<div>x</div>" + SHIM);
	});

	test("tolerates whitespace in the closing tag", () => {
		const out = injectBeforeBodyClose("<body>x</body >", SHIM);
		expect(out).toBe("<body>x" + SHIM + "\n</body >");
	});
});

test("document stays top-level HTML; a hostile slug cannot escape the annotation layer", () => {
	const html = '<html><body><h1>The actual document</h1><section data-id="s1">Text</section></body></html>';
	const result = withAnnotationLayer(html, '</script><iframe src="evil">', "test-release");
	expect(result).toContain('<h1>The actual document</h1>');
	expect(result).toContain('id="frontpage-annotations"');
	expect(result).toContain('href="/client/bundle.css?v=test-release"');
	// The slug travels as one encoded attribute value and nothing else, so it
	// cannot close the attribute, open an element, or end a script.
	expect(result).toContain('data-slug="%3C%2Fscript%3E%3Ciframe%20src%3D%22evil%22%3E"');
	expect(result).not.toContain('<iframe');
	expect(result).not.toContain('window.__FRONTPAGE_SLUG__');
	expect(result.lastIndexOf('</body>')).toBeGreaterThan(result.indexOf('src="/client/bundle.js?v=test-release"'));
});

test("running release retains bytes; mixed publication is refused", async () => {
	const dir = await mkdtemp(path.join(tmpdir(), "frontpage-release-"));
	const js = new TextEncoder().encode("script"), css = new TextEncoder().encode("style");
	try {
		await Promise.all([writeFile(path.join(dir, "bundle.js"), js), writeFile(path.join(dir, "bundle.css"), css), writeFile(path.join(dir, "release-id"), clientReleaseId(js, css))]);
		const release = await readClientRelease(dir);
		await writeFile(path.join(dir, "bundle.js"), "different script");
		expect(release.script.toString()).toBe("script");
		await expect(readClientRelease(dir)).rejects.toThrow("incomplete or mixed");
	} finally { await rm(dir, { recursive: true, force: true }); }
});
