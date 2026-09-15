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
import { Buffer } from "node:buffer";
import * as acorn from "acorn";
import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import type { CodeModeManual } from "./code-mode-manual";
import { createPersistentStore } from "./persistent-store";
import {
	SQUASH_HANDOFF_MAX_BYTES,
	type DeferredSquashOptions,
	type SquashHandoff,
} from "./deferred-squash";
import { loadRunbook } from "@pi-extensions/runbooks/engine";
import { resolveSandboxBindings } from "./sandbox-bindings.ts";
import {
	getSandboxFnsForCall,
	type ParentSessionIdentity,
	type SandboxCallContext,
	type SandboxContextUsage,
} from "@pi-extensions/shared/sandbox-registry";
import {
	CONTEXT_GUARD_THRESHOLD,
	getKnownContextPercent,
	isContextGuardActive,
	readContextUsage,
} from "./context-usage";
import { formatProgressiveOutput } from "./progressive-output";

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
	/** Absolute path to a SESSION-SCOPED snapshot file. Takes precedence over `cwd`. The extension uses store.bindPersistence() for this once the sessionManager is known; this option exists for direct/test construction. */
	storePath?: string;
	/** Default false. */
	initialEscaped?: boolean;
}


function buildOutput(warnings: string[], logs: string[]): string {
	const parts: string[] = [];
	if (warnings.length > 0) {
		parts.push(warnings.join("\n"));
		if (logs.length > 0) parts.push("---");
	}
	if (logs.length > 0) parts.push(logs.join("\n"));
	return parts.join("\n");
}

type CreateToolBindings = (ctx: any) => Record<string, unknown>;
let createToolBindingsPromise: Promise<CreateToolBindings> | undefined;

