/**
 * Code-mode session factory + per-call execution runner.
 *
 * Extracted from `packages/code-mode/extensions/code-mode.ts` so other extensions
 * (e.g. RLM) can spawn sub-sessions, build a custom binding map, and run a code
 * block with full or partial access to the same execution machinery the host
 * `execute_code` tool uses.
 *
 * Public surface — see pe-tk4s for the contract:
 *   - createCodeModeSession(opts?)              → CodeModeSession
 *   - executeInSession(session, code, deps)     → ExecutionResult
 *   - CodeModeSession                           interface
 *   - CreateSessionOptions                      interface
 *   - ExecutionDeps                             interface (pe-tk4s v3 + v4)
 *   - ExecutionResult                           interface
 */

import vm from "node:vm";
import * as acorn from "acorn";
import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import { createPersistentStore } from "./persistent-store";
import { createToolBindings } from "./sandbox-tools";
import { buildOutput } from "./tool-reference";
import { loadRunbook } from "../../runbooks/src/runbook-engine";
import {
	getSandboxFnsForCall,
	type SandboxCallContext,
} from "../../shared/src/sandbox-registry";

// ───────────────────────────────────────────────────────────────────────────────
// Session shape
// ───────────────────────────────────────────────────────────────────────────────

export interface CodeModeSession {
	context: vm.Context;
	store: ReturnType<typeof createPersistentStore>;
	logs: string[];
	images: Array<{ data: string; mimeType: string }>;
	setEscaped(v: boolean): void;
	getEscaped(): boolean;
	/** Returns logs joined with '\n' and empties the array atomically. */
	drainLogs(): string;
}

export interface CreateSessionOptions {
	/** When set, persistent store reads/writes `<cwd>/.pi/code-mode-store.json`. Omit for in-memory only (RLM sub-context use). */
	cwd?: string;
	/** Default false. */
	initialEscaped?: boolean;
}

function formatArg(arg: unknown): string {
	if (typeof arg === "string") return arg;
	if (arg === undefined) return "undefined";
	if (arg === null) return "null";
	try {
		return JSON.stringify(arg, null, 2);
	} catch {
		return String(arg);
	}
}

/**
 * Build a fresh code-mode session. Each session has its own `$` store, vm.Context,
 * captured logs/images, and an independent `escaped` flag.
 */
export function createCodeModeSession(opts?: CreateSessionOptions): CodeModeSession {
	let escaped = opts?.initialEscaped === true;
	const store = createPersistentStore({ getEscaped: () => escaped, cwd: opts?.cwd });
	const logs: string[] = [];
	const images: Array<{ data: string; mimeType: string }> = [];

	const sandbox = {
		$: store.proxy,

		// Console capture — logs array is cleared per execution (by executeInSession),
		// but the reference stays so the captured callbacks keep writing to the same buffer.
		console: {
			log: (...args: unknown[]) => logs.push(args.map(formatArg).join(" ")),
			error: (...args: unknown[]) => logs.push("[stderr] " + args.map(formatArg).join(" ")),
			warn: (...args: unknown[]) => logs.push("[warn] " + args.map(formatArg).join(" ")),
			info: (...args: unknown[]) => logs.push(args.map(formatArg).join(" ")),
		},

		// Timers (needed for sleep and async patterns)
		setTimeout: globalThis.setTimeout.bind(globalThis),
		clearTimeout: globalThis.clearTimeout.bind(globalThis),

		// Process — env, platform, pid are static; cwd is updated per-execution by executeInSession.
		process: {
			env: globalThis.process.env,
			cwd: () => globalThis.process.cwd(),
			platform: globalThis.process.platform,
			pid: globalThis.process.pid,
		},
	};

	const context = vm.createContext(sandbox);

	return {
		context,
		store,
		logs,
		images,
		setEscaped(v: boolean) {
			escaped = v === true;
		},
		getEscaped() {
			return escaped;
		},
		drainLogs(): string {
			return logs.splice(0).join("\n");
		},
	};
}

// ───────────────────────────────────────────────────────────────────────────────
// Execution dependencies
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Per-call execution dependencies. Mirrors the toolCtx fields that
 * `code-mode.ts` currently destructures at lines 254-269, plus behavioral gates,
 * the v3 `allowedTools`/`extraBindings` whitelist API, and the v4
 * `injectRunbookRun` gate.
 */
