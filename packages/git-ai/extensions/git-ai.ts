/**
 * git-ai Extension for pi
 *
 * Tracks AI-authored code via git-ai's agent-v1 protocol.
 * Uses mesh nickname as agent name.
 * On every edit tool call, sends PreToolUse/PostToolUse checkpoints
 * to git-ai so lines are attributed to the correct agent, model, and session.
 *
 * Also provides a `git-ai` tool for blame/stats/search from within pi.
 *
 * Requires: git-ai installed (https://usegitai.com)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile, spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
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
	meshNickname: string | null;
} {
	if (!existsSync(sessionFile)) {
		return { transcript: [], model: null };
	}

	const lines = readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);
	const transcript: TranscriptMessage[] = [];
	let model: string | null = null;
	let meshNickname: string | null = null;

	for (const line of lines) {
		let obj: Record<string, unknown>;
		try {
			obj = JSON.parse(line);
		} catch {
			continue;
		}

		const type = obj.type as string;

		// Extract mesh identity
		if (type === "custom" && obj.customType === "mesh_identity") {
			const data = obj.data as Record<string, unknown> | undefined;
			if (data && typeof data.nickname === "string") {
				meshNickname = data.nickname;
			}
			continue;
		}

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

	return { transcript, model, meshNickname };
}

// ── Build agent-v1 JSON payload ──

function buildAgentV1Payload(params: {
	eventName: "PreToolUse" | "PostToolUse";
	repoDir: string;
	sessionId: string;
	sessionName: string | null;
	toolName: string;
	toolInput: Record<string, unknown>;
	model: string | null;
	sessionFile: string | null;
	filePaths: string[];
}): string {
	const { eventName, repoDir, sessionId, sessionName, toolName, toolInput, model, sessionFile, filePaths } = params;

	if (eventName === "PreToolUse") {
		return JSON.stringify({
			type: "human",
			repo_working_dir: repoDir,
			will_edit_filepaths: filePaths.length > 0 ? filePaths : undefined,
		});
	}

	// PostToolUse — build full transcript
	const { transcript, model: transcriptModel, meshNickname } = parseSessionTranscript(sessionFile ?? "");
	const effectiveModel = model ?? transcriptModel ?? "unknown";
	// Prefer mesh-assigned nickname (e.g. "Alycia Europa Pandya"), fall back to
	// the user-set session name, then a generic "pi" marker.
	const agentName = meshNickname ?? sessionName ?? "pi";

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
		agent_name: agentName,
		model: effectiveModel,
		conversation_id: sessionId,
		repo_working_dir: repoDir,
		edited_filepaths: filePaths.length > 0 ? filePaths : undefined,
		transcript: { messages },
	});
}

// ── Agent identity helpers ──

/** Slugify a mesh nickname into a stable email local-part. */
function slugifyNickname(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "pi-agent";
}

/** Parse a session file for the current mesh nickname. */
function readMeshNicknameFromSession(sessionFile: string | null): string | null {
	if (!sessionFile || !existsSync(sessionFile)) return null;
	try {
		const lines = readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);
		// Scan newest first — most recent mesh_identity wins if renicknamed mid-session.
		for (let i = lines.length - 1; i >= 0; i--) {
			try {
				const obj = JSON.parse(lines[i]);
				if (obj.type === "custom" && obj.customType === "mesh_identity") {
					const data = obj.data as Record<string, unknown> | undefined;
					if (data && typeof data.nickname === "string") return data.nickname;
				}
			} catch { /* skip malformed line */ }
		}
	} catch { /* ignore */ }
	return null;
}

/** Parse a session file for the most recent model_change. */
function readModelFromSession(sessionFile: string | null): string | null {
	if (!sessionFile || !existsSync(sessionFile)) return null;
	try {
		const lines = readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);
		for (let i = lines.length - 1; i >= 0; i--) {
			try {
				const obj = JSON.parse(lines[i]);
				if (obj.type === "model_change") {
					const provider = obj.provider as string | undefined;
					const modelId = obj.modelId as string | undefined;
					if (provider && modelId) return `${provider}/${modelId}`;
				}
			} catch { /* skip */ }
		}
	} catch { /* ignore */ }
	return null;
}