async function loadCreateToolBindings(): Promise<CreateToolBindings> {
	createToolBindingsPromise ??= import("./sandbox-tools").then(
		(mod) => mod.createToolBindings as CreateToolBindings,
	);
	return createToolBindingsPromise;
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
	const store = createPersistentStore({ getEscaped: () => escaped, cwd: opts?.cwd, storePath: opts?.storePath });
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

		// Buffer — pure-JS binary helper from Node. Agents reach for it constantly
		// (training-data habit); injecting it removes a whole ReferenceError class.
		Buffer,

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
	/** Per-session manual override; avoids isolated sandboxes depending on parent module state. */
	codeModeManual?: CodeModeManual;
	/** Live context usage for the active model; null tokens = unknown (post-compaction). */
	getContextUsage?: () => SandboxContextUsage | undefined;
	/**
	 * Live host model read, fresh per invocation (pe-dvdys6os). Unlike `model`
	 * above — a snapshot captured when execute_code began — this reflects host
	 * state at call time (e.g. after a same-block model.switch()).
	 */
	getModel?: () => { provider: string; id: string } | undefined;
	/** Delegates to host pi.setModel. Resolves false when the target lacks configured auth. */
	setModel?: (model: unknown) => Promise<boolean>;
	confirmFn?: (
		title: string,
		body: string,
		opts?: { signal?: AbortSignal; timeout?: number },
	) => Promise<boolean>;
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

	/** Optional git identity — injected into Bash/git-ai env vars for automatic commit attribution. */
	agentGitIdentity?: { name: string; email: string; model?: string; sessionId?: string; sessionName?: string };

	// ── Extension-side deferral hooks ───────────────────────────────────────────
	// The session-helpers block (when injectSessionApi=true) needs to communicate
	// back to extension lifecycle handlers (turn_end / agent_end). The host
	// extension owns the deferral state; these callbacks bridge from the sandbox.
	/** Schedule a session.squash() — extension records pending and runs compact() at agent_end. */
	requestSquash?: (options: DeferredSquashOptions) => void;
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
			const wakeContent = formatProgressiveOutput("[CONSOLE.WAKE] " + message, {
				filePrefix: "pi-console-wake",
			}).text;
			if (sendMsg) {
				sendMsg(
					{ customType: "console-wake", content: wakeContent, display: true },
					{ deliverAs: "followUp", triggerTurn: true },
				);
			} else if (sendUser) {
				sendUser(wakeContent, { deliverAs: "followUp" });
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

/** Tools allowed through the context guard (context management + safe reads). */
const CONTEXT_GUARD_ALLOWED = new Set(["Read", "read", "sleep", "man"]);

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
					const pct = getKnownContextPercent(readContextUsage(getUsage))?.toFixed(1) ?? "?";
					throw new Error(
						"\ud83d\udeab Context guard active (" +
							pct +
							"% used, threshold " +
							(CONTEXT_GUARD_THRESHOLD * 100).toFixed(0) +
							"%). " +
							"Most tools blocked — only context management allowed.\n\n" +
							"BEFORE squashing, save bounded narrative context to $.ctx (it becomes model-visible after compaction):\n" +
							"$.ctx = `TASK — mid-stream\nDone: ...\nGotcha: ...\nNext: ...`;\n\n" +
							"Never put secrets in $.ctx. Then squash; it is delivered before the short continuation:\n" +
							'session.squash({ continue: "Continue with [next step]." });\n\n' +
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

type SessionSquashOptionsInput = {
	continue?: unknown;
	handoff?: unknown;
};

type NormalizedSquashOptions =
	| { readonly options: DeferredSquashOptions }
	| { readonly error: string };

/**
 * Freeze the only narrative that is allowed to cross a squash boundary.
 *
 * `$.ctx` is the documented context-handoff channel. Other persistent values
 * deliberately do not become model-visible: they may be unrelated, large, or
 * secret-bearing. An explicit `handoff.text` overrides `$.ctx` for callers
 * that need a different narrative.
 */
function normalizeSquashOptions(
	raw: unknown,
	store: Record<string, unknown>,
): NormalizedSquashOptions {
	if (raw !== undefined && (raw === null || typeof raw !== "object" || Array.isArray(raw))) {
		return { error: "session.squash(): options must be an object" };
	}

	const input = (raw ?? {}) as SessionSquashOptionsInput;
	if (input.continue !== undefined && typeof input.continue !== "string") {
		return { error: "session.squash(): continue must be a string" };
	}

	let text: string | undefined;
	let source: SquashHandoff["source"] | undefined;
	if (input.handoff !== undefined) {
		if (
			input.handoff === null ||
			typeof input.handoff !== "object" ||
			Array.isArray(input.handoff)
		) {
			return { error: "session.squash(): handoff must be an object with a non-empty text string" };
		}
		const handoffText = (input.handoff as { text?: unknown }).text;
		if (typeof handoffText !== "string" || handoffText.trim().length === 0) {
			return { error: "session.squash(): handoff.text must be a non-empty string" };
		}
		text = handoffText;
		source = "explicit";
	} else if (typeof store.ctx === "string" && store.ctx.trim().length > 0) {
		text = store.ctx;
		source = "ctx";
	}

	if (!text || !source) {
		return { options: { continue: input.continue as string | undefined } };
	}

	const bytes = Buffer.byteLength(text, "utf8");
	if (bytes > SQUASH_HANDOFF_MAX_BYTES) {
		return {
			error:
				"session.squash(): handoff is " +
				bytes +
				" UTF-8 bytes, exceeding the " +
				SQUASH_HANDOFF_MAX_BYTES +
				"-byte limit. Shorten $.ctx or handoff.text; it is not truncated.",
		};
	}

	return {
		options: {
			continue: input.continue as string | undefined,
			handoff: { text, source },
		},
	};
}

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
			squash: (options?: SessionSquashOptionsInput) => {
				const log = (msg: string) => session.logs.push(msg);
				if (!deps.compact) {
					log("session.squash(): compaction not available in this context");
					return;
				}
				const normalized = normalizeSquashOptions(
					options,
					session.store.proxy as Record<string, unknown>,
				);
				if ("error" in normalized) {
					log(normalized.error);
					return;
				}
				deps.requestSquash?.(normalized.options);
				log(
					"session.squash(): compaction scheduled for after this turn completes" +
						(normalized.options.handoff
							? "; generated handoff captured from " + normalized.options.handoff.source
							: ""),
				);
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

/** Coerce a possibly-undefined session-manager accessor to a trimmed string. */
function safeString(fn: () => unknown): string | undefined {
	try {
		const v = fn();
		const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
		return s ? s : undefined;
	} catch {
		return undefined;
	}
}

function buildSandboxCallContext(deps: ExecutionDeps): SandboxCallContext {
	const sessionManager = deps.sessionManager;
	const parentSession: ParentSessionIdentity | undefined = sessionManager
		? {
				id: safeString(() => sessionManager.getSessionId?.()),
				name: safeString(() => sessionManager.getSessionName?.()),
				file: safeString(() => sessionManager.getSessionFile?.()),
			}
		: undefined;
	return {
		signal: deps.signal,
		cwd: deps.cwd,
		model: deps.model,
		modelRegistry: deps.modelRegistry,
		getModel: deps.getModel,
		setModel: deps.setModel,
		getContextUsage: deps.getContextUsage,
		sendMessage: deps.sendMessage as ((msg: unknown, opts?: unknown) => void) | undefined,
		sendUserMessage: deps.sendUserMessage,
		parentSession,
	};
}

async function injectDefaultBindings(session: CodeModeSession, deps: ExecutionDeps): Promise<void> {
	const createToolBindings = await loadCreateToolBindings();
	const rawBindings = createToolBindings({
		cwd: deps.cwd,
		images: session.images,
		codeModeManual: deps.codeModeManual,
		model: deps.model,
		modelRegistry: deps.modelRegistry,
		confirmFn: deps.confirmFn,
		logFn: (msg: string) => session.logs.push(msg),
		signal: deps.signal,
		sessionManager: deps.sessionManager,
		agentGitIdentity: deps.agentGitIdentity,
	});
	const guarded = wrapWithContextGuard(
		rawBindings,
		deps.getContextUsage,
		deps.contextGuardEnabled !== false,
	);
	const ctxFns = getSandboxFnsForCall(buildSandboxCallContext(deps));

	// A host binding registered under a built-in's name claims that capability: the
	// built-in is suppressed here, before anything reaches the vm context, so
	// precedence never depends on spread order (kal-0q4nb1ae).
	const resolved = resolveSandboxBindings(
		guarded as Record<string, unknown>,
		ctxFns as Record<string, unknown>,
	);
	if (resolved.suppressed.length > 0) {
		session.logs.push(
			"[code-mode] host sandbox bindings replace built-ins: " + resolved.suppressed.join(", "),
		);
	}
	const merged: Record<string, unknown> = resolved.bindings;

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
	const mesh = (session.context as any).mesh;
	if (mesh && typeof mesh.inbox === "function") {
		(session.store.proxy as any).__defineVirtual?.("inbox", () => mesh.inbox());
	}
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

// executeInSession is UNBOUNDED by default. The timeout race is only installed
// when ExecutionDeps.executionTimeoutMs is a positive finite number. Callers
// (the execute_code tool) decide whether to opt into a deadline at all.

/**
 * Extract the user-code line number from a runtime error's stack.
 *
 * Execution frames reference the wrapped script as "code-mode.js:<line>:<col>".
 * The wrapper (see executeInSession) prepends exactly one line, so the user line
 * is the wrapped line minus 1. Returns null when no in-script frame is present
 * (native throws with no stack, or errors from inside tool bindings).
 */

// ── Hard-wait guard (parse-time) ─────────────────────────────────────────────
// Preventative quota fix: a long `await sleep(N)` pins the per-session VM mutex
// and reads as a frozen session; the async/wake patterns are strictly better.
// Rejected BEFORE execution so the error itself teaches the correct idiom.
// Condition-polling inside one call (short sleeps in a loop awaiting a state
// change) costs no provider turns and stays allowed; only long hard waits and
// shell `sleep N` (N>5s) are rejected.
const HARD_WAIT_MAX_SLEEP_MS = 5000;
const HARD_WAIT_GUIDANCE =
	"Await events, not elapsed time: arm async work (execute_code { async: true }), a background promise with console.wake(...), teams.on(...).timeout(ms), or bashBgStart. Short waits up to 5s are fine.";

function staticStringProp(node: unknown, names: string[]): string | undefined {
	const n = node as Record<string, unknown> | undefined;
	if (!n || n.type !== "ObjectExpression") return undefined;
	for (const prop of (n.properties as unknown[]) ?? []) {
		const pr = prop as Record<string, unknown>;
		if (pr.type !== "Property") continue;
		const key = pr.key as Record<string, unknown> | undefined;
		const name = key?.type === "Identifier" ? (key.name as string) : key?.type === "Literal" ? String(key.value) : undefined;
		if (!name || !names.includes(name)) continue;
		const value = pr.value as Record<string, unknown> | undefined;
		if (value?.type === "Literal" && typeof value.value === "string") return value.value;
	}
	return undefined;
}

function findHardWait(node: unknown): string | null {
	if (!node || typeof node !== "object") return null;
	if (Array.isArray(node)) {
		for (const item of node) {
			const hit = findHardWait(item);
			if (hit) return hit;
		}
		return null;
	}
	const n = node as Record<string, unknown>;
	if (n.type === "CallExpression") {
		const callee = n.callee as Record<string, unknown> | undefined;
		const args = (n.arguments as unknown[]) ?? [];
		if (callee?.type === "Identifier" && callee.name === "sleep") {
			const first = args[0] as Record<string, unknown> | undefined;
			if (first?.type === "Literal" && typeof first.value === "number" && first.value > HARD_WAIT_MAX_SLEEP_MS) {
				return `await sleep(${first.value}) — sleeps over 5s pin the session and read as a freeze. ${HARD_WAIT_GUIDANCE}`;
			}
		}
		if (callee?.type === "Identifier" && (callee.name === "Bash" || callee.name === "bashBgStart")) {
			const first = args[0] as Record<string, unknown> | undefined;
			const cmd = (first?.type === "Literal" && typeof first.value === "string" ? first.value : undefined) ??
				staticStringProp(first, ["command", "cmd"]);
			const m = cmd?.match(/\bsleep\s+(\d+(?:\.\d+)?)/);
			if (m && Number(m[1]) > 5) {
				return `shell "sleep ${m[1]}" — ${HARD_WAIT_GUIDANCE}`;
			}
		}
	}
	for (const key of Object.keys(n)) {
		if (key === "type" || key === "start" || key === "end" || key === "loc" || key === "range") continue;
		const hit = findHardWait(n[key]);
		if (hit) return hit;
	}
	return null;
}

function extractUserCodeLine(err: unknown): number | null {
	const stack = (err as { stack?: unknown })?.stack;
	if (typeof stack !== "string") return null;
	const m = stack.match(/code-mode\.js:(\d+):\d+/);
	if (!m) return null;
	const userLine = parseInt(m[1], 10) - 1;
	return Number.isFinite(userLine) && userLine >= 1 ? userLine : null;
}

/** acorn appends " (line:column)" to its messages; the position is re-derived from `loc`. */
const ACORN_POSITION_SUFFIX = / \(\d+:\d+\)$/;

/** Bound the echoed source line so one long line cannot dominate tool output. */
const SYNTAX_SNIPPET_MAX_WIDTH = 160;

/**
 * Rewrite an acorn syntax error so its position refers to the caller's submitted
 * code instead of the wrapped buffer acorn actually parsed.
 *
 * Only the line is offset: the wrapper prefix is whole lines, so the column is
 * already correct. A position outside the submitted region - the wrapper opener
 * or the auto-persist suffix - is returned untouched, because remapping it would
 * name a line the caller never wrote.
 */
function describeSyntaxError(
	parseErr: unknown,
	code: string,
	wrapperOpenerLines: number,
): { message: string; snippet: string[] } {
	const rawMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
	const loc = (parseErr as { loc?: { line?: unknown; column?: unknown } } | null)?.loc;
	const line = typeof loc?.line === "number" ? loc.line : undefined;
	const column = typeof loc?.column === "number" ? loc.column : undefined;
	if (line === undefined || column === undefined) return { message: rawMessage, snippet: [] };

	const codeLines = code.split("\n");
	const codeLine = line - wrapperOpenerLines;
	if (codeLine < 1 || codeLine > codeLines.length) return { message: rawMessage, snippet: [] };

	// Wording stays acorn's; only the position is replaced, and it comes from `loc`
	// rather than from the message text.
	const message = `${rawMessage.replace(ACORN_POSITION_SUFFIX, "")} (line ${codeLine}, column ${column})`;
	return { message, snippet: formatSyntaxSnippet(codeLines[codeLine - 1] ?? "", column) };
}

/** Echo the offending submitted line with a caret under the reported column. */
function formatSyntaxSnippet(lineText: string, column: number): string[] {
	// Tabs expand one-for-one, so indices stay valid without re-deriving the column.
	const expanded = lineText.replace(/\t/g, " ");
	const caretIndex = Math.min(Math.max(column, 0), expanded.length);
	const start =
		expanded.length > SYNTAX_SNIPPET_MAX_WIDTH
			? Math.max(
					0,
					Math.min(caretIndex - Math.floor(SYNTAX_SNIPPET_MAX_WIDTH / 2), expanded.length - SYNTAX_SNIPPET_MAX_WIDTH),
				)
			: 0;
	const visible = expanded.slice(start, start + SYNTAX_SNIPPET_MAX_WIDTH);
	const leading = start > 0 ? "…" : "";
	const trailing = start + visible.length < expanded.length ? "…" : "";
	return [`  ${leading}${visible}${trailing}`, `  ${" ".repeat(leading.length + (caretIndex - start))}^`];
}

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
	// acorn parses this wrapped buffer, so every position it reports refers to it.
	// Keep the opener named: the correction below derives its line offset from it.
	const wrapperOpener = "(async () => {";
	const wrapped = wrapperOpener + "\n" + code + "\n" + autoPersistSuffix + "\n})()";
	const wrapperOpenerLines = wrapperOpener.split("\n").length;

	let parsedAst: unknown;
	try {
		parsedAst = acorn.parse(wrapped, { ecmaVersion: "latest" });
	} catch (parseErr) {
		const rawParseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
		if (errorMode === "rethrow") throw parseErr instanceof Error ? parseErr : new Error(rawParseMsg);
		const syntax = describeSyntaxError(parseErr, code, wrapperOpenerLines);
		const parseMsg = syntax.message;
		return {
			output: buildOutput(warnings, [
				"\u26a0\ufe0f Syntax error: " + parseMsg,
				...syntax.snippet,
				"",
				"Your $ store was NOT affected. Fix the syntax and retry.",
				"Run console.log($.__status()) only if you need store details.",
				"",
			]),
			error: parseMsg,
			duration: Date.now() - start,
		};
	}

	const hardWait = findHardWait(parsedAst);
	if (hardWait) {
		const msg = "⛔ Hard-wait rejected: " + hardWait;
		if (errorMode === "rethrow") throw new Error(msg);
		return {
			output: buildOutput(warnings, [msg]),
			error: msg,
			duration: Date.now() - start,
		};
	}

	// Layer 2: prepare bindings + context
	const executionAbort = new AbortController();
	const runtimeDeps: ExecutionDeps = {
		...deps,
		signal: AbortSignal.any([deps.signal, executionAbort.signal]),
	};

	if (deps.skipToolInjection) {
		// Caller is responsible for the entire binding set.
		if (deps.bindings) Object.assign(session.context, deps.bindings);
	} else {
		await injectDefaultBindings(session, runtimeDeps);
	}

	// Update process.cwd to reflect the current call's working directory (always applied).
	(session.context as any).process.cwd = () => runtimeDeps.cwd;

	// Console.wake — gated.
	if (runtimeDeps.injectConsoleWake !== false) injectConsoleWake(session, runtimeDeps);

	// Session/context helpers — gated.
	if (runtimeDeps.injectSessionApi !== false) injectSessionHelpers(session, runtimeDeps);

	// Runbook runner — gated.
	if (runtimeDeps.injectRunbookRun !== false) injectRunbookRunFn(session, runtimeDeps);

	// $-bare-global hydration — gated.
	if (runtimeDeps.hydrateBareGlobals !== false) hydrateBareGlobals(session);

	// Layer 3: run inside the vm.
	const runVm = async () => {
		const promise = vm.runInContext(wrapped, session.context, {
			filename: "code-mode.js",
		});

		const races: Promise<unknown>[] = [promise];

		// Unbounded by default. Only install the timeout race when caller opts in
		// with a positive finite executionTimeoutMs. Undefined / 0 / negative all
		// mean "run until the code itself resolves or aborts".
		const timeoutMs = runtimeDeps.executionTimeoutMs;
		const hasTimeout = typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0;
		let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
		let timeoutRejectHandle: ReturnType<typeof setTimeout> | undefined;
		if (hasTimeout) {
			const ms = timeoutMs as number;
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutHandle = setTimeout(
					() => {
						const timeoutError = new Error("Timed out after " + ms + "ms");
						if (!executionAbort.signal.aborted) executionAbort.abort(timeoutError);
						timeoutRejectHandle = setTimeout(
							() => reject(new Error("Execution timed out after " + ms / 1000 + "s")),
							25,
						);
					},
					ms,
				);
			});
			races.push(timeoutPromise);
		}

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
			if (timeoutRejectHandle) clearTimeout(timeoutRejectHandle);
		}
	};

	// Run-end durability: snapshot the $ store synchronously so every var set
	// during this run is on disk before control returns — without waiting for the
	// 500ms debounce (which a fast process exit could outrun). No-op until the
	// store is bound to a disk path (RLM sub-contexts / tests stay in-memory).
	const finalizeFlush = () => {
		try {
			(session.store as { flush?: () => void }).flush?.();
		} catch {
			/* best-effort durability */
		}
	};

	if (errorMode === "rethrow") {
		try {
			await runVm();
		} finally {
			finalizeFlush();
		}
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

		// Locate the throwing line in the user's code. Execution frames reference
		// the wrapped script as "code-mode.js:<line>"; the wrapper prepends exactly
		// one line ("(async () => {"), so user line = wrapped line - 1.
		const userLine = extractUserCodeLine(err);
		const locator = userLine !== null ? " (at your code line " + userLine + ")" : "";

		// A SyntaxError reaching this RUNTIME catch is never a syntax problem in the
		// submitted code — Layer 1 (acorn) already validated that. It is a runtime
		// throw from JSON.parse()/new RegExp()/eval()/etc. on bad input. Classify by
		// PHASE (compile vs runtime), never by the error's constructor name.
		const runtimeSyntaxNote =
			(err as { name?: unknown })?.name === "SyntaxError"
				? "\nThis SyntaxError was thrown at runtime (e.g. JSON.parse() or new RegExp() on invalid input) — your code's syntax is fine; check the data you passed in."
				: "";

		const storeKeys = session.store.proxy.__keys;
		const storeKeyList = typeof storeKeys === "function" ? storeKeys() : [];
		const storeKeyCount = Array.isArray(storeKeyList) ? storeKeyList.length : 0;
		const recoveryHint =
			storeKeyCount > 0
				? `Your $ store survived (${storeKeyCount} ${storeKeyCount === 1 ? "key" : "keys"}). Use $.<var> to continue from where you left off. Run $.__status() only when you intentionally need a store inventory.`
				: "$ store is empty — nothing to recover.";

		const body = "❌ " + error + locator + runtimeSyntaxNote + "\n\n" + recoveryHint;
		const output = partialOutput ? partialOutput + "\n\n" + body : body;

		return { output, error, duration: Date.now() - start };
	} finally {
		finalizeFlush();
	}
}