export interface ExecutionDeps {
	// ── Required host fields ────────────────────────────────────────────────────
	signal: AbortSignal;
	cwd: string;
	model: { provider: string; id: string };
	modelRegistry: ModelRegistry;

	// ── Optional host fields (mirroring current toolCtx exactly) ────────────────
	sessionManager?: any;
	getContextUsage?: () => any;
	confirmFn?: (title: string, body: string) => Promise<boolean>;
	compact?: (options?: any) => void;
	setLabel?: (entryId: string, label: string | undefined) => void;
	navigateTree?: (targetId: string, options?: any) => Promise<any>;
	abort?: () => void;
	sendMessage?: (
		message: { customType: string; content: string; display?: boolean },
		options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
	) => void;
	sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void;

	// ── Behavioral gates ────────────────────────────────────────────────────────
	/** Default true. Gates the $-store → bare-global hydration block. */
	hydrateBareGlobals?: boolean;
	/** Default true. Gates the session/context-helpers injection. */
	injectSessionApi?: boolean;
	/** Default true. Gates the console.wake injection. */
	injectConsoleWake?: boolean;
	/** Default true. Gates the runbookRun injection (pe-tk4s v4). */
	injectRunbookRun?: boolean;
	/**
	 * Default 'recover'. 'recover' = catch errors and return them in the result.
	 * 'rethrow' = no try/catch; errors escape `executeInSession` (RLM uses this so
	 * `RlmReturnSignal` propagates).
	 */
	errorMode?: "recover" | "rethrow";
	/** Default 120000ms (2min). Overall execution timeout for the vm.runInContext. */
	executionTimeoutMs?: number;
	/**
	 * Default true. When false, the context guard never wraps fns, regardless
	 * of `getContextUsage()` percent. Mirrors code-mode.ts `/context-guard off`.
	 */
	contextGuardEnabled?: boolean;

	// ── Whitelist API (RLM-specific) ────────────────────────────────────────────
	/**
	 * High-level whitelist: build normal bindings, then restrict them to keys in
	 * this Set BEFORE injection. `extraBindings` is merged AFTER filtering.
	 */
	allowedTools?: Set<string>;
	/** Additional bindings merged after `allowedTools` filtering. */
	extraBindings?: Record<string, unknown>;
	/**
	 * Low-level escape hatch. When true, executeInSession does NOT call
	 * `createToolBindings` or `getSandboxFnsForCall`. Caller fills `bindings`.
	 */
	skipToolInjection?: boolean;
	/**
	 * When `skipToolInjection: true`, this map is the entire binding set merged
	 * into the session context before vm execution.
	 */
	bindings?: Record<string, unknown>;

	// ── Extension-side deferral hooks ───────────────────────────────────────────
	// The session-helpers block (when injectSessionApi=true) needs to communicate
	// back to extension lifecycle handlers (turn_end / agent_end). The host
	// extension owns the deferral state; these callbacks bridge from the sandbox.
	/** Schedule a session.squash() — extension records pending and runs compact() at agent_end. */
	requestSquash?: (options: { continue?: string }) => void;
	/** Schedule a contextCheckout() — extension records pending and navigates at agent_end. */
	requestCheckout?: (info: { targetId: string; enrichedMessage: string; backupTag?: string }) => void;
	/** Apply a contextSize cap for outgoing messages. `null` resets to 'send everything'. */
	setContextSize?: (n: number | null) => void;
}

export interface ExecutionResult {
	output: string;
	error?: string;
	duration: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// AST helpers — auto-persist top-level declarations
// ───────────────────────────────────────────────────────────────────────────────

function collectBindingNames(pattern: any, out: string[]): void {
	if (!pattern) return;
	switch (pattern.type) {
		case "Identifier":
			out.push(pattern.name);
			break;
		case "ObjectPattern":
			for (const prop of pattern.properties) {
				if (prop.type === "RestElement") {
					collectBindingNames(prop.argument, out);
				} else {
					collectBindingNames(prop.value, out);
				}
			}
			break;
		case "ArrayPattern":
			for (const elem of pattern.elements) {
				if (elem === null) continue;
				if (elem.type === "RestElement") collectBindingNames(elem.argument, out);
				else collectBindingNames(elem, out);
			}
			break;
		case "AssignmentPattern":
			collectBindingNames(pattern.left, out);
			break;
		case "RestElement":
			collectBindingNames(pattern.argument, out);
			break;
	}
}

function extractAutoPersistNames(code: string): string[] {
	try {
		const ast = acorn.parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
			locations: false,
			ranges: false,
		}) as any;

