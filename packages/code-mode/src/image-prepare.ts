/**
 * Predictive image attachment budgeting for code-mode.
 *
 * readImage() and Read() on image files attach base64 image blocks to the tool
 * result. A single oversized screenshot can push the whole request body past a
 * provider's serialized request limit (observed: a 2MB screenshot turned a Kimi
 * turn into a 3.7MB body against a 1.9MB cap, and compaction could not shed it
 * because token accounting is blind to image bytes).
 *
 * This module sizes every attached image against the current model's request
 * budget BEFORE it enters context, downscales what would blow the budget, and
 * reports the scaling to the agent so it can ask for a crop when it needs
 * full-resolution detail.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fs = require("fs") as typeof import("fs");

// ---------------------------------------------------------------------------
// Budget policy
// ---------------------------------------------------------------------------

/** Default per-image budget when the model declares no request-body cap. */
export const DEFAULT_IMAGE_BUDGET_BYTES = 1_000_000;
/** Floor for the per-image budget so tiny caps still allow a usable thumbnail. */
export const MIN_IMAGE_BUDGET_BYTES = 64_000;
/** Fraction of the model's serialized request-body cap one image may consume. */
export const IMAGE_CAP_FRACTION = 0.25;

/**
 * Hard per-dimension pixel cap for an attached image. Providers reject images
 * whose long edge exceeds their limit (Anthropic: 2000px for many-image
 * requests, and it silently downscales anything past ~1568px anyway). Capping at
 * a conservative 1568px long edge is safe across providers and matches the size
 * the model actually receives, so what we send is what it sees.
 */
export const MAX_IMAGE_EDGE_PX = 1568;
/**
 * Maximum number of tiles a single oversized image may be split into. Bounds the
 * image-token cost of a very tall screenshot; past this the image is downscaled
 * to fit within MAX_IMAGE_TILES * MAX_IMAGE_EDGE_PX on its long axis first.
 */
export const MAX_IMAGE_TILES = 6;

export interface ImageModelLike {
  provider: string;
  id: string;
}

function readModelRequestCap(model: ImageModelLike | undefined, modelRegistry: unknown): number | undefined {
  if (!model || !modelRegistry) return undefined;
  try {
    const find = (modelRegistry as { find?: (p: string, id: string) => unknown }).find;
    if (typeof find !== "function") return undefined;
    const resolved = find.call(modelRegistry, model.provider, model.id) as
      | { compat?: { maxRequestBodyBytes?: unknown } }
      | undefined;
    const cap = resolved?.compat?.maxRequestBodyBytes;
    return typeof cap === "number" && Number.isFinite(cap) && cap > 0 ? cap : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Per-image byte budget: at most IMAGE_CAP_FRACTION of the model's serialized
 * request-body cap (so one image can never consume a whole turn), clamped to a
 * usable range. Models without a declared cap get the default budget.
 */
export function resolveImageBudgetBytes(model?: ImageModelLike, modelRegistry?: unknown): number {
  const cap = readModelRequestCap(model, modelRegistry);
  if (cap === undefined) return DEFAULT_IMAGE_BUDGET_BYTES;
  return Math.max(
    MIN_IMAGE_BUDGET_BYTES,
    Math.min(DEFAULT_IMAGE_BUDGET_BYTES, Math.floor(cap * IMAGE_CAP_FRACTION)),
  );
}

// ---------------------------------------------------------------------------
// Photon (Rust/WASM) loader — mirrors the host's photon.ts: the compiled pi
// binary ships photon_rs_bg.wasm next to the executable while photon-node's
// CJS entry reads it via a baked-in __dirname path, so redirect ENOENT reads.
// ---------------------------------------------------------------------------

const WASM_FILENAME = "photon_rs_bg.wasm";

type PhotonModule = typeof import("@silvia-odwyer/photon-node");
let photonModule: PhotonModule | null = null;
let loadPromise: Promise<PhotonModule | null> | null = null;

function getFallbackWasmPaths(): string[] {
  const execDir = path.dirname(process.execPath);
  return [
    path.join(execDir, WASM_FILENAME),
    path.join(execDir, "photon", WASM_FILENAME),
    path.join(process.cwd(), WASM_FILENAME),
  ];
}

async function loadPhoton(): Promise<PhotonModule | null> {
  if (photonModule) return photonModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const originalReadFileSync = fs.readFileSync;
    const fallbackPaths = getFallbackWasmPaths();
    const mutableFs = fs as { readFileSync: typeof fs.readFileSync };
    const patched: typeof fs.readFileSync = ((file: unknown, options: unknown) => {
      const resolvedPath =
        typeof file === "string" ? file : file instanceof URL ? fileURLToPath(file) : null;
      if (resolvedPath?.endsWith(WASM_FILENAME)) {
        try {
          return originalReadFileSync(file as never, options as never);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err?.code && err.code !== "ENOENT") throw error;
          for (const fallbackPath of fallbackPaths) {
            if (!fs.existsSync(fallbackPath)) continue;
            return originalReadFileSync(fallbackPath as never, options as never);
          }
          throw error;
        }
      }
      return originalReadFileSync(file as never, options as never);
    }) as typeof fs.readFileSync;

    try {
      mutableFs.readFileSync = patched;
    } catch {
      Object.defineProperty(fs, "readFileSync", { value: patched, writable: true, configurable: true });
    }

    try {
      photonModule = await import("@silvia-odwyer/photon-node");
      return photonModule;
    } catch {
      photonModule = null;
      return photonModule;
    } finally {
      try {
        mutableFs.readFileSync = originalReadFileSync;
      } catch {
        Object.defineProperty(fs, "readFileSync", {
          value: originalReadFileSync,
          writable: true,
          configurable: true,
        });
      }
    }
  })();

  return loadPromise;
}

