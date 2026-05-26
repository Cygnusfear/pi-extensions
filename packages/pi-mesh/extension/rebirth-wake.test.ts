import { describe, test, expect } from "bun:test";
import { extractRebirthMarker, buildRebirthWakeMessage, reloadRebirthPromptCache } from "./rebirth-wake.ts";
import { MESH_REBIRTH_TYPE, MESH_IDENTITY_TYPE } from "./mesh-constants.ts";

function mockCtx(entries: Array<{ type: string; customType?: string; data?: unknown }>) {
  return { sessionManager: { getEntries: () => entries } };
}

describe("extractRebirthMarker", () => {
  test("returns null when no rebirth entry present", () => {
    const ctx = mockCtx([
      { type: "custom", customType: MESH_IDENTITY_TYPE, data: { id: "abc" } },
      { type: "message" },
    ]);
    expect(extractRebirthMarker(ctx)).toBeNull();
  });

  test("returns marker when present", () => {
    const ctx = mockCtx([
      {
        type: "custom",
        customType: MESH_REBIRTH_TYPE,
        data: { fromSession: "019e1234-abcd", transferedAt: "2026-05-25T10:00:00Z" },
      },
    ]);
    expect(extractRebirthMarker(ctx)).toEqual({
      fromSession: "019e1234-abcd",
      transferedAt: "2026-05-25T10:00:00Z",
    });
  });

  test("returns the LAST marker if multiple (defensive)", () => {
    const ctx = mockCtx([
      {
        type: "custom",
        customType: MESH_REBIRTH_TYPE,
        data: { fromSession: "first-session", transferedAt: "2026-05-25T09:00:00Z" },
      },
      {
        type: "custom",
        customType: MESH_REBIRTH_TYPE,
        data: { fromSession: "second-session", transferedAt: "2026-05-25T10:00:00Z" },
      },
    ]);
    expect(extractRebirthMarker(ctx)?.fromSession).toBe("second-session");
  });

  test("ignores entries with wrong customType", () => {
    const ctx = mockCtx([
      { type: "custom", customType: "some_other_type", data: { fromSession: "x" } },
    ]);
    expect(extractRebirthMarker(ctx)).toBeNull();
  });

  test("ignores malformed marker data", () => {
    const ctx = mockCtx([
      { type: "custom", customType: MESH_REBIRTH_TYPE, data: { fromSession: "x" } }, // missing transferedAt
      { type: "custom", customType: MESH_REBIRTH_TYPE, data: null },
      { type: "custom", customType: MESH_REBIRTH_TYPE }, // no data at all
    ]);
    expect(extractRebirthMarker(ctx)).toBeNull();
  });
});

describe("buildRebirthWakeMessage", () => {
  const marker = {
    fromSession: "019e1234-abcd-7890-ef01-234567890abc",
    transferedAt: "2026-05-25T10:00:00Z",
  };

  test("returns customType 'mesh-rebirth-wake'", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.customType).toBe("mesh-rebirth-wake");
  });

  test("display=true so the wake is visible to the hooman too", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.display).toBe(true);
  });

  test("content opens with REBIRTHED header", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toContain("REBIRTHED");
  });

  test("content points to the rebirth-handoff entry", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toContain("rebirth-handoff");
  });

  test("content includes the short parent session id for ouija lookups", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toContain("019e1234"); // first 8 chars
    expect(msg.content).not.toContain("567890abc"); // full id not exposed (8 chars only)
  });

  test("content includes transfer timestamp", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toContain("2026-05-25T10:00:00Z");
  });

  test("content includes explicit orientation steps", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toContain("Read your TPV");
    expect(msg.content).toContain("Identify");
    expect(msg.content).toContain("Check the mesh");
    expect(msg.content).toContain("continue the work");
  });

  test("content tells agent NOT to hallucinate memory", () => {
    const msg = buildRebirthWakeMessage(marker);
    expect(msg.content).toMatch(/Do NOT pretend you remember/);
  });

  test("works with null marker (defensive — should still produce a message)", () => {
    const msg = buildRebirthWakeMessage(null);
    expect(msg.customType).toBe("mesh-rebirth-wake");
    expect(msg.content).toContain("REBIRTHED");
    expect(msg.content).toContain("(unknown)"); // both parent + timestamp default to (unknown)
  });
});

describe("rebirth wake prompt file loading", () => {
  test("token substitution: every {{parentShort}} and {{transferedAt}} is replaced", () => {
    const msg = buildRebirthWakeMessage({
      fromSession: "019eABCDEF",
      transferedAt: "2026-12-25T15:00:00Z",
    });
    expect(msg.content).not.toContain("{{parentShort}}");
    expect(msg.content).not.toContain("{{transferedAt}}");
    expect(msg.content).toContain("019eABCD"); // 8-char short
    expect(msg.content).toContain("2026-12-25T15:00:00Z");
  });

  test("reloadRebirthPromptCache forces re-read on next call", async () => {
    // First call — populates cache
    const first = buildRebirthWakeMessage({ fromSession: "first0000", transferedAt: "t1" });
    expect(first.content).toContain("first000"); // 8-char short
    // Flush cache — next call must re-read from disk
    reloadRebirthPromptCache();
    const second = buildRebirthWakeMessage({ fromSession: "second00", transferedAt: "t2" });
    expect(second.content).toContain("second00");
    expect(second.content).toContain("t2");
  });
});