		const names: string[] = [];
		for (const node of ast.body) {
			if (node.type === "VariableDeclaration") {
				for (const decl of node.declarations) collectBindingNames(decl.id, names);
			} else if (node.type === "FunctionDeclaration" && node.id) {
				names.push(node.id.name);
			}
		}
		return [...new Set(names)];
	} catch {
		return [];
	}
}

// ───────────────────────────────────────────────────────────────────────────────
// Console.wake injection
// ───────────────────────────────────────────────────────────────────────────────

function injectConsoleWake(session: CodeModeSession, deps: ExecutionDeps): void {
	if (!deps.sendMessage && !deps.sendUserMessage) return;
	const sendMsg = deps.sendMessage;
	const sendUser = deps.sendUserMessage;
	(session.context as any).console.wake = (...args: unknown[]) => {
		const message = args.map(formatArg).join(" ");
		try {
			if (sendMsg) {
				sendMsg(
					{ customType: "console-wake", content: "[CONSOLE.WAKE] " + message, display: true },
					{ deliverAs: "followUp", triggerTurn: true },
				);
			} else if (sendUser) {
				sendUser(message, { deliverAs: "followUp" });
			}
		} catch (err) {
			session.logs.push(
				"[warn] [console.wake] send failed: " +
					(err instanceof Error ? err.message : String(err)),
			);
			session.logs.push("[warn] [console.wake] wake content: " + message.slice(0, 400));
		}
	};
}


// ───────────────────────────────────────────────────────────────────────────────
// Context guard — wraps tool fns so they throw when context is critically full
// ───────────────────────────────────────────────────────────────────────────────

const CONTEXT_GUARD_THRESHOLD = 0.94;

/** Tools allowed through the context guard (context management + safe reads). */
const CONTEXT_GUARD_ALLOWED = new Set(["Read", "read", "sleep", "man"]);

function isContextGuardActive(
	enabled: boolean,
	getUsage?: (() => any) | undefined,
): boolean {
	if (!enabled) return false;
	if (!getUsage) return false;
	try {
		const usage = getUsage();
		if (!usage || usage.percent === null) return false;
		return usage.percent >= CONTEXT_GUARD_THRESHOLD * 100;
	} catch {
		return false;
	}
}

function wrapWithContextGuard(
	bindings: Record<string, unknown>,
	getUsage: (() => any) | undefined,
	enabled: boolean,
): Record<string, unknown> {
	if (!getUsage) return bindings;

	const wrapped: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(bindings)) {
		if (CONTEXT_GUARD_ALLOWED.has(key)) {
			wrapped[key] = value;
		} else if (typeof value === "function") {
			wrapped[key] = (...args: unknown[]) => {
				if (isContextGuardActive(enabled, getUsage)) {
					const pct = (() => {
						try {
							return getUsage().percent.toFixed(1);
						} catch {
							return "?";
						}
					})();
					throw new Error(
						"\ud83d\udeab Context guard active (" +
							pct +
							"% used, threshold " +
							(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0) +
							"%). " +
							"Most tools blocked — only context management allowed.\n\n" +
							"BEFORE squashing, save thick context to $ (survives compaction):\n" +
							"$.ctx = `TASK — mid-stream\nDone: ...\nGotcha: ...\nNext: ...`;\n\n" +
							"Then squash with continuation:\n" +
							'session.squash({ continue: "Squash done. Continue with [next step]." });\n\n' +
							"Toggle guard: /context-guard off",
					);
				}
				return (value as Function)(...args);
			};
		} else {
			wrapped[key] = value;
		}
	}
	return wrapped;
}

// ───────────────────────────────────────────────────────────────────────────────
// Session/context helpers — `session` global + contextTag/Log/Checkout
// ───────────────────────────────────────────────────────────────────────────────

