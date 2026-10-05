import { Box, getSnapshot, type Editor } from "tldraw";

/** A read-only, self-contained snapshot of the existing document, not a renderer. */
export async function downloadHtml(editor: Editor, slug: string): Promise<void> {
	await document.fonts.ready;
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.scrollHeight;
	const snapshot = getSnapshot(editor.store);
	const clone = document.documentElement.cloneNode(true) as HTMLElement;
	clone.querySelectorAll("#frontpage-annotations, #frontpage-annotation-extent, #frontpage-annotation-styles, script, link[rel=preconnect], link[rel=dns-prefetch], link[rel=modulepreload]").forEach(el => el.remove());
	clone.querySelectorAll('link[href^="/client/"]').forEach(el => el.remove());
	if (clone.querySelector("iframe, object, embed, video, audio")) throw new Error("This page contains embedded media that cannot be saved as a standalone HTML snapshot.");
	const originalCanvases = Array.from(document.querySelectorAll("canvas")).filter(el => !el.closest("#frontpage-annotations"));
	for (const [index, canvas] of Array.from(clone.querySelectorAll("canvas")).entries()) {
		const original = originalCanvases[index];
		if (!original) throw new Error("A chart changed while exporting. Try again.");
		const image = document.createElement("img");
		image.src = original.toDataURL("image/png");
		image.alt = original.getAttribute("aria-label") ?? "Chart snapshot";
		image.style.cssText = canvas.getAttribute("style") ?? "";
		image.width = original.getBoundingClientRect().width;
		image.height = original.getBoundingClientRect().height;
		canvas.replaceWith(image);
	}
	const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")).filter(el => !el.closest("#frontpage-annotations"));
	for (const [index, control] of Array.from(clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")).entries()) {
		const original = controls[index];
		if (!original) throw new Error("A form changed while exporting. Try again.");
		if (control instanceof HTMLTextAreaElement) control.textContent = original.value;
		else if (control instanceof HTMLSelectElement) for (const option of Array.from(control.options)) option.toggleAttribute("selected", option.value === original.value);
		else { control.setAttribute("value", original.value); if (original instanceof HTMLInputElement) control.toggleAttribute("checked", original.checked); }
		control.disabled = true;
	}
	const shapes = editor.getCurrentPageShapes().filter(shape => !editor.isShapeHidden(shape));
	if (shapes.length) {
		const bounds = shapes.map(shape => editor.getShapePageBounds(shape)).filter(bound => bound !== undefined);
		const extentWidth = Math.max(width, ...bounds.map(bound => bound.maxX));
		const extentHeight = Math.max(height, ...bounds.map(bound => bound.maxY));
		const result = await editor.getSvgElement(shapes.map(shape => shape.id), { bounds: new Box(0, 0, extentWidth, extentHeight), padding: 0, background: false, scale: 1 });
		if (!result) throw new Error("Annotations could not be exported.");
		const svg = result.svg.cloneNode(true) as SVGSVGElement;
		svg.id = "frontpage-export-annotations";
		svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:10000";
		clone.querySelector("body")!.append(svg);
	}
	const resources = new Map<string, Promise<string>>();
	const inline = (source: string, base: string): Promise<string> => {
		if (source.startsWith("data:") || source.startsWith("#")) return Promise.resolve(source);
		const url = new URL(source, base).href;
		let result = resources.get(url);
		if (!result) {
			result = fetch(url, { signal: AbortSignal.timeout(15000) }).then(async response => {
				if (!response.ok) throw new Error("Export resource could not load (HTTP " + response.status + "): " + url);
				const blob = await response.blob();
				return new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(String(reader.result));
					reader.onerror = () => reject(new Error("Export resource could not be read: " + url));
					reader.readAsDataURL(blob);
				});
			});
			resources.set(url, result);
		}
		return result;
	};
	const inlineCss = async (css: string, base: string, importsSeen = new Set<string>()): Promise<string> => {
		// Resolve imports before URL resources; imported sheets use their own base URL.
		const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*([^;]*);/g)];
		for (const match of imports) {
			const url = new URL(match[1]!, base).href;
			if (importsSeen.has(url)) throw new Error("Export stylesheet has a circular import: " + url);
			const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
			if (!response.ok) throw new Error("Export stylesheet could not load: " + url);
			const imported = await inlineCss(await response.text(), url, new Set([...importsSeen, url]));
			css = css.replace(match[0], match[2]?.trim() ? "@media " + match[2] + "{" + imported + "}" : imported);
		}
		if (/@import\s/i.test(css)) throw new Error("Export stylesheet has an unsupported import.");
		const urls = [...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g)];
		for (const match of urls) css = css.replace(match[0], 'url("' + await inline(match[2]!, base) + '")');
		return css;
	};
	for (const link of Array.from(clone.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))) {
		const url = new URL(link.getAttribute("href") ?? "", document.baseURI).href;
		const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
		if (!response.ok) throw new Error("Export stylesheet could not load: " + url);
		const style = document.createElement("style");
		style.textContent = await inlineCss(await response.text(), url);
		if (link.media) style.media = link.media;
		link.replaceWith(style);
	}
	for (const style of Array.from(clone.querySelectorAll("style"))) style.textContent = await inlineCss(style.textContent ?? "", document.baseURI);
	for (const el of Array.from(clone.querySelectorAll<HTMLElement>("[style]"))) el.setAttribute("style", await inlineCss(el.getAttribute("style") ?? "", document.baseURI));
	for (const image of Array.from(clone.querySelectorAll<HTMLImageElement>("img"))) {
		if (image.getAttribute("src")) image.src = await inline(image.getAttribute("src")!, document.baseURI);
		image.removeAttribute("srcset"); image.removeAttribute("sizes"); image.removeAttribute("loading");
	}
	for (const image of Array.from(clone.querySelectorAll<SVGImageElement>("svg image"))) {
		const source = image.getAttribute("href") ?? image.getAttribute("xlink:href");
		if (source) { image.setAttribute("href", await inline(source, document.baseURI)); image.removeAttribute("xlink:href"); }
	}
	for (const el of Array.from(clone.querySelectorAll("*"))) {
		for (const attribute of Array.from(el.attributes)) if (attribute.name.startsWith("on")) el.removeAttribute(attribute.name);
		if (el instanceof HTMLButtonElement) el.disabled = true;
		if (el instanceof HTMLFormElement) { el.removeAttribute("action"); el.removeAttribute("method"); }
		if (el instanceof HTMLAnchorElement && el.getAttribute("href")?.startsWith("javascript:")) el.removeAttribute("href");
	}
	clone.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.setAttribute("content", "width=" + width + ", initial-scale=1");
	const body = clone.querySelector("body")!;
	body.style.width = width + "px";
	body.style.minWidth = width + "px";
	const style = document.createElement("style");
	style.textContent = ".animate{opacity:1!important;transform:none!important;animation:none!important}*{animation:none!important;transition:none!important}";
	clone.querySelector("head")!.append(style);
	const data = document.createElement("script");
	data.type = "application/json";
	data.id = "frontpage-export-record";
	data.textContent = JSON.stringify({ slug, exportedAt: new Date().toISOString(), width, snapshot }).replace(/</g, "\\u003c");
	body.append(data);
	if (JSON.stringify(getSnapshot(editor.store).document) !== JSON.stringify(snapshot.document)) throw new Error("Annotations changed while exporting. Try again after they save.");
	const url = URL.createObjectURL(new Blob(["<!DOCTYPE html>\n" + clone.outerHTML], { type: "text/html;charset=utf-8" }));
	const download = document.createElement("a");
	download.href = url; download.download = slug + ".html";
	document.body.append(download); download.click(); download.remove();
	setTimeout(() => URL.revokeObjectURL(url), 60000);
}
