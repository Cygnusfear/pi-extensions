export type HashlineEdit =
	| { set_line: { anchor: string; new_text: string } }
	| { replace_lines: { start_anchor: string; end_anchor: string; new_text: string } }
	| { insert_after: { anchor: string; text: string } };

export interface AppliedHashlineEdits {
	updated: string;
	appliedEdits: number;
	warnings: string[];
}

function rotateLeft(value: number, bits: number): number {
	return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/** Workerd-safe synchronous SHA-1 used to preserve the existing anchor format. */
export function sha1Hex(input: string): string {
	const bytes = new TextEncoder().encode(input);
	const bitLength = bytes.length * 8;
	const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(bytes);
	padded[bytes.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
	view.setUint32(paddedLength - 4, bitLength >>> 0, false);

	let h0 = 0x67452301;
	let h1 = 0xefcdab89;
	let h2 = 0x98badcfe;
	let h3 = 0x10325476;
	let h4 = 0xc3d2e1f0;
	const words = new Uint32Array(80);

	for (let offset = 0; offset < padded.length; offset += 64) {
		for (let index = 0; index < 16; index += 1) {
			words[index] = view.getUint32(offset + index * 4, false);
		}
		for (let index = 16; index < 80; index += 1) {
			words[index] = rotateLeft(
				(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16]) >>> 0,
				1,
			);
		}

		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;

		for (let index = 0; index < 80; index += 1) {
			let f: number;
			let k: number;
			if (index < 20) {
				f = (b & c) | (~b & d);
				k = 0x5a827999;
			} else if (index < 40) {
				f = b ^ c ^ d;
				k = 0x6ed9eba1;
			} else if (index < 60) {
				f = (b & c) | (b & d) | (c & d);
				k = 0x8f1bbcdc;
			} else {
				f = b ^ c ^ d;
				k = 0xca62c1d6;
			}

			const next = (rotateLeft(a, 5) + (f >>> 0) + e + k + words[index]) >>> 0;
			e = d;
			d = c;
			c = rotateLeft(b, 30);
			b = a;
			a = next;
		}

		h0 = (h0 + a) >>> 0;
		h1 = (h1 + b) >>> 0;
		h2 = (h2 + c) >>> 0;
		h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0;
	}

	return [h0, h1, h2, h3, h4].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function normalizeForHash(line: string): string {
	return line.replace(/\s+/g, "");
}

export function computeLineHash(line: string): string {
	const normalized = normalizeForHash(line.endsWith("\r") ? line.slice(0, -1) : line);
	return sha1Hex(normalized).slice(0, 2);
}

export function computeContentVersion(content: string): string {
	return sha1Hex(content);
}

export function parseAnchor(anchor: string): { line: number; hash: string } {
	const match = /^(\d+):([0-9a-fA-F]+)$/.exec(anchor.trim());
	if (!match) throw new Error(`Invalid anchor '${anchor}'. Expected '<line>:<hash>'.`);
	const line = Number(match[1]);
	if (!Number.isInteger(line) || line < 1) throw new Error(`Invalid anchor '${anchor}': line must be >= 1.`);
	return { line, hash: match[2].toLowerCase() };
}

export function formatHashLines(content: string, startLine = 1, endLine?: number): string {
	const lines = content.split("\n");
	const startIndex = Math.max(0, startLine - 1);
	const endIndex = endLine === undefined ? lines.length - 1 : Math.min(lines.length - 1, endLine - 1);
	const output: string[] = [];
	for (let index = startIndex; index <= endIndex; index += 1) {
		const lineNumber = index + 1;
		const line = lines[index] ?? "";
		output.push(`${lineNumber}:${computeLineHash(line)}|${line}`);
	}
	return output.join("\n");
}

function assertAnchorMatches(fileLines: string[], ref: { line: number; hash: string }, which: string): void {
	if (ref.line < 1 || ref.line > fileLines.length) {
		throw new Error(`${which} anchor line out of range: ${ref.line}. File has ${fileLines.length} line(s). Re-read the file.`);
	}
	const actual = computeLineHash(fileLines[ref.line - 1] ?? "");
	if (actual !== ref.hash) {
		throw new Error(`${which} anchor mismatch at line ${ref.line}: expected ${ref.hash}, got ${actual}. Re-read the file and retry.`);
	}
}

function checkEscapingMismatch(originalLines: string[], newText: string): string | null {
	const escaped = String.fromCharCode(92, 96);
	const plain = String.fromCharCode(96);
	if (!originalLines.some((line) => line.includes(escaped))) return null;
	if (!newText.includes(plain) || newText.includes(escaped)) return null;
	return (
		"\n⚠️ ESCAPING WARNING: Replaced lines contained escaped backticks (" + escaped + ") " +
		"suggesting a template literal, but new text has unescaped backticks (" + plain + "). " +
		"This will likely break the file. Escape backticks as " + escaped + "."
	);
}

export function applyEditsToText(original: string, edits: readonly HashlineEdit[]): AppliedHashlineEdits {
	const hadTrailingNewline = original.endsWith("\n");
	const lines = original.split("\n");
	let appliedEdits = 0;
	const warnings: string[] = [];

	for (const edit of edits) {
		if ("set_line" in edit) {
			const ref = parseAnchor(edit.set_line.anchor);
			assertAnchorMatches(lines, ref, "set_line");
			const warning = checkEscapingMismatch([lines[ref.line - 1] ?? ""], edit.set_line.new_text);
			if (warning) warnings.push(warning);
			lines.splice(ref.line - 1, 1, ...edit.set_line.new_text.split("\n"));
			appliedEdits += 1;
			continue;
		}

		if ("replace_lines" in edit) {
			const start = parseAnchor(edit.replace_lines.start_anchor);
			const end = parseAnchor(edit.replace_lines.end_anchor);
			if (end.line < start.line) {
				throw new Error(`replace_lines invalid range: end line ${end.line} < start line ${start.line}.`);
			}
			assertAnchorMatches(lines, start, "replace_lines(start)");
			assertAnchorMatches(lines, end, "replace_lines(end)");
			const warning = checkEscapingMismatch(lines.slice(start.line - 1, end.line), edit.replace_lines.new_text);
			if (warning) warnings.push(warning);
			lines.splice(start.line - 1, end.line - start.line + 1, ...edit.replace_lines.new_text.split("\n"));
			appliedEdits += 1;
			continue;
		}

		const ref = parseAnchor(edit.insert_after.anchor);
		assertAnchorMatches(lines, ref, "insert_after");
		lines.splice(ref.line, 0, ...edit.insert_after.text.split("\n"));
		appliedEdits += 1;
	}

	let updated = lines.join("\n");
	if (hadTrailingNewline && !updated.endsWith("\n")) updated += "\n";
	if (!hadTrailingNewline && updated.endsWith("\n")) updated = updated.slice(0, -1);
	return { updated, appliedEdits, warnings };
}
