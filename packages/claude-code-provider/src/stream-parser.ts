/**
 * Parses Claude Code CLI `--output-format stream-json --include-partial-messages`
 * NDJSON output and pushes events into a pi-ai AssistantMessageEventStream.
 *
 * With --include-partial-messages, Claude Code emits `stream_event` wrappers
 * around the raw Anthropic SSE events (message_start, content_block_start,
 * content_block_delta, content_block_stop, message_delta, message_stop).
 * This is effectively the same protocol that streamAnthropic parses — we just
 * unwrap the envelope.
 */

import type { Readable } from "node:stream";
import readline from "node:readline";

// ── Types ────────────────────────────────────────────────────────────────────

interface Usage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	totalTokens: number;
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
}

interface TextBlock { type: "text"; text: string; index?: number }
interface ThinkingBlock { type: "thinking"; thinking: string; thinkingSignature?: string; redacted?: boolean; index?: number }
interface ToolCallBlock { type: "toolCall"; id: string; name: string; arguments: Record<string, any>; partialJson?: string; index?: number }
type ContentBlock = TextBlock | ThinkingBlock | ToolCallBlock;

interface StreamOutput {
	role: "assistant";
	content: ContentBlock[];
	api: string;
	provider: string;
	model: string;
	usage: Usage;
	stopReason: string;
	timestamp: number;
	responseId?: string;
	errorMessage?: string;
}

export interface EventStreamLike {
	push(event: any): void;
	end(result?: any): void;
}

// ── Utilities ────────────────────────────────────────────────────────────────

