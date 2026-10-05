import { injectBeforeBodyClose } from "./html-inject.ts";

/** Keep the rendered document as the top-level page. Only annotations use React. */
export function withAnnotationLayer(html: string, slug: string, releaseId: string): string {
	const release = encodeURIComponent(releaseId);
	return injectBeforeBodyClose(html, `
<link rel="stylesheet" href="/client/bundle.css?v=${release}" />
<style>[hidden] { display: none !important; }</style>
<div id="frontpage-annotations" data-slug="${encodeURIComponent(slug)}"></div>
<script type="module" src="/client/bundle.js?v=${release}"></script>`);
}
