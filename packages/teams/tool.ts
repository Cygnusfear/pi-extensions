import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { writeFile, unlink } from "node:fs/promises";
import { getMaiBin, maiDep } from "../shared/src/mai-binary.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { formatRuntimeSummary } from "./activity.js";
import type { TeamLeader } from "./leader.js";
import { resolveTemplate, listTemplates } from "@pi-extensions/shared/team-templates";
import { resolve as resolveModelRole, checkModelHealth, livenessExpiry, type ResolverContext } from "../model-router/src/router.js";
import { projectWidgetStatus } from "./widget.js";
import type { SessionSelector } from "./session-adoption.js";

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

const SessionSelectorSchema = Type.Union([
  Type.Object({
    kind: Type.Literal("id"),
    id: Type.String({ minLength: 1, description: "Exact Pi session ID" }),
  }),
  Type.Object({
    kind: Type.Literal("file"),
    path: Type.String({ minLength: 1, description: "Path to an existing Pi session JSONL" }),
  }),
]);

const TeamsParams = Type.Object({
  action: Type.Optional(
    Type.Union([
      Type.Literal("delegate"),
      Type.Literal("adopt"),
      Type.Literal("list"),
      Type.Literal("kill"),
      Type.Literal("kill_all"),
      Type.Literal("tell"),
      Type.Literal("tell_all"),
      Type.Literal("view"),
      Type.Literal("runtime"),
      Type.Literal("history"),
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
  adoption: Type.Optional(
    Type.Object({
      session: SessionSelectorSchema,
      as: Type.String({ minLength: 1, description: "Stable team-member name" }),
      message: Type.String({ minLength: 1, description: "First team assignment sent into the resumed session" }),
      ticketId: Type.Optional(Type.String({ description: "Pre-created instruction ticket ID" })),
      model: Type.Optional(Type.String({ description: "Optional model override; omit to preserve the session model" })),
      hasTools: Type.Optional(Type.Boolean({ description: "Give the adopted member Teams delegation tools", default: false })),
    }),
  ),
  name: Type.Optional(Type.String({ description: "Worker name for kill/tell action" })),
  attemptId: Type.Optional(Type.String({ description: "Exact lifecycle attempt ID for view/history" })),
  status: Type.Optional(Type.String({ description: "Lifecycle status filter for history" })),
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

export type TeamsAdoptionParams = {
  session: SessionSelector;
  as: string;
  message: string;
  ticketId?: string;
  model?: string;
  hasTools?: boolean;
};

export type TeamsActionParams = {
  action?: "delegate" | "adopt" | "list" | "kill" | "kill_all" | "tell" | "tell_all" | "view" | "runtime" | "history";
  tasks?: Array<{ text: string; ticketId?: string | { id: string; [k: string]: unknown }; assignee?: string; model?: string; template?: string; hasTools?: boolean; persistent?: boolean; cwd?: string }>;
  adoption?: TeamsAdoptionParams;
  name?: string;
  attemptId?: string;
  status?: string;
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

type TicketReference = string | { id: string; [key: string]: unknown };

interface PreparedInstructionTicket {
  ticketId: string;
  created: boolean;
}

async function prepareInstructionTicket(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  input: {
    ticketId?: TicketReference;
    text: string;
    workerName: string;
    tags: readonly string[];
  },
): Promise<PreparedInstructionTicket> {
  if (input.ticketId) {
    const ticketId = typeof input.ticketId === "string" ? input.ticketId : input.ticketId.id;
    await pi.exec(getMaiBin(), ["start", ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
    return { ticketId, created: false };
  }

  const title = input.text.split("\n")[0].slice(0, 120);
  const createResult = await pi.exec(
    getMaiBin(),
    ["ticket", title, "task", "-l", input.tags.join(","), "-a", input.workerName],
    { cwd: ctx.cwd, timeout: 5000 },
  );
  const ticketId = (createResult.stdout ?? "").trim().split(/\s+/)[0];
  if (!ticketId || createResult.code !== 0) {
    throw new Error(`Failed to create ticket for "${title}": ${createResult.stderr}`);
  }

  if (input.text.length > title.length) {
    const tmp = join(tmpdir(), `mai-body-${ticketId}-${Date.now()}.md`);
    try {
      await writeFile(tmp, input.text, "utf8");
      await pi.exec(getMaiBin(), ["add-note", ticketId, "--file", tmp], { cwd: ctx.cwd, timeout: 5000 });
    } finally {
      await unlink(tmp).catch(() => {});
    }
  }
  await pi.exec(getMaiBin(), ["start", ticketId], { cwd: ctx.cwd, timeout: 5000 });
  return { ticketId, created: true };
}

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
    const recentAttempts = leader.getAttemptHistory({ start: -10 });
    if (workers.length === 0 && recentAttempts.length === 0) {
      return ok("No active workers.");
    }
    const lifecycleProjection = leader.getLifecycleProjectionRecord();
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
    const activeAttemptIds = new Set(workers.map((worker) => worker.workerInstanceId));
    const history = recentAttempts
      .filter((attempt) => !activeAttemptIds.has(attempt.attemptId))
      .map((attempt) => `${attempt.name}: ${attempt.declaration?.kind ?? attempt.assessment?.kind ?? attempt.process.phase} | attempt ${attempt.attemptId} | ticket #${attempt.ticketId}`);
    const header = lifecycleProjection ? `team ${lifecycleProjection.teamId}` : "team unavailable";
    return ok(`${header}\n\n${[...lines, ...history].join("\n")}`);
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
    if (!params.name && !params.attemptId) {
      return err("Provide worker name or attemptId.");
    }
    try {
      const viewed = params.attemptId
        ? await leader.viewAttempt(params.attemptId, params.start ?? -20, params.end ?? 0)
        : await leader.viewWorker(params.name!, params.start ?? -20, params.end ?? 0);
      const targetName = params.name ?? leader.getAttemptHistory({ attemptId: params.attemptId })[0]?.name ?? "unknown";
      const v2Lifecycle = leader.getV2WorkerLifecycle(targetName);
      const sessionMode = leader.getV2CurrentSessionMode(targetName);
      const sessionLabel = sessionMode ? (sessionMode.kind === "fork" ? `fork:${sessionMode.parentLeafId}` : sessionMode.kind) : "unknown";
	  const history = leader.getAttemptHistory({ name: targetName, start: -5 });
	  const historyLines = history.map((attempt) =>
		`- ${attempt.declaration?.kind ?? attempt.assessment?.kind ?? attempt.process.phase} · ${attempt.sessionMode.kind} · attempt ${attempt.attemptId}`,
	  );
	  const historyBlock = historyLines.length > 0 ? `\n\nRecent attempts:\n${historyLines.join("\n")}` : "";
	  return ok(`[source: ${viewed.source} · route: ${viewed.routeState} · v2: ${v2Lifecycle ?? "unknown"} · session: ${sessionLabel}]\n\n${viewed.text}${historyBlock}`);
    } catch (error) {
      return err(`Error: ${formatActionError(error)}`);
    }
  }

  if (action === "history") {
    const attempts = leader.getAttemptHistory({ attemptId: params.attemptId, name: params.name, status: params.status, start: params.start, end: params.end });
    return ok(JSON.stringify(attempts, null, 2));
  }

  if (action === "runtime") {
    const runtime = leader.getLifecycleProjectionRecord();
    return ok(runtime ? JSON.stringify(runtime, null, 2) : "No v2 runtime state.");
  }

  if (action === "adopt") {
    if (!maiDep.ok) return err(`${maiDep.reason}. ${maiDep.install}`);
    const adoption = params.adoption;
    if (!adoption) return err("Provide adoption with session, as, and message.");
    if (!adoption.as.trim() || adoption.as !== adoption.as.trim() || /[\/\\\0]/.test(adoption.as)) {
      return err("Adoption 'as' must be a non-empty worker name without leading/trailing whitespace or path separators.");
    }
    if (!adoption.message.trim()) return err("Adoption message must be non-empty.");
    if (adoption.ticketId !== undefined && !adoption.ticketId.trim()) return err("Adoption ticketId must be non-empty when provided.");
    if (adoption.model !== undefined && !adoption.model.trim()) return err("Adoption model must be non-empty when provided.");

    let prepared: PreparedInstructionTicket;
    try {
      prepared = await prepareInstructionTicket(pi, ctx, {
        ticketId: adoption.ticketId,
        text: adoption.message,
        workerName: adoption.as,
        tags: ["team", "agent-instruction", "adopted-session"],
      });
    } catch (error) {
      return err(formatActionError(error));
    }

    try {
      const handle = await leader.adoptSession(
        prepared.ticketId,
        adoption.as,
        adoption.session,
        adoption.message,
        adoption.model,
        adoption.hasTools,
      );
      leader.startPolling();
      const modelInfo = adoption.model ? ` [${adoption.model}]` : " [session model]";
      const toolsInfo = adoption.hasTools ? " [has-tools]" : "";
      return ok(
        `Adopted Pi session as "${adoption.as}" → ticket #${prepared.ticketId} (pid ${handle.pid})${modelInfo}${toolsInfo}\n` +
        "The exact source JSONL is now a persistent Teams member; later idle resumptions use teams.tell().",
      );
    } catch (error) {
      if (prepared.created && !leader.hasLifecycleAttempt(adoption.as, prepared.ticketId)) {
        await pi.exec(getMaiBin(), ["close", prepared.ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
      }
      return err(`Failed to adopt "${adoption.as}": ${formatActionError(error)}`);
    }
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

      // Rate-limit liveness gate: never spawn a worker on a flagged model.
      // Applies to literal pins AND template-resolved models — a flagged model
      // fails guaranteed and burns money.
      if (effectiveModel) {
        const health = checkModelHealth(effectiveModel);
        if (!health.healthy) {
          const expiry = health.entry ? (livenessExpiry(health.entry)?.toISOString() ?? "unknown") : "unknown";
          results.push(
            `✗ "${workerName}": model ${effectiveModel} is FLAGGED UNAVAILABLE (${health.entry?.reason ?? "unknown"}, expires ${expiry}). ` +
              "Delegating it would fail guaranteed and burn money. Use a template role (the router skips flagged models) " +
              "or another healthy model — check modelRouter.isAvailable first.",
          );
          continue;
        }
      }

      const templateName = task.template ?? "";
      const templateTags = templateName ? (TEMPLATE_INSTRUCTION_TAGS[templateName] ?? [`template-${templateName}`]) : [];
      let prepared: PreparedInstructionTicket;
      try {
        prepared = await prepareInstructionTicket(pi, ctx, {
          ticketId: task.ticketId,
          text: task.text,
          workerName,
          tags: ["team", "agent-instruction", ...templateTags],
        });
      } catch (error) {
        results.push(formatActionError(error));
        continue;
      }
      const { ticketId } = prepared;

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
        // Once spawn intent exists, the leader owns ticket/worktree cleanup as
        // deterministic session-native effects. Only a pre-intent rejection
        // (for example duplicate active name) needs direct ticket rollback.
        if (prepared.created && !leader.hasLifecycleAttempt(workerName, ticketId)) {
          await pi.exec(getMaiBin(), ["close", ticketId], { cwd: ctx.cwd, timeout: 5000 }).catch(() => {});
        }
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
- delegate: Create tickets and spawn workers. Provide "tasks" array — each item MUST be { text, assignee?, model?, template?, hasTools? } — the field is "text", NOT title/body/name. Example: tasks: [{ text: "Fix the bug", assignee: "fixer" }].
  Each worker can use a different model via "provider/model-id" (use examples from ${"`"}prompts/default.md${"`"}).
  Use template to apply a preset from ~/.pi/agent/team-templates.json (e.g. "review", "oracle", "fix", "implementer").
  Templates set model, worktree, and additional prompt. Explicit params override template values.
  Set hasTools: true to give a worker the teams tool so it can delegate sub-workers.
- adopt: Attach and activate one stopped persisted Pi session. Provide "adoption" with
  { session: { kind: "id", id } | { kind: "file", path }, as, message, ticketId?, model?, hasTools? }.
  The source JSONL, cwd, context, and durable mesh identity are preserved. Active sessions fail closed.
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
