/**
 * Claude Code Bridge Provider — v2
 *
 * Routes pi's model requests through a persistent interactive Claude Code
 * session using bidirectional NDJSON (stream-json mode).
 *
 * v2 architecture: multi-turn message streaming with compaction support.
 *
 *   Turn 1: pi sends full context as first message → Claude Code accumulates
 *   Turn N: pi sends only the NEW user message → Claude Code's context grows naturally
 *   Compaction: pi's message count drops → we kill the session and restart
 *              with the compacted summary as the first message of a new session
 *
 * This means:
 *   - Claude Code's native context window is used efficiently
 *   - Pi's compaction actually reduces tokens (session restart)
 *   - Multi-turn flows naturally without re-serializing everything
 *   - Pi's context management tools (squash, setContextSize) work
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createAssistantMessageEventStream } from "@mariozechner/pi-ai";
import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_NAME = "claude-code";
const API_TYPE = "claude-code-bridge";
const DUMMY_BASE_URL = "http://localhost:0";
const DUMMY_API_KEY = "claude-code-bridge-no-key-needed";

// ── Model definitions ────────────────────────────────────────────────────────

const MODELS = [
	{
		id: "cc-opus-4-6",
		cliModel: "claude-opus-4-6",
		name: "Claude Opus 4.6 (Claude Code)",
		reasoning: true,
		input: ["text", "image"] as ("text" | "image")[],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
	},
	{
		id: "cc-sonnet-4-6",
		cliModel: "claude-sonnet-4-6",
		name: "Claude Sonnet 4.6 (Claude Code)",
		reasoning: true,
		input: ["text", "image"] as ("text" | "image")[],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
	},
	{
		id: "cc-haiku-4-5",
		cliModel: "claude-haiku-4-5",
		name: "Claude Haiku 4.5 (Claude Code)",
		reasoning: false,
		input: ["text", "image"] as ("text" | "image")[],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 16384,
	},
];

const MODEL_CLI_MAP: Record<string, string> = {};
for (const m of MODELS) MODEL_CLI_MAP[m.id] = m.cliModel;

// ── Persistent Claude Session ────────────────────────────────────────────────

interface ClaudeSession {
	process: ChildProcess;
	rl: readline.Interface;
	sessionId: string | null;
	ready: boolean;
	lineBuffer: string[];
	lineWaiters: Array<(line: string) => void>;
	/** Number of messages pi had sent when this session was last used.
	 *  Used to detect compaction (message count drops). */
	lastMessageCount: number;
	/** Number of user messages we've sent to this claude session. */
	turnCount: number;
}

const sessions = new Map<string, ClaudeSession>();

function killSession(cliModel: string): void {
	const session = sessions.get(cliModel);
	if (session) {
		try { session.process.kill("SIGTERM"); } catch {}
		try { session.rl.close(); } catch {}
		sessions.delete(cliModel);
	}
}

function spawnSession(cliModel: string): ClaudeSession {
	// Kill any existing session for this model
	killSession(cliModel);

	// All Claude Code built-in tools — disallowed so the model only
	// sees pi's tools (described in the user message preamble).
	const DISALLOWED_TOOLS = [
		"Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent",
		"WebSearch", "WebFetch", "NotebookEdit", "Task", "AskUserQuestion",
		"TodoWrite", "Skill", "ToolSearch", "CronCreate", "CronDelete",
		"CronList", "EnterPlanMode", "EnterWorktree", "ExitPlanMode",
		"ExitWorktree", "RemoteTrigger", "TaskOutput", "TaskStop",
		"TaskCreate", "TaskGet", "TaskList", "TaskUpdate",
	].join(" ");

	const args: string[] = [
		"--input-format", "stream-json",
		"--output-format", "stream-json",
		"--verbose",
		"--model", cliModel,
		"--include-partial-messages",
		"--permission-mode", "acceptEdits",
		"--no-session-persistence",
		"--disallowedTools", DISALLOWED_TOOLS,
	];

	// Clean env — inherited CLAUDECODE vars don't affect rate limiting
	// but we clean them for hygiene.
	const cleanEnv = { ...process.env };
	delete cleanEnv.CLAUDECODE;
	delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;
	delete cleanEnv.CLAUDE_CODE_EXECPATH;
	delete cleanEnv.CLAUDE_CODE_SIMPLE;

	const escapedArgs = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
	const child = spawn("sh", ["-c", `exec claude ${escapedArgs}`], {
		stdio: ["pipe", "pipe", "pipe"],
		env: cleanEnv,
	});

	const session: ClaudeSession = {
		process: child,
		rl: readline.createInterface({ input: child.stdout!, crlfDelay: Infinity }),
		sessionId: null,
		ready: false,
		lineBuffer: [],
		lineWaiters: [],
		lastMessageCount: 0,
		turnCount: 0,
	};

	session.rl.on("line", (line) => {
		if (!line.trim()) return;
		const waiter = session.lineWaiters.shift();
		if (waiter) waiter(line);
		else session.lineBuffer.push(line);
	});

	child.stderr?.on("data", () => {});
	child.on("exit", () => sessions.delete(cliModel));

	sessions.set(cliModel, session);
	return session;
}

