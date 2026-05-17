import { complete, type Message, type UserMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext, SessionEntry } from "@earendil-works/pi-coding-agent";
import { safeJsonParse } from "./safe-json.js";

const ACTIVITY_SUMMARY_TYPE = "pi-activity-summary";
const ACTIVITY_SUMMARY_INTERVAL_MS = 10 * 60_000;
const MAX_RECENT_MESSAGES = 24;

export interface ActivitySummaryState {
  leafId: string | null;
  activity: string | null;
  lastUserGoal: string | null;
  updatedAt: number;
}

export interface ActivitySummaryResult {
  activity: string | null;
  lastUserGoal: string | null;
  updatedAt: number;
  leafId: string | null;
}

function sanitizeLine(value: string | null | undefined, max = 120): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((block): block is { type: string; text?: string } => typeof block === "object" && block !== null)
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

function summarizeRecentMessages(branch: SessionEntry[]): string {
  const messages = branch
    .filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
    .filter((entry) => {
      const role = (entry.message as { role?: string }).role;
      return role === "user" || role === "assistant" || role === "custom";
    })
    .slice(-MAX_RECENT_MESSAGES)
    .map((entry) => {
      const role = (entry.message as { role?: string }).role ?? "unknown";
      const text = sanitizeLine(extractText((entry.message as { content?: unknown }).content), 280);
      if (!text) return null;
      return `${role}: ${text}`;
    })
    .filter((line): line is string => Boolean(line));

  return messages.join("\n");
}

function findSavedSummary(ctx: ExtensionContext): ActivitySummaryState | null {
  let latest: ActivitySummaryState | null = null;

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === ACTIVITY_SUMMARY_TYPE && entry.data) {
      latest = entry.data as ActivitySummaryState;
    }
  }

  return latest;
}

function pickCheapModel(ctx: ExtensionContext) {
  const registry = ctx.modelRegistry as {
    getAvailable?: () => Array<{ provider: string; id: string }>;
    getAll?: () => Array<{ provider: string; id: string }>;
  };
  const models = registry.getAvailable?.call(ctx.modelRegistry) ?? registry.getAll?.call(ctx.modelRegistry) ?? [];

  return (
    models.find((model) => model.provider === "openai" && /gpt-4\.1-nano|gpt-5-nano|nano/i.test(model.id)) ??
    models.find((model) => model.provider === "anthropic" && /haiku/i.test(model.id)) ??
    ctx.model
  );
}

function buildPrompt(sessionName: string | undefined, previous: ActivitySummaryState | null, recent: string) {
  const previousActivity = previous?.activity ?? "";
  const previousGoal = previous?.lastUserGoal ?? "";

  return [
    `Session name: ${sessionName?.trim() || "(unnamed session)"}`,
    previousActivity ? `Previous activity: ${previousActivity}` : "Previous activity: (none)",
    previousGoal ? `Previous user goal: ${previousGoal}` : "Previous user goal: (none)",
    "",
    "Recent conversation (tool calls/results removed):",
    recent || "(no recent non-tool conversation)",
    "",
    "Return JSON only with this shape:",
    '{"activity":"short human sentence","last_user_goal":"short human sentence"}',
    "Keep both fields short, concrete, and plain English.",
    "Do not mention tool names unless they matter to the human goal.",
  ].join("\n");
}

function parseSummaryJson(text: string): { activity: string | null; last_user_goal: string | null } {
  try {
    const parsed = safeJsonParse<{ activity?: string | null; last_user_goal?: string | null }>(text);
    return {
      activity: sanitizeLine(parsed?.activity ?? null),
      last_user_goal: sanitizeLine(parsed?.last_user_goal ?? null),
    };
  } catch {
    return {
      activity: sanitizeLine(text),
      last_user_goal: null,
    };
  }
}

export function getSavedActivitySummary(ctx: ExtensionContext): ActivitySummaryState | null {
  return findSavedSummary(ctx);
}

export function startActivitySummaryLoop(pi: ExtensionAPI, ctx: ExtensionContext) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let warned = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await refreshActivitySummary(pi, ctx);
    } catch (error) {
      if (!warned) {
        warned = true;
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Activity summary paused: ${message}`, "warning");
      }
    } finally {
      running = false;
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, ACTIVITY_SUMMARY_INTERVAL_MS);

  return () => {
    if (timer) clearInterval(timer);
  };
}

export async function refreshActivitySummary(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<ActivitySummaryResult | null> {
  const currentLeafId = ctx.sessionManager.getLeafId?.() ?? null;
  const previous = findSavedSummary(ctx);

  if (previous?.leafId && currentLeafId && previous.leafId === currentLeafId) {
    return previous;
  }

  const model = pickCheapModel(ctx);
  if (!model) return previous;

  const recentConversation = summarizeRecentMessages(ctx.sessionManager.getBranch());
  if (!recentConversation) return previous;

  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  const prompt = buildPrompt(pi.getSessionName(), previous, recentConversation);
  const userMessage: UserMessage = {
    role: "user",
    content: [{ type: "text", text: prompt }],
    timestamp: Date.now(),
  };

  const response = await complete(
    model,
    {
      systemPrompt:
        "You summarize what an active coding session is doing. Reply with JSON only. Keep it short, concrete, and human-readable.",
      messages: [userMessage as Message],
    },
    { apiKey: auth.apiKey, headers: auth.headers },
  );

  if (response.stopReason === "aborted") {
    return previous;
  }

  const text = response.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const parsed = parseSummaryJson(text);
  const result: ActivitySummaryResult = {
    leafId: currentLeafId,
    activity: parsed.activity,
    lastUserGoal: parsed.last_user_goal,
    updatedAt: Date.now(),
  };

  pi.appendEntry(ACTIVITY_SUMMARY_TYPE, result);
  return result;
}
