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
}

function encodeCandidate(buffer: Uint8Array, mimeType: string): { data: string; encodedSize: number; mimeType: string } {
  const data = Buffer.from(buffer).toString("base64");
  return { data, encodedSize: Buffer.byteLength(data, "utf-8"), mimeType };
}

/**
 * Fit an image into the request budget. Returns the original bytes untouched
 * when they already fit; otherwise progressively downscales (0.75x steps,
 * Lanczos3) trying PNG and JPEG encodings at each size until one fits.
 * Returns null when the image cannot be decoded or no candidate fits.
 */
export async function prepareImageForAttachment(
  inputBytes: Uint8Array,
  mimeType: string,
  budgetBytes: number,
): Promise<PreparedImage | null> {
  const inputBase64Size = Math.ceil(inputBytes.byteLength / 3) * 4;
  if (inputBase64Size < budgetBytes) {
    // Dimensions unknown without decoding; decode lazily only when scaling.
    // A fitting image attaches verbatim, so report nominal values.
    return {
      data: Buffer.from(inputBytes).toString("base64"),
      mimeType,
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
      wasResized: false,
    };
  }

  const photon = await loadPhoton();
  if (!photon) return null;

  let image: InstanceType<PhotonModule["PhotonImage"]> | undefined;
  try {
    image = photon.PhotonImage.new_from_byteslice(inputBytes);
    const originalWidth = image.get_width();
    const originalHeight = image.get_height();

    const qualitySteps = [80, 70, 55, 40];
    let currentWidth = originalWidth;
    let currentHeight = originalHeight;

    while (true) {
      const resized = photon.resize(image, currentWidth, currentHeight, photon.SamplingFilter.Lanczos3);
      try {
        const candidates = [encodeCandidate(resized.get_bytes(), "image/png")];
        for (const quality of qualitySteps) {
          candidates.push(encodeCandidate(resized.get_bytes_jpeg(quality), "image/jpeg"));
        }
        for (const candidate of candidates) {
          if (candidate.encodedSize < budgetBytes) {
            return {
              data: candidate.data,
              mimeType: candidate.mimeType,
              originalWidth,
              originalHeight,
              width: currentWidth,
              height: currentHeight,
              wasResized: true,
            };
          }
        }
      } finally {
        resized.free();
      }

      if (currentWidth === 1 && currentHeight === 1) break;
      const nextWidth = currentWidth === 1 ? 1 : Math.max(1, Math.floor(currentWidth * 0.75));
      const nextHeight = currentHeight === 1 ? 1 : Math.max(1, Math.floor(currentHeight * 0.75));
      if (nextWidth === currentWidth && nextHeight === currentHeight) break;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    return null;
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

/** Message returned to the agent when an image cannot fit the budget at all. */
export function formatImageTooLargeError(fileName: string, originalBytes: number, budgetBytes: number): string {
  return (
    `Image too large: ${fileName} (${formatBytes(originalBytes)}) exceeds the ~${formatBytes(budgetBytes)} request budget ` +
    "and could not be scaled to fit. Crop the region you need into a smaller file and read that instead."
  );
}
