import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { applyBylineForCreate, applyBylineForUpdate, type Meta } from "../extensions/frontpage.ts";
import { setStableId } from "@pi-extensions/shared/session-nickname";
import type { FrontpageSpec } from "../extensions/render.ts";

const baseSpec = (): FrontpageSpec => ({
  slug: "x",
  title: "t",
  thesis: "y",
  palette: "navy",
  register: "nyt-editorial",
  sections: [],
});

const STABLE_ID_KEY = "__piMeshStableId";

function clearStableId() {
  delete (globalThis as Record<string, unknown>)[STABLE_ID_KEY];
}

describe("frontpage byline", () => {
  beforeEach(clearStableId);
  afterEach(clearStableId);

  test("create: auto-populates byline from stable nickname", () => {
    setStableId("test-id-author");
    const spec = baseSpec();
    applyBylineForCreate(spec, null);
    expect(spec.byline).toBeTruthy();
    expect(typeof spec.byline).toBe("string");
    expect(spec.byline_date).toMatch(/T\d{2}:\d{2}:\d{2}/);
    expect(spec.contributors).toBeUndefined();
  });

  test("create: respects explicit byline override", () => {
    setStableId("test-id-author");
    const spec = { ...baseSpec(), byline: "Manual Override" };
    applyBylineForCreate(spec, null);
    expect(spec.byline).toBe("Manual Override");
  });

  test("create: no stable id → no byline", () => {
    const spec = baseSpec();
    applyBylineForCreate(spec, null);
    expect(spec.byline).toBeUndefined();
    expect(spec.byline_date).toBeTruthy(); // date still set
  });

  test("create: recreating existing slug preserves original byline + tracks new editor", () => {
    setStableId("test-id-editor");
    const existing: Meta = {
      slug: "x",
      createdAt: 1,
      updatedAt: 1,
      spec: { ...baseSpec(), byline: "Original Author" },
    };
    const spec = baseSpec();
    applyBylineForCreate(spec, existing);
    expect(spec.byline).toBe("Original Author");
    expect(spec.contributors).toEqual([
      expect.any(String), // nickname derived from test-id-editor
    ]);
    expect(spec.contributors?.[0]).not.toBe("Original Author");
  });

  test("update: same agent → no change to contributors", () => {
    setStableId("test-id-author");
    const spec = baseSpec();
    applyBylineForCreate(spec, null);
    const author = spec.byline!;
    applyBylineForUpdate(spec);
    expect(spec.byline).toBe(author);
    expect(spec.contributors).toBeUndefined();
  });

  test("update: different agent → appended to contributors once", () => {
    setStableId("test-id-author");
    const spec = baseSpec();
    applyBylineForCreate(spec, null);
    const author = spec.byline!;

    setStableId("test-id-editor");
    applyBylineForUpdate(spec);
    expect(spec.byline).toBe(author); // sticky
    expect(spec.contributors).toHaveLength(1);
    const editor = spec.contributors![0];
    expect(editor).not.toBe(author);

    // Second update from the same editor → no duplicate
    applyBylineForUpdate(spec);
    expect(spec.contributors).toHaveLength(1);
    expect(spec.contributors![0]).toBe(editor);
  });

  test("update: third agent → both editors recorded in order", () => {
    setStableId("test-id-author");
    const spec = baseSpec();
    applyBylineForCreate(spec, null);

    setStableId("test-id-editor-A");
    applyBylineForUpdate(spec);
    setStableId("test-id-editor-B");
    applyBylineForUpdate(spec);

    expect(spec.contributors).toHaveLength(2);
    const [a, b] = spec.contributors!;
    expect(a).not.toBe(b);
  });

  test("update: pre-byline frontpage adopts current agent as byline", () => {
    // simulates an old frontpage with no byline being edited
    setStableId("test-id-late-author");
    const spec = baseSpec();
    expect(spec.byline).toBeUndefined();
    applyBylineForUpdate(spec);
    expect(spec.byline).toBeTruthy();
    expect(spec.contributors).toBeUndefined();
  });

  test("update: no stable id → byline + contributors untouched", () => {
    const spec = { ...baseSpec(), byline: "Existing", contributors: ["A"] };
    applyBylineForUpdate(spec);
    expect(spec.byline).toBe("Existing");
    expect(spec.contributors).toEqual(["A"]);
    expect(spec.byline_date).toBeTruthy();
  });
});
