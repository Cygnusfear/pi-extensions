import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluateIdleState,
  scanMeaningfulSessionActivity,
  type SessionActivityScanOptions,
  type SessionActivityScanState,
} from "../activity.ts";

const TEN_MINUTES = 10 * 60 * 1000;
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function rawSessionFile(content = ""): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-output-silence-"));
  tempDirs.push(dir);
  const file = path.join(dir, "session.jsonl");
  fs.writeFileSync(file, content);
  return file;
}

function entry(type: string, timestampMs: number, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ type, timestamp: new Date(timestampMs).toISOString(), ...extra });
}

function drainScan(
  file: string,
  options: SessionActivityScanOptions,
  initial?: SessionActivityScanState,
  maxSteps = 1000,
) {
  let state = initial;
  let activity;
  let result;
  let maxBytesRead = 0;
  for (let step = 0; step < maxSteps; step++) {
    result = scanMeaningfulSessionActivity(file, state, options);
    state = result.state;
    activity = result.activity ?? activity;
    maxBytesRead = Math.max(maxBytesRead, result.bytesRead);
    if (result.progressKnown || (state.phase === "following" && state.scanOffset === fs.statSync(file).size)) {
      return { ...result, state, activity, maxBytesRead, steps: step + 1 };
    }
  }
  throw new Error(`scanner did not settle after ${maxSteps} steps`);
}

describe("Teams output-silence watchdog", () => {
  const now = Date.UTC(2026, 7, 15, 12, 0, 0);

  test("fires at exactly ten minutes even with a live child and fresh heartbeat/process telemetry", () => {
    const idle = evaluateIdleState({
      now,
      thresholdMs: 5 * 60 * 1000,
      outputSilenceThresholdMs: TEN_MINUTES,
      hasActiveChildProcess: true,
      lastHeartbeatAt: now,
      lastProcessActivityAt: now,
      lastOutputAt: now - TEN_MINUTES,
    });
    expect(idle.shouldWarnOutputSilence).toBe(true);
    expect(idle.outputIdleMs).toBe(TEN_MINUTES);
    expect(idle.shouldWarnStuck).toBe(false);
  });

  test("does not fire at 9m59s and meaningful output resets the deadline", () => {
    const before = evaluateIdleState({
      now,
      thresholdMs: 5 * 60 * 1000,
      outputSilenceThresholdMs: TEN_MINUTES,
      hasActiveChildProcess: true,
      lastHeartbeatAt: now,
      lastProcessActivityAt: now,
      lastOutputAt: now - TEN_MINUTES + 1000,
    });
    const reset = evaluateIdleState({
      now,
      thresholdMs: 5 * 60 * 1000,
      outputSilenceThresholdMs: TEN_MINUTES,
      hasActiveChildProcess: false,
      lastHeartbeatAt: now,
      lastProcessActivityAt: now,
      lastOutputAt: now - 1,
    });
    expect(before.shouldWarnOutputSilence).toBe(false);
    expect(reset.shouldWarnOutputSilence).toBe(false);
  });

  test("preserves the legacy liveness predicate independently", () => {
    const idle = evaluateIdleState({
      now,
      thresholdMs: 5 * 60 * 1000,
      outputSilenceThresholdMs: TEN_MINUTES,
      hasActiveChildProcess: false,
      lastHeartbeatAt: now - 5 * 60 * 1000,
      lastProcessActivityAt: now - 5 * 60 * 1000,
      lastOutputAt: now,
    });
    expect(idle.shouldWarnStuck).toBe(true);
    expect(idle.shouldWarnOutputSilence).toBe(false);
  });
});

