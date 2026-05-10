/**
 * TYPECHECK ISOLATION SHIM (NOT for runtime — bun resolves the real package
 * via package.json "exports" field at runtime; this file's createRequire body
 * is defensive dead code that only runs if bun's resolution is bypassed).
 *
 * Why this exists: importing the real @pi-extensions/code-mode/{session-factory,
 * sandbox-tools,types} pulls code-mode's full module graph into RLM's tsc, which
 * inherits baseline errors from sandbox-tools/tool-reference/fff/tldr-code. This
 * shim isolates RLM's typecheck from that transitive type-debt graph.
 *
 * Deletion criterion: when `bunx tsc -p packages/code-mode/tsconfig.json`
 * exits 0 (i.e., code-mode's baseline reaches zero), delete this entire
 * `ts-shims/` directory and the corresponding `paths` redirects in
 * packages/rlm/tsconfig.json. Then RLM imports the real package surface.
 *
 * TODO(pe-tk4s + code-mode-baseline-cleanup): delete on the cleanup ticket.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function sessionFactoryModule(): any {
	return require("../../../code-mode/src/session-factory.ts");
}

export interface CodeModeSession {
	context: unknown;
	store: {
		has(k: string): boolean;
		get(k: string): unknown;
		set(k: string, v: unknown): void;
		delete(k: string): void;
		keys(): string[];
	};
	logs: string[];
	images: Array<{ data: string; mimeType: string }>;
	setEscaped(v: boolean): void;
	getEscaped(): boolean;
	drainLogs(): string;
}

export function createCodeModeSession(): CodeModeSession {
	return sessionFactoryModule().createCodeModeSession();
}

export function executeInSession(
	session: CodeModeSession,
	code: string,
	deps: {
		signal: AbortSignal;
		cwd: string;
		model: { provider: string; id: string };
		modelRegistry: unknown;
		hydrateBareGlobals?: boolean;
		injectSessionApi?: boolean;
		injectConsoleWake?: boolean;
		injectRunbookRun?: boolean;
		errorMode?: "recover" | "rethrow";
		allowedTools?: Set<string>;
		extraBindings?: Record<string, unknown>;
		agentGitIdentity?: { name: string; email: string; model?: string; sessionId?: string; sessionName?: string };
	},
): Promise<{ output: string; error?: string; duration: number }> {
	return sessionFactoryModule().executeInSession(session, code, deps);
}
