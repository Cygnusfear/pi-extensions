import { describe, test, expect } from "bun:test";
import { extractRebirthMarker, buildRebirthWakeMessage, buildRebirthCommandPrompt, reloadRebirthPromptCache } from "./rebirth-wake.ts";
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
    expect(msg.content).toContain("Check state");
    expect(msg.content).toContain("ORIENTATION");
    expect(msg.content).toContain("ouija");
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

describe("buildRebirthCommandPrompt", () => {
  test("loads from prompts/rebirth-command.md and substitutes tokens", () => {
    const text = buildRebirthCommandPrompt({
      sessionId: "019eABCDEF12",
      cwd: "/Users/alex/Projects/foo",
    });
    expect(text).toContain("Session ID: 019eABCDEF12");
    expect(text).toContain("CWD: /Users/alex/Projects/foo");
    expect(text).toContain("REBIRTH");
    expect(text).toContain("$.tpv");
    expect(text).toContain("rebirth({ tpv: $.tpv })");
    // Tokens fully replaced
    expect(text).not.toContain("{{sessionId}}");
    expect(text).not.toContain("{{cwd}}");
  });

  test("contains the TPV checklist (gushing personality line included)", () => {
    const text = buildRebirthCommandPrompt({ sessionId: "x", cwd: "y" });
    expect(text).toContain("Session context");
    expect(text).toContain("Key decisions");
    expect(text).toContain("Dead ends");
    expect(text).toContain("Files modified");
    expect(text).toContain("Tickets created");
    expect(text).toContain("Lessons learned");
    expect(text).toContain("gushing");
  });
});

describe("substituteTokens (via prompt-loader)", () => {
  test("unknown tokens are left as literal {{name}} so missing data is visible", async () => {
    const { substituteTokens } = await import("./prompt-loader.ts");
    const out = substituteTokens("hello {{name}}, you said {{message}}", { name: "world" });
    expect(out).toBe("hello world, you said {{message}}");
  });

  test("multiple occurrences of the same token all substitute", async () => {
    const { substituteTokens } = await import("./prompt-loader.ts");
    const out = substituteTokens("{{x}} and {{x}} again — {{x}}", { x: "a" });
    expect(out).toBe("a and a again — a");
  });
});

describe("buildRebirthCommandPrompt + shared TPV checklist", () => {
  test("expands {{tpvChecklist}} token with content from shared/prompts/tpv-checklist.md", () => {
    const text = buildRebirthCommandPrompt({ sessionId: "x", cwd: "y" });
    // {{tpvChecklist}} was replaced (token gone)
    expect(text).not.toContain("{{tpvChecklist}}");
    // Content from shared checklist is present
    expect(text).toContain("TPV — what to track for handoff");
    expect(text).toContain("DEFERRED AND NOT TICKETED IS LOST");
  });

  test("identical TPV checklist content as the system-prompt path", async () => {
    const { loadSharedPrompt } = await import("@pi-extensions/shared/shared-prompts");
    const sharedText = loadSharedPrompt("tpv-checklist", "");
    const rebirthText = buildRebirthCommandPrompt({ sessionId: "x", cwd: "y" });
    // The full shared content is embedded — single source of truth across surfaces
    expect(rebirthText).toContain(sharedText);
  });
});
