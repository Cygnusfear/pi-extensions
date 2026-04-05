/**
 * git-ai Extension for pi
 *
 * Tracks AI-authored code via git-ai's agent-v1 protocol.
 * On every edit tool call, sends PreToolUse/PostToolUse checkpoints
 * to git-ai so lines are attributed to the correct agent, model, and session.
 *
 * Also provides a `git-ai` tool for blame/stats/search from within pi.
 *
 * Requires: git-ai installed (https://usegitai.com)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ── git-ai binary resolution ──

function resolveGitAiBin(): string {
	const candidates = [
		process.env.GIT_AI_BIN,
		join(homedir(), ".local", "bin", "git-ai"),
		join(homedir(), ".git-ai", "bin", "git-ai"),
	];
	for (const c of candidates) {
		if (c && existsSync(c)) return c;
	}
	return "git-ai";
}

// ── File path extraction from tool inputs ──

const APPLY_PATCH_PREFIXES = [
	"*** Update File: ",
	"*** Add File: ",
	"*** Delete File: ",
	"*** Move to: ",
];

function extractFilePaths(toolName: string, input: Record<string, unknown>): string[] {
	const paths = new Set<string>();

	for (const key of ["path", "filePath", "file_path"]) {
		const v = input[key];
		if (typeof v === "string" && v.trim()) paths.add(v.trim());
	}

	for (const key of ["paths", "filePaths", "file_paths"]) {
		const v = input[key];
		if (Array.isArray(v)) {
			for (const item of v) {
				if (typeof item === "string" && item.trim()) paths.add(item.trim());
			}
		}
	}

	if (toolName === "apply_patch") {
		const patchText = input.patchText ?? input.text ?? "";
		if (typeof patchText === "string") {
			for (const line of patchText.split("\n")) {
				const trimmed = line.trim();
				for (const prefix of APPLY_PATCH_PREFIXES) {
					if (trimmed.startsWith(prefix)) {
						const p = trimmed.slice(prefix.length).trim().replace(/^['"]|['"]$/g, "");
						if (p) paths.add(p);
					}
				}
			}
		}
	}

	return [...paths];
}

// ── Git repo detection ──

async function findGitRepo(cwd: string): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
			cwd,
			timeout: 2000,
		});
		return stdout.trim() || null;
	} catch {
		return null;
	}
}

// ── Edit tool detection ──

const EDIT_TOOLS = new Set(["edit", "write", "apply_patch", "hash_edit"]);

// ── Transcript builder ──
// Parses pi's session JSONL into git-ai's AiTranscript format

interface TranscriptMessage {
	type: "user" | "assistant" | "thinking" | "tool_use";
	text: string;
	timestamp?: string;
	toolName?: string;
	toolInput?: Record<string, unknown>;
}

function parseSessionTranscript(sessionFile: string): {
	transcript: TranscriptMessage[];
	model: string | null;
} {
	if (!existsSync(sessionFile)) {
		return { transcript: [], model: null };
	}

	const lines = readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);
	const transcript: TranscriptMessage[] = [];
	let model: string | null = null;

	for (const line of lines) {
		let obj: Record<string, unknown>;
		try {
			obj = JSON.parse(line);
		} catch {
			continue;
		}

		const type = obj.type as string;

		if (type === "model_change") {
			const provider = obj.provider as string | undefined;
			const modelId = obj.modelId as string | undefined;
			if (provider && modelId) model = `${provider}/${modelId}`;
			continue;
		}

		if (type !== "message") continue;
		const msg = obj.message as Record<string, unknown> | undefined;
		if (!msg) continue;

		const role = msg.role as string;
		const timestamp = obj.timestamp as string | undefined;
		const content = msg.content;

		if (role === "user" && typeof content === "string") {
			if (content.trim()) transcript.push({ type: "user", text: content.trim(), timestamp });
			continue;
		}

		if (role === "user" && Array.isArray(content)) {
			const text = content
				.filter((b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string")
				.map((b: Record<string, unknown>) => (b.text as string).trim())
				.filter(Boolean)
				.join("\n");
			if (text) transcript.push({ type: "user", text, timestamp });
			continue;
		}

		if (role === "assistant" && Array.isArray(content)) {
			if (!model) {
				const provider = msg.provider as string | undefined;
				const msgModel = msg.model as string | undefined;
				if (provider && msgModel) model = `${provider}/${msgModel}`;
			}

			for (const block of content) {
				if (!block || typeof block !== "object") continue;
				const b = block as Record<string, unknown>;
				const bType = b.type as string;

				if (bType === "text" && typeof b.text === "string" && b.text.trim()) {
					transcript.push({ type: "assistant", text: b.text.trim(), timestamp });
				} else if (bType === "thinking" && typeof b.thinking === "string" && b.thinking.trim()) {
					transcript.push({ type: "thinking", text: b.thinking.trim(), timestamp });
				} else if (bType === "toolCall") {
					const name = (b.name as string) ?? "unknown";
					const args = (b.arguments as Record<string, unknown>) ?? {};
					const summary: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(args)) {
						summary[k] = typeof v === "string" && v.length > 300
							? v.slice(0, 300) + "..."
							: v;
					}
					transcript.push({ type: "tool_use", text: name, timestamp, toolName: name, toolInput: summary });
				}
			}
		}
	}

	return { transcript, model };
}

// ── Build agent-v1 JSON payload ──

function buildAgentV1Payload(params: {
	eventName: "PreToolUse" | "PostToolUse";
	repoDir: string;
	sessionId: string;
	toolName: string;
	toolInput: Record<string, unknown>;
	model: string | null;
	sessionFile: string | null;
	filePaths: string[];
}): string {
	const { eventName, repoDir, sessionId, toolName, toolInput, model, sessionFile, filePaths } = params;

	if (eventName === "PreToolUse") {
		return JSON.stringify({
			type: "human",
			repo_working_dir: repoDir,
			will_edit_filepaths: filePaths.length > 0 ? filePaths : undefined,
		});
	}

	// PostToolUse — build full transcript
	const { transcript, model: transcriptModel } = parseSessionTranscript(sessionFile ?? "");
	const effectiveModel = model ?? transcriptModel ?? "unknown";

	const messages = transcript.map((m) => {
		const ts = m.timestamp ?? undefined;
		switch (m.type) {
			case "user":
				return { type: "user", text: m.text, ...(ts ? { timestamp: ts } : {}) };
			case "assistant":
				return { type: "assistant", text: m.text, ...(ts ? { timestamp: ts } : {}) };
			case "thinking":
				return { type: "thinking", text: m.text, ...(ts ? { timestamp: ts } : {}) };
			case "tool_use":
				return { type: "tool_use", name: m.toolName ?? "unknown", input: m.toolInput ?? {}, ...(ts ? { timestamp: ts } : {}) };
		}
	});

	return JSON.stringify({
		type: "ai_agent",
		agent_name: "pi",
		model: effectiveModel,
		conversation_id: sessionId,
		repo_working_dir: repoDir,
		edited_filepaths: filePaths.length > 0 ? filePaths : undefined,
		transcript: { messages },
	});
}

// ── Checkpoint runner ──

async function runCheckpoint(gitAiBin: string, payload: string): Promise<void> {
	try {
		await execFileAsync(gitAiBin, ["checkpoint", "agent-v1", "--hook-input", "stdin"], {
			input: payload,
			timeout: 5000,
			windowsHide: true,
		});
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error(`[git-ai] checkpoint failed: ${msg}`);
	}
}

// ── Extension ──

export default function (pi: ExtensionAPI) {
	const gitAiBin = resolveGitAiBin();
	let gitAiAvailable = false;

	pi.on("session_start", async () => {
		try {
			await execFileAsync(gitAiBin, ["--version"], { timeout: 2000, windowsHide: true });
			gitAiAvailable = true;
		} catch {
			gitAiAvailable = false;
		}
	});

	// ── PreToolUse: mark state before AI edit ──
	pi.on("tool_call", async (event, ctx) => {
		if (!gitAiAvailable) return;
		if (!EDIT_TOOLS.has(event.toolName)) return;

		const input = event.input as Record<string, unknown>;
		const filePaths = extractFilePaths(event.toolName, input);
		const toolCwd = (input.cwd ?? input.workdir ?? ctx.cwd) as string;
		const repoDir = await findGitRepo(toolCwd);
		if (!repoDir) return;

		const sessionFile = ctx.sessionManager.getSessionFile() ?? null;
		const sessionId = ctx.sessionManager.getSessionId();

		const payload = buildAgentV1Payload({
			eventName: "PreToolUse",
			repoDir,
			sessionId,
			toolName: event.toolName,
			toolInput: input,
			model: null,
			sessionFile,
			filePaths,
		});

		runCheckpoint(gitAiBin, payload).catch(() => {});
	});

	// ── PostToolUse: mark AI-authored edits ──
	pi.on("tool_result", async (event, ctx) => {
		if (!gitAiAvailable) return;
		if (!EDIT_TOOLS.has(event.toolName)) return;

		const input = event.input as Record<string, unknown>;
		const filePaths = extractFilePaths(event.toolName, input);
		const toolCwd = (input.cwd ?? input.workdir ?? ctx.cwd) as string;
		const repoDir = await findGitRepo(toolCwd);
		if (!repoDir) return;

		const sessionFile = ctx.sessionManager.getSessionFile() ?? null;
		const sessionId = ctx.sessionManager.getSessionId();

		const payload = buildAgentV1Payload({
			eventName: "PostToolUse",
			repoDir,
			sessionId,
			toolName: event.toolName,
			toolInput: input,
			model: null, // model is extracted from session JSONL transcript
			sessionFile,
			filePaths,
		});

		runCheckpoint(gitAiBin, payload).catch(() => {});
	});

	// ── git-ai custom tool ──
	pi.registerTool({
		name: "git-ai",
		label: "Git AI",
		description:
			"Run git-ai commands: blame (AI attribution per line), stats (AI composition), search (find prompts).",
		parameters: Type.Object({
			command: Type.String({
				description: 'git-ai subcommand: "blame", "stats", or "search"',
			}),
			args: Type.Array(Type.String(), {
				description: "Arguments to pass to git-ai (e.g. file path, --json, --lines 10-20)",
				default: [],
			}),
		}),
		async execute(_toolCallId, params, signal) {
			const { command, args } = params;
			const validCommands = ["blame", "stats", "search"];

			if (!validCommands.includes(command)) {
				return {
					content: [{ type: "text" as const, text: `Unknown command "${command}". Valid: ${validCommands.join(", ")}` }],
					details: {},
				};
			}

			try {
				const result = await execFileAsync(gitAiBin, [command, ...args], {
					timeout: 15000,
					signal,
					windowsHide: true,
					maxBuffer: 1024 * 1024,
				});
				return {
					content: [{ type: "text" as const, text: result.stdout }],
					details: { exitCode: result.exitCode, stderr: result.stderr },
				};
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text" as const, text: `git-ai ${command} failed: ${msg}` }],
					details: {},
					isError: true,
				};
			}
		},
	});
}
