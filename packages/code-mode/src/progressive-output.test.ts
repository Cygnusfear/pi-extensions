import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import {
  MODEL_VISIBLE_OUTPUT_MAX_BYTES,
  MODEL_VISIBLE_OUTPUT_MAX_LINES,
  formatProgressiveOutput,
} from "./progressive-output";
import { createCodeModeSession, executeInSession } from "./session-factory";

const overflowFiles = new Set<string>();

function track(path: string | undefined): string {
  expect(path).toBeDefined();
  overflowFiles.add(path!);
  return path!;
}

afterEach(() => {
  for (const file of overflowFiles) {
    fs.rmSync(file, { force: true });
  }
  overflowFiles.clear();
});

describe("formatProgressiveOutput", () => {
  test("returns ordinary output unchanged", () => {
    const result = formatProgressiveOutput("small\nresult", {
      filePrefix: "pi-codemode-test",
    });

    expect(result).toEqual({
      text: "small\nresult",
      truncated: false,
      totalBytes: 12,
      totalLines: 2,
    });
  });

  test("hard-caps oversized output and preserves the full bytes in /tmp", () => {
    const original =
      "discarded-prefix-" +
      "x".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 10_000) +
      "important-tail";
    const result = formatProgressiveOutput(original, {
      filePrefix: "pi-codemode-test",
    });
    const fullOutputPath = track(result.fullOutputPath);

    expect(result.truncated).toBe(true);
    expect(Buffer.byteLength(result.text, "utf-8")).toBeLessThanOrEqual(
      MODEL_VISIBLE_OUTPUT_MAX_BYTES,
    );
    expect(fs.readFileSync(fullOutputPath, "utf-8")).toBe(original);
    expect(fullOutputPath).toStartWith("/tmp/pi-codemode-test-");
    expect(fs.statSync(fullOutputPath).mode & 0o777).toBe(0o600);
    expect(result.text).toContain(`Full output saved to: ${fullOutputPath}`);
    expect(result.text).toContain(
      `Read({ path: ${JSON.stringify(fullOutputPath)}, offset: 1, limit: 200 })`,
    );
    expect(result.text).toContain("Do not read the entire file at once");
    expect(result.text).toContain("important-tail");
    expect(result.text).not.toContain("discarded-prefix");
  });

  test("caps by line count even when the byte budget is not exhausted", () => {
    const original = Array.from(
      { length: MODEL_VISIBLE_OUTPUT_MAX_LINES + 1 },
      (_, index) => `line-${index + 1}`,
    ).join("\n");
    const result = formatProgressiveOutput(original, {
      filePrefix: "pi-codemode-lines",
    });
    const fullOutputPath = track(result.fullOutputPath);

    expect(result.truncated).toBe(true);
    expect(result.totalLines).toBe(MODEL_VISIBLE_OUTPUT_MAX_LINES + 1);
    expect(result.text.split("\n").length).toBeLessThanOrEqual(
      MODEL_VISIBLE_OUTPUT_MAX_LINES,
    );
    expect(fs.readFileSync(fullOutputPath, "utf-8")).toBe(original);
    expect(result.text).toContain("offset=201, 401, and so on");
    expect(result.text).toContain("line-1");
    expect(result.text).toContain(`line-${MODEL_VISIBLE_OUTPUT_MAX_LINES + 1}`);
    expect(result.text).toContain("output omitted");
  });

  test("measures multibyte output as UTF-8 bytes without corrupting characters", () => {
    const original = Array.from({ length: 13_000 }, () => "🧪").join("\n");
    const result = formatProgressiveOutput(original, {
      filePrefix: "pi-codemode-unicode",
    });
    const fullOutputPath = track(result.fullOutputPath);

    expect(result.truncated).toBe(true);
    expect(result.totalBytes).toBe(Buffer.byteLength(original, "utf-8"));
    expect(Buffer.byteLength(result.text, "utf-8")).toBeLessThanOrEqual(
      MODEL_VISIBLE_OUTPUT_MAX_BYTES,
    );
    expect(result.text).not.toContain("�");
    expect(fs.readFileSync(fullOutputPath, "utf-8")).toBe(original);
  });

  test("uses a distinct overflow file for every result", () => {
    const original = "z".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 1);
    const first = formatProgressiveOutput(original, { filePrefix: "pi-unique" });
    const second = formatProgressiveOutput(original, { filePrefix: "pi-unique" });
    track(first.fullOutputPath);
    track(second.fullOutputPath);

    expect(first.fullOutputPath).not.toBe(second.fullOutputPath);
  });

  test("keeps the model-visible result capped when temporary-file persistence fails", () => {
    const original = "q".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 1);
    const result = formatProgressiveOutput(original, {
      filePrefix: "pi-write-failure",
      writeOverflowFile: () => {
        throw new Error("disk full");
      },
    });

    expect(result.truncated).toBe(true);
    expect(result.fullOutputPath).toBeUndefined();
    expect(Buffer.byteLength(result.text, "utf-8")).toBeLessThanOrEqual(
      MODEL_VISIBLE_OUTPUT_MAX_BYTES,
    );
    expect(result.text).toContain("complete output could not be saved: disk full");
  });
});

describe("model-visible code-mode messages", () => {
  test("hard-caps console.wake and preserves its complete message", async () => {
    const sent: Array<{ content: string }> = [];
    const session = createCodeModeSession();
    const result = await executeInSession(
      session,
      `console.wake("w".repeat(${MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000}));`,
      {
        signal: new AbortController().signal,
        cwd: process.cwd(),
        model: { provider: "test", id: "test" },
        modelRegistry: {} as never,
        skipToolInjection: true,
        injectSessionApi: false,
        injectRunbookRun: false,
        sendMessage: (message) => sent.push({ content: message.content }),
      },
    );

    expect(result.error).toBeUndefined();
    expect(sent).toHaveLength(1);
    expect(Buffer.byteLength(sent[0].content, "utf-8")).toBeLessThanOrEqual(
      MODEL_VISIBLE_OUTPUT_MAX_BYTES,
    );
    const pathMatch = sent[0].content.match(/Full output saved to: (.+)\n/);
    const fullOutputPath = track(pathMatch?.[1]);
    expect(fs.readFileSync(fullOutputPath, "utf-8")).toBe(
      "[CONSOLE.WAKE] " + "w".repeat(MODEL_VISIBLE_OUTPUT_MAX_BYTES + 5_000),
    );
  });
});
