import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { formatRuntimeSummary } from "./activity.js";
import type { TeamLeader } from "./leader.js";
import { resolveTemplate, listTemplates } from "./templates.js";
import { projectWidgetStatus } from "./widget.js";

/**
 * Maps team template names to ticket creation semantics.
 * Templates not listed here default to normal actionable tickets.
 */
const TEMPLATE_TICKET_OVERRIDES: Record<string, { type: string; tags: string[] }> = {
  review: { type: "artifact", tags: ["review"] },
  oracle: { type: "artifact", tags: ["research", "oracle"] },
  investigate: { type: "artifact", tags: ["research"] },
};

const TeamsParams = Type.Object({
  action: Type.Optional(
    Type.Union([
      Type.Literal("delegate"),
      Type.Literal("list"),
      Type.Literal("kill"),
      Type.Literal("kill_all"),
      Type.Literal("tell"),
      Type.Literal("tell_all"),
      Type.Literal("view"),
    ]),
  ),
  tasks: Type.Optional(
    Type.Array(
      Type.Object({
        text: Type.String({ description: "Task description" }),
        assignee: Type.Optional(Type.String({ description: "Worker name" })),
        model: Type.Optional(
          Type.String({
            description: "Model for this worker (see recommendations from `prompts/default.md`)",
          }),
        ),
        template: Type.Optional(
          Type.String({
            description: "Worker template name (e.g. 'review', 'oracle', 'fix', 'implementer'). " +
              "Templates set model, worktree, and additional prompt from ~/.pi/agent/team-templates.json. " +
              "Explicit model/worktree params override the template.",
          }),
        ),
        persistent: Type.Optional(
            Type.Boolean({
              description: "Keep worker alive indefinitely — coordinator controls lifecycle via kill. " +
                "Worker won't auto-close after completing work. Use for interactive sessions, tag-teaming with other agents, monitoring, or roleplay.",
              default: false,
            }),
          ),
        hasTools: Type.Optional(
          Type.Boolean({
            description: "Give worker access to teams tool for sub-delegation (default: false)",
            default: false,
          }),
        ),
      }),
    ),
  ),
  name: Type.Optional(Type.String({ description: "Worker name for kill/tell action" })),
  message: Type.Optional(Type.String({ description: "Message to send to worker(s) for tell/tell_all action" })),
  start: Type.Optional(Type.Number({ description: "View window start offset. Defaults to -20." })),
  end: Type.Optional(Type.Number({ description: "View window end offset. Defaults to 0 (newest entry)." })),
  useWorktree: Type.Optional(
    Type.Boolean({ description: "Give each worker its own git worktree", default: true }),
  ),
  baseRef: Type.Optional(
    Type.String({
      description:
        "Git ref (branch name, SHA, or tag) to branch worker worktrees from. " +
        "Use this when you're working in a worktree — pass the worktree's branch name " +
        "so workers branch from the right commit instead of from the repo root's HEAD. " +
        "Example: if you cd'd into .worktrees/cleanroom on branch 'cleanroom', pass baseRef: 'cleanroom'.",
    }),
  ),
});

type TeamsActionParams = {
  action?: "delegate" | "list" | "kill" | "kill_all" | "tell" | "tell_all" | "view";
  tasks?: Array<{ text: string; assignee?: string; model?: string; template?: string; hasTools?: boolean; persistent?: boolean }>;
  name?: string;
  message?: string;
  start?: number;
  end?: number;
  useWorktree?: boolean;
  baseRef?: string;
};



