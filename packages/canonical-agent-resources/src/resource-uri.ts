const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const AUTHORITY = /^[a-z0-9][a-z0-9._-]*$/;
const SAFE_BYTE = /^[A-Za-z0-9._@+-]$/;
function hasControlCharacter(value: string): boolean {
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (
			codePoint !== undefined &&
			(codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
		)
			return true;
	}
	return false;
}

export function encodeCanonicalResourceSegment(value: string): string {
	if (
		value.length === 0 ||
		value === "." ||
		value === ".." ||
		value.includes("/") ||
		value.includes("\\") ||
		hasControlCharacter(value)
	) {
		throw new Error("canonical_resource_segment_invalid");
	}
	const bytes = encoder.encode(value);
	if (decoder.decode(bytes) !== value)
		throw new Error("canonical_resource_segment_invalid");
	let encoded = "";
	for (const byte of bytes) {
		const character = String.fromCharCode(byte);
		encoded += SAFE_BYTE.test(character)
			? character
			: `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
	}
	return encoded;
}

function decodeCanonicalResourceSegment(value: string): string | undefined {
	if (value.length === 0) return undefined;
	const bytes: number[] = [];
	for (let index = 0; index < value.length; ) {
		const character = value[index];
		if (character === "%") {
			const hex = value.slice(index + 1, index + 3);
			if (!/^[0-9A-F]{2}$/.test(hex)) return undefined;
			bytes.push(Number.parseInt(hex, 16));
			index += 3;
			continue;
		}
		if (!character || !SAFE_BYTE.test(character)) return undefined;
		bytes.push(character.charCodeAt(0));
		index++;
	}
	try {
		const decoded = decoder.decode(Uint8Array.from(bytes));
		return encodeCanonicalResourceSegment(decoded) === value
			? decoded
			: undefined;
	} catch {
		return undefined;
	}
}

export function isCanonicalResourceUri(value: string): boolean {
	if (!value.startsWith("resource://")) return false;
	const parts = value.slice("resource://".length).split("/");
	const authority = parts.shift();
	if (!authority || !AUTHORITY.test(authority)) return false;
	return parts.every(
		(segment) => decodeCanonicalResourceSegment(segment) !== undefined,
	);
}
