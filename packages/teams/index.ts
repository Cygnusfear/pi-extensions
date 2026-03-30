import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { TeamLeader } from "./leader.js";
import { registerTeamsTool, runTeamsAction } from "./tool.js";
import { runWorker } from "./worker.js";

const IS_WORKER = process.env.PI_TEAMS_WORKER === "1";
const HAS_TOOLS = process.env.PI_TEAMS_HAS_TOOLS === "1";
const IS_FREEFORM = process.env.PI_TEAMS_FREEFORM === "1";

export default function (pi: ExtensionAPI) {
	if (IS_WORKER) {
		const stayAlive = HAS_TOOLS || IS_FREEFORM;
		runWorker(pi, {
			// Freeform/hasTools workers never auto-close — coordinator controls lifecycle.
			// Normal workers auto-close after grace period (GRACE_PERIOD_MS).
			autoCloseOnAgentEnd: !stayAlive,
			autoCloseOnSessionShutdown: true,
		});
		if (!HAS_TOOLS) return;
		// Worker with hasTools: also register as a leader so it can delegate sub-workers
	}

	const leader = new TeamLeader(pi);
	registerTeamsTool(pi, leader);

	// Only register the /team command for interactive sessions (not worker-leaders)
	if (IS_WORKER) {
		pi.on("session_start", (_event, ctx) => {
			leader.setContext(ctx);
		});
		pi.on("agent_end", async () => {
			await leader.waitForAllWorkersToFinish();
		});
		pi.on("session_shutdown", async () => {
			leader.stopPolling();
		});
		return;
	}

	pi.registerCommand("team", {
		description: "Team control: /team list | /team kill <name> | /team kill_all | /team delegate <worker[@model]>:<task> | /team thinking",
		handler: async (args, ctx) => {
			const input = (args ?? "").trim();
			const show = (text: string, type: "info" | "warning" | "error" = "info") => ctx.ui.notify(text, type);
			if (!input || input === "help") {
				show("/team list | /team kill <name> | /team kill_all | /team delegate <worker[@model]>:<task> | /team thinking");
				return;
			}

			if (input === "list") {
				const res = await runTeamsAction(pi, leader, { action: "list" }, ctx);
				show(res.content[0]?.text ?? "");
				return;
			}

			if (input.startsWith("kill ")) {
				const name = input.slice(5).trim();
				const res = await runTeamsAction(pi, leader, { action: "kill", name }, ctx);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			if (input === "kill_all") {
				const res = await runTeamsAction(pi, leader, { action: "kill_all" }, ctx);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			if (input === "thinking") {
				leader.showComments = !leader.showComments;
				show(`Worker notes ${leader.showComments ? "visible" : "hidden"}`);
				return;
			}

			if (input.startsWith("delegate ")) {
				const raw = input.slice(9).trim();
				const sep = raw.indexOf(":");
				if (sep <= 0) {
					show("Usage: /team delegate <worker[@model]>:<task>", "warning");
					return;
				}
				const workerPart = raw.slice(0, sep).trim();
				const text = raw.slice(sep + 1).trim();
				if (!workerPart || !text) {
					show("Usage: /team delegate <worker[@model]>:<task>", "warning");
					return;
				}
				// Parse worker@model syntax
				const atIdx = workerPart.indexOf("@");
				const assignee = atIdx > 0 ? workerPart.slice(0, atIdx) : workerPart;
				const model = atIdx > 0 ? workerPart.slice(atIdx + 1) : undefined;
				const res = await runTeamsAction(
					pi,
					leader,
					{ action: "delegate", tasks: [{ text, assignee, model }], useWorktree: true },
					ctx,
				);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			show("Unknown subcommand. Use /team help", "warning");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		leader.setContext(ctx);
		// Share the pi-mesh extension's mesh instance (avoids duplicate connections)
		const mesh = (globalThis as any).__piMesh;
		if (mesh) leader.setMesh(mesh);
		// Restore worker state from session (survives reloads)
		leader.restoreState(ctx);
	});

	pi.on("session_shutdown", async () => {
		leader.stopPolling();
	});
}
