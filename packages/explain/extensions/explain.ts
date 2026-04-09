/**
 * Explain — communicator model extension
 *
 * Registers an `explain` tool that routes text through a communicator model
 * (glm-5.1) with full conversation context. The working model (e.g. gpt-5.4)
 * calls explain() when it needs to communicate something to the user.
 * The communicator model reads the conversation and writes a clear explanation.
 *
 * The explained text is rendered directly to the user as a custom message.
 * The working model gets a short confirmation — no parroting.
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm, getMarkdownTheme, serializeConversation } from "@mariozechner/pi-coding-agent";
import { Box, Markdown, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

let communicatorProvider = "zai";
let communicatorModelId = "glm-5.1";

// ~150k tokens budget for context (leave room for response in 200k window)
// rough estimate: 1 token ≈ 4 chars
const MAX_CONTEXT_CHARS = 150_000 * 4;

const COMMUNICATOR_SYSTEM_PROMPT = `You are a communicator. You receive conversation context and a message from a coding assistant that needs to be communicated to a human.

Your job:
- Read the conversation to understand what's happening
- Rewrite the message so it's clear, well-structured, and genuinely useful
- Preserve all technical accuracy
- Eliminate jargon, corporate-speak, and filler
- Be direct and natural — write like a smart colleague talking to another smart person
- Use structure (headings, bullets) only when it helps, not as decoration
- If the original message is already clear, just clean it up — don't over-explain

You output ONLY the rewritten message. No preamble, no "Here's the explanation", just the content.`;

function truncateToFit(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  // Keep the tail (most recent conversation)
  const truncated = text.slice(-maxChars);
  const firstNewline = truncated.indexOf("\n");
  if (firstNewline > 0 && firstNewline < 200) {
    // Clean cut at first complete line
    return "... (earlier context truncated) ...\n" + truncated.slice(firstNewline + 1);
  }
  return "... (earlier context truncated) ...\n" + truncated;
}

function serializeSessionContext(entries: SessionEntry[]): string {
  const messages = entries
    .filter((e): e is SessionEntry & { type: "message" } => e.type === "message")
    .map((e) => e.message);

  const llmMessages = convertToLlm(messages);
  return serializeConversation(llmMessages);
}

export default function (pi: ExtensionAPI) {
  // Custom renderer for explained messages
  pi.registerMessageRenderer("explain", (message, { expanded }, theme) => {
    const details = message.details as {
      originalText?: string;
      model?: string;
      contextTokensEstimate?: number;
    } | undefined;

    const mdTheme = getMarkdownTheme();
    const container = new Box(1, 1, (t: string) => theme.bg("customMessageBg", t));

    // Header
    const modelLabel = details?.model ?? `${communicatorProvider}/${communicatorModelId}`;
    const header = theme.fg("accent", "💬 ") + theme.fg("dim", `[${modelLabel}]`);
    container.addChild(new Text(header, 0, 0));

    // The explained content as markdown
    container.addChild(new Markdown(message.content || "(no content)", 0, 0, mdTheme));

    // Collapsed: show original if expanded
    if (expanded && details?.originalText) {
      const origHeader = theme.fg("muted", "─── original ───");
      container.addChild(new Text(origHeader, 0, 0));
      container.addChild(new Text(theme.fg("dim", details.originalText), 0, 0));
    }

    return container;
  });

  // The explain tool
  pi.registerTool({
    name: "explain",
    label: "Explain",
    description:
      "Send a message to the user through a communicator model that writes clearly. " +
      "Use this when you need to explain decisions, summarize findings, give status updates, " +
      "or communicate anything substantive. The communicator model has conversation context " +
      "and will rewrite your message for clarity.",
    promptSnippet: "Communicate to the user through a clear-writing model (explain decisions, summaries, status)",
    promptGuidelines: [
      "Use explain when communicating substantive information: decisions, summaries, status updates, explanations.",
      "Write your raw thoughts/findings as the text parameter — the communicator model handles clarity.",
      "Do NOT parrot or repeat the explained output. After calling explain, move on to the next task.",
      "GUARD PROTOCOL — After calling explain, you do NOT speak further about the same topic. The communicator model has already communicated to the user. Any additional commentary from you is redundant noise. Move on silently.",
    ],
    parameters: Type.Object({
      text: Type.String({
        description: "The message to communicate. Write your raw thoughts — the communicator handles clarity.",
      }),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      // Find the communicator model
      const model = ctx.modelRegistry.find(communicatorProvider, communicatorModelId);
      if (!model) {
        // Fallback: show raw text via renderResult
        return {
          content: [{ type: "text", text: "Communicated to user (communicator model not available, showed raw text)." }],
          details: { explained: params.text, originalText: params.text, model: "fallback (model not found)" },
        };
      }

      // Get API key
      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        // Fallback: show raw text via renderResult
        return {
          content: [{ type: "text", text: "Communicated to user (no API key for communicator, showed raw text)." }],
          details: { explained: params.text, originalText: params.text, model: "fallback (no API key)" },
        };
      }

      // Stream progress
      onUpdate?.({
        content: [{ type: "text", text: "Routing through communicator model..." }],
        details: {},
      });

      // Build conversation context
      const branch = ctx.sessionManager.getBranch();
      const conversationText = serializeSessionContext(branch);
      const truncatedContext = truncateToFit(conversationText, MAX_CONTEXT_CHARS);
      const contextTokensEstimate = Math.round(truncatedContext.length / 4);

      // Build the user message for the communicator
      const userMessage: Message = {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "## Conversation Context",
              "",
              truncatedContext,
              "",
              "## Message to Communicate",
              "",
              params.text,
            ].join("\n"),
          },
        ],
        timestamp: Date.now(),
      };

      try {
        const response = await complete(
          model,
          {
            systemPrompt: COMMUNICATOR_SYSTEM_PROMPT,
            messages: [userMessage],
          },
          {
            apiKey: auth.apiKey,
            headers: auth.headers,
            signal: signal ?? undefined,
          },
        );

        if (response.stopReason === "aborted") {
          return {
            content: [{ type: "text", text: "Explain cancelled." }],
            details: {},
          };
        }

        const explained = response.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        // Return short confirmation to the LLM — the full glm output is in details
        // and rendered to the user via renderResult (no sendMessage to avoid retriggering)
        return {
          content: [{ type: "text", text: "✓ Communicated to user via communicator model." }],
          details: {
            explained,
            originalText: params.text,
            model: `${communicatorProvider}/${communicatorModelId}`,
            contextTokensEstimate,
          },
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Fallback: show raw text via renderResult
        return {
          content: [{ type: "text", text: `Communicated to user (communicator error: ${errorMsg}, showed raw text).` }],
          details: { explained: params.text, originalText: params.text, model: `fallback (error: ${errorMsg})` },
        };
      }
    },

    // Compact tool call render
    renderCall(args, theme, _context) {
      const preview = args.text
        ? args.text.length > 80
          ? args.text.slice(0, 80) + "..."
          : args.text
        : "...";
      const text =
        theme.fg("toolTitle", theme.bold("explain ")) +
        theme.fg("accent", "💬") +
        "\n  " +
        theme.fg("dim", preview);
      return new Text(text, 0, 0);
    },

    // Render the communicator output directly to the user
    renderResult(result, { expanded }, theme, _context) {
      const details = result.details as {
        explained?: string;
        originalText?: string;
        model?: string;
        contextTokensEstimate?: number;
      } | undefined;

      // If no explained text, just show the short confirmation
      if (!details?.explained) {
        const text = result.content?.[0];
        const content = text?.type === "text" ? text.text : "done";
        return new Text(theme.fg("success", content), 0, 0);
      }

      const mdTheme = getMarkdownTheme();
      const container = new Box(1, 1, (t: string) => theme.bg("customMessageBg", t));

      // Header with model label
      const modelLabel = details.model ?? `${communicatorProvider}/${communicatorModelId}`;
      const header = theme.fg("accent", "💬 ") + theme.fg("dim", `[${modelLabel}]`);
      container.addChild(new Text(header, 0, 0));

      // The explained content as markdown
      container.addChild(new Markdown(details.explained, 0, 0, mdTheme));

      // Show original text when expanded
      if (expanded && details.originalText) {
        const origHeader = theme.fg("muted", "─── original ───");
        container.addChild(new Text(origHeader, 0, 0));
        container.addChild(new Text(theme.fg("dim", details.originalText), 0, 0));
      }

      return container;
    },
  });

  // /rephrase command — manually route last assistant message through communicator
  pi.registerCommand("rephrase", {
    description: "Rephrase the last assistant message through the communicator model",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("rephrase requires interactive mode", "error");
        return;
      }

      // Find the last assistant text message from the branch
      const branch = ctx.sessionManager.getBranch();
      let lastAssistantText = "";

      for (let i = branch.length - 1; i >= 0; i--) {
        const entry = branch[i] as any;
        if (entry.type === "message" && entry.message?.role === "assistant") {
          const content = entry.message.content;
          if (Array.isArray(content)) {
            const textParts = content
              .filter((c: any) => c.type === "text" && typeof c.text === "string")
              .map((c: any) => c.text);
            if (textParts.length > 0) {
              lastAssistantText = textParts.join("\n");
              break;
            }
          } else if (typeof content === "string") {
            lastAssistantText = content;
            break;
          }
        }
      }

      if (!lastAssistantText.trim()) {
        ctx.ui.notify("No assistant message found to rephrase", "warning");
        return;
      }

      // Find communicator model
      const model = ctx.modelRegistry.find(communicatorProvider, communicatorModelId);
      if (!model) {
        ctx.ui.notify(`Communicator model ${communicatorProvider}/${communicatorModelId} not found`, "error");
        return;
      }

      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        ctx.ui.notify("No API key for communicator model", "error");
        return;
      }

      ctx.ui.setStatus("rephrase", "Rephrasing via communicator...");

      try {
        // Build conversation context
        const conversationText = serializeSessionContext(branch);
        const truncatedContext = truncateToFit(conversationText, MAX_CONTEXT_CHARS);
        const contextTokensEstimate = Math.round(truncatedContext.length / 4);

        const userMessage: Message = {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "## Conversation Context",
                "",
                truncatedContext,
                "",
                "## Message to Rephrase",
                "",
                lastAssistantText,
              ].join("\n"),
            },
          ],
          timestamp: Date.now(),
        };

        const response = await complete(
          model,
          {
            systemPrompt: COMMUNICATOR_SYSTEM_PROMPT,
            messages: [userMessage],
          },
          {
            apiKey: auth.apiKey,
            headers: auth.headers,
          },
        );

        const explained = response.content
          .filter((c: any): c is { type: "text"; text: string } => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");

        pi.sendMessage({
          customType: "explain",
          content: explained,
          display: true,
          details: {
            originalText: lastAssistantText,
            model: `${communicatorProvider}/${communicatorModelId}`,
            contextTokensEstimate,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Rephrase failed: ${errorMsg}`, "error");
      } finally {
        ctx.ui.setStatus("rephrase", undefined);
      }
    },
  });


  // /communicator command — switch the communicator model
  pi.registerCommand("communicator", {
    description: "Set the communicator model (e.g. /communicator zai/glm-5.1, /communicator anthropic/claude-opus-4-6)",
    handler: async (args, ctx) => {
      const input = args.trim();

      if (!input) {
        // Show current model
        ctx.ui.notify(`Communicator: ${communicatorProvider}/${communicatorModelId}`, "info");
        return;
      }

      // Parse provider/model
      const parts = input.split("/");
      if (parts.length !== 2) {
        ctx.ui.notify("Usage: /communicator provider/model-id", "error");
        return;
      }

      const [provider, modelId] = parts;
      const model = ctx.modelRegistry.find(provider, modelId);
      if (!model) {
        ctx.ui.notify(`Model not found: ${input}`, "error");
        return;
      }

      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        ctx.ui.notify(`No API key for ${input}`, "error");
        return;
      }

      communicatorProvider = provider;
      communicatorModelId = modelId;
      ctx.ui.notify(`Communicator set to ${provider}/${modelId}`, "success");
    },
  });

}
