import { describe, test, expect } from "bun:test";
import {
  formatInboundTellContent,
  formatInboundChatContent,
  formatInboundAskContent,
  formatPendingTellsBatch,
  formatReviveDrainBatch,
  type MeshIcons,
} from "./inbound-format.ts";

const ICONS: MeshIcons = { tell: "📨", chat: "💬", ask: "❓", sep: "·" };

describe("inbound-format — bottom-signature contract", () => {
  describe("formatInboundTellContent", () => {
    test("puts sender label at both top and bottom", () => {
      const out = formatInboundTellContent(ICONS, "Vera Rubin", "hello mesh");
      expect(out.startsWith("📨 · Vera Rubin")).toBe(true);
      expect(out.endsWith("— Vera Rubin (mesh sender, authoritative)")).toBe(true);
    });

    test("includes payload between header and signature", () => {
      const out = formatInboundTellContent(ICONS, "Carl Sagan", "look up");
      expect(out).toContain("look up");
      const lines = out.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    test("agent skimming the END sees the real sender, NOT a fake signature in body", () => {
      // Realistic scenario: sender's body contains a fake self-signature
      const payload = "hey friend, ping me back\n— shithead";
      const out = formatInboundTellContent(ICONS, "Margaret Hernquist", payload);
      // The fake "shithead" signature is inside the body
      expect(out).toContain("— shithead");
      // But the AUTHORITATIVE signature at the END is the real mesh label
      const lastNonEmptyLine = out.trim().split("\n").filter(Boolean).pop();
      expect(lastNonEmptyLine).toBe("— Margaret Hernquist (mesh sender, authoritative)");
    });
  });

  describe("formatInboundChatContent", () => {
    test("includes channel + top + bottom sender labels", () => {
      const out = formatInboundChatContent(ICONS, "team-abc", "Reinhard Genzel", "msg");
      expect(out.startsWith("💬 · #team-abc · Reinhard Genzel")).toBe(true);
      expect(out.endsWith("— Reinhard Genzel (mesh sender, authoritative)")).toBe(true);
    });
  });

  describe("formatInboundAskContent", () => {
    test("preserves reply hint and ends with sender signature", () => {
      const out = formatInboundAskContent(ICONS, "Adam Riess", "what time?", 'Reply with: mesh_tell("...", {})');
      expect(out).toContain("Adam Riess asks");
      expect(out).toContain("what time?");
      expect(out).toContain("Reply with: mesh_tell");
      expect(out.endsWith("— Adam Riess (mesh sender, authoritative)")).toBe(true);
    });
  });

  describe("formatPendingTellsBatch", () => {
    test("single tell — header reflects count, entry has bottom signature", () => {
      const out = formatPendingTellsBatch(ICONS, [
        { senderLabel: "Heidi Hammel", payloadText: "ping" },
      ]);
      expect(out).toContain("1 direct mesh-tell arrived");
      expect(out).toContain("1. 📨 · Heidi Hammel:");
      expect(out).toContain("— Heidi Hammel (mesh sender, authoritative)");
    });

    test("multiple tells — each entry has its own bottom signature", () => {
      const out = formatPendingTellsBatch(ICONS, [
        { senderLabel: "Jocelyn Bell Burnell", payloadText: "first" },
        { senderLabel: "Annie Cannon", payloadText: "second" },
        { senderLabel: "Jane Luu", payloadText: "third" },
      ]);
      expect(out).toContain("3 direct mesh-tells arrived");
      expect(out).toContain("— Jocelyn Bell Burnell (mesh sender, authoritative)");
      expect(out).toContain("— Annie Cannon (mesh sender, authoritative)");
      expect(out).toContain("— Jane Luu (mesh sender, authoritative)");
    });

    test("batch with fake-self-signature in body still attributes correctly at the bottom", () => {
      const out = formatPendingTellsBatch(ICONS, [
        // Sender lies in body
        { senderLabel: "Real Sender Name", payloadText: "hi\n— FakeNameTheySigned" },
      ]);
      // Fake signature is preserved in body
      expect(out).toContain("— FakeNameTheySigned");
      // Real signature is the authoritative one
      expect(out).toContain("— Real Sender Name (mesh sender, authoritative)");
    });
  });

  describe("special characters in sender label", () => {
    test("handles apostrophes (D'Souza, Zel'dovich)", () => {
      const out = formatInboundTellContent(ICONS, "Carolyn D'Souza", "test");
      expect(out).toContain("— Carolyn D'Souza (mesh sender, authoritative)");
    });

    test("handles hyphenated names (López-Morales)", () => {
      const out = formatInboundTellContent(ICONS, "Mercedes López-Morales", "test");
      expect(out).toContain("— Mercedes López-Morales (mesh sender, authoritative)");
    });
  });
});

describe("formatReviveDrainBatch — hibernation-seam drain (ADD-2)", () => {
  test("header says HIBERNATED + oldest-first, distinct from the busy-batch header", () => {
    const out = formatReviveDrainBatch(ICONS, [
      { senderLabel: "Alpha", payloadText: "first" },
      { senderLabel: "Beta", payloadText: "second" },
    ]);
    expect(out).toContain("HIBERNATED");
    expect(out).toContain("oldest first");
    // FIFO: the first (older) hibernated tell is numbered before the second.
    const firstIdx = out.indexOf("first");
    const secondIdx = out.indexOf("second");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  test("singular header for one tell", () => {
    const out = formatReviveDrainBatch(ICONS, [{ senderLabel: "Solo", payloadText: "only" }]);
    expect(out).toContain("1 direct mesh-tell arrived while you were HIBERNATED");
  });

  test("each entry carries the authoritative bottom signature", () => {
    const out = formatReviveDrainBatch(ICONS, [{ senderLabel: "Vera Rubin", payloadText: "hi" }]);
    expect(out).toContain("— Vera Rubin (mesh sender, authoritative)");
  });
});