function injectSessionHelpers(session: CodeModeSession, deps: ExecutionDeps): void {
	const sm = deps.sessionManager;
	if (!sm) return;
	const getUsage = deps.getContextUsage;

	Object.assign(session.context, {
		session: {
			messages: () => {
				const branch = sm.getBranch();
				return branch
					.filter((e: any) => e.type === "message")
					.map((e: any) => {
						const m = e.message;
						const content =
							typeof m.content === "string"
								? m.content
								: Array.isArray(m.content)
									? m.content
											.filter((p: any) => p.type === "text")
											.map((p: any) => p.text)
											.join("\n")
									: "";
						return { id: e.id, role: m.role, content, timestamp: e.timestamp };
					});
			},
			tokens: () => {
				if (!getUsage) return null;
				const usage = getUsage();
				return usage ?? null;
			},
			tags: () => {
				const entries = sm.getEntries();
				return entries
					.filter((e: any) => e.type === "label" && e.label)
					.map((e: any) => ({
						id: e.id,
						targetId: e.targetId,
						label: e.label,
						timestamp: e.timestamp,
					}));
			},
			tag: (name: string) => {
				if (!name || !name.trim()) return "Tag name cannot be empty";
				const leafId = sm.getLeafId();
				if (!leafId) return "No current position to tag";
				sm.appendLabelChange(leafId, name.trim());
				return "Tagged: " + name.trim();
			},
			id: () => sm.getSessionId(),
			name: () => sm.getSessionName() ?? null,
			save: (key: string, data: unknown) => {
				if (!key || !key.trim()) return "Key cannot be empty";
				if (key.length > 128) return "Key too long (max 128 chars)";
				let json: string;
				try {
					json = JSON.stringify(data);
				} catch {
					return "Cannot save: data is not JSON-serializable";
				}
				if (json === undefined)
					return "Cannot save: data is not JSON-serializable (function/symbol)";
				if (json.length > 512 * 1024) return "Cannot save: data exceeds 512KB limit";
				sm.appendCustomEntry("code-mode:" + key.trim(), data);
				return "Saved: " + key.trim();
			},
			setContextSize: (n?: number) => {
				if (n === undefined || n === null) {
					deps.setContextSize?.(null);
					return "Context size reset (sending all messages)";
				}
				if (typeof n !== "number" || !isFinite(n)) {
					return "Invalid context size: must be a finite number";
				}
				const size = Math.max(4, Math.abs(Math.round(n)));
				deps.setContextSize?.(size);
				return "Context limited to last " + size + " messages";
			},
			preCompact: () => {
				const log = (msg: string) => session.logs.push(msg);
				const branch = sm.getBranch();
				const outline: string[] = [];
				let msgCount = 0;
				for (const entry of branch) {
					if (entry.type !== "message") continue;
					const msg = (entry as any).message;
					if (!msg) continue;
					msgCount++;
					const idTag = entry.id ? entry.id + " · " : "";
					if (typeof msg.content === "string") {
						outline.push("[" + idTag + msg.role + "] " + msg.content.slice(0, 200));
					} else if (Array.isArray(msg.content)) {
						const text = msg.content
							.filter((p: any) => p.type === "text")
							.map((p: any) => p.text)
							.join(" ")
							.trim();
						const tools = msg.content
							.filter((p: any) => p.type === "toolCall")
							.map((p: any) => p.name);
						if (text || tools.length) {
							outline.push(
								"[" +
									idTag +
									msg.role +
									"] " +
									(text.slice(0, 150) || "") +
									(tools.length ? " (tools: " + tools.join(", ") + ")" : ""),
							);
						}
					}
				}
				session.store.proxy.preCompact = {
					messageCount: msgCount,
					outline: outline.join("\n"),
				};
				log(
					"preCompact: stashed outline of " +
						msgCount +
						" messages into $.preCompact. Review it, pin important messages by ID with session.pin([...]), then call session.squash().",
				);
			},
			pin: (ids: string[]) => {
				const log = (msg: string) => session.logs.push(msg);
				if (!Array.isArray(ids) || ids.length === 0) {
					log(
						"session.pin(): pass an array of message IDs (get them from $.preCompact.outline or session.messages())",
					);
					return "No IDs provided";
				}
				const want = new Set(ids.filter((x) => typeof x === "string" && x.length > 0));
				if (want.size === 0) {
					log("session.pin(): no valid string IDs in input");
					return "No valid IDs";
				}
				const branch = sm.getBranch();
				const byId = new Map<string, any>();
				for (const e of branch) {
					if (e.type === "message" && e.id && want.has(e.id)) byId.set(e.id, e);
				}
				const missing = [...want].filter((id) => !byId.has(id));
				const proxy = session.store.proxy;
				const existing = Array.isArray(proxy.pinned) ? (proxy.pinned as any[]) : [];
				const seenIds = new Set(existing.map((m: any) => m?.id).filter(Boolean));
				let added = 0;
				let chars = 0;
				for (const id of ids) {
					if (!byId.has(id)) continue;
					if (seenIds.has(id)) continue;
					const entry = byId.get(id);
					const msg = entry.message;
					const content =
						typeof msg.content === "string"
							? msg.content
							: Array.isArray(msg.content)
								? msg.content
										.filter((p: any) => p.type === "text")
										.map((p: any) => p.text)
										.join("\n")
								: "";
					existing.push({ id: entry.id, role: msg.role, content, timestamp: entry.timestamp });
					seenIds.add(id);
					added++;
					chars += content.length;
				}
				proxy.pinned = existing;
				const parts = [
					"session.pin(): pinned " +
						added +
						" message(s) into $.pinned (total: " +
						existing.length +
						", " +
						chars +
						" new chars)",
				];
				if (missing.length > 0) parts.push("skipped unknown IDs: " + missing.join(", "));
				const msg = parts.join("; ");
				log(msg);
				return msg;
			},
			squash: (options?: { continue?: string }) => {
				const log = (msg: string) => session.logs.push(msg);
				if (!deps.compact) {
					log("session.squash(): compaction not available in this context");
					return;
				}
				deps.requestSquash?.({ continue: options?.continue });
				log("session.squash(): compaction scheduled for after this turn completes");
			},
			load: (key: string) => {
				const entries = sm.getEntries();
				const prefix = "code-mode:" + key;
				let latest: any = null;
				for (const e of entries) {
					if (e.type === "custom" && e.customType === prefix) latest = e.data;
				}
				return latest;
			},
			entries: () => {
				return sm.getBranch().map((e: any) => ({
					id: e.id,
					type: e.type,
					timestamp: e.timestamp,
					...(e.type === "message" ? { role: e.message?.role } : {}),
					...(e.type === "label" ? { label: e.label } : {}),
					...(e.type === "compaction" || e.type === "branch_summary"
						? { summary: e.summary }
						: {}),
					...(e.type === "custom" ? { customType: e.customType, data: e.data } : {}),
				}));
			},
		},
	});

	// Context-management functions (vendored from pi-context, always available
	// when sessionManager is present).
	Object.assign(session.context, {
		contextTag: (args: { name: string; target?: string }) => {
			if (!args?.name || !args.name.trim()) return "Error: tag name required";
			const tagName = args.name.trim();

			const resolveTargetId = (target: string): string => {
				if (target.toLowerCase() === "root") {
					const t = sm.getTree();
					return t.length > 0 ? t[0].entry.id : target;
				}
				if (/^[0-9a-f]{8,}$/i.test(target)) return target;
				const stack: any[] = [...sm.getTree()];
				while (stack.length > 0) {
					const n = stack.pop()!;
					if (sm.getLabel(n.entry.id) === target) return n.entry.id;
					if (n.children?.length) stack.push(...n.children);
				}
				return target;
			};

			const findTagInTree = (nodes: any[], name: string): string | null => {
				for (const n of nodes) {
					if (sm.getLabel(n.entry.id) === name) return n.entry.id;
					const r = findTagInTree(n.children || [], name);
					if (r) return r;
				}
				return null;
			};

			const existing = findTagInTree(sm.getTree(), tagName);
			if (existing) return "Error: Tag '" + tagName + "' already exists at " + existing;

			let id: string = args.target ? resolveTargetId(args.target) : "";
			if (!id) {
				const branch = sm.getBranch();
				for (let i = branch.length - 1; i >= 0; i--) {
					const entry = branch[i];
					if (entry.type === "message" && entry.message.role === "toolResult") continue;
					id = entry.id;
					break;
				}
				if (!id) id = sm.getLeafId() ?? "";
			}

			if (deps.setLabel) deps.setLabel(id, tagName);
			else sm.appendLabelChange(id, tagName);
			return "Tagged '" + tagName + "' at " + id;
		},

		contextLog: (args?: { limit?: number; verbose?: boolean }) => {
			const branch = sm.getBranch();
			const leafId = sm.getLeafId();
			const verbose = args?.verbose ?? false;
			const limit = args?.limit ?? 50;

			const getContent = (entry: any): string => {
				if (entry.type === "branch_summary" || entry.type === "compaction")
					return (entry.summary || "[No summary]").slice(0, 120);
				if (entry.type === "label") return "tag: " + entry.label;
				if (entry.type === "message") {
					const msg = entry.message;
					if (msg.role === "toolResult") {
						const text = (msg.content || [])
							.filter((p: any) => p.type === "text")
							.map((p: any) => p.text)
							.join(" ")
							.trim();
						return "(" + msg.toolName + ") " + (text.length > 80 ? text.slice(0, 80) + "..." : text);
					}
					if (msg.role === "bashExecution") return "[Bash] " + msg.command;
					if (msg.role === "user")
						return (typeof msg.content === "string"
							? msg.content
							: Array.isArray(msg.content)
								? msg.content
										.filter((p: any) => p.type === "text")
										.map((p: any) => p.text)
										.join(" ")
										.trim()
								: ""
						).slice(0, 120);
					if (msg.role === "assistant") {
						let text =
							typeof msg.content === "string"
								? msg.content
								: Array.isArray(msg.content)
									? msg.content
											.filter((p: any) => p.type === "text")
											.map((p: any) => p.text)
											.join(" ")
											.trim()
									: "";
						const tcs = (msg.content || [])
							.filter((c: any) => c.type === "toolCall")
							.map((tc: any) => tc.name);
						if (tcs.length) text = (text ? text + " | " : "") + "tools: " + tcs.join(", ");
						return text.slice(0, 120);
					}
				}
				return "";
			};

			const isInteresting = (entry: any): boolean => {
				if (entry.id === leafId) return true;
				if (branch[0] && entry.id === branch[0].id) return true;
				if (sm.getLabel(entry.id)) return true;
				if (entry.type === "label") return false;
				if (entry.type === "branch_summary" || entry.type === "compaction") return true;
				if (sm.getChildren(entry.id).length > 1) return true;
				if (entry.type === "message" && entry.message.role === "user") return true;
				return false;
			};

			const seq: any[] = [];
			const backboneIds = new Set(branch.map((e: any) => e.id));
			branch.forEach((entry: any) => {
				seq.push(entry);
				sm.getChildren(entry.id).forEach((child: any) => {
					if (
						(child.type === "branch_summary" || child.type === "compaction") &&
						!backboneIds.has(child.id)
					)
						seq.push(child);
				});
			});

			const visIds = new Set<string>();
			seq.forEach((e: any) => {
				if (verbose || isInteresting(e)) visIds.add(e.id);
			});
			let vis = seq.filter((e: any) => visIds.has(e.id));
			if (vis.length > limit) {
				const allowed = new Set(vis.slice(-limit).map((e: any) => e.id));
				visIds.clear();
				allowed.forEach((id: string) => visIds.add(id));
			}

			const lines: string[] = [];
			let hidden = 0;
			seq.forEach((entry: any) => {
				if (!visIds.has(entry.id)) {
					hidden++;
					return;
				}
				if (hidden > 0) {
					lines.push("  ... (" + hidden + " hidden) ...");
					hidden = 0;
				}
				const isHead = entry.id === leafId;
				const label = sm.getLabel(entry.id);
				const body = getContent(entry).replace(/\s+/g, " ");
				let role =
					entry.type === "message"
						? entry.message.role === "assistant"
							? "AI"
							: entry.message.role === "user"
								? "USER"
								: "TOOL"
						: entry.type === "compaction" || entry.type === "branch_summary"
							? "SUMMARY"
							: entry.type.toUpperCase();
				if (role === "CUSTOM_MESSAGE") return;
				const meta = [
					branch[0] && entry.id === branch[0].id ? "ROOT" : null,
					isHead ? "HEAD" : null,
					label ? "tag:" + label : null,
				]
					.filter(Boolean)
					.join(", ");
				lines.push(
					(isHead ? "*" : role === "USER" ? "•" : "|") +
						" " +
						entry.id.slice(0, 8) +
						(meta ? " (" + meta + ")" : "") +
						" [" +
						role +
						"] " +
						body,
				);
			});
			if (hidden > 0) lines.push("  ... (" + hidden + " hidden) ...");

			const usage = getUsage ? getUsage() : null;
			let usageStr = "Unknown";
			if (usage)
				usageStr =
					(usage.percent?.toFixed(1) ?? "?") +
					"% (" +
					Math.round((usage.tokens ?? 0) / 1024) +
					"k/" +
					Math.round((usage.contextWindow ?? 0) / 1024) +
					"k)";
			let stepsSince = 0,
				nearestTag = "None";
			for (let i = branch.length - 1; i >= 0; i--) {
				const l = sm.getLabel(branch[i].id);
				if (l) {
					nearestTag = l;
					break;
				}
				stepsSince++;
			}
			return (
				"[Context Dashboard]\n• Usage: " +
				usageStr +
				"\n• Steps since '" +
				nearestTag +
				"': " +
				stepsSince +
				"\n---\n" +
				(lines.join("\n") || "(empty)")
			);
		},

		contextCheckout: (args: { target: string; message: string; backupTag?: string }) => {
			if (!args?.target) return "Error: target required";
			if (!args?.message) return "Error: message required";

			const resolveId = (target: string): string => {
				if (target.toLowerCase() === "root") {
					const t = sm.getTree();
					return t.length > 0 ? t[0].entry.id : target;
				}
				if (/^[0-9a-f]{8,}$/i.test(target)) return target;
				const stack: any[] = [...sm.getTree()];
				while (stack.length > 0) {
					const n = stack.pop()!;
					if (sm.getLabel(n.entry.id) === target) return n.entry.id;
					if (n.children?.length) stack.push(...n.children);
				}
				return target;
			};

			const tid = resolveId(args.target);
			const currentLeaf = sm.getLeafId();
			if (currentLeaf === tid) return "Already at target " + tid;
			if (args.backupTag && currentLeaf && deps.setLabel)
				deps.setLabel(currentLeaf, args.backupTag);

			const label = currentLeaf ? sm.getLabel(currentLeaf) : undefined;
			const origin = label ? "tag: " + label : currentLeaf || "unknown";
			const enrichedMessage = "(summary from " + origin + ")\n" + args.message;

			const nid = sm.branchWithSummary(tid, enrichedMessage);
			deps.requestCheckout?.({ targetId: nid, enrichedMessage, backupTag: args.backupTag });

			return (
				"Checkout initiated -> " +
				args.target +
				". Backup: " +
				(args.backupTag || "none") +
				". Navigation completes after this turn."
			);
		},
	});
}

