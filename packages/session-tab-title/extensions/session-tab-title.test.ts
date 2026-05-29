import { describe, test, expect } from "bun:test";
import { buildTitle, resolveStageKey, listStageKeys, STAGES } from "../extensions/session-tab-title.ts";

describe("STAGES table", () => {
  test("has all 10 hooman-specified stages", () => {
    const keys = listStageKeys();
    expect(keys).toContain("planning");
    expect(keys).toContain("implementing");
    expect(keys).toContain("blocked");
    expect(keys).toContain("blocked-long");
    expect(keys).toContain("review");
    expect(keys).toContain("landing");
    expect(keys).toContain("bugfix");
    expect(keys).toContain("cleaning");
    expect(keys).toContain("coordinator");
    expect(keys).toContain("bhakti");
    expect(keys).toHaveLength(10);
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
  });

  test("returns null for unknown", () => {
    expect(resolveStageKey("nonsense")).toBeNull();
    expect(resolveStageKey("")).toBeNull();
  });
});

describe("buildTitle", () => {
  test("format is <icon> <session-name> - <folder> — no π", () => {
    expect(buildTitle("implementing", "fixer JWT-auth", "myproject"))
      .toBe("🏭 fixer JWT-auth - myproject");
  });

  test("default planning icon, with folder", () => {
    expect(buildTitle("planning", "oracle V2-spec", "gso"))
      .toBe("🧶 oracle V2-spec - gso");
  });

  test("falls back to <icon> <folder> when no name (no redundant folder - folder)", () => {
    expect(buildTitle("review", undefined, "pi-extensions"))
      .toBe("🕵️ pi-extensions");
    expect(buildTitle("review", "", "pi-extensions"))
      .toBe("🕵️ pi-extensions");
  });

  test("unknown stage falls back to default planning icon", () => {
    expect(buildTitle("does-not-exist", "x", "y")).toBe("🧶 x - y");
  });

  test("icon is the first character (survives cmux tab truncation)", () => {
    const t = buildTitle("coordinator", "lead", "repo");
    expect(t.startsWith("👩‍🚀")).toBe(true);
  });

  test("every stage produces a distinct leading icon", () => {
    const icons = listStageKeys().map((k) => buildTitle(k, "x", "y").split(" ")[0]);
    // 👩‍🚀 contains a space-free ZWJ sequence; split(" ")[0] still isolates it
    const unique = new Set(icons);
    expect(unique.size).toBe(icons.length);
  });
});