describe("bounded resumable meaningful-session scanner", () => {
  const now = Date.UTC(2026, 7, 15, 12, 0, 0);
  const budgetBytes = 64 * 1024;
  const metadataPrefixBytes = 4 * 1024;
  const options = { now, cutoffMs: now - TEN_MINUTES, budgetBytes, metadataPrefixBytes };

  test("recovers a 9m59s meaningful message behind more than 1 MiB of fresh heartbeats", () => {
    const lines = [entry("message", now - TEN_MINUTES + 1000, { message: { role: "assistant", content: "reviewing" } })];
    for (let index = 0; index < 9000; index++) {
      lines.push(entry("heartbeat", now - 9 * 60 * 1000 + index, { padding: "x".repeat(100) }));
    }
    const file = rawSessionFile(lines.join("\n") + "\n");
    expect(fs.statSync(file).size).toBeGreaterThan(1024 * 1024);
    const result = drainScan(file, options);
    expect(result.activity).toEqual({ timestampMs: now - TEN_MINUTES + 1000, label: "response" });
    expect(result.progressKnown).toBe(true);
    expect(result.maxBytesRead).toBeLessThanOrEqual(budgetBytes + metadataPrefixBytes);
    expect(result.steps).toBeGreaterThan(1);
  });

  test("consumes a multi-megabyte complete record over bounded slices and eventually recognizes it", () => {
    const file = rawSessionFile();
    const initial = scanMeaningfulSessionActivity(file, undefined, options);
    expect(initial.progressKnown).toBe(true);
    const large = entry("message", now - 1000, { message: { role: "assistant", content: "分析".repeat(400_000) } });
    fs.appendFileSync(file, large + "\n");
    const result = drainScan(file, options, initial.state);
    expect(result.activity).toEqual({ timestampMs: now - 1000, label: "response" });
    expect(result.progressKnown).toBe(true);
    expect(result.maxBytesRead).toBeLessThanOrEqual(budgetBytes + metadataPrefixBytes);
    expect(result.steps).toBeGreaterThan(10);
  });

  test("does not reread or trust a multi-megabyte unterminated record, then recognizes it after newline completion", () => {
    const file = rawSessionFile();
    const initial = scanMeaningfulSessionActivity(file, undefined, options);
    const large = entry("message", now - 1000, { message: { role: "assistant", content: "z".repeat(2 * 1024 * 1024) } });
    fs.appendFileSync(file, large);
    const pending = drainScan(file, options, initial.state);
    expect(pending.progressKnown).toBe(false);
    expect(pending.activity).toBeUndefined();
    expect(pending.maxBytesRead).toBeLessThanOrEqual(budgetBytes + metadataPrefixBytes);
    const noReread = scanMeaningfulSessionActivity(file, pending.state, options);
    expect(noReread.bytesRead).toBe(0);
    expect(noReread.progressKnown).toBe(false);

    fs.appendFileSync(file, "\n");
    const complete = drainScan(file, options, noReread.state);
    expect(complete.activity).toEqual({ timestampMs: now - 1000, label: "response" });
    expect(complete.progressKnown).toBe(true);
    expect(complete.maxBytesRead).toBeLessThanOrEqual(budgetBytes + metadataPrefixBytes);
  });

  test("keeps malformed timestamp-free recovery unknown instead of declaring silence", () => {
    const malformed = JSON.stringify({ type: "message", message: { role: "assistant", content: "q".repeat(2 * 1024 * 1024) } });
    const file = rawSessionFile(malformed + "\n");
    const result = drainScan(file, options);
    expect(result.activity).toBeUndefined();
    expect(result.progressKnown).toBe(false);
    expect(result.maxBytesRead).toBeLessThanOrEqual(budgetBytes + metadataPrefixBytes);
  });

  test("rejects future-dated meaningful records during recovery and incremental following", () => {
    const futureFile = rawSessionFile(entry("message", now + 24 * 60 * 60 * 1000, { message: { role: "assistant" } }) + "\n");
    const recovered = drainScan(futureFile, options);
    expect(recovered.activity).toBeUndefined();
    expect(recovered.progressKnown).toBe(true);

    const oldBaseline = now - TEN_MINUTES;
    expect(evaluateIdleState({
      now,
      thresholdMs: 5 * 60 * 1000,
      outputSilenceThresholdMs: TEN_MINUTES,
      hasActiveChildProcess: true,
      lastHeartbeatAt: now,
      lastProcessActivityAt: now,
      lastOutputAt: oldBaseline,
    }).shouldWarnOutputSilence).toBe(true);

    const incrementalFile = rawSessionFile();
    const initial = scanMeaningfulSessionActivity(incrementalFile, undefined, options);
    fs.appendFileSync(incrementalFile, entry("message", now + 60_000, { message: { role: "assistant" } }) + "\n");
    const followed = drainScan(incrementalFile, options, initial.state);
    expect(followed.activity).toBeUndefined();
    expect(followed.progressKnown).toBe(true);
  });
});