// ── Checkpoint runner ──

async function runCheckpoint(gitAiBin: string, payload: string): Promise<void> {
	return new Promise<void>((resolve) => {
		const child = spawn(gitAiBin, ["checkpoint", "agent-v1", "--hook-input", "stdin"], {
			stdio: ["pipe", "pipe", "pipe"],
			windowsHide: true,
		});

		child.on("close", () => { resolve(); });
		child.on("error", () => { resolve(); });

		// Ensure stdin is flushed before closing
		child.stdin.on("error", () => { /* ignore write-after-close if process exits fast */ });
		child.stdin.write(payload, () => { child.stdin.end(); });

		setTimeout(() => { child.kill(); resolve(); }, 5000);
	});
}

// ── Extension ──

export default function (pi: ExtensionAPI) {
	const gitAiBin = resolveGitAiBin();
	let gitAiAvailable = false;

	// ── Commit hook env vars ──
	// Point core.hooksPath at our bundled hook dispatcher via GIT_CONFIG_*
	// env override, and publish agent identity for prepare-commit-msg to read.
	// The bundled hooks dispatch repo-local .git/hooks first, so existing
	// lefthook/husky/custom hook enforcement is preserved. Only affects git
	// processes spawned under pi's env — user terminal commits are untouched.
	const hooksDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "hooks");
	let sessionManagerRef: any = null;

	function refreshCommitEnv(): void {
		if (!sessionManagerRef) return;
		const sessionFile = sessionManagerRef.getSessionFile?.() ?? null;
		const sessionId = sessionManagerRef.getSessionId?.() ?? "";
		const sessionName = sessionManagerRef.getSessionName?.() ?? "";
		const meshNickname = readMeshNicknameFromSession(sessionFile);
		const agentName = meshNickname ?? sessionName ?? "pi";
		const agentEmail = `${slugifyNickname(agentName)}@pi-agent.local`;
		const model = readModelFromSession(sessionFile) ?? "";

		// core.hooksPath via GIT_CONFIG_* env override
		process.env.GIT_CONFIG_COUNT = "1";
		process.env.GIT_CONFIG_KEY_0 = "core.hooksPath";
		process.env.GIT_CONFIG_VALUE_0 = hooksDir;

		process.env.PI_AGENT_NAME = agentName;
		process.env.PI_AGENT_EMAIL = agentEmail;
		if (model) process.env.PI_AGENT_MODEL = model;
		if (sessionId) process.env.PI_SESSION_ID = sessionId;
		if (sessionName) process.env.PI_SESSION_NAME = sessionName;
	}

	pi.on("session_start", async (_event, ctx) => {
		try {
			await execFileAsync(gitAiBin, ["--version"], { timeout: 2000, windowsHide: true });
			gitAiAvailable = true;
		} catch {
			gitAiAvailable = false;
		}

		// Capture sessionManager for later refreshes + prime commit env.
		sessionManagerRef = (ctx as any)?.sessionManager ?? null;
		refreshCommitEnv();

		// Clean up model/session env if we were previously set for a different
		// session — refreshCommitEnv writes the fresh set but doesn't clear stale keys.
		// (session-start is fired for /new, /resume, /fork — so always re-prime.)

		// Register sandbox-callable function for code-mode (ESM import to share module instance)
		try {
			const { registerSandboxFn } = await import("../../shared/src/sandbox-registry");
			registerSandboxFn("gitAi", async (params: { command: string; args?: string[] }) => {
				const validCommands = ["blame", "stats", "search"];
				if (!validCommands.includes(params.command)) {
					return "Unknown command: " + params.command + ". Valid: " + validCommands.join(", ");
				}
				const { execFile } = await import("node:child_process");
				const { promisify } = await import("node:util");
				const execFileAsync = promisify(execFile);
				try {
					const result = await execFileAsync(gitAiBin, [params.command, ...(params.args || [])], {
						timeout: 15000,
						windowsHide: true,
					});
					return result.stdout || result.stderr || "(no output)";
				} catch (e: any) {
					return "Error: " + (e.message || String(e));
				}
			});
		} catch (err) {
			console.warn("[git-ai] Failed to register sandbox function:", err);
		}
	});

	// ── Shared checkpoint emitter ──
	// Used by both the direct pi tool_* event handlers (non-code-mode edits) and
	// the edit-hooks registry (code-mode sandbox edits). One path for both.
	async function emitCheckpoint(params: {
		phase: "PreToolUse" | "PostToolUse";
		toolName: string;
		toolInput: Record<string, unknown>;
		filePaths: string[];
		toolCwd: string;
		sessionManager: any;
	}): Promise<void> {
		if (!gitAiAvailable) return;
		const repoDir = await findGitRepo(params.toolCwd);
		if (!repoDir) return;

		const sessionFile = params.sessionManager?.getSessionFile?.() ?? null;
		const sessionId = params.sessionManager?.getSessionId?.() ?? "unknown";
		const sessionName = params.sessionManager?.getSessionName?.() ?? null;

		const payload = buildAgentV1Payload({
			eventName: params.phase,
			repoDir,
			sessionId,
			sessionName,
			toolName: params.toolName,
			toolInput: params.toolInput,
			model: null, // parsed from session JSONL transcript
			sessionFile,
			filePaths: params.filePaths,
		});

		await runCheckpoint(gitAiBin, payload);
	}

	// ── Refresh commit env on every turn (picks up /model changes, mesh rename) ──
	pi.on("turn_start", async (_event, ctx) => {
		sessionManagerRef = (ctx as any)?.sessionManager ?? sessionManagerRef;
		refreshCommitEnv();
	});

	// ── PreToolUse: mark state before AI edit (direct tool calls) ──
	pi.on("tool_call", async (event, ctx) => {
		if (!EDIT_TOOLS.has(event.toolName)) return;
		const input = event.input as Record<string, unknown>;
		const filePaths = extractFilePaths(event.toolName, input);
		const toolCwd = (input.cwd ?? input.workdir ?? ctx.cwd) as string;
		await emitCheckpoint({
			phase: "PreToolUse",
			toolName: event.toolName,
			toolInput: input,
			filePaths,
			toolCwd,
			sessionManager: ctx.sessionManager,
		});
	});

	// ── PostToolUse: mark AI-authored edits (direct tool calls) ──
	pi.on("tool_result", async (event, ctx) => {
		if (!EDIT_TOOLS.has(event.toolName)) return;
		const input = event.input as Record<string, unknown>;
		const filePaths = extractFilePaths(event.toolName, input);
		const toolCwd = (input.cwd ?? input.workdir ?? ctx.cwd) as string;
		await emitCheckpoint({
			phase: "PostToolUse",
			toolName: event.toolName,
			toolInput: input,
			filePaths,
			toolCwd,
			sessionManager: ctx.sessionManager,
		});
	});

	// ── Sandbox edit hook: catches code-mode Write/Edit/hashEdit/applyPatch ──
	// Code-mode runs under a single execute_code tool_call and performs
	// fs.writeFileSync directly inside the sandbox, which never emits
	// pi tool_call / tool_result events. The edit-hooks registry is how
	// code-mode surfaces those edits to extensions like this one.
	(async () => {
		try {
			const { registerEditHook } = await import("../../shared/src/edit-hooks");
			registerEditHook(async (e) => {
				if (e.filePaths.length === 0) return;
				await emitCheckpoint({
					phase: e.phase === "pre" ? "PreToolUse" : "PostToolUse",
					toolName: e.toolName,
					toolInput: { paths: e.filePaths },
					filePaths: e.filePaths,
					toolCwd: e.cwd,
					sessionManager: e.sessionManager,
				});
			});
		} catch (err) {
			console.warn("[git-ai] Failed to register edit hook:", err);
		}
	})();

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

	// Sandbox registration moved to session_start (async ESM import for shared module instance)
}
