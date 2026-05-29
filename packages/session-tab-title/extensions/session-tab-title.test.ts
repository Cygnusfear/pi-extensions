import { describe, test, expect } from "bun:test";
import { buildTitle } from "../extensions/session-tab-title.ts";

describe("buildTitle", () => {
  describe("busy state", () => {
    test("prefixes with 🏭 + name + cwd", () => {
      expect(buildTitle("busy", "Implement JWT auth", "myproject"))
        .toBe("🏭 π - Implement JWT auth - myproject");
    });

    test("works without a display name", () => {
      expect(buildTitle("busy", undefined, "pi-extensions"))
        .toBe("🏭 π - pi-extensions");
    });
  });

  describe("idle state", () => {
    test("prefixes with 🛬 + name + cwd", () => {
      expect(buildTitle("idle", "Fix auth bug", "myproject"))
        .toBe("🛬 π - Fix auth bug - myproject");
    });

    test("works without a display name", () => {
      expect(buildTitle("idle", undefined, "pi-extensions"))
        .toBe("🛬 π - pi-extensions");
    });
  });

  describe("icon is the FIRST character (survives tab truncation)", () => {
    test("busy title starts with 🏭", () => {
      const t = buildTitle("busy", "a", "b");
      expect([...t][0]).toBe("🏭");
    });

    test("idle title starts with 🛬", () => {
      const t = buildTitle("idle", "a", "b");
      expect([...t][0]).toBe("🛬");
    });
  });

  describe("different state → different icon at start", () => {
    test("busy and idle icons differ", () => {
      const busy = buildTitle("busy", "x", "y");
      const idle = buildTitle("idle", "x", "y");
      expect(busy).not.toBe(idle);
      expect([...busy][0]).not.toBe([...idle][0]);
    });
  });
});