// ---------------------------------------------------------------------------
// Scaling
// ---------------------------------------------------------------------------

export interface PreparedImage {
  data: string;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  wasResized: boolean;
  /** True when this image is one slice of a larger image split across tiles. */
  wasTiled: boolean;
  /** 1-based index of this tile within the attachment (1 when not tiled). */
  tileIndex: number;
  /** Total number of tiles in the attachment (1 when not tiled). */
  tileCount: number;
}

function encodeCandidate(buffer: Uint8Array, mimeType: string): { data: string; encodedSize: number; mimeType: string } {
  const data = Buffer.from(buffer).toString("base64");
  return { data, encodedSize: Buffer.byteLength(data, "utf-8"), mimeType };
}

/**
 * Read pixel dimensions from an image header without decoding the pixels.
 * Supports PNG, JPEG and GIF — the formats readImage attaches in practice.
 * Returns null for anything it cannot parse cheaply (e.g. WebP); callers then
 * fall back to a full decode, which yields authoritative dimensions. Uses the
 * byte view's own offset so it stays correct for pooled Node Buffers.
 */
export function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: 8-byte signature, then IHDR with big-endian uint32 width@16, height@20.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // GIF: "GIF" then little-endian uint16 width@6, height@8.
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  // JPEG: scan segment markers for a Start-Of-Frame carrying the frame size.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 1 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      // Standalone markers that carry no length payload.
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (offset + 3 >= bytes.length) break;
      const segmentLength = view.getUint16(offset + 2);
      const isStartOfFrame =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isStartOfFrame) {
        if (offset + 8 >= bytes.length) break;
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }
  return null;
}

/**
 * Downscale a decoded image (0.75x Lanczos3 steps) starting from a target size
 * until a PNG or JPEG encoding fits the byte budget. Returns the fitting
 * candidate and its final dimensions, or null when nothing fits.
 */
function fitDecodedToBudget(
  photon: PhotonModule,
  image: InstanceType<PhotonModule["PhotonImage"]>,
  startWidth: number,
  startHeight: number,
  budgetBytes: number,
): { data: string; mimeType: string; width: number; height: number } | null {
  const qualitySteps = [80, 70, 55, 40];
  let width = Math.max(1, startWidth);
  let height = Math.max(1, startHeight);

  while (true) {
    const resized = photon.resize(image, width, height, photon.SamplingFilter.Lanczos3);
    try {
      const candidates = [encodeCandidate(resized.get_bytes(), "image/png")];
      for (const quality of qualitySteps) {
        candidates.push(encodeCandidate(resized.get_bytes_jpeg(quality), "image/jpeg"));
      }
      for (const candidate of candidates) {
        if (candidate.encodedSize < budgetBytes) {
          return { data: candidate.data, mimeType: candidate.mimeType, width, height };
        }
      }
    } finally {
      resized.free();
    }

    if (width === 1 && height === 1) break;
    const nextWidth = width === 1 ? 1 : Math.max(1, Math.floor(width * 0.75));
    const nextHeight = height === 1 ? 1 : Math.max(1, Math.floor(height * 0.75));
    if (nextWidth === width && nextHeight === height) break;
    width = nextWidth;
    height = nextHeight;
  }
  return null;
}

function verbatimAttachment(
  inputBytes: Uint8Array,
  mimeType: string,
  width: number,
  height: number,
): PreparedImage {
  return {
    data: Buffer.from(inputBytes).toString("base64"),
    mimeType,
    originalWidth: width,
    originalHeight: height,
    width,
    height,
    wasResized: false,
    wasTiled: false,
    tileIndex: 1,
    tileCount: 1,
  };
}

