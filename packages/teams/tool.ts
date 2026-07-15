import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { writeFile, unlink } from "node:fs/promises";
import { getMaiBin, maiDep } from "../shared/src/mai-binary.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { formatRuntimeSummary } from "./activity.js";
import type { TeamLeader } from "./leader.js";
import { resolveTemplate, listTemplates } from "@pi-extensions/shared/team-templates";
import { resolve as resolveModelRole, type ResolverContext } from "../model-router/src/router.js";
import { projectWidgetStatus } from "./widget.js";

function formatActionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Tags that describe the worker role on Teams-created assignment tickets.
 *
 * These tickets are instructions owned by the Teams lifecycle, not the output
 * artifacts produced by the worker. For example, a review worker's assignment
 * ticket is tagged `agent-instruction`; the review worker creates a separate
 * `review` artifact for the actual review output.
 */
const TEMPLATE_INSTRUCTION_TAGS: Record<string, string[]> = {
  review: ["reviewer"],
  oracle: ["oracle"],
  investigate: ["investigate"],
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
      Type.Literal("runtime"),
    ]),
  ),
  tasks: Type.Optional(
    Type.Array(
      Type.Object({
        text: Type.String({ description: "Task description" }),
        ticketId: Type.Optional(Type.String({ description: "Pre-created ticket ID from maiTicket(). Skips ticket creation — worker uses this ticket directly." })),
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
  names: Type.Optional(Type.Array(Type.String({ description: "Worker names for bulk kill action" }))),
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
  action?: "delegate" | "list" | "kill" | "kill_all" | "tell" | "tell_all" | "view" | "runtime";
  tasks?: Array<{ text: string; ticketId?: string | { id: string; [k: string]: unknown }; assignee?: string; model?: string; template?: string; hasTools?: boolean; persistent?: boolean; cwd?: string }>;
  name?: string;
  names?: string[];
  message?: string;
  start?: number;
  end?: number;
  useWorktree?: boolean;
  baseRef?: string;
};



/** Shape of every AgentToolResult returned by runTeamsAction. Matches
 *  `AgentToolResult` from the pi SDK (`content` + `details: unknown`) plus an
 *  optional `isError` flag that downstream `ToolResultMessage` carries.
 *  `details` is mandatory (typed unknown, may be undefined) so the SDK's
 *  required-property contract is satisfied at compile time. */
type TeamsActionResult = {
  content: Array<{ type: "text"; text: string }>;
  details: unknown;
  isError?: boolean;
};
/** Build a successful AgentToolResult from a single text body. */
const ok = (text: string): TeamsActionResult => ({ content: [{ type: "text", text }], details: undefined });
/** Same as `ok` but flagged as an error result. */
const err = (text: string): TeamsActionResult => ({ content: [{ type: "text", text }], isError: true, details: undefined });

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
      return ok("No active workers.");
    }
    const v2Team = leader.getV2TeamRecord();
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
    const header = v2Team ? `v2 team ${v2Team.teamId} · leaderEpoch ${v2Team.leaderEpoch}` : "v2 team unavailable";
    return ok(`${header}\n\n${lines.join("\n")}`);
  }

  if (action === "kill") {
    const names = params.names?.length ? params.names : (params.name ? [params.name] : []);
    if (names.length === 0)
      return err("Provide worker name(s).");
    for (const name of names) await leader.kill(name);
    return ok(names.length === 1 ? `Killed worker "${names[0]}"` : `Killed ${names.length} workers`);
  }

  if (action === "kill_all") {
    await leader.killAll();
    return ok("All workers killed.");
  }

  if (action === "tell") {
    if (!params.name || !params.message) {
      return err("Provide name and message.");
    }
    const sent = await leader.tellWorker(params.name, params.message);
    const worker = leader.getWorker(params.name);
    const why = worker ? ` (route ${worker.routeState})` : "";
    return ok(sent ? `Told "${params.name}"` : `Worker "${params.name}" not reachable${why}`);
  }

  if (action === "tell_all") {
    if (!params.message) {
      return err("Provide message.");
    }
    const count = await leader.tellAllWorkers(params.message);
    return ok(`Told ${count} worker(s)`);
  }

  if (action === "view") {
    if (!params.name) {
      return err("Provide worker name.");
    }
    try {
      const viewed = await leader.viewWorker(params.name, params.start ?? -20, params.end ?? 0);
      const v2Lifecycle = leader.getV2WorkerLifecycle(params.name);
      const sessionMode = leader.getV2CurrentSessionMode(params.name);
      const sessionLabel = sessionMode ? (sessionMode.kind === "fork" ? `fork:${sessionMode.parentLeafId}` : sessionMode.kind) : "unknown";
      return ok(`[source: ${viewed.source} · route: ${viewed.routeState} · v2: ${v2Lifecycle ?? "unknown"} · session: ${sessionLabel}]\n\n${viewed.text}`);
    } catch (error) {
      return err(`Error: ${formatActionError(error)}`);
    }
  }

  if (action === "runtime") {
    const runtime = leader.getV2TeamRecord();
    return ok(runtime ? JSON.stringify(runtime, null, 2) : "No v2 runtime state.");
  }

  if (action === "delegate") {
    if (!maiDep.ok) {
      return err(`${maiDep.reason}. ${maiDep.install}`);
    }
    if (!params.tasks?.length) {
      return err("Provide tasks array.");
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
        // Resolve model via router when template has an array, direct when string
        if (!effectiveModel && tmpl.model) {
          if (Array.isArray(tmpl.model)) {
            const resolverCtx: ResolverContext = { getAvailable: () => ctx.modelRegistry.getAvailable() };
            const resolved = resolveModelRole(resolverCtx, { role: task.template, count: 1 });
            if (resolved.resolved.length > 0) {
              effectiveModel = resolved.resolved[0].id;
            } else if (resolved.skipped.length > 0) {
              results.push(`⚠ Role "${task.template}" has no available models. Skipped: ${resolved.skipped.map(s => `${s.id} (${s.skipReason})`).join(", ")}`);
              continue;
            }
          } else {
            effectiveModel = tmpl.model;
          }
        }
        if (tmpl.worktree !== undefined && params.useWorktree === undefined) effectiveWorktree = tmpl.worktree;
        if (tmpl.prompt) additionalPrompt = tmpl.prompt;
        if (tmpl.freeform) freeform = true;
      }
      if (task.persistent) freeform = true;

      let ticketId: string;

      if (task.ticketId) {
        // Pre-created ticket — skip creation, just ensure it's started
        // Coerce: mai.ticket() returns { id, started, message } — extract .id if object
        const raw = task.ticketId;
        ticketId = typeof raw === 'string' ? raw
          : (raw && typeof raw === 'object' && 'id' in raw ? String(raw.id) : String(raw));
        await pi.exec(getMaiBin(), ["start", ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
      } else {
        // Create ticket from task text
        const templateName = task.template ?? "";
        const templateTags = templateName ? (TEMPLATE_INSTRUCTION_TAGS[templateName] ?? [`template-${templateName}`]) : [];
        const ticketType = "task";
        const ticketTags = ["team", "agent-instruction", ...templateTags].join(",");

        const taskTitle = task.text.split("\n")[0].slice(0, 120);
        const needsBody = task.text.length > taskTitle.length;

        const createResult = await pi.exec(
          getMaiBin(),
          ["ticket", taskTitle, ticketType, "-l", ticketTags, "-a", workerName],
          { cwd: ctx.cwd, timeout: 5000 },
        );

        ticketId = (createResult.stdout ?? "").trim().split(/\s+/)[0];
        if (!ticketId || createResult.code !== 0) {
          results.push(`Failed to create ticket for "${taskTitle}": ${createResult.stderr}`);
          continue;
        }

        if (needsBody) {
          const tmp = join(tmpdir(), `mai-body-${ticketId}-${Date.now()}.md`);
          try {
            await writeFile(tmp, task.text, "utf8");
            await pi.exec(getMaiBin(), ["add-note", ticketId, "--file", tmp], { cwd: ctx.cwd, timeout: 5000 });
          } finally {
            await unlink(tmp).catch(() => {});
          }
        }

        await pi.exec(getMaiBin(), ["start", ticketId], { cwd: ctx.cwd, timeout: 5000 });
      }

      try {
        const handle = await leader.delegate(ticketId, workerName, effectiveWorktree, effectiveModel, task.hasTools, additionalPrompt, freeform, params.baseRef, task.text, task.cwd);
        const modelInfo = effectiveModel ? ` [${effectiveModel}]` : "";
        const toolsInfo = task.hasTools ? " [has-tools]" : "";
        const tmplInfo = task.template ? ` (template: ${task.template})` : "";
        const refInfo = params.baseRef ? ` [from: ${params.baseRef}]` : "";
        results.push(
          `Spawned "${workerName}" → ticket #${ticketId} (pid ${handle.pid})${modelInfo}${toolsInfo}${tmplInfo}${refInfo}`,
        );
      } catch (err) {
        // Pre-flight auth failure or other spawn error — clean up the ticket
        await pi.exec(getMaiBin(), ["close", ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
        results.push(`Failed to spawn "${workerName}": ${err}`);
      }
    }

    leader.startPolling();
    const spawnedAny = results.some((r) => r.startsWith("Spawned"));
    if (spawnedAny) {
      results.push(
        "🔔 You will be WOKEN automatically when each worker reaches a terminal state (done/failed/quit) — do NOT poll teams.list() in a loop. " +
          'Optional: customize the wake with teams.on("<worker>", "terminal").wake((e) => `...`) (host-owned; never use .preventDefault() + console.wake() for terminal events).',
      );
    }
    return ok(results.join("\n"));
  }

  return err(`Unknown action: ${action}`);
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
