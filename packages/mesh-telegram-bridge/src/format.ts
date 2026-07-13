const TOKEN_RE = /␞(\d+)␞/g;

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeAttribute(text: string): string {
	return escapeHtml(text).replace(/"/g, "&quot;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Normalize agent payloads before they reach Telegram. Handles JSON strings emitted by agents. */
export function displayPayload(payload: unknown): string {
	if (typeof payload === "string") {
		const trimmed = payload.trim();
		if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
			try {
				const parsed: unknown = JSON.parse(trimmed);
				if (
					isRecord(parsed) &&
					["subject", "body", "text", "message", "content"].some(
						(key) => key in parsed,
					)
				) {
					return displayPayload(parsed);
				}
			} catch {
				// Keep malformed JSON-looking agent text exactly as sent.
			}
		}
		return payload;
	}

	if (isRecord(payload)) {
		const subject =
			typeof payload.subject === "string" ? payload.subject.trim() : "";
		const value =
			payload.text ?? payload.body ?? payload.message ?? payload.content;
		if (typeof value === "string")
			return subject ? `${subject}\n${value}` : value;
		if (
			"reaction" in payload ||
			"react" in payload ||
			"emoji" in payload ||
			"attachment" in payload ||
			"image" in payload ||
			"file" in payload ||
			"path" in payload
		)
			return "";
	}

	try {
		return JSON.stringify(payload);
	} catch {
		return String(payload);
	}
}

function inlineMarkdown(text: string): string {
	const tokens: string[] = [];
	const token = (html: string): string => {
		const marker = `␞${tokens.length}␞`;
		tokens.push(html);
		return marker;
	};

	let value = text
		.replace(/`([^`\n]+)`/g, (_, code: string) =>
			token(`<code>${escapeHtml(code)}</code>`),
		)
		.replace(
			/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
			(_, label: string, href: string) =>
				token(`<a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`),
		);
	value = escapeHtml(value)
		.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
		.replace(/__([^_\n]+)__/g, "<b>$1</b>")
		.replace(/~~([^~\n]+)~~/g, "<s>$1</s>")
		.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<i>$1</i>")
		.replace(/(?<![\w])_([^_\n]+)_(?![\w])/g, "<i>$1</i>");
	return value.replace(
		TOKEN_RE,
		(_, index: string) => tokens[Number(index)] ?? "",
	);
}

/** Convert common Markdown into Telegram-safe HTML. */
export function markdownToTelegramHtml(text: string): string {
	const lines = text.split(/\r?\n/);
	const output: string[] = [];
	let inFence = false;
	let fence: string[] = [];

	for (const line of lines) {
		if (/^\s*```/.test(line)) {
			if (inFence) {
				output.push(`<pre><code>${escapeHtml(fence.join("\n"))}</code></pre>`);
				fence = [];
				inFence = false;
			} else {
				inFence = true;
			}
			continue;
		}
		if (inFence) {
			fence.push(line);
			continue;
		}

		let body = line;
		const heading = body.match(/^\s*#{1,6}\s+(.*)$/);
		if (heading) body = `**${heading[1]}**`;
		body = body.replace(/^(\s*)[-*+]\s+/, "$1• ");
		output.push(inlineMarkdown(body));
	}
	if (inFence)
		output.push(`<pre><code>${escapeHtml(fence.join("\n"))}</code></pre>`);
	return output.join("\n");
}
