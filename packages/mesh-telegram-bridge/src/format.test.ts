import { describe, expect, test } from "bun:test";
import {
	displayPayload,
	markdownToTelegramHtml,
	normalizeAgentPayload,
	projectAgentPayload,
} from "./format.ts";

describe("normalizeAgentPayload", () => {
	test("parses supported JSON object strings", () => {
		expect(
			normalizeAgentPayload(
				'  {"image":" /tmp/frame.png ","text":"caption"}  ',
			),
		).toEqual({ image: " /tmp/frame.png ", text: "caption" });
	});

	test("preserves non-string payloads and unrelated or invalid JSON strings", () => {
		const objectPayload = { image: "/tmp/frame.png" };
		expect(normalizeAgentPayload(objectPayload)).toBe(objectPayload);
		expect(normalizeAgentPayload('{"unrelated":"value"}')).toBe(
			'{"unrelated":"value"}',
		);
		expect(normalizeAgentPayload('{"image":42}')).toBe('{"image":42}');
		expect(normalizeAgentPayload("{not really json}")).toBe(
			"{not really json}",
		);
		expect(normalizeAgentPayload('[{"image":"/tmp/frame.png"}]')).toBe(
			'[{"image":"/tmp/frame.png"}]',
		);
	});
});

describe("projectAgentPayload", () => {
	test("projects object and JSON-string media payloads identically", () => {
		const objectPayload = {
			image: " /tmp/frame.png ",
			text: "caption",
		};
		const expected = {
			text: "caption",
			attachment: "/tmp/frame.png",
			reaction: undefined,
		};
		expect(projectAgentPayload(objectPayload)).toEqual(expected);
		expect(projectAgentPayload(JSON.stringify(objectPayload))).toEqual(expected);
	});

	test("projects JSON-string attachment-only and reaction payloads", () => {
		expect(projectAgentPayload('{"file":" /tmp/frame.png "}')).toEqual({
			text: "",
			attachment: "/tmp/frame.png",
			reaction: undefined,
		});
		expect(projectAgentPayload('{"emoji":" 👍 "}')).toEqual({
			text: "",
			attachment: undefined,
			reaction: "👍",
		});
	});

	test("does not project attachment semantics from unrelated JSON text", () => {
		const raw = '{"unrelated":"value"}';
		expect(projectAgentPayload(raw)).toEqual({
			text: raw,
			attachment: undefined,
			reaction: undefined,
		});
	});

	test("preserves object alias precedence", () => {
		expect(
			projectAgentPayload({ attachment: "", image: "/tmp/frame.png" }),
		).toEqual({ text: "", attachment: undefined, reaction: undefined });
		expect(projectAgentPayload({ reaction: 42, emoji: "👍" })).toEqual({
			text: "",
			attachment: undefined,
			reaction: undefined,
		});
	});
});

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
		expect(displayPayload('{"image":"x.png"}')).toBe("");
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
