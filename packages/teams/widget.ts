import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { Component, TUI } from "@mariozechner/pi-tui";
import { formatRuntimeSummary } from "./activity.js";
import type { WorkerHandle, WorkerStatus } from "./types.js";

type WidgetColor = "warning" | "success" | "error" | "muted";

const STATUS_COLOR: Record<WorkerStatus, WidgetColor> = {
	spawning: "warning",
	running: "success",
	done: "success",
	failed: "error",
	killed: "muted",
	grace: "warning",
};

const STATUS_ICON: Record<WorkerStatus, string> = {
	spawning: "◐",
	running: "●",
	done: "✓",
	failed: "✕",
	killed: "○",
	grace: "◉",
};

function padRight(s: string, w: number): string {
	const n = Math.max(0, w - visibleWidth(s));
	return s + " ".repeat(n);
}

export function createTeamsWidget(getWorkers: () => WorkerHandle[]) {
	return (_tui: TUI, theme: Theme): Component => ({
		render(width: number): string[] {
			const workers = getWorkers();
			if (!workers.length) return [];

			const lines: string[] = [];
			lines.push(truncateToWidth(" " + theme.bold(theme.fg("accent", "Teams")), width));

			const nameW = Math.max(...workers.map((w) => visibleWidth(w.name)));
			const ticketW = Math.max(...workers.map((w) => visibleWidth(w.ticketId)));
			for (const w of workers) {
				const statusKey = (w.status in STATUS_COLOR ? w.status : "failed") as WorkerStatus;
				const icon = theme.fg(STATUS_COLOR[statusKey], STATUS_ICON[statusKey]);
				const nick = w.nickname ? theme.fg("warning", w.nickname) + " · " : "";
				const name = theme.bold(padRight(w.name, nameW));
				const status = theme.fg(STATUS_COLOR[statusKey], padRight(String(w.status ?? "unknown"), 8));
				const route = theme.fg(w.routeState === "linked" ? "success" : w.routeState === "resumable" ? "warning" : "muted", w.routeState);
				const ticketStatus = w.ticketStatus ?? "unknown";
				const modelTag = w.model ? ` · ${theme.fg("accent", w.model)}` : "";
				const row = ` ${icon} ${nick}${name} ${status} · mesh ${route} · ticket ${padRight(w.ticketId, ticketW)} · ${theme.fg("muted", ticketStatus)} · pid ${w.pid}${modelTag}`;
				lines.push(truncateToWidth(row, width));
				const activity = formatRuntimeSummary({
					hasActiveChildProcess: w.hasActiveChildProcess,
					activeChildProcessCount: w.activeChildProcessCount,
					currentCommand: w.currentCommand,
					currentCommandElapsedSeconds: w.currentCommandElapsedSeconds,
					startedAt: w.spawnedAt,
					lastOutputAt: w.lastOutputAt,
					lastOutputLabel: w.lastOutputLabel,
				});
				lines.push(truncateToWidth(`   ${theme.fg("dim", "↳")} ${theme.fg("muted", activity)}`, width));
				if (w.lastNote) {
					const note = w.lastNote.replace(/\s+/g, " ").trim();
					const noteRow = `   ${theme.fg("dim", "↳")} ${theme.fg("muted", note)}`;
					lines.push(truncateToWidth(noteRow, width));
				}
			}

			const pending = workers.filter((w) => w.status === "spawning" || w.status === "running").length;
			const done = workers.filter((w) => w.status === "done" || w.status === "grace").length;
			const failed = workers.filter((w) => w.status === "failed").length;
			lines.push(truncateToWidth(" " + theme.fg("dim", "─".repeat(Math.max(0, width - 2))), width));
			lines.push(
				truncateToWidth(
					` ${theme.bold("Total")} ${theme.fg("muted", `· ${pending} pending · ${done} done · ${failed} failed`)}`,
					width,
				),
			);
			lines.push(truncateToWidth(" " + theme.fg("dim", "/team list · /team kill <name> · /team kill_all"), width));

			return lines;
		},
		invalidate() {},
	});
}
