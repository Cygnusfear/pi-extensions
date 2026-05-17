import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { TeamLeader } from "./leader.js";
import { buildPredicate, TeamsSubscription, type EventFilter, type PollEventType } from "./subscription.js";
import { registerTeamsTool, runTeamsAction } from "./tool.js";
import { runWorker } from "./worker.js";
import { registerSandboxFn } from "@pi-extensions/shared/sandbox-registry";

function normalizeUiError(text: string): string {
	return text.replace(/^Error:\s*/i, "");
}

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

	// Sandbox function for execute_code — shares same leader instance
	let sessionCtx: ExtensionContext | null = null;

	const run = async (params: Record<string, unknown>) => {
		if (!sessionCtx) throw new Error("Teams not ready — session not started yet");
		const result = await runTeamsAction(pi, leader, params as any, sessionCtx);
		if (result.isError) throw new Error(result.content[0]?.text ?? "Teams action failed");
		return result.details ?? result.content[0]?.text ?? "";
	};

	// Build namespaced callable: teams({...}) for raw dispatch, teams.delegate/list/kill/...
	const teamsFn = async (params: Record<string, unknown>) => run(params);
	(teamsFn as any).delegate = async (tasks: Array<Record<string, unknown>>, opts?: Record<string, unknown>) =>
		run({ action: "delegate", tasks, ...opts });
	(teamsFn as any).list = async () => run({ action: "list" });
	(teamsFn as any).kill = async (name: string) => run({ action: "kill", names: [name] });
	(teamsFn as any).killAll = async () => run({ action: "kill_all" });
	(teamsFn as any).tell = async (name: string, message: string) => run({ action: "tell", name, message });
	(teamsFn as any).tellAll = async (message: string) => run({ action: "tell_all", message });
	(teamsFn as any).view = async (name: string, opts?: { start?: number; end?: number }) =>
		run({ action: "view", name, ...opts });
	(teamsFn as any).runtime = async () => run({ action: "runtime" });

	// teams.on — subscribe to the leader's PollEvent stream with a predicate.
	// Returns a thenable TeamsSubscription you can `await`, chain with .each(),
	// .timeout(), .preventDefault(), .stopPropagation(), or .unsubscribe().
	// No polling, no sleeps.
	//
	// To trigger a coordinator turn from a background event, call console.wake()
	// from inside your .each() or .then() callback — console.wake is the single
	// canonical wake primitive. Do not reinvent it per-subscription.
	//
	// Supported signatures (all return TeamsSubscription):
	//   teams.on("fixer")
	//   teams.on("fixer", "completed")
	//   teams.on({ name: "oracle", comment: /DONE:/ })
	//   teams.on({ predicate: e => ... })
	//   teams.on("fixer", "completed", (event) => { ... })    // shorthand for .each()
	//   teams.on({ name: "oracle" }, (event) => { ... })
	(teamsFn as any).on = (
		targetOrFilter: string | EventFilter,
		typeOrCallback?: PollEventType | ((event: unknown) => void),
		callback?: (event: unknown) => void,
	): TeamsSubscription => {
		// Disambiguate overloads. Rule: first arg string + second arg is a poll-event-type string
		// → two-positional form. Anything else with second-arg function → streaming callback.
		let eventType: PollEventType | undefined;
		let eachCb: ((event: unknown) => void) | undefined;

		if (typeof targetOrFilter === "string") {
			if (typeof typeOrCallback === "string") {
				eventType = typeOrCallback;
				eachCb = callback;
			} else if (typeof typeOrCallback === "function") {
				eachCb = typeOrCallback;
			}
		} else if (typeof typeOrCallback === "function") {
			eachCb = typeOrCallback;
		}

		const { filter, predicate } = buildPredicate(targetOrFilter, eventType);
		const sub = new TeamsSubscription(leader, filter, predicate);
		if (eachCb) sub.each(eachCb as (event: unknown) => void);
		return sub;
	};

	registerSandboxFn("teams", teamsFn);

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
			// Kill all workers and persist clean state so reload doesn't restore orphans (RC-B5)
			await leader.killAll();
		});
		return;
	}

	pi.registerCommand("team", {
		description: "Team control: /team list | /team runtime | /team view <name> | /team tell <name> <msg> | /team tell_all <msg> | /team kill <name...> | /team kill_all | /team delegate <worker[@model]>:<task> | /team thinking",
		handler: async (args, ctx) => {
			const input = (args ?? "").trim();
			const show = (text: string, type: "info" | "warning" | "error" = "info") => ctx.ui.notify(text, type);
			if (!input || input === "help") {
				show("/team list | /team runtime | /team view <name> | /team tell <name> <msg> | /team tell_all <msg> | /team kill <name...> | /team kill_all | /team delegate <worker[@model]>:<task> | /team thinking");
				return;
			}

			if (input === "list") {
				const res = await runTeamsAction(pi, leader, { action: "list" }, ctx);
				show(res.content[0]?.text ?? "");
				return;
			}

			if (input.startsWith("kill ")) {
				const names = input.slice(5).trim().split(/\s+/).filter(Boolean);
				const res = await runTeamsAction(pi, leader, { action: "kill", names }, ctx);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			if (input === "runtime") {
				const res = await runTeamsAction(pi, leader, { action: "runtime" }, ctx);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			if (input.startsWith("view ")) {
				const name = input.slice(5).trim();
				const res = await runTeamsAction(pi, leader, { action: "view", name }, ctx);
				show(res.isError ? normalizeUiError(res.content[0]?.text ?? "") : (res.content[0]?.text ?? ""), res.isError ? "error" : "info");
				return;
			}

			if (input.startsWith("tell_all ")) {
				const message = input.slice(9).trim();
				const res = await runTeamsAction(pi, leader, { action: "tell_all", message }, ctx);
				show(res.content[0]?.text ?? "", res.isError ? "error" : "info");
				return;
			}

			if (input.startsWith("tell ")) {
				const rest = input.slice(5).trim();
				const space = rest.indexOf(" ");
				if (space <= 0) {
					show("Usage: /team tell <name> <message>", "warning");
					return;
				}
				const name = rest.slice(0, space).trim();
				const message = rest.slice(space + 1).trim();
				const res = await runTeamsAction(pi, leader, { action: "tell", name, message }, ctx);
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
		sessionCtx = ctx;
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