function getSession(cliModel: string): ClaudeSession | null {
	const session = sessions.get(cliModel);
	if (session && session.process.exitCode === null) return session;
	return null;
}

function nextLine(session: ClaudeSession): Promise<string> {
	const buffered = session.lineBuffer.shift();
	if (buffered) return Promise.resolve(buffered);
	return new Promise<string>((resolve) => {
		session.lineWaiters.push(resolve);
	});
}

function sendMessage(session: ClaudeSession, content: string): void {
	const msg = JSON.stringify({
		type: "user",
		message: { role: "user", content },
		session_id: session.sessionId,
	});
	session.process.stdin!.write(msg + "\n");
	session.turnCount++;
}

// ── Context extraction helpers ───────────────────────────────────────────────

/** Extract the last user message text from pi's context. */
function getLastUserMessage(context: any): string | null {
	const messages = context.messages;
	if (!messages || messages.length === 0) return null;

	// Walk backwards to find the last user message
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role === "user") {
			if (typeof msg.content === "string") return msg.content;
			if (Array.isArray(msg.content)) {
				return msg.content
					.filter((b: any) => b.type === "text")
					.map((b: any) => b.text)
					.join("\n");
			}
		}
	}
	return null;
}

/** Serialize the full context for a fresh session's first message. */
function serializeFullContext(context: any): string {
	const parts: string[] = [];

	// Pi's system prompt as instructions (not as --system-prompt flag)
	if (context.systemPrompt) {
		parts.push("<system_instructions>", context.systemPrompt, "</system_instructions>", "");
	}

	// Tool definitions
	if (context.tools && context.tools.length > 0) {
		parts.push("## Available Tools", "");
		parts.push("To use a tool, emit a tool_use XML block in this exact format:");
		parts.push("```");
		parts.push("<tool_use>");
		parts.push("<tool_name>name_here</tool_name>");
		parts.push("<tool_id>toolu_XX</tool_id>");
		parts.push("<parameters>");
		parts.push('{"param": "value"}');
		parts.push("</parameters>");
		parts.push("</tool_use>");
		parts.push("```");
		parts.push("Generate a unique tool_id (toolu_01, toolu_02, etc). After emitting a tool_use, STOP and wait for the result.", "");

		for (const tool of context.tools) {
			parts.push(`### ${tool.name}`);
			if (tool.description) {
				const desc = tool.description.length > 300 ? tool.description.slice(0, 300) + "..." : tool.description;
				parts.push(desc);
			}
			if (tool.parameters?.properties) {
				parts.push("Parameters:");
				for (const [key, schema] of Object.entries(tool.parameters.properties) as [string, any][]) {
					const type = schema.type || "any";
					const desc = schema.description ? ` — ${schema.description}` : "";
					parts.push(`  - ${key}: ${type}${desc}`);
				}
			}
			parts.push("");
		}
	}

	// Conversation history
	const messages = context.messages || [];
	if (messages.length > 0) {
		parts.push("<conversation_history>");
		for (const msg of messages) {
			if (msg.role === "user") {
				const text = typeof msg.content === "string"
					? msg.content
					: (msg.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
				parts.push(`[H] ${text}`);
			} else if (msg.role === "assistant") {
				const text = (msg.content || []).map((b: any) => {
					if (b.type === "text") return b.text;
					if (b.type === "toolCall") return `<tool_use name="${b.name}">${JSON.stringify(b.arguments)}</tool_use>`;
					return "";
				}).filter(Boolean).join("\n");
				parts.push(`[A] ${text}`);
			} else if (msg.role === "toolResult") {
				const text = (msg.content || []).map((b: any) => b.type === "text" ? b.text : "").filter(Boolean).join("\n");
				parts.push(`[tool_result id=${msg.toolCallId}] ${text}`);
			}
		}
		parts.push("</conversation_history>", "", "Continue the conversation. Respond as the assistant.");
	}

	return parts.join("\n");
}

// ── Stream event parsing ─────────────────────────────────────────────────────

interface Usage {
	input: number; output: number; cacheRead: number; cacheWrite: number;
	totalTokens: number;
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
}

const ZERO_USAGE: Usage = {
	input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function parseStreamingJson(json: string): Record<string, any> {
	if (!json) return {};
	try { return JSON.parse(json); } catch {}
	let attempt = json;
	const opens = (attempt.match(/\{/g) || []).length;
	const closes = (attempt.match(/\}/g) || []).length;
	for (let i = closes; i < opens; i++) attempt += "}";
	try { return JSON.parse(attempt); } catch { return {}; }
}

// ── streamSimple ─────────────────────────────────────────────────────────────

function claudeCodeStream(model: any, context: any, options?: any) {
	const stream = createAssistantMessageEventStream();

	(async () => {
		try {
			const piModelId = model.id || "cc-sonnet-4-6";
			const cliModel = MODEL_CLI_MAP[piModelId] || "claude-sonnet-4-6";
			const currentMessageCount = (context.messages || []).length;

			// ── Session lifecycle ────────────────────────────────────────
			let session = getSession(cliModel);
			let needsFullContext = false;

			if (!session) {
				// No session — spawn fresh, send full context
				session = spawnSession(cliModel);
				needsFullContext = true;
			} else if (currentMessageCount < session.lastMessageCount) {
				// Message count dropped — compaction happened.
				// Kill session and restart with compacted context.
				session = spawnSession(cliModel);
				needsFullContext = true;
			}
			// else: existing session, send only the delta (last user message)

			session.lastMessageCount = currentMessageCount;

			// ── Send message ─────────────────────────────────────────────
			let messageToSend: string;

			if (needsFullContext || session.turnCount === 0) {
				// First turn on this session: serialize everything
				messageToSend = serializeFullContext(context);
			} else {
				// Subsequent turn: send just the last user message.
				// Claude Code already has the prior context in its window.
				const lastMsg = getLastUserMessage(context);
				messageToSend = lastMsg || "Continue.";
			}

			sendMessage(session, messageToSend);

			// Wait for init on fresh sessions
			if (!session.ready) {
				while (true) {
					const line = await nextLine(session);
					let data: any;
					try { data = JSON.parse(line); } catch { continue; }
					if (data.type === "system" && data.subtype === "init") {
						session.sessionId = data.session_id;
						session.ready = true;
						break;
					}
				}
			}

			// ── Build output and stream events ───────────────────────────
			const output: any = {
				role: "assistant",
				content: [],
				api: API_TYPE,
				provider: PROVIDER_NAME,
				model: piModelId,
				usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
				stopReason: "stop",
				timestamp: Date.now(),
			};

			let started = false;
			const emitStart = () => {
				if (!started) { started = true; stream.push({ type: "start", partial: output }); }
			};

			let aborted = false;
			if (options?.signal) {
				options.signal.addEventListener("abort", () => { aborted = true; }, { once: true });
			}

			// ── Read response events ─────────────────────────────────────
			while (!aborted) {
				const line = await nextLine(session);
				let data: any;
				try { data = JSON.parse(line); } catch { continue; }

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
							output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
						}
					}
					else if (event.type === "content_block_start") {
						const cb = event.content_block;
						if (cb?.type === "text") {
							output.content.push({ type: "text", text: "", _idx: event.index });
							stream.push({ type: "text_start", contentIndex: output.content.length - 1, partial: output });
						}
						else if (cb?.type === "thinking") {
							output.content.push({ type: "thinking", thinking: "", thinkingSignature: "", _idx: event.index });
							stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
						}
						else if (cb?.type === "redacted_thinking") {
							output.content.push({ type: "thinking", thinking: "[Reasoning redacted]", thinkingSignature: cb.data, redacted: true, _idx: event.index });
							stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
						}
						else if (cb?.type === "tool_use") {
							output.content.push({ type: "toolCall", id: cb.id, name: cb.name, arguments: cb.input ?? {}, _partialJson: "", _idx: event.index });
							stream.push({ type: "toolcall_start", contentIndex: output.content.length - 1, partial: output });
						}
					}
					else if (event.type === "content_block_delta") {
						const idx = output.content.findIndex((b: any) => b._idx === event.index);
						if (idx === -1) continue;
						const block = output.content[idx];

						if (event.delta?.type === "text_delta" && block.type === "text") {
							block.text += event.delta.text;
							stream.push({ type: "text_delta", contentIndex: idx, delta: event.delta.text, partial: output });
						}
						else if (event.delta?.type === "thinking_delta" && block.type === "thinking") {
							block.thinking += event.delta.thinking;
							stream.push({ type: "thinking_delta", contentIndex: idx, delta: event.delta.thinking, partial: output });
						}
						else if (event.delta?.type === "input_json_delta" && block.type === "toolCall") {
							block._partialJson = (block._partialJson || "") + event.delta.partial_json;
							block.arguments = parseStreamingJson(block._partialJson);
							stream.push({ type: "toolcall_delta", contentIndex: idx, delta: event.delta.partial_json, partial: output });
						}
						else if (event.delta?.type === "signature_delta" && block.type === "thinking") {
							block.thinkingSignature = (block.thinkingSignature || "") + event.delta.signature;
						}
					}
					else if (event.type === "content_block_stop") {
						const idx = output.content.findIndex((b: any) => b._idx === event.index);
						if (idx === -1) continue;
						const block = output.content[idx];
						delete block._idx;

						if (block.type === "text") {
							stream.push({ type: "text_end", contentIndex: idx, content: block.text, partial: output });
						}
						else if (block.type === "thinking") {
							stream.push({ type: "thinking_end", contentIndex: idx, content: block.thinking, partial: output });
						}
						else if (block.type === "toolCall") {
							block.arguments = parseStreamingJson(block._partialJson || "");
							delete block._partialJson;
							stream.push({ type: "toolcall_end", contentIndex: idx, toolCall: block, partial: output });
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
							output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
						}
					}
					continue;
				}

				// ── result — turn complete ─────────────────────────────
				if (data.type === "result") {
					emitStart();

					const u = data.usage;
					if (u) {
						output.usage.input = u.input_tokens ?? output.usage.input;
						output.usage.output = u.output_tokens ?? output.usage.output;
						output.usage.cacheRead = u.cache_read_input_tokens ?? output.usage.cacheRead;
						output.usage.cacheWrite = u.cache_creation_input_tokens ?? output.usage.cacheWrite;
						output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
					}

					for (const block of output.content) {
						delete block._idx;
						delete block._partialJson;
					}

					if (data.is_error || data.subtype === "error") {
						output.stopReason = "error";
						output.errorMessage = data.result || "Unknown error from Claude Code";
						stream.push({ type: "error", reason: "error", error: output });
					} else {
						if (output.content.length === 0 && data.result) {
							output.content.push({ type: "text", text: data.result });
							stream.push({ type: "text_start", contentIndex: 0, partial: output });
							stream.push({ type: "text_delta", contentIndex: 0, delta: data.result, partial: output });
							stream.push({ type: "text_end", contentIndex: 0, content: data.result, partial: output });
						}

						// Extract XML-based tool calls from text blocks.
						// With --disallowedTools blocking Claude Code's tools, the model
						// emits pi's tool calls as <tool_use> XML in its text response.
						for (const block of output.content) {
							if (block.type !== "text") continue;
							const { cleanText, toolCalls } = extractToolUsesFromText(block.text);
							if (toolCalls.length > 0) {
								block.text = cleanText;
								for (const tc of toolCalls) {
									output.content.push(tc);
									const tcIdx = output.content.length - 1;
									stream.push({ type: "toolcall_start", contentIndex: tcIdx, partial: output });
									stream.push({ type: "toolcall_end", contentIndex: tcIdx, toolCall: tc, partial: output });
								}
							}
						}

						const hasToolCalls = output.content.some((b: any) => b.type === "toolCall");
						output.stopReason = hasToolCalls ? "toolUse" : "stop";
						stream.push({ type: "done", reason: output.stopReason, message: output });
					}
					stream.end();
					return;
				}
			}

			// Aborted
			if (aborted) {
				output.stopReason = "aborted";
				output.errorMessage = "Request was aborted";
				stream.push({ type: "error", reason: "aborted", error: output });
				stream.end();
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			try {
				stream.push({
					type: "error",
					reason: "error",
					error: {
						role: "assistant", content: [],
						api: API_TYPE, provider: PROVIDER_NAME, model: model.id || "unknown",
						usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
						stopReason: "error", errorMessage: errMsg, timestamp: Date.now(),
					},
				});
				stream.end();
			} catch {}
		}
	})();

	return stream;
}

