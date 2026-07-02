import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { colorizeNickname } from "@pi-extensions/shared/session-nickname";
import { formatRuntimeSummary } from "./activity.js";
import type { WorkerHandle, WorkerStatus } from "./types.js";
import type { WorkerLifecycleState } from "./v2/state.ts";

type WidgetColor = "warning" | "success" | "error" | "muted";

const STATUS_COLOR: Record<WorkerStatus, WidgetColor> = {
  spawning: "warning",
  running: "success",
  done: "success",
  warning: "warning",
  failed: "error",
  killed: "muted",
  grace: "warning",
};

const STATUS_ICON: Record<WorkerStatus, string> = {
  spawning: "◐",
  running: "●",
  done: "✓",
  warning: "!",
  failed: "✕",
  killed: "○",
  grace: "◉",
};

function padRight(s: string, w: number): string {
  const n = Math.max(0, w - visibleWidth(s));
  return s + " ".repeat(n);
}

/** Workers in grace status are hidden from the TUI widget once their last
 *  output was more than this many milliseconds ago. They remain visible to
 *  the agent via teams.list / getWorkers(). */
const GRACE_TUI_HIDE_MS = 120_000; // 2 minutes

export function createTeamsWidget(
  getWorkers: () => WorkerHandle[],
  getV2Lifecycle?: (workerName: string) => WorkerLifecycleState | null,
  getSessionModeLabel?: (workerName: string) => string | null,
) {
  return (_tui: TUI, theme: Theme): Component => ({
    render(width: number): string[] {
      const allWorkers = getWorkers();
      if (!allWorkers.length) return [];
      const now = Date.now();
      // Hide grace workers whose last output was > 2min ago.
      // They're still visible to the agent — just not cluttering the TUI.
      const TERMINAL_TUI_HIDE_MS = 120_000; // 2 minutes — same as grace
      const workers = allWorkers.filter((w) => {
        // Hide terminal workers (killed/done/warning/failed) older than TTL
        if (["killed", "done", "warning", "failed"].includes(w.status)) {
          const terminalAt = w.doneAt ?? w.killedAt ?? w.lastOutputAt ?? w.lastActivityAt;
          if (terminalAt && now - terminalAt > TERMINAL_TUI_HIDE_MS) return false;
        }
        // Hide grace workers whose last output was > 2min ago
        if (w.status === "grace") {
          if (!w.lastOutputAt) return true;
          return now - w.lastOutputAt < GRACE_TUI_HIDE_MS;
        }
        return true;
      });
      if (!workers.length) return [];

      const lines: string[] = [];
      lines.push(truncateToWidth(" " + theme.bold(theme.fg("accent", "Teams")), width));

      const ticketW = Math.max(...workers.map((w) => visibleWidth(w.ticketId)));
      for (const w of workers) {
        const v2Lifecycle = getV2Lifecycle?.(w.name) ?? null;
        const sessionModeLabel = getSessionModeLabel?.(w.name) ?? null;
        const { status } = projectWidgetStatus(w, v2Lifecycle);
        const statusKey = (status in STATUS_COLOR ? status : "failed") as WorkerStatus;
        const icon = theme.fg(STATUS_COLOR[statusKey], STATUS_ICON[statusKey]);
        // Line 1 — DURABLE IDENTITY first (the pinned nickname from v1a: e.g. "Roger
        // Geodesic Maudin"), then role, then status. The worker IS its durable mesh
        // peer; `w.name` is a mutable role-alias, not the identity. Before the
        // worker's hello envelope arrives we don't know the face yet — show "…" so
        // the row reads "peer exists, identity resolving" rather than hiding the
        // identity slot entirely.
        const identityLabel = w.nickname
          ? colorizeNickname(w.nickname) // shared color — same amber the powerline footer uses
          : theme.fg("dim", "…");
        const roleLabel = theme.bold(w.name);
        const statusLabel = theme.fg(STATUS_COLOR[statusKey], String(status ?? "unknown"));
        const identityRow = ` ${icon} ${identityLabel} · ${roleLabel} · ${statusLabel}`;
        lines.push(truncateToWidth(identityRow, width));

        // Line 2 — metadata badges (model · session-mode · ticket + ticket-status),
        // indented to align with the ↳ activity/note rows below. This separation
        // stops the identity from being buried behind the metadata pileup.
        const ticketStatus = w.ticketStatus ?? "unknown";
        const sessionIcon = sessionModeLabel?.startsWith("fork") ? "" : "󰆈";
        const sessionText = sessionModeLabel?.startsWith("fork")
          ? "fork"
          : (sessionModeLabel ?? "new");
        const ticketStatusLabel =
          ticketStatus === "closed"
            ? theme.fg("muted", ticketStatus)
            : theme.fg("accent", ticketStatus);
        const modelBadge = w.model
          ? `${theme.fg("muted", "󰁨")} ${theme.fg("accent", w.model)}`
          : "";
        const sessionBadge = `${theme.fg("muted", sessionIcon)} ${theme.fg("muted", sessionText)}`;
        const ticketBadge = `${theme.fg("muted", "󰤓")} ${padRight(w.ticketId, ticketW)} ${ticketStatusLabel}`;
        const badges = [modelBadge, sessionBadge, ticketBadge].filter((s) => s.length > 0).join(" · ");
        lines.push(truncateToWidth(`   ${badges}`, width));
        const activity = formatRuntimeSummary({
          hasActiveChildProcess: w.hasActiveChildProcess,
          activeChildProcessCount: w.activeChildProcessCount,
          currentCommand: w.currentCommand,
          currentCommandElapsedSeconds: w.currentCommandElapsedSeconds,
          startedAt: w.spawnedAt,
          lastOutputAt: w.lastOutputAt,
          lastOutputLabel: w.lastOutputLabel,
        });
        lines.push(
          truncateToWidth(`   ${theme.fg("dim", "↳")} ${theme.fg("muted", activity)}`, width),
        );
        if (w.lastNote) {
          const note = w.lastNote.replace(/\s+/g, " ").trim();
          const noteRow = `   ${theme.fg("dim", "↳")} ${theme.fg("muted", note)}`;
          lines.push(truncateToWidth(noteRow, width));
        }
      }

      const pending = workers.filter(
        (w) => w.status === "spawning" || w.status === "running",
      ).length;
      const done = workers.filter((w) => w.status === "done" || w.status === "grace").length;
      const warnings = workers.filter((w) => w.status === "warning").length;
      const failed = workers.filter((w) => w.status === "failed").length;
      lines.push(truncateToWidth(" " + theme.fg("dim", "─".repeat(Math.max(0, width - 2))), width));
      lines.push(
        truncateToWidth(
          ` ${theme.bold("Total")} ${theme.fg("muted", `· ${pending} pending · ${done} done · ${warnings} warning · ${failed} failed`)}`,
          width,
        ),
      );
      lines.push(
        truncateToWidth(
          " " + theme.fg("dim", "/team list · /team kill <name> · /team kill_all"),
          width,
        ),
      );

      return lines;
    },
    invalidate() {},
  });
}

export function projectWidgetStatus(
  worker: WorkerHandle,
  v2Lifecycle?: WorkerLifecycleState | null,
): { status: WorkerStatus; routeLabel: string } {
  const status = worker.status;
  const routeLabel = v2Lifecycle ? `${worker.routeState} / v2:${v2Lifecycle}` : worker.routeState;
  return { status, routeLabel };
}
