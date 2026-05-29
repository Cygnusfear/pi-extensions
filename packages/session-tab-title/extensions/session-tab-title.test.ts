import { describe, test, expect } from "bun:test";
import { buildTitle, shortStableName, normalizeSessionTitle, resolveStageKey, listStageKeys, STAGES } from "../extensions/session-tab-title.ts";

describe("STAGES table", () => {
  test("has all 13 hooman-specified stages", () => {
    const keys = listStageKeys();
    for (const k of [
      "planning", "implementing", "blocked", "blocked-long", "review", "landing",
      "bugfix", "cleaning", "coordinator", "bhakti", "smoketest", "parked", "attention",
    ]) {
      expect(keys).toContain(k);
    }
    expect(keys).toHaveLength(13);
  });

  test("icons match the hooman's spec", () => {
    expect(STAGES.planning.icon).toBe("🧶");
    expect(STAGES.implementing.icon).toBe("🏭");
    expect(STAGES.blocked.icon).toBe("🚦");
    expect(STAGES["blocked-long"].icon).toBe("⛔");
    expect(STAGES.review.icon).toBe("🕵️");
    expect(STAGES.landing.icon).toBe("🛬");
    expect(STAGES.bugfix.icon).toBe("🪲");
    expect(STAGES.cleaning.icon).toBe("🧼");
    expect(STAGES.coordinator.icon).toBe("👩‍🚀");
    expect(STAGES.bhakti.icon).toBe("📡");
    expect(STAGES.smoketest.icon).toBe("🚬");
    expect(STAGES.parked.icon).toBe("🚏");
    expect(STAGES.attention.icon).toBe("🚨");
  });

  test("colors match the hooman's spec", () => {
    expect(STAGES.planning.color).toBe("none");
    expect(STAGES.implementing.color).toBe("amber");
    expect(STAGES.blocked.color).toBe("red");
    expect(STAGES["blocked-long"].color).toBe("charcoal");
    expect(STAGES.review.color).toBe("teal");
    expect(STAGES.landing.color).toBe("teal");
    expect(STAGES.bugfix.color).toBe("green");
    expect(STAGES.cleaning.color).toBe("green");
    expect(STAGES.coordinator.color).toBe("purple");
    expect(STAGES.bhakti.color).toBe("purple");
    expect(STAGES.smoketest.color).toBe("yellow");
    expect(STAGES.parked.color).toBe("grey");
    expect(STAGES.attention.color).toBe("red");
  });
});

describe("resolveStageKey", () => {
  test("resolves canonical keys", () => {
    expect(resolveStageKey("implementing")).toBe("implementing");
    expect(resolveStageKey("blocked-long")).toBe("blocked-long");
  });

  test("case-insensitive + trims", () => {
    expect(resolveStageKey("  Implementing  ")).toBe("implementing");
    expect(resolveStageKey("REVIEW")).toBe("review");
  });

  test("resolves aliases", () => {
    expect(resolveStageKey("plan")).toBe("planning");
    expect(resolveStageKey("impl")).toBe("implementing");
    expect(resolveStageKey("fix")).toBe("bugfix");
    expect(resolveStageKey("clean")).toBe("cleaning");
    expect(resolveStageKey("coord")).toBe("coordinator");
    expect(resolveStageKey("deploy")).toBe("bhakti");
    expect(resolveStageKey("land")).toBe("landing");
    expect(resolveStageKey("smoke")).toBe("smoketest");
    expect(resolveStageKey("idle")).toBe("parked");
    expect(resolveStageKey("done")).toBe("parked");
    expect(resolveStageKey("urgent")).toBe("attention");
  });

  test("returns null for unknown", () => {
    expect(resolveStageKey("nonsense")).toBeNull();
    expect(resolveStageKey("")).toBeNull();
  });
});

