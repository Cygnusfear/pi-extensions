import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function sessionFactoryModule(): any {
	return require("../../../code-mode/src/session-factory.ts");
}

export interface CodeModeSession {
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
	},
): Promise<{ output: string; error?: string; duration: number }> {
	return sessionFactoryModule().executeInSession(session, code, deps);
}
