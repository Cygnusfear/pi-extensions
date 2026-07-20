import { describe, expect, test } from "bun:test";
import zlib from "node:zlib";
import {
  DEFAULT_IMAGE_BUDGET_BYTES,
  MIN_IMAGE_BUDGET_BYTES,
  formatImageScaledNote,
  formatImageTooLargeError,
  prepareImageForAttachment,
  resolveImageBudgetBytes,
} from "./image-prepare";

// --- Minimal PNG encoder (RGBA8) so tests can synthesize genuinely large images ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

function encodePng(width: number, height: number, pixelAt: (x: number, y: number) => [number, number, number, number]): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = new Uint8Array(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  const iend = new Uint8Array(0);
  const total = signature.length + (12 + 13) + (12 + idat.length) + 12;
  const out = new Uint8Array(total);
  let pos = 0;
  out.set(signature, pos); pos += signature.length;
  const ihdrChunk = pngChunk("IHDR", ihdr); out.set(ihdrChunk, pos); pos += ihdrChunk.length;
  const idatChunk = pngChunk("IDAT", idat); out.set(idatChunk, pos); pos += idatChunk.length;
  const iendChunk = pngChunk("IEND", iend); out.set(iendChunk, pos);
  return out;
}

/** Random-noise PNG: compresses poorly, so even modest dimensions are multi-MB. */
function makeNoisePng(width: number, height: number): Uint8Array {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed & 0xff;
  };
  return encodePng(width, height, () => [rand(), rand(), rand(), 255]);
}

describe("resolveImageBudgetBytes", () => {
  test("defaults when no model or registry is available", () => {
    expect(resolveImageBudgetBytes()).toBe(DEFAULT_IMAGE_BUDGET_BYTES);
    expect(resolveImageBudgetBytes({ provider: "kimi-coding", id: "k3" }, undefined)).toBe(DEFAULT_IMAGE_BUDGET_BYTES);
  });

  test("uses a quarter of the model request cap", () => {
    const registry = { find: () => ({ compat: { maxRequestBodyBytes: 1_900_000 } }) };
    expect(resolveImageBudgetBytes({ provider: "kimi-coding", id: "k3" }, registry)).toBe(475_000);
  });

  test("clamps tiny caps to the minimum usable budget", () => {
    const registry = { find: () => ({ compat: { maxRequestBodyBytes: 100_000 } }) };
    expect(resolveImageBudgetBytes({ provider: "x", id: "y" }, registry)).toBe(MIN_IMAGE_BUDGET_BYTES);
  });

  test("clamps huge caps to the default budget", () => {
    const registry = { find: () => ({ compat: { maxRequestBodyBytes: 100_000_000 } }) };
    expect(resolveImageBudgetBytes({ provider: "x", id: "y" }, registry)).toBe(DEFAULT_IMAGE_BUDGET_BYTES);
  });

  test("falls back to the default when the registry throws", () => {
    const registry = {
      find: () => {
        throw new Error("boom");
      },
    };
    expect(resolveImageBudgetBytes({ provider: "x", id: "y" }, registry)).toBe(DEFAULT_IMAGE_BUDGET_BYTES);
  });
});

describe("prepareImageForAttachment", () => {
  test("passes images already under budget through untouched", async () => {
    const png = makeNoisePng(8, 8);
    const prepared = await prepareImageForAttachment(png, "image/png", 1_000_000);

    expect(prepared).not.toBeNull();
    expect(prepared!.wasResized).toBe(false);
    expect(prepared!.mimeType).toBe("image/png");
    expect(Buffer.from(prepared!.data, "base64").equals(Buffer.from(png))).toBe(true);
  });

  test("downscales an oversized screenshot until it fits the budget", async () => {
    const png = makeNoisePng(1600, 1200);
    expect(png.byteLength).toBeGreaterThan(1_000_000);

    const prepared = await prepareImageForAttachment(png, "image/png", 200_000);

    expect(prepared).not.toBeNull();
    expect(prepared!.wasResized).toBe(true);
    expect(prepared!.originalWidth).toBe(1600);
    expect(prepared!.originalHeight).toBe(1200);
    expect(prepared!.width).toBeLessThan(1600);
    expect(Buffer.byteLength(prepared!.data, "utf-8")).toBeLessThan(200_000);
  });

  test("returns null for undecodable input instead of attaching", async () => {
    const garbage = new Uint8Array(300_000).fill(0x61);

    const prepared = await prepareImageForAttachment(garbage, "image/png", 100_000);

    expect(prepared).toBeNull();
  });
});

describe("agent-facing notes", () => {
  test("scaled note reports the resize, final size, budget, and crop hint", () => {
    const note = formatImageScaledNote(
      "shot.png",
      {
        data: "x".repeat(240_000),
        mimeType: "image/jpeg",
        originalWidth: 3024,
        originalHeight: 1964,
        width: 1024,
        height: 665,
        wasResized: true,
      },
      2_000_000,
      475_000,
    );

    expect(note).toContain("shot.png");
    expect(note).toContain("3024x1964 -> 1024x665");
    expect(note).toContain("auto-scaled");
    expect(note).toContain("475KB");
    expect(note).toContain("crop");
  });

  test("too-large error names the budget and tells the agent to crop", () => {
    const note = formatImageTooLargeError("huge.png", 2_000_000, 475_000);

    expect(note).toContain("huge.png");
    expect(note).toContain("475KB");
    expect(note).toContain("Crop");
  });
});
