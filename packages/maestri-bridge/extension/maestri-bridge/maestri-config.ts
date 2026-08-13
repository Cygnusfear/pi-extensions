import {
	accessSync,
	constants,
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { isValidTerminalId, terminalPinState } from "./session-pinning.ts";

export interface ParsedPiCommand {
	kind: "pi" | "wrapper" | "other" | "unsupported";
	executable?: string;
	args: string[];
	ephemeral: boolean;
}

const VALUE_FLAGS = new Set([
	"--mode",
	"--provider",
	"--model",
	"--api-key",
	"--system-prompt",
	"--append-system-prompt",
	"--name",
	"-n",
	"--session",
	"--session-id",
	"--fork",
	"--session-dir",
	"--models",
	"--tools",
	"-t",
	"--exclude-tools",
	"-xt",
	"--extension",
	"-e",
	"--skill",
	"--prompt-template",
	"--theme",
	"--thinking",
	"--export",
]);

/** Interpret a built-in flag only when it is not the value of another built-in flag. */
function hasTopLevelFlag(args: readonly string[], wanted: string): boolean {
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === wanted) return true;
		if (VALUE_FLAGS.has(arg)) i += 1;
	}
	return false;
}

const UNSAFE_SHELL = /[\n\r;&|`$<>]/;

/** Conservative shell-word parser: quotes/backslashes only, no expansion. */
export function tokenizeSimpleCommand(command: string): string[] | undefined {
	if (UNSAFE_SHELL.test(command)) return undefined;
	const words: string[] = [];
	let word = "";
	let active = false;
	let quote: "'" | '"' | undefined;
	let escaped = false;
	for (const char of command) {
		if (escaped) {
			word += char;
			active = true;
			escaped = false;
			continue;
		}
		if (char === "\\" && quote !== "'") {
			escaped = true;
			active = true;
			continue;
		}
		if (quote) {
			if (char === quote) quote = undefined;
			else word += char;
			active = true;
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			active = true;
			continue;
		}
		if (/\s/.test(char)) {
			if (active) {
				words.push(word);
				word = "";
				active = false;
			}
			continue;
		}
		word += char;
		active = true;
	}
	if (escaped || quote) return undefined;
	if (active) words.push(word);
	return words;
}

export function shellQuote(value: string): string {
	return /^[A-Za-z0-9_@%+=:,./-]+$/.test(value)
		? value
		: `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function parsePiCommand(
	command: unknown,
	wrapperTarget: string,
): ParsedPiCommand {
	if (typeof command !== "string")
		return { kind: "other", args: [], ephemeral: false };
	const words = tokenizeSimpleCommand(command);
	if (!words || words.length === 0)
		return { kind: "unsupported", args: [], ephemeral: false };
	const [executable, ...args] = words;
	if (executable === undefined)
		return { kind: "unsupported", args: [], ephemeral: false };
	const ephemeral = hasTopLevelFlag(args, "--no-session");
	// Protection is a verified ownership claim, not a basename guess. Only the
	// installed target is a wrapper. A bare pi-maestri remains an unverified
	// command until --patch normalizes it to this absolute path.
	if (isInstalledWrapper(executable, wrapperTarget)) {
		return { kind: "wrapper", executable, args, ephemeral };
	}
	if (executable === "pi" || executable.endsWith("/pi"))
		return { kind: "pi", executable, args, ephemeral };
	return { kind: "other", executable, args, ephemeral };
}

/** A protected command must name the installed, executable wrapper itself. */
function isInstalledWrapper(
	executable: string,
	wrapperTarget: string,
): boolean {
	if (!isAbsolute(executable) || resolve(executable) !== resolve(wrapperTarget))
		return false;
	try {
		if (!statSync(wrapperTarget).isFile()) return false;
		accessSync(wrapperTarget, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

export function renderWrapperCommand(
	args: readonly string[],
	wrapperTarget: string,
): string {
	return [shellQuote(wrapperTarget), ...args.map(shellQuote)].join(" ");
}

export function rewritePiCommand(
	command: unknown,
	wrapperTarget: string,
): string | undefined {
	const parsed = parsePiCommand(command, wrapperTarget);
	if (parsed.kind === "wrapper" || parsed.kind === "pi")
		return renderWrapperCommand(parsed.args, wrapperTarget);
	// A bare wrapper name is a safe rewrite candidate, but never a verified
	// protected command until persisted as the absolute installed target.
	const words =
		typeof command === "string" ? tokenizeSimpleCommand(command) : undefined;
	if (words?.[0] === "pi-maestri")
		return renderWrapperCommand(words.slice(1), wrapperTarget);
	return undefined;
}

/**
 * Persisted terminals must resume dynamically from their concrete pin. Strip
 * only startup session selectors; preserve model/name/offline/tool flags. An
 * explicit --no-session terminal remains intentionally ephemeral verbatim.
 */
export function dynamicTerminalCommand(
	command: unknown,
	wrapperTarget: string,
): string | undefined {
	let parsed = parsePiCommand(command, wrapperTarget);
	if (parsed.kind !== "pi" && parsed.kind !== "wrapper") {
		const words =
			typeof command === "string" ? tokenizeSimpleCommand(command) : undefined;
		if (words?.[0] !== "pi-maestri") return undefined;
		parsed = {
			kind: "other",
			executable: words[0],
			args: words.slice(1),
			ephemeral: hasTopLevelFlag(words.slice(1), "--no-session"),
		};
	}
	if (parsed.ephemeral) return renderWrapperCommand(parsed.args, wrapperTarget);
	const kept: string[] = [];
	for (let i = 0; i < parsed.args.length; i++) {
		const arg = parsed.args[i];
		if (arg === undefined) continue;
		if (VALUE_FLAGS.has(arg)) {
			const value = parsed.args[i + 1];
			i += 1;
			if (arg !== "--session" && arg !== "--session-id" && arg !== "--fork") {
				kept.push(arg);
				if (value !== undefined) kept.push(value);
			}
			continue;
		}
		if (
			arg === "--continue" ||
			arg === "-c" ||
			arg === "--resume" ||
			arg === "-r"
		)
			continue;
		kept.push(arg);
	}
	return renderWrapperCommand(kept, wrapperTarget);
}

function looksLikePi(command: unknown): boolean {
	return (
		typeof command === "string" &&
		/(^|[\s;&|])(?:[^\s;&|/]+\/)*pi(?:[\s;&|]|$)/.test(command)
	);
}

export function isConfiguredPi(
	record: Record<string, unknown>,
	wrapperTarget: string,
): boolean {
	const command = parsePiCommand(record.command, wrapperTarget);
	if (command.kind === "pi" || command.kind === "wrapper") return true;
	if (looksLikePi(record.command) || looksLikePi(record.resumeCommand))
		return true;
	return (
		record.agentType === "custom" &&
		typeof record.name === "string" &&
		/^pi(?:\s|#|$)/i.test(record.name)
	);
}

export interface ConfigurationReadIssue {
	path: string;
	reason: string;
}

export interface LaunchAuditRow {
	location: string;
	command: string;
	commandState: ParsedPiCommand["kind"];
	resumeCommand?: string;
	resumeState?: ParsedPiCommand["kind"] | "missing";
	terminalId?: string;
	pinState?: ReturnType<typeof terminalPinState>["kind"];
	ephemeral: boolean;
}

function readJsonConfig(
	path: string,
	issues?: ConfigurationReadIssue[],
): any | undefined {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		issues?.push({ path, reason: (error as Error)?.message ?? String(error) });
		return undefined;
	}
}

interface ScannedConfiguration {
	kind: "preferences" | "workspace";
	path: string;
	data: any;
}

interface ConfigurationScan {
	documents: ScannedConfiguration[];
	issues: ConfigurationReadIssue[];
}

/** Read every persisted Maestri JSON source before interpreting any record. */
function scanLaunchConfigurations(configRoot: string): ConfigurationScan {
	const documents: ScannedConfiguration[] = [];
	const issues: ConfigurationReadIssue[] = [];
	const preferences = join(configRoot, "preferences.json");
	if (existsSync(preferences)) {
		const data = readJsonConfig(preferences, issues);
		if (data !== undefined)
			documents.push({ kind: "preferences", path: preferences, data });
	}

	const workspaces = join(configRoot, "workspaces");
	if (!existsSync(workspaces)) return { documents, issues };
	let names: string[];
	try {
		names = readdirSync(workspaces).sort();
	} catch (error) {
		issues.push({
			path: workspaces,
			reason: (error as Error)?.message ?? String(error),
		});
		return { documents, issues };
	}
	for (const workspace of names) {
		const path = join(workspaces, workspace, "workspace.json");
		if (!existsSync(path)) continue;
		const data = readJsonConfig(path, issues);
		if (data !== undefined) documents.push({ kind: "workspace", path, data });
	}
	return { documents, issues };
}

export function collectLaunchAuditRows(
	configRoot: string,
	wrapperTarget: string,
	stateFor: (terminalId: string) => ReturnType<typeof terminalPinState> = (
		terminalId,
	) => terminalPinState(terminalId),
	issues: ConfigurationReadIssue[] = [],
): LaunchAuditRow[] {
	const rows: LaunchAuditRow[] = [];
	const scan = scanLaunchConfigurations(configRoot);
	issues.push(...scan.issues);
	for (const document of scan.documents) {
		if (document.kind === "preferences") {
			for (const preset of document.data?.payload?.agentPresets ?? []) {
				if (!preset || !isConfiguredPi(preset, wrapperTarget)) continue;
				const parsed = parsePiCommand(preset.command, wrapperTarget);
				rows.push({
					location: `preset:${preset.name ?? preset.id ?? "unknown"}`,
					command: String(preset.command ?? ""),
					commandState: parsed.kind,
					ephemeral: parsed.ephemeral,
				});
			}
			continue;
		}
		for (const node of document.data?.payload?.nodes ?? []) {
			const terminal = node?.content?.terminal?._0;
			if (!terminal || !isConfiguredPi(terminal, wrapperTarget)) continue;
			const command = parsePiCommand(terminal.command, wrapperTarget);
			const resume =
				terminal.resumeCommand === undefined
					? undefined
					: parsePiCommand(terminal.resumeCommand, wrapperTarget);
			const terminalId =
				typeof terminal.id === "string" && isValidTerminalId(terminal.id)
					? terminal.id
					: undefined;
			rows.push({
				location: `terminal:${terminal.name ?? terminal.id ?? node.id ?? "unknown"}`,
				command: String(terminal.command ?? ""),
				commandState: command.kind,
				resumeCommand: terminal.resumeCommand,
				resumeState: resume?.kind ?? "missing",
				terminalId,
				pinState: terminalId ? stateFor(terminalId).kind : undefined,
				ephemeral: command.ephemeral,
			});
		}
	}
	return rows;
}

export interface TerminalLaunchConfiguration {
	command: string;
	commandState: ParsedPiCommand["kind"];
	resumeCommand?: string;
	resumeState: ParsedPiCommand["kind"] | "missing";
	protected: boolean;
}

export function findTerminalLaunchConfiguration(
	configRoot: string,
	terminalId: string,
	wrapperTarget: string,
	issues: ConfigurationReadIssue[] = [],
): TerminalLaunchConfiguration | undefined {
	if (!isValidTerminalId(terminalId)) return undefined;
	const scan = scanLaunchConfigurations(configRoot);
	issues.push(...scan.issues);
	for (const document of scan.documents) {
		if (document.kind !== "workspace") continue;
		for (const node of document.data?.payload?.nodes ?? []) {
			const terminal = node?.content?.terminal?._0;
			if (terminal?.id !== terminalId) continue;
			const command = parsePiCommand(terminal.command, wrapperTarget);
			const resume =
				terminal.resumeCommand === undefined
					? undefined
					: parsePiCommand(terminal.resumeCommand, wrapperTarget);
			return {
				command: String(terminal.command ?? ""),
				commandState: command.kind,
				resumeCommand: terminal.resumeCommand,
				resumeState: resume?.kind ?? "missing",
				protected: command.kind === "wrapper" && resume?.kind === "wrapper",
			};
		}
	}
	return undefined;
}
