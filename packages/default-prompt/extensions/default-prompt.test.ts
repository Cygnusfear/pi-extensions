import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { setStableId } from "@pi-extensions/shared/session-nickname";

const STABLE_ID_KEY = "__piMeshStableId";

function clearStableId() {
  delete (globalThis as Record<string, unknown>)[STABLE_ID_KEY];
}

// We can't easily test the extension's before_agent_start handler in isolation
// without a full pi runtime. Instead we exercise the buildIdentityBlock function
// by re-importing the module and asserting on the systemPrompt that comes out
// of a fake before_agent_start fire.

async function captureSystemPromptResult(eventInput: any, ctxInput: any): Promise<any> {
  const { default: register } = await import("../extensions/default-prompt.ts?test-bust=" + Math.random());
  let handler: any = null;
  const fakePi = {
    on(event: string, h: any) {
      if (event === "before_agent_start") handler = h;
    },
  };
  register(fakePi as any);
  if (!handler) throw new Error("handler not registered");
  return handler(eventInput, ctxInput);
}

describe("default-prompt identity injection", () => {
  beforeEach(clearStableId);
  afterEach(clearStableId);

  test("injects identity block when stable id is set", async () => {
    setStableId("test-id-injection");
    const result = await captureSystemPromptResult({ systemPrompt: "base" }, { cwd: "/tmp/no-such-repo" });
    expect(result).toBeDefined();
    expect(result.systemPrompt).toContain("Your identity (re-anchored every turn)");
    // Stable nickname: "First Cosmic Last" — name parts may include apostrophes
    // (D'Souza), hyphens (López-Morales, Lynden-Bell), accents (Hložek, Özel),
    // even spaces (single-astronomer easter eggs). Just require three bolded
    // tokens after "You are **" and before "** on the mesh".
    expect(result.systemPrompt).toMatch(/You are \*\*[^*]+\*\* on the mesh\./);
    expect(result.systemPrompt).toContain("does NOT change between turns");
    expect(result.systemPrompt).toMatch(/Current time: \*\*[^*]+\*\* \(\d{4}-\d{2}-\d{2}T/);
  });

  test("identity block appears AFTER the base prompt and bundled global prompt", async () => {
    setStableId("test-id-order");
    const result = await captureSystemPromptResult({ systemPrompt: "BASE_PROMPT_MARKER" }, { cwd: "/tmp/no-such-repo" });
    const idx_base = result.systemPrompt.indexOf("BASE_PROMPT_MARKER");
    const idx_identity = result.systemPrompt.indexOf("Your identity (re-anchored every turn)");
    expect(idx_base).toBeGreaterThanOrEqual(0);
    expect(idx_identity).toBeGreaterThan(idx_base);
  });

  test("does NOT inject identity when no stable id is available", async () => {
    // Don't call setStableId — globalThis.__piMeshStableId is undefined
    const result = await captureSystemPromptResult({ systemPrompt: "base" }, { cwd: "/tmp/no-such-repo" });
    // result may still be defined (from bundled global prompt) but must NOT
    // contain the identity block
    const text = result?.systemPrompt ?? "";
    expect(text).not.toContain("Your identity (re-anchored every turn)");
  });

  test("identity block contains both ISO and local-time formats", async () => {
    setStableId("test-id-time-format");
    const result = await captureSystemPromptResult({ systemPrompt: "" }, { cwd: "/tmp/no-such-repo" });
    // ISO timestamp
    expect(result.systemPrompt).toMatch(/\(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Local timestamp with weekday — e.g. "Mon, May 23, 2026, 03:00 PM EDT"
    expect(result.systemPrompt).toMatch(/Current time: \*\*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/);
  });
});
