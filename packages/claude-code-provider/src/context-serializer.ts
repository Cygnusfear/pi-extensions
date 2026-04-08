/**
 * Serializes pi's Context (system prompt + messages + tools) into
 * arguments suitable for `claude -p`.
 *
 * The key challenge: `claude -p` takes a single prompt string and an
 * optional --system-prompt. We need to pack a full multi-turn conversation
 * with tool_use/tool_result blocks into that format so the model continues
 * the conversation naturally — including emitting tool_use blocks for pi
 * to handle.
 */

import type { TSchema } from "@sinclair/typebox";

// We import the types but they come from pi-ai at runtime
interface TextContent { type: "text"; text: string }
interface ImageContent { type: "image"; data: string; mimeType: string }
interface ThinkingContent { type: "thinking"; thinking: string }
interface ToolCall { type: "toolCall"; id: string; name: string; arguments: Record<string, any> }

interface UserMessage { role: "user"; content: string | (TextContent | ImageContent)[] }
interface AssistantMessage { role: "assistant"; content: (TextContent | ThinkingContent | ToolCall)[] }
interface ToolResultMessage { role: "toolResult"; toolCallId: string; toolName: string; content: (TextContent | ImageContent)[]; isError: boolean }

type Message = UserMessage | AssistantMessage | ToolResultMessage;

interface Tool<TParameters extends TSchema = TSchema> {
	name: string;
	description: string;
	parameters: TParameters;
}

export interface Context {
	systemPrompt?: string;
	messages: Message[];
	tools?: Tool[];
}

export interface SerializedContext {
	systemPrompt: string;
	conversationPrompt: string;
}

// ── Tool schema serialization ────────────────────────────────────────────────

function serializeToolSchema(tool: Tool): string {
	const lines: string[] = [];
	lines.push(`### ${tool.name}`);
	if (tool.description) {
		// Take first ~200 chars to keep it manageable
		const desc = tool.description.length > 300
			? tool.description.slice(0, 300) + "..."
			: tool.description;
		lines.push(desc);
	}
	if (tool.parameters?.properties) {
		lines.push("Parameters:");
		for (const [key, schema] of Object.entries(tool.parameters.properties) as [string, any][]) {
			const type = schema.type || "any";
			const desc = schema.description ? ` — ${schema.description}` : "";
			const required = tool.parameters.required?.includes(key) ? " (required)" : "";
			lines.push(`  - ${key}: ${type}${required}${desc}`);
		}
	}
	return lines.join("\n");
}

function serializeTools(tools: Tool[]): string {
	if (tools.length === 0) return "";

	const sections = tools.map(serializeToolSchema);
	return [
		"",
		"## Available Tools",
		"",
		"You have access to the following tools. To use a tool, you MUST respond with an XML tool_use block in this exact format:",
		"",
		"```",
		"<tool_use>",
		'<tool_name>tool_name_here</tool_name>',
		'<tool_id>unique_id_here</tool_id>',
		"<parameters>",
		'{"param1": "value1", "param2": "value2"}',
		"</parameters>",
		"</tool_use>",
		"```",
		"",
		"You may include multiple tool_use blocks in a single response.",
		"Generate a unique tool_id for each tool use (e.g., toolu_01, toolu_02, etc.).",
		"After each tool_use block, STOP and wait for the tool result.",
		"",
		...sections,
	].join("\n");
}

// ── Message serialization ────────────────────────────────────────────────────

function serializeUserContent(content: string | (TextContent | ImageContent)[]): string {
	if (typeof content === "string") return content;
	return content
		.map((block) => {
			if (block.type === "text") return block.text;
			if (block.type === "image") return `[image: ${block.mimeType}, ${block.data.length} bytes]`;
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function serializeAssistantContent(content: (TextContent | ThinkingContent | ToolCall)[]): string {
	return content
		.map((block) => {
			if (block.type === "text") return block.text;
			if (block.type === "thinking") return `<thinking>${block.thinking}</thinking>`;
			if (block.type === "toolCall") {
				return [
					`<tool_use>`,
					`<id>${block.id}</id>`,
					`<name>${block.name}</name>`,
					`<arguments>${JSON.stringify(block.arguments)}</arguments>`,
					`</tool_use>`,
				].join("\n");
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function serializeToolResult(msg: ToolResultMessage): string {
	const text = msg.content
		.map((block) => {
			if (block.type === "text") return block.text;
			return `[image: ${(block as ImageContent).mimeType}]`;
		})
		.join("\n");

	return [
		`<tool_result>`,
		`<tool_use_id>${msg.toolCallId}</tool_use_id>`,
		msg.isError ? `<is_error>true</is_error>` : "",
		`<content>${text}</content>`,
		`</tool_result>`,
	].filter(Boolean).join("\n");
}

function serializeMessage(msg: Message): string {
	switch (msg.role) {
		case "user":
			return `[H] ${serializeUserContent(msg.content)}`;
		case "assistant":
			return `[A] ${serializeAssistantContent(msg.content)}`;
		case "toolResult":
			return `[tool_result] ${serializeToolResult(msg)}`;
	}
}

// ── Main serializer ──────────────────────────────────────────────────────────

export function serializeContext(context: Context): SerializedContext {
	// IMPORTANT: We do NOT replace Claude Code's system prompt.
	// Replacing it via --system-prompt triggers Anthropic's detection
	// and blocks the request. Instead, we inject pi's instructions
	// and tool definitions as a preamble in the user message.

	const preamble: string[] = [];

	if (context.systemPrompt) {
		preamble.push("<system_instructions>", context.systemPrompt, "</system_instructions>", "");
	}

	if (context.tools && context.tools.length > 0) {
		preamble.push(serializeTools(context.tools), "");
	}

	// Serialize conversation history
	const messages = context.messages;
	if (messages.length === 0) {
		const text = preamble.length > 0 ? preamble.join("\n") : "";
		return { systemPrompt: "", conversationPrompt: text };
	}

	// If the conversation is just a single user message, prepend preamble
	if (messages.length === 1 && messages[0].role === "user") {
		const userContent = serializeUserContent(messages[0].content);
		const prompt = preamble.length > 0
			? [...preamble, userContent].join("\n")
			: userContent;
		return { systemPrompt: "", conversationPrompt: prompt };
	}

	// Multi-turn: serialize all messages with preamble
	const serialized = messages.map(serializeMessage);
	const conversation = [
		...preamble,
		"<conversation_history>",
		...serialized,
		"</conversation_history>",
		"",
		"Continue the conversation. Respond as the assistant.",
	].join("\n");

	return { systemPrompt: "", conversationPrompt: conversation };
}
