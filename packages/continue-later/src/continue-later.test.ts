import { describe, expect, test } from "bun:test";
import {
  ContinueScheduler,
  formatClockTime,
  formatEta,
  formatPendingList,
  parseWhen,
} from "./continue-later.js";

describe("parseWhen", () => {
  const NOW = new Date("2026-07-24T20:00:00").getTime();

  test("parses simple durations", () => {
    expect(parseWhen("90s", NOW)).toBe(NOW + 90_000);
    expect(parseWhen("30m", NOW)).toBe(NOW + 30 * 60_000);
    expect(parseWhen("2h", NOW)).toBe(NOW + 2 * 3_600_000);
    expect(parseWhen("1.5h", NOW)).toBe(NOW + 5_400_000);
  });

  test("parses compound durations", () => {
    expect(parseWhen("1h30m", NOW)).toBe(NOW + 5_400_000);
    expect(parseWhen("2h15m10s", NOW)).toBe(NOW + 8_110_000);
  });

  test("parses clock times today when in the future", () => {
    expect(parseWhen("22:40", NOW)).toBe(new Date("2026-07-24T22:40:00").getTime());
  });

  test("rolls clock times to tomorrow when already past", () => {
    expect(parseWhen("07:05", NOW)).toBe(new Date("2026-07-25T07:05:00").getTime());
  });

  test("rejects invalid input", () => {
    expect(parseWhen("25:00", NOW)).toBeNull();
    expect(parseWhen("22:99", NOW)).toBeNull();
    expect(parseWhen("soon", NOW)).toBeNull();
    expect(parseWhen("", NOW)).toBeNull();
    expect(parseWhen("0s", NOW)).toBeNull();
  });
});

describe("formatEta", () => {
  test("formats compact ETAs", () => {
    expect(formatEta(45_000)).toBe("in 45s");
    expect(formatEta(90_000)).toBe("in 1m30s");
    expect(formatEta(5_400_000)).toBe("in 1h30m");
    expect(formatEta(7_380_000)).toBe("in 2h3m");
    expect(formatEta(93_600_000)).toBe("in 1d2h");
  });
});

describe("ContinueScheduler", () => {
  test("fires the scheduled text through send", async () => {
    const sent: string[] = [];
    const scheduler = new ContinueScheduler((text) => {
      sent.push(text);
    });

    const entry = scheduler.schedule(Date.now() + 20, "go");
    expect(entry.id).toBe(1);
    expect(scheduler.list()).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(sent).toEqual(["go"]);
    expect(scheduler.list()).toHaveLength(0);
  });

  test("cancel prevents firing", async () => {
    const sent: string[] = [];
    const scheduler = new ContinueScheduler((text) => {
      sent.push(text);
    });

    const entry = scheduler.schedule(Date.now() + 20, "go");
    expect(scheduler.cancel(entry.id)).toBe(true);
    expect(scheduler.cancel(999)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(sent).toEqual([]);
  });

  test("cancelAll clears everything and reports the count", async () => {
    const sent: string[] = [];
    const scheduler = new ContinueScheduler((text) => {
      sent.push(text);
    });

    scheduler.schedule(Date.now() + 20, "one");
    scheduler.schedule(Date.now() + 30, "two");
    expect(scheduler.cancelAll()).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(sent).toEqual([]);
  });

  test("list sorts by fire time", () => {
    const scheduler = new ContinueScheduler(() => {});
    const later = scheduler.schedule(Date.now() + 60_000, "later");
    const sooner = scheduler.schedule(Date.now() + 5_000, "sooner");
    expect(scheduler.list().map((e) => e.id)).toEqual([sooner.id, later.id]);
    scheduler.cancelAll();
  });
});

describe("formatPendingList", () => {
  test("shows empty state and entries", () => {
    expect(formatPendingList([])).toBe("No scheduled continuations.");
    const now = Date.now();
    const list = formatPendingList([{ id: 3, fireAt: now + 5_400_000, text: "go" }], now);
    expect(list).toContain("#3");
    expect(list).toContain('"go"');
    expect(list).toContain("1h30m");
  });

  test("formatClockTime renders HH:MM", () => {
    const at = new Date("2026-07-24T22:40:00").getTime();
    expect(formatClockTime(at)).toBe("22:40");
  });
});
