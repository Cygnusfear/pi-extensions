import { describe, expect, test } from "bun:test";
import {
	parseMaestriTerminalList,
	parseQuotedName,
} from "../extension/maestri-bridge/maestri-list.ts";

describe("parseQuotedName", () => {
	test("plain quoted name", () => {
		expect(parseQuotedName('"Pi #5"')).toBe("Pi #5");
	});
	test("name with maestro metadata suffix", () => {
		expect(parseQuotedName('"Dante", maestro: true')).toBe("Dante");
	});
	test("escaped quote inside name", () => {
		expect(parseQuotedName('"O\\"Neil"')).toBe('O"Neil');
	});
	test("unquoted garbage is rejected", () => {
		expect(parseQuotedName("Pi #5")).toBeUndefined();
	});
	test("control characters are rejected", () => {
		expect(parseQuotedName('"bad\u0007name"')).toBeUndefined();
	});
});

describe("parseMaestriTerminalList", () => {
	test("live format: self only, no connections", () => {
		const out = parseMaestriTerminalList(
			'You:\n  - name: "Pi #5"\n\nNo connected agents, notes, or portals. Use the Connect button in the terminal toolbar to connect to another terminal, note, or portal.\n',
		);
		expect(out.self).toBe("Pi #5");
		expect(out.connected.size).toBe(0);
	});

	test("connected agents, maestro suffix, notes section ignored", () => {
		const out = parseMaestriTerminalList(
			[
				"You:",
				'  - name: "Pi"',
				"",
				"Connected agents:",
				'  - name: "Margaret DO"',
				'  - name: "Pi #2", maestro: true',
				"",
				"Connected notes:",
				'  - name: "Sneaky Note"',
				"",
			].join("\n"),
		);
		expect(out.self).toBe("Pi");
		expect([...out.connected].sort()).toEqual(["Margaret DO", "Pi #2"]);
	});

	test("deeper-indented nested rows are never peers", () => {
		const out = parseMaestriTerminalList(
			[
				"You:",
				'  - name: "Pi"',
				"",
				"Connected agents:",
				'  - name: "Peer"',
				'    - name: "Nested Child"',
			].join("\n"),
		);
		expect(out.connected.has("Nested Child")).toBe(false);
		expect(out.connected.has("Peer")).toBe(true);
	});

	test("garbage rows and unknown headings are skipped", () => {
		const out = parseMaestriTerminalList(
			[
				"Random heading:",
				'  - name: "NotSelf"',
				"You:",
				'  - name: "Pi"',
				"garbage line",
				'  - not-a-name: "X"',
			].join("\n"),
		);
		expect(out.self).toBe("Pi");
		expect(out.connected.size).toBe(0);
	});

	test("empty output yields no self", () => {
		const out = parseMaestriTerminalList("");
		expect(out.self).toBeUndefined();
	});
});