// ───────────────────────────────────────────────────────────────────────────────
// Tool injection — bindings, runbooks, sandbox-fns, $-bare-globals
// ───────────────────────────────────────────────────────────────────────────────

function buildSandboxCallContext(deps: ExecutionDeps): SandboxCallContext {
	return {
		signal: deps.signal,
		cwd: deps.cwd,
		model: deps.model,
		modelRegistry: deps.modelRegistry,
		sendMessage: deps.sendMessage as ((msg: unknown, opts?: unknown) => void) | undefined,
		sendUserMessage: deps.sendUserMessage,
	};
}

function injectDefaultBindings(session: CodeModeSession, deps: ExecutionDeps): void {
	const rawBindings = createToolBindings({
		cwd: deps.cwd,
		images: session.images,
		confirmFn: deps.confirmFn,
		logFn: (msg: string) => session.logs.push(msg),
		signal: deps.signal,
		sessionManager: deps.sessionManager,
	});
	const guarded = wrapWithContextGuard(
		rawBindings,
		deps.getContextUsage,
		deps.contextGuardEnabled !== false,
	);
	const ctxFns = getSandboxFnsForCall(buildSandboxCallContext(deps));

	const merged: Record<string, unknown> = { ...guarded, ...ctxFns };

	if (deps.allowedTools) {
		const filtered: Record<string, unknown> = {};
		for (const key of deps.allowedTools) {
			if (key in merged) filtered[key] = merged[key];
		}
		Object.assign(filtered, deps.extraBindings ?? {});
		Object.assign(session.context, filtered);
		return;
	}

	Object.assign(session.context, merged);
	if (deps.extraBindings) Object.assign(session.context, deps.extraBindings);
}