async function runTeamsAction(
  pi: ExtensionAPI,
  leader: TeamLeader,
  params: TeamsActionParams,
  ctx: ExtensionContext,
) {
  leader.setContext(ctx);
  const action = params.action ?? "delegate";

  if (action === "list") {
    const workers = leader.getWorkers();
    if (workers.length === 0) {
      return { content: [{ type: "text" as const, text: "No active workers." }] };
    }
    const lines = workers.map((w) => {
      const modelSuffix = w.model ? ` | model ${w.model}` : "";
      const v2Lifecycle = leader.getV2WorkerLifecycle(w.name);
      const sessionMode = leader.getV2CurrentSessionMode(w.name);
      const sessionModeLabel = sessionMode ? (sessionMode.kind === "fork" ? `fork:${sessionMode.parentLeafId}` : sessionMode.kind) : "unknown";
      const projected = projectWidgetStatus(w, v2Lifecycle);
      const parts = [`${w.name}: ${projected.status}${v2Lifecycle ? ` | v2 ${v2Lifecycle}` : ""} | route ${projected.routeLabel} | session ${sessionModeLabel} | ticket #${w.ticketId} | pid ${w.pid}${modelSuffix}`];
      parts.push(
        `  activity: ${formatRuntimeSummary({
          hasActiveChildProcess: w.hasActiveChildProcess,
          activeChildProcessCount: w.activeChildProcessCount,
          currentCommand: w.currentCommand,
          currentCommandElapsedSeconds: w.currentCommandElapsedSeconds,
          startedAt: w.spawnedAt,
          lastOutputAt: w.lastOutputAt,
          lastOutputLabel: w.lastOutputLabel,
        })}`,
      );
      if (w.lastNote) parts.push(`  last note: ${w.lastNote.slice(0, 120)}`);
      return parts.join("\n");
    });
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }

  if (action === "kill") {
    if (!params.name)
      return { content: [{ type: "text" as const, text: "Provide worker name." }], isError: true };
    await leader.kill(params.name);
    return { content: [{ type: "text" as const, text: `Killed worker "${params.name}"` }] };
  }

  if (action === "kill_all") {
    await leader.killAll();
    return { content: [{ type: "text" as const, text: "All workers killed." }] };
  }

  if (action === "tell") {
    if (!params.name || !params.message) {
      return { content: [{ type: "text" as const, text: "Provide name and message." }], isError: true };
    }
    const sent = leader.tellWorker(params.name, params.message);
    const worker = leader.getWorker(params.name);
    const why = worker ? ` (route ${worker.routeState})` : "";
    return { content: [{ type: "text" as const, text: sent ? `Told "${params.name}"` : `Worker "${params.name}" not reachable${why}` }] };
  }

  if (action === "tell_all") {
    if (!params.message) {
      return { content: [{ type: "text" as const, text: "Provide message." }], isError: true };
    }
    const count = leader.tellAllWorkers(params.message);
    return { content: [{ type: "text" as const, text: `Told ${count} worker(s)` }] };
  }

  if (action === "view") {
    if (!params.name) {
      return { content: [{ type: "text" as const, text: "Provide worker name." }], isError: true };
    }
    try {
      const viewed = await leader.viewWorker(params.name, params.start ?? -20, params.end ?? 0);
      return {
        content: [{ type: "text" as const, text: `[source: ${viewed.source} · route: ${viewed.routeState}]\n\n${viewed.text}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${error}` }],
        isError: true,
      };
    }
  }

  if (action === "delegate") {
    if (!params.tasks?.length) {
      return { content: [{ type: "text" as const, text: "Provide tasks array." }], isError: true };
    }

    const defaultWorktree = params.useWorktree ?? true;
    const results: string[] = [];
    let workerIdx = 0;

    for (const task of params.tasks) {
      const workerName = task.assignee ?? `worker-${++workerIdx}`;

      // Resolve template — explicit task params override template values
      let effectiveModel = task.model;
      let effectiveWorktree = defaultWorktree;
      let additionalPrompt: string | undefined;
      let freeform = false;

      if (task.template) {
        const tmpl = resolveTemplate(task.template);
        if (!tmpl) {
          const available = listTemplates();
          const names = available.length > 0
            ? available.map(t => `"${t.name}"`).join(", ")
            : "(none configured)";
          results.push(`Unknown template "${task.template}" for "${workerName}". Available: ${names}. Configure in ~/.pi/agent/team-templates.json`);
          continue;
        }
        if (!effectiveModel && tmpl.model) effectiveModel = tmpl.model;
        if (tmpl.worktree !== undefined && params.useWorktree === undefined) effectiveWorktree = tmpl.worktree;
        if (tmpl.prompt) additionalPrompt = tmpl.prompt;
        if (tmpl.freeform) freeform = true;
      }
      if (task.persistent) freeform = true;

      // Determine ticket type and tags based on template
      const templateName = task.template ?? "";
      const overrides = TEMPLATE_TICKET_OVERRIDES[templateName];
      const ticketType = overrides?.type ?? "task";
      const ticketTags = ["team", ...(overrides?.tags ?? [])].join(",");

      const createResult = await pi.exec(
        "mai",
        ["ticket", task.text, ticketType, "-d", task.text, "-l", ticketTags, "-a", workerName],
        { cwd: ctx.cwd, timeout: 5000 },
      );

      const ticketId = (createResult.stdout ?? "").trim().split(/\s+/)[0];
      if (!ticketId || createResult.code !== 0) {
        results.push(`Failed to create ticket for "${task.text}": ${createResult.stderr}`);
        continue;
      }

      await pi.exec("mai", ["start", ticketId], { cwd: ctx.cwd, timeout: 5000 });

      try {
        const handle = await leader.delegate(ticketId, workerName, effectiveWorktree, effectiveModel, task.hasTools, additionalPrompt, freeform, params.baseRef);
        const modelInfo = effectiveModel ? ` [${effectiveModel}]` : "";
        const toolsInfo = task.hasTools ? " [has-tools]" : "";
        const tmplInfo = task.template ? ` (template: ${task.template})` : "";
        const refInfo = params.baseRef ? ` [from: ${params.baseRef}]` : "";
        results.push(
          `Spawned "${workerName}" → ticket #${ticketId} (pid ${handle.pid})${modelInfo}${toolsInfo}${tmplInfo}${refInfo}`,
        );
      } catch (err) {
        // Pre-flight auth failure or other spawn error — clean up the ticket
        await pi.exec("mai", ["close", ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
        results.push(`Failed to spawn "${workerName}": ${err}`);
      }
    }

    leader.startPolling();
    return { content: [{ type: "text" as const, text: results.join("\n") }] };
  }

  return { content: [{ type: "text" as const, text: `Unknown action: ${action}` }], isError: true };
}

export function registerTeamsTool(pi: ExtensionAPI, leader: TeamLeader) {
  pi.registerTool({
    name: "teams",
    label: "Teams",
    description: `Coordinate a team of worker agents.

Actions:
- delegate: Create tickets and spawn workers. Provide "tasks" array with { text, assignee?, model?, template?, hasTools? }.
  Each worker can use a different model via "provider/model-id" (use examples from ${"`"}prompts/default.md${"`"}).
  Use template to apply a preset from ~/.pi/agent/team-templates.json (e.g. "review", "oracle", "fix", "implementer").
  Templates set model, worktree, and additional prompt. Explicit params override template values.
  Set hasTools: true to give a worker the teams tool so it can delegate sub-workers.
- list: Show all active workers and their status.
- kill: Kill a specific worker by name.
- kill_all: Kill all workers.
- view: Read recent meaningful session entries for a worker. Live workers use mesh first; resumable/offline workers fall back to their session log.

IMPORTANT: After delegating, do NOT poll or loop-call "list" to check on workers.
You will be automatically notified via [team-event] messages when workers post progress, complete, or fail.
Just continue with other work or wait for the user. Only use "list" if the user explicitly asks for worker status.

IMPORTANT: If you are working in a git worktree (not the repo root), you MUST pass baseRef with the
worktree's branch name when using useWorktree: true. Otherwise workers will branch from the repo root's
HEAD (likely main) instead of your working branch, and their changes will be unmergeable.
Example: if you cd'd into .worktrees/cleanroom on branch "cleanroom", pass baseRef: "cleanroom".`,
    parameters: TeamsParams,
    async execute(_id, params, _signal, _onUpdate, ctx) {
      return runTeamsAction(pi, leader, params, ctx);
    },
  });
}

export { runTeamsAction };