const ZERO_USAGE: Usage = {
	input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function makeOutput(modelId: string, provider: string, api: string): StreamOutput {
	return {
		role: "assistant",
		content: [],
		api,
		provider,
		model: modelId,
		usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

function updateUsageTotals(usage: Usage): void {
	usage.totalTokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}

/**
 * Extract <tool_use> XML blocks from text content and convert them to
 * proper ToolCall blocks. This handles the case where `--tools ""` forces
 * Claude to emit tool calls as text rather than native tool_use blocks.
 *
 * Returns { cleanText, toolCalls } where cleanText has the XML stripped.
 */
export function extractToolUsesFromText(text: string): {
	cleanText: string;
	toolCalls: ToolCallBlock[];
} {
	const toolCalls: ToolCallBlock[] = [];
	const regex = /<tool_use>\s*<tool_name>(.*?)<\/tool_name>\s*<tool_id>(.*?)<\/tool_id>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_use>/g;

	let match;
	while ((match = regex.exec(text)) !== null) {
		const name = match[1].trim();
		const id = match[2].trim();
		let args: Record<string, any> = {};
		try {
			args = JSON.parse(match[3].trim());
		} catch {
			args = { _raw: match[3].trim() };
		}
		toolCalls.push({ type: "toolCall", id, name, arguments: args });
	}

	const cleanText = text.replace(regex, "").trim();
	return { cleanText, toolCalls };
}

/**
 * Parse partial JSON from streaming tool call arguments.
 * Returns {} if parsing fails (arguments still streaming).
 */
function parseStreamingJson(json: string): Record<string, any> {
	if (!json) return {};
	try {
		return JSON.parse(json);
	} catch {
		// Try closing open braces/brackets
		let attempt = json;
		const opens = (attempt.match(/\{/g) || []).length;
		const closes = (attempt.match(/\}/g) || []).length;
		for (let i = closes; i < opens; i++) attempt += "}";
		try {
			return JSON.parse(attempt);
		} catch {
			return {};
		}
	}
}

// ── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse Claude Code stream-json NDJSON from a readable stream and push
 * events into an AssistantMessageEventStream.
 */
export async function parseClaudeStream(
	stdout: Readable,
	stream: EventStreamLike,
	modelId: string,
	provider: string,
	api: string,
): Promise<void> {
	const output = makeOutput(modelId, provider, api);
	let started = false;
	let ended = false;

	const emitStart = () => {
		if (!started) {
			started = true;
			stream.push({ type: "start", partial: output });
		}
	};

	const rl = readline.createInterface({ input: stdout, crlfDelay: Infinity });

	for await (const line of rl) {
		if (!line.trim() || ended) continue;

		let data: any;
		try {
			data = JSON.parse(line);
		} catch {
			continue;
		}

		// ── stream_event — raw Anthropic SSE events ──────────────────────
		if (data.type === "stream_event") {
			const event = data.event;
			if (!event) continue;

			emitStart();

			if (event.type === "message_start") {
				if (event.message?.id) output.responseId = event.message.id;
				if (event.message?.model) output.model = event.message.model;
				const u = event.message?.usage;
				if (u) {
					output.usage.input = u.input_tokens ?? 0;
					output.usage.output = u.output_tokens ?? 0;
					output.usage.cacheRead = u.cache_read_input_tokens ?? 0;
					output.usage.cacheWrite = u.cache_creation_input_tokens ?? 0;
					updateUsageTotals(output.usage);
				}
			}
			else if (event.type === "content_block_start") {
				const cb = event.content_block;
				if (cb?.type === "text") {
					const block: TextBlock = { type: "text", text: "", index: event.index };
					output.content.push(block);
					stream.push({ type: "text_start", contentIndex: output.content.length - 1, partial: output });
				}
				else if (cb?.type === "thinking") {
					const block: ThinkingBlock = { type: "thinking", thinking: "", thinkingSignature: "", index: event.index };
					output.content.push(block);
					stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
				}
				else if (cb?.type === "redacted_thinking") {
					const block: ThinkingBlock = {
						type: "thinking",
						thinking: "[Reasoning redacted]",
						thinkingSignature: cb.data,
						redacted: true,
						index: event.index,
					};
					output.content.push(block);
					stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
				}
				else if (cb?.type === "tool_use") {
					const block: ToolCallBlock = {
						type: "toolCall",
						id: cb.id,
						name: cb.name,
						arguments: cb.input ?? {},
						partialJson: "",
						index: event.index,
					};
					output.content.push(block);
					stream.push({ type: "toolcall_start", contentIndex: output.content.length - 1, partial: output });
				}
			}
			else if (event.type === "content_block_delta") {
				const idx = output.content.findIndex((b: any) => b.index === event.index);
				if (idx === -1) continue;
				const block = output.content[idx];

				if (event.delta?.type === "text_delta" && block.type === "text") {
					(block as TextBlock).text += event.delta.text;
					stream.push({ type: "text_delta", contentIndex: idx, delta: event.delta.text, partial: output });
				}
				else if (event.delta?.type === "thinking_delta" && block.type === "thinking") {
					(block as ThinkingBlock).thinking += event.delta.thinking;
					stream.push({ type: "thinking_delta", contentIndex: idx, delta: event.delta.thinking, partial: output });
				}
				else if (event.delta?.type === "input_json_delta" && block.type === "toolCall") {
					const tc = block as ToolCallBlock;
					tc.partialJson = (tc.partialJson || "") + event.delta.partial_json;
					tc.arguments = parseStreamingJson(tc.partialJson);
					stream.push({ type: "toolcall_delta", contentIndex: idx, delta: event.delta.partial_json, partial: output });
				}
				else if (event.delta?.type === "signature_delta" && block.type === "thinking") {
					const tb = block as ThinkingBlock;
					tb.thinkingSignature = (tb.thinkingSignature || "") + event.delta.signature;
				}
			}
			else if (event.type === "content_block_stop") {
				const idx = output.content.findIndex((b: any) => b.index === event.index);
				if (idx === -1) continue;
				const block = output.content[idx];

				// Clean up index field
				delete (block as any).index;

				if (block.type === "text") {
					stream.push({ type: "text_end", contentIndex: idx, content: (block as TextBlock).text, partial: output });
				}
				else if (block.type === "thinking") {
					stream.push({ type: "thinking_end", contentIndex: idx, content: (block as ThinkingBlock).thinking, partial: output });
				}
				else if (block.type === "toolCall") {
					const tc = block as ToolCallBlock;
					tc.arguments = parseStreamingJson(tc.partialJson || "");
					delete tc.partialJson;
					stream.push({ type: "toolcall_end", contentIndex: idx, toolCall: tc, partial: output });
				}
			}
			else if (event.type === "message_delta") {
				if (event.delta?.stop_reason) {
					const reason = event.delta.stop_reason;
					if (reason === "end_turn") output.stopReason = "stop";
					else if (reason === "tool_use") output.stopReason = "toolUse";
					else if (reason === "max_tokens") output.stopReason = "length";
					else output.stopReason = reason;
				}
				const u = event.usage;
				if (u) {
					if (u.input_tokens != null) output.usage.input = u.input_tokens;
					if (u.output_tokens != null) output.usage.output = u.output_tokens;
					if (u.cache_read_input_tokens != null) output.usage.cacheRead = u.cache_read_input_tokens;
					if (u.cache_creation_input_tokens != null) output.usage.cacheWrite = u.cache_creation_input_tokens;
					updateUsageTotals(output.usage);
				}
			}
			// message_stop handled by the result event below
			continue;
		}

		// ── result — session complete ────────────────────────────────────
		if (data.type === "result") {
			emitStart();
			ended = true;

			// Final usage from result event
			const u = data.usage;
			if (u) {
				output.usage.input = u.input_tokens ?? output.usage.input;
				output.usage.output = u.output_tokens ?? output.usage.output;
				output.usage.cacheRead = u.cache_read_input_tokens ?? output.usage.cacheRead;
				output.usage.cacheWrite = u.cache_creation_input_tokens ?? output.usage.cacheWrite;
				updateUsageTotals(output.usage);
			}

			// Clean up any remaining index fields
			for (const block of output.content) delete (block as any).index;

			if (data.is_error || data.subtype === "error") {
				output.stopReason = "error";
				output.errorMessage = data.result || "Unknown error from Claude Code";
				stream.push({ type: "error", reason: "error", error: output });
			} else {
				// If we got no content from streaming, use the result text
				if (output.content.length === 0 && data.result) {
					output.content.push({ type: "text", text: data.result });
					stream.push({ type: "text_start", contentIndex: 0, partial: output });
					stream.push({ type: "text_delta", contentIndex: 0, delta: data.result, partial: output });
					stream.push({ type: "text_end", contentIndex: 0, content: data.result, partial: output });
				}

				// Post-process: extract <tool_use> XML from text blocks.
				// When --tools "" is used, Claude emits tool calls as text.
				const textBlocks = output.content.filter((b) => b.type === "text") as TextBlock[];
				for (const textBlock of textBlocks) {
					const { cleanText, toolCalls } = extractToolUsesFromText(textBlock.text);
					if (toolCalls.length > 0) {
						textBlock.text = cleanText;
						for (const tc of toolCalls) {
							output.content.push(tc);
							const idx = output.content.length - 1;
							stream.push({ type: "toolcall_start", contentIndex: idx, partial: output });
							stream.push({ type: "toolcall_end", contentIndex: idx, toolCall: tc, partial: output });
						}
					}
				}

				const hasToolCalls = output.content.some((b) => b.type === "toolCall");
				output.stopReason = hasToolCalls ? "toolUse" : "stop";
				stream.push({ type: "done", reason: output.stopReason as any, message: output });
			}
			stream.end();
			return;
		}

		// Skip system, assistant (duplicate of stream_events), rate_limit_event, etc.
	}

	// Stream ended without result (process killed/crashed)
	if (!ended) {
		emitStart();
		for (const block of output.content) delete (block as any).index;
		output.stopReason = "error";
		output.errorMessage = "Claude Code process ended without a result";
		stream.push({ type: "error", reason: "error", error: output });
		stream.end();
	}
}
