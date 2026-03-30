/**
 * Image Links extension
 *
 * When the read tool returns an image, appends a clickable file:// link
 * to the text output so you can open the image in your browser.
 * Uses OSC 8 hyperlinks which work in iTerm2, Ghostty, WezTerm, etc.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import path from "node:path";

function makeHyperlink(url: string, text: string): string {
	return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

export default function imageLinks(pi: ExtensionAPI) {
	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "read") return;

		// Check if result contains an image
		const hasImage = event.content.some(
			(block: any) => block.type === "image",
		);
		if (!hasImage) return;

		// Get the file path from the tool input
		const filePath = event.input?.path as string | undefined;
		if (!filePath) return;

		// Resolve to absolute path
		const absPath = path.isAbsolute(filePath)
			? filePath
			: path.resolve(ctx.cwd, filePath);

		const fileUrl = `file://${encodeURI(absPath)}`;
		const link = makeHyperlink(fileUrl, `📷 Open image`);

		// Append the link to the text content
		const newContent = event.content.map((block: any) => {
			if (block.type === "text" && block.text.includes("Read image file")) {
				return { ...block, text: `${block.text}\n${link}` };
			}
			return block;
		});

		return { content: newContent };
	});
}