/**
 * Prepare an image for attachment under two hard constraints: (1) no attached
 * tile's edge exceeds MAX_IMAGE_EDGE_PX, so a provider never rejects it on
 * dimensions, and (2) the total attached bytes stay within the request budget.
 *
 * An image that already satisfies both attaches verbatim. An oversized-but-in-cap
 * image is downscaled for the byte budget. An image past the edge cap is split
 * into up to MAX_IMAGE_TILES native-resolution tiles along its long axis
 * (downscaled first only when it is too large to tile within that bound), and
 * the byte budget is shared across the tiles so tiling never inflates the request
 * body beyond a single image's budget.
 *
 * Returns one PreparedImage per attached block (1..N), or null when the image
 * cannot be decoded or made to fit.
 */
export async function prepareImagesForAttachment(
  inputBytes: Uint8Array,
  mimeType: string,
  budgetBytes: number,
): Promise<PreparedImage[] | null> {
  const inputBase64Size = Math.ceil(inputBytes.byteLength / 3) * 4;
  const headerDims = readImageDimensions(inputBytes);
  const fitsBudget = inputBase64Size < budgetBytes;
  const fitsEdge =
    headerDims !== null &&
    headerDims.width <= MAX_IMAGE_EDGE_PX &&
    headerDims.height <= MAX_IMAGE_EDGE_PX;

  // Fast path: dimensions known within the cap and bytes within budget — attach
  // verbatim without decoding.
  if (fitsBudget && fitsEdge && headerDims) {
    return [verbatimAttachment(inputBytes, mimeType, headerDims.width, headerDims.height)];
  }

  const photon = await loadPhoton();
  if (!photon) {
    // Degraded mode (no image codec available): preserve prior behavior — attach
    // verbatim when it fits the byte budget, otherwise give up. Dimension capping
    // and tiling both require the codec.
    if (fitsBudget) {
      return [verbatimAttachment(inputBytes, mimeType, headerDims?.width ?? 0, headerDims?.height ?? 0)];
    }
    return null;
  }

  let image: InstanceType<PhotonModule["PhotonImage"]> | undefined;
  try {
    image = photon.PhotonImage.new_from_byteslice(inputBytes);
    const originalWidth = image.get_width();
    const originalHeight = image.get_height();
    const longEdge = Math.max(originalWidth, originalHeight);

    // Case 1: dimensions already within the cap — single image, byte budget only.
    if (longEdge <= MAX_IMAGE_EDGE_PX) {
      if (fitsBudget) {
        return [verbatimAttachment(inputBytes, mimeType, originalWidth, originalHeight)];
      }
      const fit = fitDecodedToBudget(photon, image, originalWidth, originalHeight, budgetBytes);
      if (!fit) return null;
      return [
        {
          data: fit.data,
          mimeType: fit.mimeType,
          originalWidth,
          originalHeight,
          width: fit.width,
          height: fit.height,
          wasResized: fit.width !== originalWidth || fit.height !== originalHeight,
          wasTiled: false,
          tileIndex: 1,
          tileCount: 1,
        },
      ];
    }

    // Case 2: long edge exceeds the cap — tile along the long axis, preserving
    // native resolution per tile. Downscale first only to (a) bring the short
    // edge within the cap, or (b) keep the tile count within MAX_IMAGE_TILES.
    const vertical = originalHeight >= originalWidth;
    const shortEdge = Math.min(originalWidth, originalHeight);

    let scale = 1;
    if (shortEdge > MAX_IMAGE_EDGE_PX) scale = MAX_IMAGE_EDGE_PX / shortEdge;
    let nTiles = Math.ceil((longEdge * scale) / MAX_IMAGE_EDGE_PX);
    if (nTiles > MAX_IMAGE_TILES) {
      scale = (MAX_IMAGE_TILES * MAX_IMAGE_EDGE_PX) / longEdge;
      nTiles = MAX_IMAGE_TILES;
    }

    const workWidth = Math.max(1, Math.round(originalWidth * scale));
    const workHeight = Math.max(1, Math.round(originalHeight * scale));
    const perTileBudget = Math.max(1, Math.floor(budgetBytes / nTiles));

    const working = photon.resize(image, workWidth, workHeight, photon.SamplingFilter.Lanczos3);
    try {
      const workLong = vertical ? workHeight : workWidth;
      const sliceLength = Math.ceil(workLong / nTiles);
      const tiles: PreparedImage[] = [];

      for (let i = 0; i < nTiles; i++) {
        const start = i * sliceLength;
        if (start >= workLong) break;
        const end = Math.min(start + sliceLength, workLong);
        const x1 = vertical ? 0 : start;
        const y1 = vertical ? start : 0;
        const x2 = vertical ? workWidth : end;
        const y2 = vertical ? end : workHeight;
        const tileWidth = x2 - x1;
        const tileHeight = y2 - y1;

        const cropped = photon.crop(working, x1, y1, x2, y2);
        try {
          const fit = fitDecodedToBudget(photon, cropped, tileWidth, tileHeight, perTileBudget);
          if (!fit) return null;
          tiles.push({
            data: fit.data,
            mimeType: fit.mimeType,
            originalWidth,
            originalHeight,
            width: fit.width,
            height: fit.height,
            wasResized: scale !== 1 || fit.width !== tileWidth || fit.height !== tileHeight,
            wasTiled: false,
            tileIndex: tiles.length + 1,
            tileCount: 0,
          });
        } finally {
          cropped.free();
        }
      }

      if (tiles.length === 0) return null;
      const tiled = tiles.length > 1;
      for (const tile of tiles) {
        tile.tileCount = tiles.length;
        tile.wasTiled = tiled;
      }
      return tiles;
    } finally {
      working.free();
    }
  } catch {
    return null;
  } finally {
    image?.free();
  }
}

