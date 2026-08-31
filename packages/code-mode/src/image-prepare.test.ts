import { describe, expect, test } from "bun:test";
import zlib from "node:zlib";
import {
  DEFAULT_IMAGE_BUDGET_BYTES,
  MAX_IMAGE_EDGE_PX,
  MAX_IMAGE_TILES,
  MIN_IMAGE_BUDGET_BYTES,
  type PreparedImage,
  formatImageAttachmentNote,
  formatImageScaledNote,
  formatImageTiledNote,
  formatImageTooLargeError,
  prepareImagesForAttachment,
  readImageDimensions,
  resolveImageBudgetBytes,
} from "./image-prepare";

const IMAGE_INTEGRATION_TIMEOUT_MS = 30_000;

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

/** Solid-color PNG: compresses to a few KB regardless of dimensions. */
function makeSolidPng(width: number, height: number): Uint8Array {
  return encodePng(width, height, () => [12, 34, 56, 255]);
}

function maxEdge(image: PreparedImage): number {
  return Math.max(image.width, image.height);
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

describe("readImageDimensions", () => {
  test("reads PNG dimensions from the IHDR header", () => {
    const png = makeSolidPng(13, 7);
    expect(readImageDimensions(png)).toEqual({ width: 13, height: 7 });
  });

  test("reads GIF dimensions from the logical screen descriptor", () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02, 0x00, 0x00]);
    expect(readImageDimensions(gif)).toEqual({ width: 800, height: 600 });
  });

  test("reads JPEG dimensions by scanning to the Start-Of-Frame marker", () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    ]);
    expect(readImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
  });

  test("returns null for formats it cannot parse cheaply", () => {
    expect(readImageDimensions(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBeNull();
    expect(readImageDimensions(new Uint8Array(4).fill(0))).toBeNull();
  });
});

describe("prepareImagesForAttachment", () => {
  test("passes an in-cap image under budget through untouched", async () => {
    const png = makeNoisePng(8, 8);
    const prepared = await prepareImagesForAttachment(png, "image/png", 1_000_000);

    expect(prepared).not.toBeNull();
    expect(prepared!).toHaveLength(1);
    const [only] = prepared!;
    expect(only.wasResized).toBe(false);
    expect(only.wasTiled).toBe(false);
    expect(only.tileCount).toBe(1);
    expect(only.mimeType).toBe("image/png");
    expect(Buffer.from(only.data, "base64").equals(Buffer.from(png))).toBe(true);
  });

  test("tiles a tall screenshot that fits the byte budget but exceeds the pixel cap", async () => {
    // The exact reported failure: a small-byte, very tall page slipped through the
    // byte-only budget and the provider rejected it on dimensions. It must tile now.
    const png = makeSolidPng(100, 2000);
    expect(Math.ceil((png.byteLength / 3) * 4)).toBeLessThan(1_000_000); // genuinely under budget

    const prepared = await prepareImagesForAttachment(png, "image/png", 1_000_000);

    expect(prepared).not.toBeNull();
    expect(prepared!.length).toBeGreaterThanOrEqual(2);
    for (const tile of prepared!) {
      expect(maxEdge(tile)).toBeLessThanOrEqual(MAX_IMAGE_EDGE_PX);
      expect(tile.wasTiled).toBe(true);
      expect(tile.tileCount).toBe(prepared!.length);
      expect(tile.originalWidth).toBe(100);
      expect(tile.originalHeight).toBe(2000);
    }
    expect(prepared!.map((t) => t.tileIndex)).toEqual(prepared!.map((_, i) => i + 1));
    // A tile is a re-encoded crop, never the original bytes.
    expect(Buffer.from(prepared![0].data, "base64").equals(Buffer.from(png))).toBe(false);
  });

  test("preserves native resolution across tiles (no downscale when it fits the tile bound)", async () => {
    const png = makeSolidPng(800, 2400);
    const prepared = await prepareImagesForAttachment(png, "image/png", 1_000_000);

    expect(prepared).not.toBeNull();
    expect(prepared!).toHaveLength(2);
    for (const tile of prepared!) {
      expect(tile.width).toBe(800); // full native width kept
      expect(maxEdge(tile)).toBeLessThanOrEqual(MAX_IMAGE_EDGE_PX);
      expect(tile.wasResized).toBe(false);
    }
    const totalHeight = prepared!.reduce((sum, t) => sum + t.height, 0);
    expect(totalHeight).toBe(2400); // the whole page is covered, top-to-bottom
  });

  test("bounds a pathologically tall image to at most MAX_IMAGE_TILES tiles", async () => {
    const png = makeSolidPng(100, 20_000);
    const prepared = await prepareImagesForAttachment(png, "image/png", 1_000_000);

    expect(prepared).not.toBeNull();
    expect(prepared!.length).toBeLessThanOrEqual(MAX_IMAGE_TILES);
    for (const tile of prepared!) {
      expect(maxEdge(tile)).toBeLessThanOrEqual(MAX_IMAGE_EDGE_PX);
      expect(tile.wasResized).toBe(true); // had to downscale to fit the tile bound
    }
  });

  test("downscales an in-cap image that is over the byte budget (single image)", async () => {
    const png = makeNoisePng(1400, 1000);
    expect(png.byteLength).toBeGreaterThan(200_000);

    const prepared = await prepareImagesForAttachment(png, "image/png", 200_000);

    expect(prepared).not.toBeNull();
    expect(prepared!).toHaveLength(1);
    const [only] = prepared!;
    expect(only.wasResized).toBe(true);
    expect(only.wasTiled).toBe(false);
    expect(only.originalWidth).toBe(1400);
    expect(only.width).toBeLessThan(1400);
    expect(Buffer.byteLength(only.data, "utf-8")).toBeLessThan(200_000);
  }, IMAGE_INTEGRATION_TIMEOUT_MS);

  test("returns null for undecodable input instead of attaching", async () => {
    const garbage = new Uint8Array(300_000).fill(0x61);
    const prepared = await prepareImagesForAttachment(garbage, "image/png", 100_000);
    expect(prepared).toBeNull();
  });
});

