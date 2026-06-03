import { describe, test, expect } from "bun:test";
import { injectBeforeBodyClose } from "../server-process/html-inject.ts";

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
