import { isValidTerminalName } from "./protocol.ts";

/**
 * Parser for `maestri list` output. Only the documented two-space depth rows
 * under the "You:" and "Connected agents:" headings are considered; nested rows
 * (notes, portals, future children) are never directly reachable peers.
 */

export interface MaestriTerminalList {
	self: string | undefined;
	connected: ReadonlySet<string>;
}

export function parseQuotedName(value: string): string | undefined {
	// `maestri list` emits a JSON-quoted name and may append local metadata,
	// for example `- name: "Dante", maestro: true` for the active maestro.
	const match = /^("(?:\\.|[^"\\])*")(?:\s*,.*)?$/.exec(value.trim());
	if (!match) return undefined;

	try {
		const encoded = match[1];
		if (encoded === undefined) return undefined;
		const parsed: unknown = JSON.parse(encoded);
		return typeof parsed === "string" && isValidTerminalName(parsed)
			? parsed
			: undefined;
	} catch {
		return undefined;
	}
}

export function parseMaestriTerminalList(
	listOutput: string,
): MaestriTerminalList {
	let section: "you" | "connected" | undefined;
	let self: string | undefined;
	const connected = new Set<string>();

	for (const line of listOutput.split("\n")) {
		const heading = line.trim();
		if (heading === "You:") {
			section = "you";
			continue;
		}
		if (heading === "Connected agents:") {
			section = "connected";
			continue;
		}
		if (heading.endsWith(":")) {
			section = undefined;
			continue;
		}

		const match = line.match(/^ {2}- name: (.+?)\s*$/);
		if (!match || !section) continue;
		const encodedName = match[1];
		if (encodedName === undefined) continue;
		const name = parseQuotedName(encodedName);
		if (!name) continue;
		if (section === "you" && self === undefined) self = name;
		if (section === "connected") connected.add(name);
	}

	return { self, connected };
}
