/**
 * HTML injection helpers for the frontpage server.
 *
 * Pure + dependency-free so they can be unit-tested without booting hono.
 */

/**
 * Inject a snippet immediately before the document's CLOSING </body>.
 *
 * CRITICAL — why not `html.replace(/<\/body>/i, ...)`:
 * that matches the FIRST </body>, but a rendered frontpage contains a literal
 * '</body></html>' string INSIDE the inlined zoom-pan.js (its openInNewTab
 * builds a standalone document to "open full size"). Injecting a
 * <script>…</script> shim at that first match splits the page's module
 * script — the shim's </script> prematurely closes it, and the entire rest of
 * the page's JavaScript renders to the page as visible TEXT. No diagram ever
 * runs. Every page with a zoom/pan diagram (mermaid/chart/svg/d3) breaks.
 *
 * Targeting the LAST </body> (the true document close — section content and
 * all scripts precede it) sidesteps the landmine. If there is no </body> at
 * all, append.
 */
export function injectBeforeBodyClose(html: string, snippet: string): string {
	const re = /<\/body\s*>/gi;
	let lastIdx = -1;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) lastIdx = m.index;
	if (lastIdx < 0) return html + snippet;
	return html.slice(0, lastIdx) + snippet + "\n" + html.slice(lastIdx);
}
