import { describe, test, expect } from "bun:test";
import { loadSharedPrompt, reloadSharedPromptCache, getSharedPromptPath } from "./shared-prompts.ts";
import fs from "node:fs";
import path from "node:path";

describe("loadSharedPrompt", () => {
  test("loads the canonical tpv-checklist", () => {
    const text = loadSharedPrompt("tpv-checklist", "");
    expect(text.length).toBeGreaterThan(100);
    expect(text).toContain("TPV");
    expect(text).toContain("Session context");
    expect(text).toContain("Key decisions");
    expect(text).toContain("Dead ends");
    expect(text).toContain("Files modified");
    expect(text).toContain("Tickets created");
    expect(text).toContain("Unfinished work");
    expect(text).toContain("Lessons learned");
    expect(text).toContain("gushing"); // personality line
  });

  test("returns fallback when file is missing", () => {
    const text = loadSharedPrompt("absolutely-does-not-exist-xyz", "FALLBACK");
    expect(text).toBe("FALLBACK");
  });

  test("empty fallback when file missing and no fallback supplied", () => {
    const text = loadSharedPrompt("absolutely-does-not-exist-xyz");
    expect(text).toBe("");
  });

  test("mtime cache: second call returns the same content as first", () => {
    const a = loadSharedPrompt("tpv-checklist", "");
    const b = loadSharedPrompt("tpv-checklist", "");
    expect(a).toBe(b);
  });

  test("reloadSharedPromptCache forces re-read on next call", () => {
    loadSharedPrompt("tpv-checklist", ""); // populate
    reloadSharedPromptCache();
    const after = loadSharedPrompt("tpv-checklist", "");
    expect(after.length).toBeGreaterThan(100);
  });
});

describe("getSharedPromptPath", () => {
  test("returns absolute path to existing prompt", () => {
    const p = getSharedPromptPath("tpv-checklist");
    expect(path.isAbsolute(p)).toBe(true);
    expect(p.endsWith("tpv-checklist.md")).toBe(true);
    expect(fs.existsSync(p)).toBe(true);
  });

  test("returns absolute path even when prompt does not exist", () => {
    const p = getSharedPromptPath("nonexistent");
    expect(path.isAbsolute(p)).toBe(true);
    expect(p.endsWith("nonexistent.md")).toBe(true);
  });
});