describe("agent-facing notes", () => {
  const tile = (over: Partial<PreparedImage>): PreparedImage => ({
    data: "x".repeat(1000),
    mimeType: "image/jpeg",
    originalWidth: 820,
    originalHeight: 2702,
    width: 820,
    height: 1351,
    wasResized: false,
    wasTiled: true,
    tileIndex: 1,
    tileCount: 2,
    ...over,
  });

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
        wasTiled: false,
        tileIndex: 1,
        tileCount: 1,
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

  test("tiled note names the tile count, dimensions, cap, and reading order", () => {
    const tiles = [tile({ tileIndex: 1 }), tile({ tileIndex: 2 })];
    const note = formatImageTiledNote("page.png", tiles, 1_800_000, 475_000);

    expect(note).toContain("page.png");
    expect(note).toContain("820x2702");
    expect(note).toContain("2 tiles of 820x1351");
    expect(note).toContain(String(MAX_IMAGE_EDGE_PX));
    expect(note).toContain("top-to-bottom");
    expect(note).toContain("crop");
  });

  test("attachment dispatcher routes verbatim, scaled, and tiled cases", () => {
    const verbatim = [tile({ wasResized: false, wasTiled: false, tileCount: 1, mimeType: "image/png" })];
    expect(formatImageAttachmentNote("a.png", verbatim, 100_000, 475_000)).toContain("Image loaded");
    expect(formatImageAttachmentNote("a.png", verbatim, 100_000, 475_000)).not.toContain("tiles");

    const scaled = [tile({ wasResized: true, wasTiled: false, tileCount: 1 })];
    expect(formatImageAttachmentNote("b.png", scaled, 900_000, 475_000)).toContain("auto-scaled");

    const tiled = [tile({ tileIndex: 1 }), tile({ tileIndex: 2 })];
    expect(formatImageAttachmentNote("c.png", tiled, 1_800_000, 475_000)).toContain("2 tiles of");
  });

  test("too-large error names the budget and tells the agent to crop", () => {
    const note = formatImageTooLargeError("huge.png", 2_000_000, 475_000);
    expect(note).toContain("huge.png");
    expect(note).toContain("475KB");
    expect(note).toContain("Crop");
  });
});