describe("shortStableName", () => {
  test("triple name → first + initial.", () => {
    expect(shortStableName("Gerard Stargate Freedman")).toBe("Gerard S.");
  });

  test("two words → first + initial.", () => {
    expect(shortStableName("Galileo Accretion")).toBe("Galileo A.");
  });

  test("single word → as-is, no initial", () => {
    expect(shortStableName("Gerard")).toBe("Gerard");
  });

  test("empty / null / undefined → undefined", () => {
    expect(shortStableName("")).toBeUndefined();
    expect(shortStableName(null)).toBeUndefined();
    expect(shortStableName(undefined)).toBeUndefined();
    expect(shortStableName("   ")).toBeUndefined();
  });

  test("collapses extra whitespace", () => {
    expect(shortStableName("  Gerard   Stargate   Freedman  ")).toBe("Gerard S.");
  });
});

describe("normalizeSessionTitle", () => {
  test("short codename passes through", () => {
    expect(normalizeSessionTitle("WARPSTOP")).toEqual({ title: "WARPSTOP", clipped: false });
    expect(normalizeSessionTitle("SALVAGE")).toEqual({ title: "SALVAGE", clipped: false });
  });

  test("exactly 12 chars is kept", () => {
    expect(normalizeSessionTitle("ABCDEFGHIJKL")).toEqual({ title: "ABCDEFGHIJKL", clipped: false });
  });

  test("over 12 chars is clipped", () => {
    expect(normalizeSessionTitle("REFACTOR-AUTH-MIDDLEWARE")).toEqual({ title: "REFACTOR-AUT", clipped: true });
  });

  test("trims + collapses inner whitespace", () => {
    expect(normalizeSessionTitle("  warp   stop  ")).toEqual({ title: "warp stop", clipped: false });
  });

  test("empty / whitespace / null → undefined, not clipped", () => {
    expect(normalizeSessionTitle("")).toEqual({ title: undefined, clipped: false });
    expect(normalizeSessionTitle("   ")).toEqual({ title: undefined, clipped: false });
    expect(normalizeSessionTitle(null)).toEqual({ title: undefined, clipped: false });
    expect(normalizeSessionTitle(undefined)).toEqual({ title: undefined, clipped: false });
  });
});

describe("buildTitle", () => {
  test("full: <icon> <agent-name> <ses-title> - <folder>", () => {
    expect(buildTitle("implementing", "NPC", "Gerard S.", "my-repo"))
      .toBe("🏭 Gerard S. NPC - my-repo");
  });

  test("new stages render their icons", () => {
    expect(buildTitle("smoketest", "NPC", "Gerard S.", "repo")).toBe("🚬 Gerard S. NPC - repo");
    expect(buildTitle("parked", undefined, "Gerard S.", "repo")).toBe("🚏 Gerard S. - repo");
    expect(buildTitle("attention", "NPC", undefined, "repo")).toBe("🚨 NPC - repo");
  });

  test("topic only (no stable name)", () => {
    expect(buildTitle("planning", "oracle V2-spec", undefined, "gso"))
      .toBe("🧶 oracle V2-spec - gso");
  });

  test("stable name only (no /name topic)", () => {
    expect(buildTitle("review", undefined, "Gerard S.", "pi-extensions"))
      .toBe("🕵️ Gerard S. - pi-extensions");
  });

  test("falls back to <icon> <folder> when neither (no redundant folder - folder)", () => {
    expect(buildTitle("review", undefined, undefined, "pi-extensions"))
      .toBe("🕵️ pi-extensions");
    expect(buildTitle("review", "", "", "pi-extensions"))
      .toBe("🕵️ pi-extensions");
  });

  test("unknown stage falls back to default planning icon", () => {
    expect(buildTitle("does-not-exist", "x", undefined, "y")).toBe("🧶 x - y");
  });

  test("icon is the first character (survives cmux tab truncation)", () => {
    const t = buildTitle("coordinator", "lead", "Gerard S.", "repo");
    expect(t.startsWith("👩‍🚀")).toBe(true);
  });

  test("every stage produces a distinct leading icon", () => {
    const icons = listStageKeys().map((k) => buildTitle(k, "x", undefined, "y").split(" ")[0]);
    // 👩‍🚀 contains a space-free ZWJ sequence; split(" ")[0] still isolates it
    const unique = new Set(icons);
    expect(unique.size).toBe(icons.length);
  });
});
