/**
 * continue-later — schedule a message to be delivered to this session later.
 *
 * Use case: an agent just rate-limited. Instead of burning paid retries, the
 * hooman schedules `/continue 2h go` and walks away; when the timer fires the
 * message lands as a follow-up and the idle agent starts a turn.
 *
 * This module is the testable core: time parsing, ETA formatting, and the
 * scheduler. The pi wiring lives in extensions/continue-later.ts.
 *
 * Timers are in-process: they do not survive a pi restart.
 */

export interface PendingContinue {
  id: number;
  /** Epoch ms when the message fires. */
  fireAt: number;
  text: string;
}

export const CONTINUE_USAGE =
  "Usage: /continue <when> [text]\n" +
  "  when: a duration (90s, 30m, 2h, 1h30m) or a clock time (22:40, 7:05)\n" +
  "  text: message to send when it fires (default: \"go\")\n" +
  "Other commands: /continue list · /continue cancel <id|all>\n" +
  "Timers are in-process — they do not survive a pi restart.";

const DURATION_PART = /(\d+(?:\.\d+)?)([smh])/gi;

/**
 * Parse a "when" token into an epoch-ms fire time.
 * Durations: 90s, 30m, 2h, or compounds like 1h30m.
 * Clock times: HH:MM (24h) today, rolling to tomorrow when already past.
 * Returns null when the token is neither.
 */
export function parseWhen(token: string, now: number = Date.now()): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  // Clock time HH:MM
  const clock = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return null;
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    let fireAt = target.getTime();
    if (fireAt <= now) fireAt += 24 * 60 * 60 * 1000;
    return fireAt;
  }

  // Duration, possibly compound: 2h, 30m, 90s, 1h30m, 1h30m10s
  if (/^(\d+(?:\.\d+)?[smh])+$/i.test(trimmed)) {
    let totalMs = 0;
    let matched: RegExpExecArray | null;
    DURATION_PART.lastIndex = 0;
    while ((matched = DURATION_PART.exec(trimmed)) !== null) {
      const value = Number(matched[1]);
      const unit = matched[2].toLowerCase();
      totalMs += unit === "h" ? value * 3_600_000 : unit === "m" ? value * 60_000 : value * 1000;
    }
    if (totalMs <= 0) return null;
    return now + Math.round(totalMs);
  }

  return null;
}

/** Format a delta in ms as a compact ETA: "in 45s", "in 2h3m", "in 1d2h". */
export function formatEta(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length || (seconds && !days && !hours)) parts.push(`${seconds}s`);
  return "in " + parts.join("");
}

/** Format the fire time as local HH:MM. */
export function formatClockTime(fireAt: number): string {
  const d = new Date(fireAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

interface PendingTimer {
  entry: PendingContinue;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * In-process scheduler. `send` delivers the message (pi.sendUserMessage in the
 * extension, a spy in tests).
 */
export class ContinueScheduler {
  private pending = new Map<number, PendingTimer>();
  private nextId = 1;

  constructor(
    private send: (text: string) => void | Promise<void>,
    private now: () => number = () => Date.now(),
  ) {}

  schedule(fireAt: number, text: string): PendingContinue {
    const entry: PendingContinue = { id: this.nextId++, fireAt, text };
    const delay = Math.max(0, fireAt - this.now());
    const timer = setTimeout(() => {
      this.pending.delete(entry.id);
      void Promise.resolve(this.send(entry.text)).catch(() => {
        // Delivery failures surface through pi's extension error channel in the
        // extension; the scheduler intentionally does not retry.
      });
    }, delay);
    if (typeof timer === "object" && timer !== null && "unref" in timer) timer.unref();
    this.pending.set(entry.id, { entry, timer });
    return entry;
  }

  list(): PendingContinue[] {
    return [...this.pending.values()].map((p) => p.entry).sort((a, b) => a.fireAt - b.fireAt);
  }

  cancel(id: number): boolean {
    const pending = this.pending.get(id);
    if (!pending) return false;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    return true;
  }

  cancelAll(): number {
    const count = this.pending.size;
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
    return count;
  }
}

/** Format the pending list for display. */
export function formatPendingList(entries: PendingContinue[], now: number = Date.now()): string {
  if (entries.length === 0) return "No scheduled continuations.";
  const lines = entries.map(
    (e) => `#${e.id} — "${e.text}" at ${formatClockTime(e.fireAt)} (${formatEta(e.fireAt - now)})`,
  );
  return lines.join("\n");
}
