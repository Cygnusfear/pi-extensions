/**
 * Process-level guard for code-mode.
 *
 * Background promises stashed on `$` (or any async work spawned by user code
 * inside `vm.runInContext`) live in the host's event loop. If they reject
 * with no `.catch()`, the rejection propagates to Node/Bun's default handler,
 * which under some runtimes terminates the host process — taking the entire
 * pi agent down with it.
 *
 * That is unacceptable. Code-mode is a sandbox: it must contain failures and
 * surface them, never crash the host. This module installs a single,
 * idempotent process-level safety net that:
 *
 *   1. Catches every unhandledRejection and uncaughtException.
 *   2. Detects rejections that originated inside the code-mode vm context
 *      (their stack includes `code-mode.js` or `runbook:<name>`).
 *   3. Surfaces them to the agent as a wake-style follow-up message via
 *      `pi.sendMessage`, so the agent learns what failed and can react.
 *   4. Logs everything else to stderr without killing the host.
 *
 * Hot-reload safety: a Symbol on the global `process` records that the guard
 * is already installed. Calling install again removes any prior handlers
 * tagged with the same Symbol and re-installs fresh closures bound to the
 * current `pi`.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const GUARD_TAG = Symbol.for("@pi-extensions/code-mode/process-guard");

interface GuardHandlers {
	unhandledRejection: NodeJS.UnhandledRejectionListener;
	uncaughtException: NodeJS.UncaughtExceptionListener;
}

interface GuardedProcess extends NodeJS.Process {
	[GUARD_TAG]?: GuardHandlers;
}

/** Format a rejection reason or thrown value into a stable string. */
function formatReason(reason: unknown): { message: string; stack: string } {
	if (reason instanceof Error) {
		return { message: reason.message || reason.name, stack: reason.stack ?? "" };
	}
	if (typeof reason === "object" && reason !== null) {
		const r = reason as { message?: unknown; stack?: unknown };
		const message = typeof r.message === "string" ? r.message : safeJson(reason);
		const stack = typeof r.stack === "string" ? r.stack : "";
		return { message, stack };
	}
	return { message: String(reason), stack: "" };
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/** Stack contains a code-mode vm filename → it came from sandbox user code. */
function isFromCodeMode(stack: string): boolean {
	if (!stack) return false;
	return stack.includes("code-mode.js") || stack.includes("runbook:");
}

/**
 * Install the process-level guard. Idempotent — calling repeatedly removes any
 * prior installation (e.g. on extension hot-reload) and binds fresh handlers
 * to the supplied `pi` instance.
 */
export function installCodeModeProcessGuard(pi: ExtensionAPI): void {
	const guardedProcess = process as GuardedProcess;

	// Remove prior handlers from a previous install (hot-reload path).
	const prior = guardedProcess[GUARD_TAG];
	if (prior) {
		try { process.removeListener("unhandledRejection", prior.unhandledRejection); } catch { /* noop */ }
		try { process.removeListener("uncaughtException", prior.uncaughtException); } catch { /* noop */ }
	}

	const surface = (kind: "unhandledRejection" | "uncaughtException", reason: unknown): void => {
		const { message, stack } = formatReason(reason);
		const fromSandbox = isFromCodeMode(stack);
		const tag = fromSandbox ? "[code-mode]" : "[host]";

		// Sandbox-origin failures are user-code/code-mode failures. Do NOT write
		// them with console.error: in pi, stderr is a host/TUI error channel, so a
		// contained sandbox rejection would still look like the app itself broke.
		// Surface those as in-session messages instead. Host-origin failures still
		// go to stderr because they are actual host failures.
		if (!fromSandbox) {
			try {
				console.error(`${tag} ${kind}: ${message}\n${stack}`);
			} catch { /* never let logging itself bubble */ }
			return;
		}

		const sendMessage = (pi as unknown as {
			sendMessage?: (
				message: { customType: string; content: string; display?: boolean },
				options?: { deliverAs?: "steer" | "followUp"; triggerTurn?: boolean },
			) => void;
		}).sendMessage;
		if (typeof sendMessage !== "function") return;

		const trimmedStack = stack.length > 4000 ? `${stack.slice(0, 4000)}\n…(truncated)` : stack;
		const body = [
			`[CODE-MODE BACKGROUND ${kind === "unhandledRejection" ? "REJECTION" : "EXCEPTION"}]`,
			"",
			`A promise or callback spawned by execute_code threw with no .catch() / try.`,
			`The host did NOT crash — guard contained the failure.`,
			"",
			`Error: ${message}`,
			"",
			"Stack:",
			trimmedStack || "(no stack)",
			"",
			"Likely cause: a background async task stashed on $ (or a setTimeout / setInterval / event-emitter callback) ran after its enclosing execute_code block returned and threw without a handler. Inspect $ for pending tasks and add proper error handling.",
		].join("\n");

		try {
			sendMessage(
				{ customType: "code-mode-crash", content: body, display: true },
				{ deliverAs: "followUp", triggerTurn: true },
			);
		} catch {
			// Never fall back to console.error for sandbox failures. The process
			// guard already contained the exception; logging it to stderr would
			// reclassify a contained user-code failure as a host/TUI error.
		}
	};

	const onUnhandledRejection: NodeJS.UnhandledRejectionListener = (reason, _promise) => {
		surface("unhandledRejection", reason);
	};
	const onUncaughtException: NodeJS.UncaughtExceptionListener = (err, _origin) => {
		surface("uncaughtException", err);
	};

	process.on("unhandledRejection", onUnhandledRejection);
	process.on("uncaughtException", onUncaughtException);

	guardedProcess[GUARD_TAG] = {
		unhandledRejection: onUnhandledRejection,
		uncaughtException: onUncaughtException,
	};
}

/** Test/uninstall hook — primarily for hot-reload teardown and tests. */
export function uninstallCodeModeProcessGuard(): void {
	const guardedProcess = process as GuardedProcess;
	const prior = guardedProcess[GUARD_TAG];
	if (!prior) return;
	try { process.removeListener("unhandledRejection", prior.unhandledRejection); } catch { /* noop */ }
	try { process.removeListener("uncaughtException", prior.uncaughtException); } catch { /* noop */ }
	delete guardedProcess[GUARD_TAG];
}
