import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { Component, TUI } from "@mariozechner/pi-tui";
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

export function createTeamsWidget(
	getWorkers: () => WorkerHandle[],
	getV2Lifecycle?: (workerName: string) => WorkerLifecycleState | null,
	getSessionModeLabel?: (workerName: string) => string | null,
) {
	return (_tui: TUI, theme: Theme): Component => ({
		render(width: number): string[] {
			const workers = getWorkers();
			if (!workers.length) return [];

			const lines: string[] = [];
			lines.push(truncateToWidth(" " + theme.bold(theme.fg("accent", "Teams")), width));

			const nameW = Math.max(...workers.map((w) => visibleWidth(w.name)));
			const ticketW = Math.max(...workers.map((w) => visibleWidth(w.ticketId)));
			for (const w of workers) {
				const v2Lifecycle = getV2Lifecycle?.(w.name) ?? null;
				const sessionModeLabel = getSessionModeLabel?.(w.name) ?? null;
				const { status, routeLabel } = projectWidgetStatus(w, v2Lifecycle);
				const statusKey = (status in STATUS_COLOR ? status : "failed") as WorkerStatus;
				const icon = theme.fg(STATUS_COLOR[statusKey], STATUS_ICON[statusKey]);
				const nick = w.nickname ? theme.fg("warning", w.nickname) + " · " : "";
				const name = theme.bold(padRight(w.name, nameW));
				const statusText = v2Lifecycle ? `${status}/${v2Lifecycle}` : String(status ?? "unknown");
				const statusLabel = theme.fg(STATUS_COLOR[statusKey], padRight(statusText, 18));
				const route = theme.fg(w.routeState === "linked" ? "success" : w.routeState === "resumable" ? "warning" : "muted", routeLabel);
				const ticketStatus = w.ticketStatus ?? "unknown";
				const modelTag = w.model ? ` · ${theme.fg("accent", w.model)}` : "";
				const sessionTag = sessionModeLabel ? ` · session ${theme.fg("muted", sessionModeLabel)}` : "";
				const row = ` ${icon} ${nick}${name} ${statusLabel} · mesh ${route}${sessionTag} · ticket ${padRight(w.ticketId, ticketW)} · ${theme.fg("muted", ticketStatus)} · pid ${w.pid}${modelTag}`;
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
			const warnings = workers.filter((w) => w.status === "warning").length;
			const failed = workers.filter((w) => w.status === "failed").length;
			lines.push(truncateToWidth(" " + theme.fg("dim", "─".repeat(Math.max(0, width - 2))), width));
			lines.push(
				truncateToWidth(
					` ${theme.bold("Total")} ${theme.fg("muted", `· ${pending} pending · ${done} done · ${warnings} warning · ${failed} failed`)}`,
					width,
				),
			);
			lines.push(truncateToWidth(" " + theme.fg("dim", "/team list · /team kill <name> · /team kill_all"), width));

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
