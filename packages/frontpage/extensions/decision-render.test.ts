import { describe, expect, test } from "bun:test";
import { render, assignIds, type FrontpageSpec } from "./render.ts";

function pageWith(sections: unknown[]): string {
  return render(assignIds({
    slug: "t", title: "T", thesis: "x", palette: "crimson", register: "magazine-monograph",
    sections: sections as FrontpageSpec["sections"],
  }));
}

describe("decision section", () => {
  test("renders the block, options, recommended pill, free-text, and per-block counter", () => {
    const html = pageWith([
      { type: "lead", text: "hi" },
      { type: "decision", prompt: "Pick one?", options: [
        { key: "a", label: "Alpha", detail: "first", recommended: true },
        { key: "b", label: "Beta" },
      ], allowText: true },
      { type: "decision", prompt: "Free?", allowText: true },
    ]);
    expect(html).toContain('class="section fp-decision');
    expect(html).toContain('data-fp-option="a"');
    expect(html).toContain('data-fp-option="b"');
    expect(html).toContain("fp-decision__rec"); // recommended pill
    expect(html).toContain("data-fp-text"); // free-text
    expect(html).toContain("#1 of 2");
    expect(html).toContain("#2 of 2");
  });

  test("auto-collects decisions into the header pill + floating chip with the right count", () => {
    const html = pageWith([
      { type: "decision", prompt: "Q1" },
      { type: "decision", prompt: "Q2" },
      { type: "decision", prompt: "Q3" },
    ]);
    expect(html).toContain("fp-decisions-pill");
    expect(html).toContain("data-fp-pill-count>3<");
    expect(html).toContain("fp-decisions-chip");
    expect(html).toContain("decisions need you");
  });

  test("singular noun for one decision", () => {
    const html = pageWith([{ type: "decision", prompt: "Only one?" }]);
    expect(html).toContain("data-fp-pill-count>1<");
    // the rendered pill label is singular (the plural string also lives in the JS frag, so assert on the pill markup)
    expect(html).toContain('fp-decisions-pill__label">decision needs you<');
  });

  test("injects the interactive page script with the slug baked in", () => {
    const html = pageWith([{ type: "decision", prompt: "Q" }]);
    expect(html).toMatch(/const SLUG = "t"/);
    expect(html).toContain("/decision");
  });

  test("no decisions → no pill, no chip, no script", () => {
    // class names live in the always-inlined base.css; assert on markup-only attributes + the injected script
    const html = pageWith([{ type: "lead", text: "hi" }]);
    expect(html).not.toContain("data-fp-decisions-pill");
    expect(html).not.toContain("data-fp-decisions-chip");
    expect(html).not.toContain("data-fp-decision=");
    expect(html).not.toContain("const SLUG");
  });

  test("escapes hostile content in prompt/option label", () => {
    const html = pageWith([{ type: "decision", prompt: "<script>x</script>", options: [{ key: "k", label: "<b>z</b>" }] }]);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;z&lt;/b&gt;");
  });
});
