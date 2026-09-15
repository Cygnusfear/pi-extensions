import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pidFileOf, pidsForScript, sidecarPid, sweepStaleSidecarHomes } from "./sidecar-test-harness.ts";

/**
 * The sweep is the one part of kal-x2akvjnh that can itself cause harm: the
 * temp-HOME prefix is shared by concurrent runs of the pi-mesh suite, so a sweep
 * that is too eager deletes another live session's in-flight HOME and turns their
 * green test into a rare red one. These tests pin BOTH edges of the guard,
 * because "it worked when I ran it once" does not cover the dangerous direction.
 */

const PREFIX = "pi-mesh-harness-test-";
const created: string[] = [];

function plant(ageMinutes: number): string {
  const home = join(tmpdir(), PREFIX + process.pid + "-" + Date.now() + "-" + created.length);
  mkdirSync(join(home, ".pi"), { recursive: true });
  const when = new Date(Date.now() - ageMinutes * 60_000);
  utimesSync(home, when, when);
  created.push(home);
  return home;
}

async function until(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return predicate();
}

afterEach(() => {
  for (const home of created.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe("sidecar-test-harness stale-home sweep (kal-x2akvjnh)", () => {
  test("removes a HOME older than the stale window", () => {
    const stale = plant(60);
    expect(sweepStaleSidecarHomes(PREFIX)).toContain(stale);
    expect(existsSync(stale)).toBe(false);
  });

  test("preserves a recent HOME, because a concurrent run may still own it", () => {
    const fresh = plant(0);
    expect(sweepStaleSidecarHomes(PREFIX)).not.toContain(fresh);
    expect(existsSync(fresh)).toBe(true);
  });

  test("preserves an old HOME that a live process still references", async () => {
    const held = plant(60);
    // A holder that keeps the HOME on its command line AND stays alive. Two dead ends
    // were hit here: macOS "sleep" rejects a trailing path and exits at once, and
    // "sh -c 'sleep 20' holder <path>" exec-replaces itself with sleep, dropping the
    // path from the command line. bun -e keeps its argv, like a real fixture does.
    // A bare "sleep 20 <path>" is wrong here: macOS sleep rejects the trailing
    // argument and exits immediately, which made an earlier revision of this test
    // so ownership is detected the same way reapSidecars detects a live sidecar.
    const holder = Bun.spawn(["bun", "-e", "setTimeout(() => {}, 20000)", held], {
      stdout: "ignore",
      stderr: "ignore",
    });
    try {
      // Prove the owner is visible BEFORE sweeping, so a holder that died early
      // fails this test loudly instead of passing it silently.
      expect(await until(() => pidsForScript(held).length > 0, 3_000)).toBe(true);
      expect(sweepStaleSidecarHomes(PREFIX)).not.toContain(held);
      expect(existsSync(held)).toBe(true);
    } finally {
      holder.kill();
    }
  });
});

describe("sidecar-test-harness pidfile reading (kal-x2akvjnh)", () => {
  test("reads the pid the sidecar recorded for itself", () => {
    const home = plant(0);
    writeFileSync(pidFileOf(home), " 424242 \n");
    expect(sidecarPid(home)).toBe(424242);
  });

  test("rejects a missing, blank, or non-numeric pidfile instead of a bogus pid", () => {
    const home = plant(0);
    expect(sidecarPid(home)).toBe(null);
    writeFileSync(pidFileOf(home), "not-a-pid");
    expect(sidecarPid(home)).toBe(null);
    writeFileSync(pidFileOf(home), "-7");
    expect(sidecarPid(home)).toBe(null);
  });
});
