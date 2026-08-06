import { describe, expect, test } from "bun:test";
import {
	currentAlertSessionIdentity,
	teamsLauncherProvenance,
	formatProviderLimitNotice,
	normalizeAlertDisplay,
	type ProviderLimitNotice,
} from "@pi-extensions/shared/alert-provenance";

describe("normalizeAlertDisplay", () => {
	test("collapses whitespace and caps length without splitting a surrogate", () => {
		expect(normalizeAlertDisplay("  a\nb  c ")).toBe("a b c");
		expect(normalizeAlertDisplay(undefined)).toBeUndefined();
		expect(normalizeAlertDisplay("😀".repeat(10), 1)).toBe("😀");
	});
});

describe("currentAlertSessionIdentity", () => {
	test("direct agent resolves session + nickname from manager and mesh", () => {
		const id = currentAlertSessionIdentity(
			{ getSessionId: () => "sess-1", getSessionName: () => "Build" },
			{ self: () => ({ nickname: "Lisa Nova" }), getIdentity: () => ({ id: "mesh-1" }) },
			{},
		);
		expect(id).toEqual({ sessionId: "sess-1", sessionName: "Build", nickname: "Lisa Nova", meshId: "mesh-1" });
	});

	test("Teams worker resolves ticket/worker from env", () => {
		const id = currentAlertSessionIdentity(undefined, undefined, {
			PI_TEAMS_TICKET_ID: "tk-9",
			PI_TEAMS_WORKER_NAME: "fixer",
		});
		expect(id.ticketId).toBe("tk-9");
		expect(id.workerName).toBe("fixer");
		expect(id.sessionId).toBeUndefined();
	});

	test("never throws on broken accessors", () => {
		const id = currentAlertSessionIdentity(
			{ getSessionName: () => { throw new Error("boom"); } },
			{ self: () => { throw new Error("x"); } },
			{},
		);
		expect(id.sessionId).toBeUndefined();
	});
});

describe("teamsLauncherProvenance", () => {
	test("returns undefined when no coordinator env is present", () => {
		expect(teamsLauncherProvenance({}, undefined)).toBeUndefined();
	});

	test("resolves name/nickname from trusted env", () => {
		const l = teamsLauncherProvenance(
			{ PI_TEAMS_COORDINATOR_SESSION_ID: "coord-sess", PI_TEAMS_COORDINATOR_SESSION_NAME: "Manager", PI_TEAMS_COORDINATOR_NICKNAME: "Anna Galaxy Jayawardhana" },
			undefined,
		);
		expect(l?.sessionId).toBe("coord-sess");
		expect(l?.sessionName).toBe("Manager");
		expect(l?.nickname).toBe("Anna Galaxy Jayawardhana");
	});

	test("legacy fallback: fills missing display from a live coordinator peer", () => {
		const l = teamsLauncherProvenance(
			{ PI_TEAMS_COORDINATOR_ID: "coord-mesh" },
			{ peers: () => [{ meshId: "coord-mesh", name: "DIRECTOR", nickname: "Sandra Flyby Maury" }] },
		);
		expect(l?.sessionName).toBe("DIRECTOR");
		expect(l?.nickname).toBe("Sandra Flyby Maury");
	});
});

describe("formatProviderLimitNotice", () => {
	test("direct agent notice names the failed session and model", () => {
		const notice: ProviderLimitNotice = {
			kind: "rate_limited",
			model: "anthropic/claude-opus-5",
			operation: "agent",
			failed: { sessionName: "Build", nickname: "Lisa Nova", sessionId: "s1" },
		};
		const out = formatProviderLimitNotice(notice);
		expect(out).toContain("rate-limited — anthropic/claude-opus-5");
		expect(out).toContain("failed: Build (Lisa Nova)");
		expect(out).not.toContain("launched by");
	});

	test("Teams notice names both the failed worker and the launcher", () => {
		const notice: ProviderLimitNotice = {
			kind: "quota",
			model: "kimi/k3",
			operation: "agent",
			failed: { sessionName: "slice-2", nickname: "Edwin Blackhole Paczyński", workerName: "fixer", ticketId: "tk-2" },
			launcher: { sessionName: "Manager", nickname: "Maggie Muon Bagenal" },
		};
		const out = formatProviderLimitNotice(notice);
		expect(out).toContain("Teams worker: fixer (ticket tk-2)");
		expect(out).toContain("launched by: Manager (Maggie Muon Bagenal)");
	});

	test("RLM notice names the operation and rlm identity, never raw task text", () => {
		const notice: ProviderLimitNotice = {
			kind: "rate_limited",
			model: "zai/glm-5",
			operation: "rlm",
			failed: { sessionName: "investigate", sessionId: "p1" },
			rlmIdentity: "evidence-map",
			detail: "auto-resuming in 62s.",
		};
		const out = formatProviderLimitNotice(notice);
		expect(out).toContain("operation: RLM (evidence-map)");
		expect(out).toContain("failed: investigate");
		expect(out).toContain("auto-resuming in 62s.");
		expect(out).not.toContain("secret"); // task text never appears
	});
});