// ── Tool use extraction from text ────────────────────────────────────────────

function extractToolUsesFromText(text: string): {
	cleanText: string;
	toolCalls: Array<{ type: "toolCall"; id: string; name: string; arguments: Record<string, any> }>;
} {
	const toolCalls: Array<{ type: "toolCall"; id: string; name: string; arguments: Record<string, any> }> = [];
	const regex = /<tool_use>\s*<tool_name>(.*?)<\/tool_name>\s*<tool_id>(.*?)<\/tool_id>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_use>/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		let args: Record<string, any> = {};
		try { args = JSON.parse(match[3].trim()); } catch { args = { _raw: match[3].trim() }; }
		toolCalls.push({ type: "toolCall", id: match[2].trim(), name: match[1].trim(), arguments: args });
	}
	return { cleanText: text.replace(regex, "").trim(), toolCalls };
}

// ── Extension entry point ────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerProvider(PROVIDER_NAME, {
		baseUrl: DUMMY_BASE_URL,
		apiKey: DUMMY_API_KEY,
		api: API_TYPE,
		streamSimple: claudeCodeStream,
		models: MODELS,
	});

	// /cc-opus, /cc-sonnet, /cc-haiku
	for (const model of MODELS) {
		const shortName = model.id.replace(/-\d+-\d+$/, "");
		pi.registerCommand(shortName, {
			description: `Switch to ${model.name}`,
			handler: async (_args, ctx) => {
				const ok = await pi.setModel({
					id: model.id, name: model.name, api: API_TYPE,
					provider: PROVIDER_NAME, baseUrl: DUMMY_BASE_URL,
					reasoning: model.reasoning, input: model.input, cost: model.cost,
					contextWindow: model.contextWindow, maxTokens: model.maxTokens,
				} as any);
				if (ok) ctx.ui.notify(`Switched to ${model.name}`, "info");
				else ctx.ui.notify(`Failed to switch to ${model.name}`, "error");
			},
		});
	}

	// Restart sessions on compaction so the compacted context is used
	pi.on("session_compact", () => {
		for (const [cliModel] of sessions) {
			killSession(cliModel);
		}
	});

	// Clean up on shutdown
	pi.on("session_shutdown", () => {
		for (const [, session] of sessions) {
			try { session.process.kill("SIGTERM"); } catch {}
		}
		sessions.clear();
	});
}
