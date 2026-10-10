import { afterEach, describe, expect, test } from "bun:test";
import { getSessionIdentity, getStableNickname, onStableIdChange, SESSION_IDENTITY_KEY, setSessionIdentity } from "./session-nickname.ts";

// Sanga san-dxhb711z: with pi-mesh off, the name a session shows must be the one its network identity carries.
afterEach(() => { delete (globalThis as any)[SESSION_IDENTITY_KEY]; delete (globalThis as any).__piMeshStableId; });

describe("provided session identity", () => {
	test("without a provider the old derivation is unchanged (a hash of the fallback id)", () => {
		expect(getSessionIdentity()).toBeNull();
		expect(getStableNickname("86a462cb-e492-4426-9ecc-bd9067f3a966")).not.toBe("Kirsten Io Kulkarni");
		expect(getStableNickname()).toBeNull();
	});
	test("a provided identity wins over the stable id and the fallback", () => {
		(globalThis as any).__piMeshStableId = "some-mesh-id";
		setSessionIdentity({ nickname: "Kirsten Io Kulkarni", id: "agent_tony_hoare", source: "sanga" });
		expect(getStableNickname("86a462cb")).toBe("Kirsten Io Kulkarni");
		expect(getSessionIdentity()).toMatchObject({ id: "agent_tony_hoare", source: "sanga" });
	});
	test("listeners re-render on a change, not on a repeat; null clears it", () => {
		let n = 0;
		const off = onStableIdChange(() => { n++; });
		setSessionIdentity({ nickname: "Ada", source: "sanga" });
		setSessionIdentity({ nickname: "Ada", source: "sanga" });
		setSessionIdentity({ nickname: "Ada Renamed", source: "sanga" });
		setSessionIdentity(null);
		off();
		expect(n).toBe(3);
		expect(getSessionIdentity()).toBeNull();
	});
	test("a writer in another bundle uses the documented global key directly", () => {
		(globalThis as any)[SESSION_IDENTITY_KEY] = { nickname: "Lucianne Magnetar Bernstein", source: "sanga" };
		expect(getStableNickname("x")).toBe("Lucianne Magnetar Bernstein");
		expect(SESSION_IDENTITY_KEY).toBe("__piSessionIdentity");
	});
	test("an empty nickname is no identity", () => {
		setSessionIdentity({ nickname: "  ", source: "sanga" });
		expect(getSessionIdentity()).toBeNull();
	});
});