function injectRunbookRunFn(session: CodeModeSession, deps: ExecutionDeps): void {
	(session.context as any).runbookRun = async (input: { name: string; args?: Record<string, unknown> }) => {
		const { code } = loadRunbook(deps.cwd, input.name);
		const argsLine = input.args ? "const args = " + JSON.stringify(input.args) + ";\n" : "const args = {};\n";
		const wrapped = "(async () => {\n" + argsLine + code + "\n})()";
		return vm.runInContext(wrapped, session.context, { filename: "runbook:" + input.name });
	};
}

function hydrateBareGlobals(session: CodeModeSession): void {
	const PROTECTED = new Set(["$", "console", "session", "setTimeout", "clearTimeout", "process"]);
	const storeKeys = (session.store.proxy as any).__keys();
	for (const key of storeKeys) {
		if (typeof key !== "string") continue;
		if (key.startsWith("__") || PROTECTED.has(key)) continue;
		const existing = (session.context as any)[key];
		if (typeof existing === "function") continue;
		(session.context as any)[key] = (session.store.proxy as any)[key];
	}
}

// ───────────────────────────────────────────────────────────────────────────────
// executeInSession — the call-time runner
// ───────────────────────────────────────────────────────────────────────────────

const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000;

export async function executeInSession(
	session: CodeModeSession,
	code: string,
	deps: ExecutionDeps,
): Promise<ExecutionResult> {
	const errorMode = deps.errorMode ?? "recover";
	const start = Date.now();

	// Advance turn and process expiry
	session.store.nextTurn();
	const warnings = session.store.processExpiry();

	// Clear logs and images for this execution
	session.logs.length = 0;
	session.images.length = 0;

	// Layer 1: Syntax pre-validation. Catch parse errors without touching the store.
	const autoPersistNames = extractAutoPersistNames(code);
	const autoPersistSuffix = autoPersistNames
		.map((n) => "$." + n + " = typeof " + n + " !== \"undefined\" ? " + n + " : $." + n + ";")
		.join("\n");
	const wrapped = "(async () => {\n" + code + "\n" + autoPersistSuffix + "\n})()";

	try {
		new vm.Script(wrapped, { filename: "code-mode.js" });
	} catch (parseErr) {
		const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
		const storeInfo = session.store.getStatus();
		if (errorMode === "rethrow") throw parseErr instanceof Error ? parseErr : new Error(parseMsg);
		return {
			output: buildOutput(warnings, [
				"\u26a0\ufe0f Syntax error: " + parseMsg,
				"",
				"Your $ store was NOT affected. Fix the syntax and retry.",
				"",
				storeInfo,
			]),
			error: parseMsg,
			duration: Date.now() - start,
		};
	}

	// Layer 2: prepare bindings + context
	if (deps.skipToolInjection) {
		// Caller is responsible for the entire binding set.
		if (deps.bindings) Object.assign(session.context, deps.bindings);
	} else {
		injectDefaultBindings(session, deps);
	}

	// Update process.cwd to reflect the current call's working directory (always applied).
	(session.context as any).process.cwd = () => deps.cwd;

	// Console.wake — gated.
	if (deps.injectConsoleWake !== false) injectConsoleWake(session, deps);

	// Session/context helpers — gated.
	if (deps.injectSessionApi !== false) injectSessionHelpers(session, deps);

	// Runbook runner — gated.
	if (deps.injectRunbookRun !== false) injectRunbookRunFn(session, deps);

	// $-bare-global hydration — gated.
	if (deps.hydrateBareGlobals !== false) hydrateBareGlobals(session);

	// Layer 3: run inside the vm.
	const runVm = async () => {
		const promise = vm.runInContext(wrapped, session.context, {
			filename: "code-mode.js",
		});

		const races: Promise<unknown>[] = [promise];

		const timeoutMs = deps.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
		let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(
				() => reject(new Error("Execution timed out after " + timeoutMs / 1000 + "s")),
				timeoutMs,
			);
		});
		races.push(timeoutPromise);

		const signal = deps.signal;
		const abortPromise = new Promise<never>((_, reject) => {
			if (signal.aborted) {
				reject(new Error("Aborted"));
				return;
			}
			signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
		});
		races.push(abortPromise);

		try {
			await Promise.race(races);
		} finally {
			if (timeoutHandle) clearTimeout(timeoutHandle);
		}
	};

	if (errorMode === "rethrow") {
		await runVm();
		const output = buildOutput(warnings, session.logs);
		return { output, duration: Date.now() - start };
	}

	try {
		await runVm();
		const output = buildOutput(warnings, session.logs);
		return { output, duration: Date.now() - start };
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		const partialOutput = buildOutput(warnings, session.logs);
		const storeInfo = session.store.getStatus();
		const recoveryHint =
			storeInfo !== "$ is empty"
				? "Your $ store survived. Use $.<var> to continue from where you left off.\n" + storeInfo
				: "$ store is empty — nothing to recover.";

		const output = partialOutput
			? partialOutput + "\n\n\u274c " + error + "\n\n" + recoveryHint
			: "\u274c " + error + "\n\n" + recoveryHint;

		return { output, error, duration: Date.now() - start };
	}
}
