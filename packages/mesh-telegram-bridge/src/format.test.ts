import { describe, expect, test } from "bun:test";
import { displayPayload, markdownToTelegramHtml } from "./format.ts";

describe("displayPayload", () => {
	test("unwraps JSON-string subject/body payloads and decodes newlines", () => {
		const raw = JSON.stringify({
			subject: "D3 review fixes landed",
			body: "First pass\n\n**B1:** fixed",
		});
		expect(displayPayload(raw)).toBe(
			"D3 review fixes landed\nFirst pass\n\n**B1:** fixed",
		);
	});

	test("keeps ordinary text unchanged", () => {
		expect(displayPayload("plain text")).toBe("plain text");
	});

	test("keeps malformed JSON-looking text as-is", () => {
		expect(displayPayload("{not really json")).toBe("{not really json");
	});

	test("unwraps object payloads with text/body/message/content", () => {
		expect(displayPayload({ subject: "Subject", body: "Body" })).toBe(
			"Subject\nBody",
		);
		expect(displayPayload({ text: "just text" })).toBe("just text");
		expect(displayPayload({ message: "msg" })).toBe("msg");
		expect(displayPayload({ content: "cnt" })).toBe("cnt");
	});

	test("returns empty string for reaction/attachment-only payloads", () => {
		expect(displayPayload({ reaction: "👍", from: "x" })).toBe("");
		expect(displayPayload({ attachment: "x.png", from: "x" })).toBe("");
	});
});

describe("markdownToTelegramHtml", () => {
	test("renders common Markdown as safe Telegram HTML", () => {
		expect(
			markdownToTelegramHtml(
				"# Title\n\n**bold** *italic* `code`\n\n- one\n- two\n\n[link](https://example.com)",
			),
		).toBe(
			'<b>Title</b>\n\n<b>bold</b> <i>italic</i> <code>code</code>\n\n• one\n• two\n\n<a href="https://example.com">link</a>',
		);
	});

	test("escapes HTML and preserves fenced code", () => {
		expect(
			markdownToTelegramHtml("```ts\nconst x = <unsafe>;\n```\n<raw>"),
		).toBe("<pre><code>const x = &lt;unsafe&gt;;</code></pre>\n&lt;raw&gt;");
	});

	test("does not touch ordinary text", () => {
		expect(markdownToTelegramHtml("nothing special here")).toBe(
			"nothing special here",
		);
	});
});