// ---------------------------------------------------------------------------
// Agent-facing notes
// ---------------------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1).replace(/\.0$/, "") + "MB";
  return Math.max(1, Math.round(bytes / 1000)) + "KB";
}

/** Message returned to the agent when an image attached without scaling. */
export function formatImageLoadedNote(fileName: string, mimeType: string, originalBytes: number): string {
  return `Image loaded: ${fileName} (${mimeType}, ${formatBytes(originalBytes)})`;
}

/** Message returned to the agent when an image was auto-scaled to fit the budget. */
export function formatImageScaledNote(
  fileName: string,
  prepared: PreparedImage,
  originalBytes: number,
  budgetBytes: number,
): string {
  const dims =
    prepared.originalWidth > 0
      ? ` ${prepared.originalWidth}x${prepared.originalHeight} -> ${prepared.width}x${prepared.height},`
      : "";
  return (
    `Image loaded: ${fileName} (${prepared.mimeType}, ${formatBytes(originalBytes)} -> auto-scaled${dims}, ` +
    `${formatBytes(Buffer.byteLength(prepared.data, "utf-8"))} to fit the ~${formatBytes(budgetBytes)} request budget — ` +
    "ask for a crop if you need fine detail)"
  );
}

/**
 * Message returned to the agent when a large image was split into tiles so no
 * tile edge exceeds the provider's per-dimension cap. The tiles attach as
 * consecutive image blocks and are read in order as one image, preserving native
 * resolution the provider would otherwise downscale away.
 */
export function formatImageTiledNote(
  fileName: string,
  tiles: PreparedImage[],
  originalBytes: number,
  budgetBytes: number,
): string {
  const first = tiles[0];
  const totalEncoded = tiles.reduce((sum, tile) => sum + Buffer.byteLength(tile.data, "utf-8"), 0);
  const original = first.originalWidth > 0 ? `${first.originalWidth}x${first.originalHeight}` : "oversized";
  const dims = tiles.map((tile) => `${tile.width}x${tile.height}`);
  const uniform = dims.every((d) => d === dims[0]);
  const tileSummary = uniform ? `${tiles.length} tiles of ${dims[0]}` : `${tiles.length} tiles (${dims.join(", ")})`;
  const axis = first.originalHeight >= first.originalWidth ? "top-to-bottom" : "left-to-right";
  return (
    `Image loaded: ${fileName} (${first.mimeType}, ${formatBytes(originalBytes)}) — full image ${original} ` +
    `split into ${tileSummary} so no edge exceeds ${MAX_IMAGE_EDGE_PX}px; read them ${axis} as one image ` +
    `(${formatBytes(totalEncoded)} total within the ~${formatBytes(budgetBytes)} request budget — ` +
    "ask for a crop if you need finer detail)."
  );
}

/**
 * Pick the right agent-facing note for a prepared attachment: a tiled note when
 * the image was split, a scaled note when a single image was downscaled, or a
 * plain loaded note when it attached verbatim.
 */
export function formatImageAttachmentNote(
  fileName: string,
  prepared: PreparedImage[],
  originalBytes: number,
  budgetBytes: number,
): string {
  if (prepared.length > 1) {
    return formatImageTiledNote(fileName, prepared, originalBytes, budgetBytes);
  }
  const only = prepared[0];
  return only.wasResized
    ? formatImageScaledNote(fileName, only, originalBytes, budgetBytes)
    : formatImageLoadedNote(fileName, only.mimeType, originalBytes);
}

/** Message returned to the agent when an image cannot fit the budget at all. */
export function formatImageTooLargeError(fileName: string, originalBytes: number, budgetBytes: number): string {

  return (
    `Image too large: ${fileName} (${formatBytes(originalBytes)}) exceeds the ~${formatBytes(budgetBytes)} request budget ` +
    "and could not be scaled to fit. Crop the region you need into a smaller file and read that instead."
  );
}
