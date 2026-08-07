import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  formatSize,
  truncateHead,
  truncateTail,
} from "@earendil-works/pi-coding-agent";

/**
 * A tool result is an index into an artifact, not the artifact itself. Keep
 * the preview small enough that one accidental console.log cannot dominate an
 * agent turn; formatProgressiveOutput preserves the complete value on disk.
 */
export const MODEL_VISIBLE_OUTPUT_MAX_BYTES = 16 * 1024;
export const MODEL_VISIBLE_OUTPUT_MAX_LINES = 500;
export const PROGRESSIVE_READ_LINE_COUNT = 200;

export interface ProgressiveOutputOptions {
  filePrefix: string;
  writeOverflowFile?: (content: string, filePrefix: string) => string;
}

export interface ProgressiveOutputResult {
  text: string;
  truncated: boolean;
  fullOutputPath?: string;
  totalBytes: number;
  totalLines: number;
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let lines = 1;
  for (let index = 0; index < content.length; index++) {
    if (content.charCodeAt(index) === 10) lines++;
  }
  return content.endsWith("\n") ? lines - 1 : lines;
}

function writeOverflowFile(content: string, filePrefix: string): string {
  const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, "-");
  const fullOutputPath = path.join(
    "/tmp",
    `${safePrefix}-${process.pid}-${Date.now()}-${randomUUID()}.log`,
  );
  fs.writeFileSync(fullOutputPath, content, {
    encoding: "utf-8",
    flag: "wx",
    mode: 0o600,
  });
  return fullOutputPath;
}

function buildOverflowNotice(
  fullOutputPath: string | undefined,
  totalBytes: number,
  totalLines: number,
  persistenceError?: string,
): string {
  const location = fullOutputPath
    ? [
        `Full output saved to: ${fullOutputPath}`,
        `Inspect it progressively with Read({ path: ${JSON.stringify(fullOutputPath)}, offset: 1, limit: ${PROGRESSIVE_READ_LINE_COUNT} }).`,
        `Continue with offset=${PROGRESSIVE_READ_LINE_COUNT + 1}, ${PROGRESSIVE_READ_LINE_COUNT * 2 + 1}, and so on. Do not read the entire file at once.]`,
      ]
    : [
        `The complete output could not be saved: ${persistenceError ?? "unknown temporary-file error"}.`,
        "The preview remains hard-capped to protect the session.]",
      ];
  return [
    `[Output truncated: original output is ${formatSize(totalBytes)} across ${totalLines} lines.`,
    ...location,
  ].join("\n");
}

function formatPersistenceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 300);
}

/**
 * Bound text before it enters a model-visible tool result or follow-up message.
 * Overflow is preserved byte-for-byte in a unique, owner-only temporary file.
 */
export function formatProgressiveOutput(
  content: string,
  options: ProgressiveOutputOptions,
): ProgressiveOutputResult {
  const totalBytes = Buffer.byteLength(content, "utf-8");
  const totalLines = countLines(content);
  if (
    totalBytes <= MODEL_VISIBLE_OUTPUT_MAX_BYTES &&
    totalLines <= MODEL_VISIBLE_OUTPUT_MAX_LINES
  ) {
    return { text: content, truncated: false, totalBytes, totalLines };
  }

  let fullOutputPath: string | undefined;
  let persistenceError: string | undefined;
  try {
    fullOutputPath = (options.writeOverflowFile ?? writeOverflowFile)(
      content,
      options.filePrefix,
    );
  } catch (error) {
    persistenceError = formatPersistenceError(error);
  }
  const notice = buildOverflowNotice(
    fullOutputPath,
    totalBytes,
    totalLines,
    persistenceError,
  );
  const separator = "\n\n";
  const previewGap = "\n\n[… output omitted; complete output is in the file below …]\n\n";
  const previewByteBudget =
    MODEL_VISIBLE_OUTPUT_MAX_BYTES -
    Buffer.byteLength(separator + notice + previewGap, "utf-8");
  const noticeAddedLines = countLines(separator + notice) - 1;
  const gapAddedLines = countLines(previewGap) - 1;
  const previewLineBudget =
    MODEL_VISIBLE_OUTPUT_MAX_LINES - noticeAddedLines - gapAddedLines;
  if (previewByteBudget <= 0 || previewLineBudget <= 0) {
    throw new Error("Progressive output notice exceeds the model-visible output budget");
  }

  const headByteBudget = Math.floor(previewByteBudget / 2);
  const headLineBudget = Math.floor(previewLineBudget / 2);
  const tailByteBudget = previewByteBudget - headByteBudget;
  const tailLineBudget = previewLineBudget - headLineBudget;
  const head = truncateHead(content, {
    maxBytes: headByteBudget,
    maxLines: headLineBudget,
  }).content;
  const tail = truncateTail(content, {
    maxBytes: tailByteBudget,
    maxLines: tailLineBudget,
  }).content;
  const preview = head && tail ? head + previewGap + tail : head || tail;
  const text = preview ? preview + separator + notice : notice;

  if (
    Buffer.byteLength(text, "utf-8") > MODEL_VISIBLE_OUTPUT_MAX_BYTES ||
    countLines(text) > MODEL_VISIBLE_OUTPUT_MAX_LINES
  ) {
    throw new Error("Progressive output formatter exceeded its hard output limits");
  }

  return {
    text,
    truncated: true,
    fullOutputPath,
    totalBytes,
    totalLines,
  };
}
