import { describe, expect, test } from "bun:test";
import { isExplicitMeshAddress, tellAttempts } from "./tell-target.ts";

const DURABLE = "0d10973c-6ac7-4849-bace-25c682d17f28";
const throwNoPeer = () => {
	throw new Error("no live peer matched");
};

describe("tell delivery attempts", () => {
	test("a resolvable target routes straight to it", () => {
		expect(tellAttempts("vera", () => "durable-vera")).toEqual([{ kind: "route", route: "durable-vera" }]);
	});

	test("an explicit address the peer map does not know still routes", () => {
		expect(tellAttempts(DURABLE, throwNoPeer)).toEqual([
			{ kind: "mailbox" },
			{ kind: "route", route: DURABLE },
		]);
	});

	test("mailbox comes first for an explicit address, so hibernated peers keep store-and-forward", () => {
		const attempts = tellAttempts(DURABLE, throwNoPeer);
		expect(attempts[0]).toEqual({ kind: "mailbox" });
	});

	test("an unknown nickname tries the mailbox and stops - no invented route", () => {
		expect(tellAttempts("nobody at all", throwNoPeer)).toEqual([{ kind: "mailbox" }]);
	});

	test("a missing or non-string target is never treated as an address", () => {
		expect(tellAttempts(undefined, throwNoPeer)).toEqual([{ kind: "mailbox" }]);
		expect(tellAttempts("", throwNoPeer)).toEqual([{ kind: "mailbox" }]);
		expect(tellAttempts(42, throwNoPeer)).toEqual([{ kind: "mailbox" }]);
	});

	test("only uuid shapes count as explicit addresses", () => {
		expect(isExplicitMeshAddress(DURABLE)).toBe(true);
		expect(isExplicitMeshAddress("  " + DURABLE + "  ")).toBe(true);
		expect(isExplicitMeshAddress("55974709")).toBe(false);
		expect(isExplicitMeshAddress("Vera Rubin")).toBe(false);
		expect(isExplicitMeshAddress(undefined)).toBe(false);
	});
});
