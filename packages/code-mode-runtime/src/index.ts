const encoder = new TextEncoder();
export const CODE_MODE_LIMITS = {
	codeBytes: 65_536,
	thinkingBytes: 8_192,
	stateBytes: 262_144,
	outputBytes: 65_536,
	ioBytes: 1_048_576,
	timeoutMs: 300_000,
	grantEnvironmentNames: 3,
	grantEgressOrigins: 16,
	grantAdapterArguments: 16,
} as const;

export const CODE_TOOL_NAMES = [
	"Read",
	"Write",
	"Edit",
	"Bash",
	"Glob",
	"rg",
	"fd",
	"WebFetch",
	"sleep",
] as const;
export type CodeToolNameV1 = (typeof CODE_TOOL_NAMES)[number];
export type CodeEnvironmentNameV1 = "LANG" | "LC_ALL" | "TZ";

export interface CodeExecutionRequestV1 {
	version: 1;
	thinking: string;
	code: string;
	timeoutMs?: number;
}
export interface CodeSessionStateV1 {
	version: 1;
	revision: number;
	values: Readonly<Record<string, unknown>>;
}
export interface CodeExecutionOutcomeV1 {
	version: 1;
	operationId: string;
	paramsDigest: string;
	output: string;
	state: CodeSessionStateV1;
	elapsedMs: number;
}
export interface SandboxCommandAdapterV1 {
	version: 1;
	executable: string;
	arguments: readonly string[];
}
export interface SandboxCapabilityGrantV1 {
	version: 1;
	tools: readonly CodeToolNameV1[];
	environment: readonly CodeEnvironmentNameV1[];
	egressOrigins: readonly string[];
	commandAdapter?: SandboxCommandAdapterV1;
}
export type SandboxQueryV1 =
	| { kind: "unknown" | "pending" | "indeterminate" | "conflict" }
	| { kind: "terminal"; outcome: CodeExecutionOutcomeV1 };
export interface SandboxExecutionIntentV2 {
	version: 2;
	operationId: string;
	paramsDigest: string;
	request: CodeExecutionRequestV1;
	state: CodeSessionStateV1;
	grant: SandboxCapabilityGrantV1;
}
export interface SandboxHost {
	query(operationId: string, paramsDigest: string): Promise<SandboxQueryV1>;
	execute(intent: SandboxExecutionIntentV2): Promise<CodeExecutionOutcomeV1>;
}

function byteLength(value: string): number {
	return encoder.encode(value).byteLength;
}
function exact(
	value: unknown,
	keys: readonly string[],
	label: string,
): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new Error(label);
	const object = value as Record<string, unknown>;
	const actual = Object.keys(object).sort();
	const expected = [...keys].sort();
	if (
		actual.length !== expected.length ||
		actual.some((key, index) => key !== expected[index])
	)
		throw new Error(label);
	return object;
}
function validOperationId(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length > 0 &&
		value.length <= 256 &&
		/^[a-zA-Z0-9._:-]+$/.test(value)
	);
}
function validDigest(value: unknown): value is string {
	return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function validateJson(value: unknown, label: string): string {
	const seen = new Set<object>();
	let nodes = 0;
	const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current || ++nodes > 10_000 || current.depth > 32)
			throw new Error(label);
		const item = current.value;
		if (item === null || typeof item === "string" || typeof item === "boolean")
			continue;
		if (typeof item === "number") {
			if (!Number.isFinite(item)) throw new Error(label);
			continue;
		}
		if (typeof item !== "object" || seen.has(item)) throw new Error(label);
		seen.add(item);
		if (!Array.isArray(item)) {
			const prototype = Object.getPrototypeOf(item);
			if (prototype !== Object.prototype && prototype !== null)
				throw new Error(label);
		}
		for (const child of Object.values(item as Record<string, unknown>))
			stack.push({ value: child, depth: current.depth + 1 });
	}
	const serialized = JSON.stringify(value);
	if (byteLength(serialized) > CODE_MODE_LIMITS.stateBytes)
		throw new Error(label);
	return serialized;
}
function exactStringList(
	value: unknown,
	allowed: ReadonlySet<string>,
	maximum: number,
	label: string,
): string[] {
	if (!Array.isArray(value) || value.length > maximum) throw new Error(label);
	const result: string[] = [];
	for (const item of value) {
		if (typeof item !== "string" || !allowed.has(item) || result.includes(item))
			throw new Error(label);
		result.push(item);
	}
	return result;
}
function decodeCommandAdapter(value: unknown): SandboxCommandAdapterV1 {
	const object = exact(
		value,
		["version", "executable", "arguments"],
		"invalid_sandbox_capability_grant_v1",
	);
	if (
		object.version !== 1 ||
		typeof object.executable !== "string" ||
		!object.executable.startsWith("/") ||
		byteLength(object.executable) > 4_096 ||
		!Array.isArray(object.arguments) ||
		object.arguments.length > CODE_MODE_LIMITS.grantAdapterArguments ||
		object.arguments.some(
			(argument) =>
				typeof argument !== "string" || byteLength(argument) > 4_096,
		)
	)
		throw new Error("invalid_sandbox_capability_grant_v1");
	return {
		version: 1,
		executable: object.executable,
		arguments: [...(object.arguments as string[])],
	};
}
export function decodeSandboxCapabilityGrant(
	value: unknown,
): SandboxCapabilityGrantV1 {
	const hasAdapter =
		typeof (value as Record<string, unknown>)?.commandAdapter !== "undefined";
	const object = exact(
		value,
		hasAdapter
			? ["version", "tools", "environment", "egressOrigins", "commandAdapter"]
			: ["version", "tools", "environment", "egressOrigins"],
		"invalid_sandbox_capability_grant_v1",
	);
	if (object.version !== 1)
		throw new Error("invalid_sandbox_capability_grant_v1");
	const tools = exactStringList(
		object.tools,
		new Set(CODE_TOOL_NAMES),
		CODE_TOOL_NAMES.length,
		"invalid_sandbox_capability_grant_v1",
	) as CodeToolNameV1[];
	const environment = exactStringList(
		object.environment,
		new Set(["LANG", "LC_ALL", "TZ"]),
		CODE_MODE_LIMITS.grantEnvironmentNames,
		"invalid_sandbox_capability_grant_v1",
	) as CodeEnvironmentNameV1[];
	if (
		!Array.isArray(object.egressOrigins) ||
		object.egressOrigins.length > CODE_MODE_LIMITS.grantEgressOrigins
	)
		throw new Error("invalid_sandbox_capability_grant_v1");
	const egressOrigins: string[] = [];
	for (const item of object.egressOrigins) {
		if (typeof item !== "string" || byteLength(item) > 2_048)
			throw new Error("invalid_sandbox_capability_grant_v1");
		let parsed: URL;
		try {
			parsed = new URL(item);
		} catch {
			throw new Error("invalid_sandbox_capability_grant_v1");
		}
		if (
			(parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
			parsed.origin !== item ||
			parsed.username ||
			parsed.password ||
			egressOrigins.includes(item)
		)
			throw new Error("invalid_sandbox_capability_grant_v1");
		egressOrigins.push(item);
	}
	const commandAdapter = hasAdapter
		? decodeCommandAdapter(object.commandAdapter)
		: undefined;
	const commandTools = tools.some((tool) =>
		["Bash", "Glob", "rg", "fd"].includes(tool),
	);
	if (commandTools !== Boolean(commandAdapter))
		throw new Error("invalid_sandbox_capability_grant_v1");
	return {
		version: 1,
		tools,
		environment,
		egressOrigins,
		...(commandAdapter ? { commandAdapter } : {}),
	};
}
export function decodeCodeExecutionOutcome(
	value: unknown,
	expected: {
		operationId: string;
		paramsDigest: string;
		stateRevision: number;
	},
): CodeExecutionOutcomeV1 {
	const {
		operationId,
		paramsDigest,
		stateRevision: expectedRevision,
	} = expected;
	const object = exact(
		value,
		["version", "operationId", "paramsDigest", "output", "state", "elapsedMs"],
		"invalid_code_execution_outcome_v1",
	);
	if (
		object.version !== 1 ||
		object.operationId !== operationId ||
		object.paramsDigest !== paramsDigest ||
		typeof object.output !== "string" ||
		!Number.isSafeInteger(object.elapsedMs) ||
		Number(object.elapsedMs) < 0
	)
		throw new Error("invalid_code_execution_outcome_v1");
	const state = decodeCodeSessionState(object.state);
	if (state.revision !== expectedRevision)
		throw new Error("invalid_code_execution_outcome_v1");
	return {
		version: 1,
		operationId,
		paramsDigest,
		output: boundCodeOutput(object.output),
		state,
		elapsedMs: Number(object.elapsedMs),
	};
}
export function decodeCodeExecutionRequest(
	value: unknown,
): CodeExecutionRequestV1 {
	const optional =
		typeof (value as Record<string, unknown>)?.timeoutMs !== "undefined";
	const object = exact(
		value,
		optional
			? ["version", "thinking", "code", "timeoutMs"]
			: ["version", "thinking", "code"],
		"invalid_code_execution_request_v1",
	);
	if (
		object.version !== 1 ||
		typeof object.thinking !== "string" ||
		!object.thinking.trim() ||
		byteLength(object.thinking) > CODE_MODE_LIMITS.thinkingBytes ||
		typeof object.code !== "string" ||
		!object.code.trim() ||
		byteLength(object.code) > CODE_MODE_LIMITS.codeBytes
	)
		throw new Error("invalid_code_execution_request_v1");
	if (
		object.timeoutMs !== undefined &&
		(!Number.isSafeInteger(object.timeoutMs) ||
			Number(object.timeoutMs) < 1 ||
			Number(object.timeoutMs) > CODE_MODE_LIMITS.timeoutMs)
	)
		throw new Error("invalid_code_execution_request_v1");
	return {
		version: 1,
		thinking: object.thinking,
		code: object.code,
		...(object.timeoutMs === undefined
			? {}
			: { timeoutMs: Number(object.timeoutMs) }),
	};
}
export function decodeCodeSessionState(value: unknown): CodeSessionStateV1 {
	const object = exact(
		value,
		["version", "revision", "values"],
		"invalid_code_session_state_v1",
	);
	if (
		object.version !== 1 ||
		!Number.isSafeInteger(object.revision) ||
		Number(object.revision) < 0 ||
		typeof object.values !== "object" ||
		object.values === null ||
		Array.isArray(object.values)
	)
		throw new Error("invalid_code_session_state_v1");
	validateJson(object.values, "invalid_code_session_state_v1");
	return {
		version: 1,
		revision: Number(object.revision),
		values: structuredClone(object.values as Record<string, unknown>),
	};
}
export function boundCodeOutput(value: string): string {
	const bytes = encoder.encode(value);
	if (bytes.byteLength <= CODE_MODE_LIMITS.outputBytes) return value;
	const suffix = "\n[output truncated by code-mode runtime]";
	const contentLimit = CODE_MODE_LIMITS.outputBytes - byteLength(suffix);
	let content = new TextDecoder().decode(bytes.slice(0, contentLimit));
	while (byteLength(content + suffix) > CODE_MODE_LIMITS.outputBytes)
		content = content.slice(0, -1);
	return content + suffix;
}
export class CodeExecutionEngine {
	constructor(private readonly host: SandboxHost) {}
	async execute(
		operationId: string,
		paramsDigest: string,
		requestValue: unknown,
		stateValue: unknown,
		grantValue: unknown,
	): Promise<CodeExecutionOutcomeV1> {
		if (!validOperationId(operationId) || !validDigest(paramsDigest))
			throw new Error("invalid_code_execution_identity");
		const request = decodeCodeExecutionRequest(requestValue);
		const state = decodeCodeSessionState(stateValue);
		const grant = decodeSandboxCapabilityGrant(grantValue);
		const query = await this.host.query(operationId, paramsDigest);
		const existing = exact(
			query,
			query &&
				typeof query === "object" &&
				(query as { kind?: unknown }).kind === "terminal"
				? ["kind", "outcome"]
				: ["kind"],
			"invalid_sandbox_query_v1",
		);
		if (existing.kind === "terminal")
			return decodeCodeExecutionOutcome(existing.outcome, {
				operationId,
				paramsDigest,
				stateRevision: state.revision + 1,
			});
		if (existing.kind === "conflict")
			throw new Error("code_operation_conflict");
		if (existing.kind === "pending" || existing.kind === "indeterminate")
			throw new Error(`code_operation_${existing.kind}`);
		if (existing.kind !== "unknown")
			throw new Error("invalid_sandbox_query_v1");
		return decodeCodeExecutionOutcome(
			await this.host.execute({
				version: 2,
				operationId,
				paramsDigest,
				request,
				state,
				grant,
			}),
			{ operationId, paramsDigest, stateRevision: state.revision + 1 },
		);
	}
}

function base64Json(value: unknown): string {
	const bytes = encoder.encode(JSON.stringify(value));
	let binary = "";
	for (let offset = 0; offset < bytes.byteLength; offset += 32_768)
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
	return btoa(binary);
}

const SANDBOX_BOOTSTRAP = `
(() => {
	const hostCall = globalThis.__bridge;
	const toolNames = JSON.parse(globalThis.__toolsJson);
	const state = JSON.parse(globalThis.__stateJson);
	delete globalThis.__bridge;
	delete globalThis.__toolsJson;
	delete globalThis.__stateJson;
	const invoke = async (name, input) => {
		const envelope = JSON.parse(
			await hostCall(JSON.stringify({ name, input })),
		);
		if (!envelope || envelope.ok !== true) {
			const error = new Error(envelope?.code ?? "capability_denied");
			error.code = envelope?.code ?? "capability_denied";
			throw error;
		}
		if (envelope.undefined === true) return undefined;
		return envelope.value;
	};
	for (const name of toolNames) {
		Object.defineProperty(globalThis, name, {
			value: async (input) => invoke(name, input),
			writable: false,
			configurable: false,
		});
	}
	Object.defineProperty(globalThis, "$", {
		value: state,
		writable: false,
		configurable: false,
	});
	const record = (...items) => {
		let payload;
		try {
			payload = JSON.stringify({ name: "console", input: items });
		} catch {
			payload = JSON.stringify({ name: "console", input: ["[unserializable]"] });
		}
		void hostCall(payload);
	};
	Object.defineProperty(globalThis, "console", {
		value: Object.freeze({ log: record, error: record }),
		writable: false,
		configurable: false,
	});
	Object.defineProperty(globalThis, "__kaliStateJson", {
		value: () => JSON.stringify(state),
		writable: false,
		configurable: false,
	});
})();
`;

export function buildBunHandsRunner(intent: SandboxExecutionIntentV2): string {
	if (
		intent.version !== 2 ||
		!validOperationId(intent.operationId) ||
		!validDigest(intent.paramsDigest)
	)
		throw new Error("invalid_sandbox_execution_intent_v2");
	const normalized: SandboxExecutionIntentV2 = {
		version: 2,
		operationId: intent.operationId,
		paramsDigest: intent.paramsDigest,
		request: decodeCodeExecutionRequest(intent.request),
		state: decodeCodeSessionState(intent.state),
		grant: decodeSandboxCapabilityGrant(intent.grant),
	};
	const encoded = base64Json(normalized);
	return `import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { Script, createContext } from "node:vm";
const I = JSON.parse(Buffer.from(${JSON.stringify(encoded)}, "base64").toString("utf8"));
const IO_LIMIT = ${CODE_MODE_LIMITS.ioBytes};
const OUTPUT_LIMIT = ${CODE_MODE_LIMITS.outputBytes};
const STATE_LIMIT = ${CODE_MODE_LIMITS.stateBytes};
const started = performance.now();
const timeoutMs = I.request.timeoutMs ?? ${CODE_MODE_LIMITS.timeoutMs};
const deadline = started + timeoutMs;
const children = new Set();
const fetchControllers = new Set();
const timedOut = () => Object.assign(new Error("code_execution_timed_out"), { code: "code_execution_timed_out" });
const remaining = () => { const value = Math.floor(deadline - performance.now()); if (value < 1) throw timedOut(); return value; };
const abortAll = () => { for (const fetchController of fetchControllers) fetchController.abort(); for (const child of children) { try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch {} try { child.kill("SIGKILL"); } catch {} } };
const withinDeadline = (promise, onTimeout) => new Promise((resolveValue, rejectValue) => { let timer; try { timer = setTimeout(() => { try { onTimeout?.(); } catch {} abortAll(); rejectValue(timedOut()); }, remaining()); } catch (error) { rejectValue(error); return; } Promise.resolve(promise).then(resolveValue, rejectValue).finally(() => clearTimeout(timer)); });
const cleanupFetch = async (cancel, fetchController) => { try { await withinDeadline(Promise.resolve().then(cancel), () => fetchController.abort()); } catch (error) { if (error?.code === "code_execution_timed_out") throw error; } finally { fetchController.abort(); } };
const root = await realpath(process.cwd());
const inside = (path) => { const rel = relative(root, path); return rel === "" || (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel)); };
const denied = () => Object.assign(new Error("capability_denied"), { code: "capability_denied" });
const pathText = (value) => { if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > 4096) throw denied(); return value; };
const lexical = (path, cwd = ".") => { const base = resolve(root, pathText(cwd)); if (!inside(base)) throw denied(); const target = resolve(base, pathText(path)); if (!inside(target)) throw denied(); return target; };
const existing = async (path, cwd = ".") => { const resolved = await realpath(lexical(path, cwd)); if (!inside(resolved)) throw denied(); return resolved; };
const writable = async (path, cwd = ".") => { const target = lexical(path, cwd); try { await lstat(target); return await existing(path, cwd); } catch (error) { if (error?.code !== "ENOENT") throw error; const parentPath = dirname(target); let ancestor = parentPath; while (true) { try { const resolved = await realpath(ancestor); if (!inside(resolved)) throw denied(); break; } catch (parentError) { if (parentError?.code !== "ENOENT") throw parentError; const next = dirname(ancestor); if (next === ancestor) throw denied(); ancestor = next; } } await withinDeadline(mkdir(parentPath, { recursive: true })); const parent = await realpath(parentPath); if (!inside(parent)) throw denied(); return target; } };
const bounded = (value, limit, code) => { if (typeof value !== "string" || Buffer.byteLength(value) > limit) throw Object.assign(new Error(code), { code }); return value; };
const readBounded = async (path, cwd = ".") => { remaining(); const bytes = await withinDeadline(readFile(await existing(path, cwd))); if (bytes.byteLength > IO_LIMIT) throw Object.assign(new Error("read_limit_exceeded"), { code: "read_limit_exceeded" }); try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw Object.assign(new Error("read_invalid_utf8"), { code: "read_invalid_utf8" }); } };
const granted = new Set(I.grant.tools);
const requireTool = (name) => { if (!granted.has(name)) throw Object.assign(new Error("capability_denied"), { code: "capability_denied" }); remaining(); };
const safeEnv = Object.create(null); for (const name of I.grant.environment) { const value = process.env[name]; if (value !== undefined) safeEnv[name] = value; }
const runAdapter = async (tool, input) => { requireTool(tool); const adapter = I.grant.commandAdapter; if (!adapter) throw denied(); const payload = bounded(JSON.stringify({ version: 1, tool, workspaceRoot: root, input }), IO_LIMIT, "command_limit_exceeded"); const child = spawn(adapter.executable, adapter.arguments, { cwd: root, env: safeEnv, detached: true, stdio: ["pipe", "pipe", "pipe"] }); children.add(child); child.stdin.end(payload); const stdout = [], stderr = []; let outBytes = 0, errBytes = 0; const capture = (chunks, chunk, current) => { if (current >= IO_LIMIT) return current; const kept = chunk.subarray(0, IO_LIMIT - current); chunks.push(kept); return current + kept.byteLength; }; child.stdout.on("data", (chunk) => { outBytes = capture(stdout, chunk, outBytes); }); child.stderr.on("data", (chunk) => { errBytes = capture(stderr, chunk, errBytes); }); const exitCode = await withinDeadline(new Promise((resolveExit, rejectExit) => { child.on("error", rejectExit); child.on("close", resolveExit); }), () => { try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch {} try { child.kill("SIGKILL"); } catch {} }); children.delete(child); if (exitCode !== 0) throw Object.assign(new Error("command_adapter_failed"), { code: "command_adapter_failed" }); let result; try { result = JSON.parse(Buffer.concat(stdout).toString("utf8")); } catch { throw Object.assign(new Error("command_adapter_invalid"), { code: "command_adapter_invalid" }); } const keys = result && typeof result === "object" && !Array.isArray(result) ? Object.keys(result).sort().join(",") : ""; if (!result || (keys !== "exitCode,stderr,stderrTruncated,stdout,stdoutTruncated" && keys !== "exitCode,stderr,stderrTruncated,stdout,stdoutTruncated,timedOut") || !Number.isSafeInteger(result.exitCode) || typeof result.stdout !== "string" || typeof result.stderr !== "string" || typeof result.stdoutTruncated !== "boolean" || typeof result.stderrTruncated !== "boolean" || (result.timedOut !== undefined && typeof result.timedOut !== "boolean") || Buffer.byteLength(result.stdout) > IO_LIMIT || Buffer.byteLength(result.stderr) > IO_LIMIT || errBytes > 0) throw Object.assign(new Error("command_adapter_invalid"), { code: "command_adapter_invalid" }); return result; };
const truncated = (value, wasTruncated) => { if (!wasTruncated) return value; const suffix = "\\n[output truncated by code-mode runtime]"; let kept = Buffer.from(value).subarray(0, Math.max(0, IO_LIMIT - Buffer.byteLength(suffix))).toString("utf8"); while (Buffer.byteLength(kept + suffix) > IO_LIMIT) kept = kept.slice(0, -1); return kept + suffix; };
const handlers = Object.create(null);
if (granted.has("Read")) handlers.Read = async ({ path, cwd = ".", offset, limit, optional = false }) => { requireTool("Read"); if ((offset !== undefined && (!Number.isSafeInteger(offset) || offset < 1)) || (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) || typeof optional !== "boolean") throw Object.assign(new Error("invalid_read_options"), { code: "invalid_read_options" }); let value; try { value = await readBounded(path, cwd); } catch (error) { if (optional && error?.code === "ENOENT") return null; throw error; } if (offset === undefined && limit === undefined) return value; const lines = value.split("\\n"); const start = (offset ?? 1) - 1; return lines.slice(start, limit === undefined ? lines.length : start + limit).join("\\n"); };
if (granted.has("Write")) handlers.Write = async ({ path, cwd = ".", content }) => { requireTool("Write"); bounded(content, IO_LIMIT, "write_limit_exceeded"); await withinDeadline(writeFile(await writable(path, cwd), content)); };
if (granted.has("Edit")) handlers.Edit = async ({ path, cwd = ".", oldText, newText }) => { requireTool("Edit"); if (typeof oldText !== "string" || typeof newText !== "string") throw Object.assign(new Error("invalid_edit_content"), { code: "invalid_edit_content" }); const target = await existing(path, cwd), value = await readBounded(path, cwd); if (!value.includes(oldText)) return { matched: false }; const edited = value.replace(oldText, newText); bounded(edited, IO_LIMIT, "write_limit_exceeded"); await withinDeadline(writeFile(target, edited)); return { matched: true }; };
if (granted.has("Bash")) handlers.Bash = async ({ command, cwd = ".", timeout }) => { await existing(cwd); if (timeout !== undefined && (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0)) throw Object.assign(new Error("invalid_command_timeout"), { code: "invalid_command_timeout" }); const result = await runAdapter("Bash", { command: bounded(command, IO_LIMIT, "command_limit_exceeded"), cwd, ...(timeout === undefined ? {} : { timeout }) }); return { stdout: truncated(result.stdout, result.stdoutTruncated), stderr: truncated(result.stderr, result.stderrTruncated), exitCode: result.exitCode, ...(result.timedOut === undefined ? {} : { timedOut: result.timedOut }) }; };
if (granted.has("Glob")) handlers.Glob = async ({ pattern, path = "." }) => { await existing(path); const result = await runAdapter("Glob", { pattern: bounded(pattern, 4096, "command_limit_exceeded"), path }); if (result.stdoutTruncated || result.stderrTruncated || result.exitCode !== 0 || result.stderr.trim()) throw Object.assign(new Error("command_adapter_failed"), { code: "command_adapter_failed" }); return result.stdout.trim().split("\\n").filter(Boolean); };
if (granted.has("rg")) handlers.rg = async ({ args, cwd = ".", follow = true }) => { await existing(cwd); if (typeof follow !== "boolean") throw Object.assign(new Error("invalid_command_follow"), { code: "invalid_command_follow" }); const result = await runAdapter("rg", { args: bounded(args, IO_LIMIT, "command_limit_exceeded"), cwd, follow }); if (result.stdoutTruncated || result.stderrTruncated) throw Object.assign(new Error("command_output_truncated"), { code: "command_output_truncated" }); if (!result.stdout && result.stderr.trim()) throw Object.assign(new Error("command_adapter_failed"), { code: "command_adapter_failed" }); return result.stdout; };
if (granted.has("fd")) handlers.fd = async ({ args, cwd = ".", follow = true }) => { await existing(cwd); if (typeof follow !== "boolean") throw Object.assign(new Error("invalid_command_follow"), { code: "invalid_command_follow" }); const result = await runAdapter("fd", { args: bounded(args, IO_LIMIT, "command_limit_exceeded"), cwd, follow }); if (result.stdoutTruncated || result.stderrTruncated) throw Object.assign(new Error("command_output_truncated"), { code: "command_output_truncated" }); if (!result.stdout && result.stderr.trim()) throw Object.assign(new Error("command_adapter_failed"), { code: "command_adapter_failed" }); return result.stdout; };
const htmlText = (html) => html.replace(/<\\s*(script|style|noscript)[^>]*>[\\s\\S]*?<\\s*\\/\\1\\s*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();
const htmlMarkdown = (html) => html.replace(/<\\s*(script|style|noscript|meta|link)[^>]*>[\\s\\S]*?<\\s*\\/\\1\\s*>/gi, "").replace(/<\\s*br\\s*\\/?>/gi, "\\n").replace(/<\\s*\\/\\s*(p|div|section|article|header|footer|ul|ol|pre|blockquote)\\s*>/gi, "\\n\\n").replace(/<\\s*li[^>]*>/gi, "- ").replace(/<\\s*\\/\\s*li\\s*>/gi, "\\n").replace(/<\\s*h([1-6])[^>]*>/gi, (_, level) => "#".repeat(Number(level)) + " ").replace(/<\\s*\\/\\s*h[1-6]\\s*>/gi, "\\n\\n").replace(/<\\s*(strong|b)[^>]*>/gi, "**").replace(/<\\s*\\/\\s*(strong|b)\\s*>/gi, "**").replace(/<\\s*(em|i)[^>]*>/gi, "_").replace(/<\\s*\\/\\s*(em|i)\\s*>/gi, "_").replace(/<\\s*code[^>]*>/gi, String.fromCharCode(96)).replace(/<\\s*\\/\\s*code\\s*>/gi, String.fromCharCode(96)).replace(/<[^>]+>/g, "").replace(/\\n[ \\t]+/g, "\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
if (granted.has("WebFetch")) handlers.WebFetch = async ({ url, format = "text", timeout = 30 }) => {
  requireTool("WebFetch");
  if (!(["text", "markdown", "html"].includes(format)) || typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0 || timeout > 120) throw Object.assign(new Error("invalid_fetch_options"), { code: "invalid_fetch_options" });
  let target;
  try { target = new URL(url); } catch { throw Object.assign(new Error("egress_denied"), { code: "egress_denied" }); }
  if ((target.protocol !== "https:" && target.protocol !== "http:") || target.username || target.password || !I.grant.egressOrigins.includes(target.origin)) throw Object.assign(new Error("egress_denied"), { code: "egress_denied" });
  const fetchController = new AbortController();
  fetchControllers.add(fetchController);
  const fetchDeadline = Math.min(deadline, performance.now() + timeout * 1000);
  const fetchRemaining = () => { const value = Math.floor(fetchDeadline - performance.now()); if (value < 1) { if (fetchDeadline === deadline) throw timedOut(); throw Object.assign(new Error("fetch_timed_out"), { code: "fetch_timed_out" }); } return value; };
  const withinFetch = (promise) => new Promise((resolveValue, rejectValue) => { let timer; try { timer = setTimeout(() => { fetchController.abort(); if (fetchDeadline === deadline) { abortAll(); rejectValue(timedOut()); } else rejectValue(Object.assign(new Error("fetch_timed_out"), { code: "fetch_timed_out" })); }, fetchRemaining()); } catch (error) { rejectValue(error); return; } Promise.resolve(promise).then(resolveValue, rejectValue).finally(() => clearTimeout(timer)); });
  try {
    const response = await withinFetch(fetch(target, { redirect: "manual", signal: fetchController.signal }));
    if ((response.status >= 300 && response.status <= 399) || response.type === "opaqueredirect") {
      await cleanupFetch(() => response.body?.cancel(), fetchController);
      throw Object.assign(new Error("egress_denied"), { code: "egress_denied" });
    }
    if (!response.ok) {
      await cleanupFetch(() => response.body?.cancel(), fetchController);
      throw Object.assign(new Error("fetch_http_error"), { code: "fetch_http_error" });
    }
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\\d+$/.test(declared) || Number(declared) > IO_LIMIT)) {
      await cleanupFetch(() => response.body?.cancel(), fetchController);
      throw Object.assign(new Error("fetch_limit_exceeded"), { code: "fetch_limit_exceeded" });
    }
    const reader = response.body?.getReader();
    const chunks = [];
    let total = 0;
    if (reader) {
      while (true) {
        const next = await withinFetch(reader.read());
        if (next.done) break;
        total += next.value.byteLength;
        if (total > IO_LIMIT) {
          await cleanupFetch(() => reader.cancel(), fetchController);
          throw Object.assign(new Error("fetch_limit_exceeded"), { code: "fetch_limit_exceeded" });
        }
        chunks.push(next.value);
      }
    }
    const body = Buffer.concat(chunks).toString("utf8");
    return format === "html" ? body : format === "markdown" ? htmlMarkdown(body) : htmlText(body);
  } finally {
    fetchControllers.delete(fetchController);
  }
};
if (granted.has("sleep")) handlers.sleep = async (milliseconds) => { requireTool("sleep"); if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw Object.assign(new Error("invalid_sleep"), { code: "invalid_sleep" }); await withinDeadline(new Promise((resolveSleep) => setTimeout(resolveSleep, Math.min(milliseconds, remaining())))); };
for (const name of ${JSON.stringify(CODE_TOOL_NAMES)}) if (typeof handlers[name] !== "function") handlers[name] = async () => { throw denied(); };
const logs = []; let logBytes = 0;
const record = (...items) => { if (logBytes >= OUTPUT_LIMIT) return null; let line; try { line = items.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" "); } catch { line = "[unserializable]"; } const bytes = Buffer.from(line + "\\n"); const kept = bytes.subarray(0, OUTPUT_LIMIT - logBytes); logs.push(kept); logBytes += kept.byteLength; return null; };
handlers.console = (items) => { if (!Array.isArray(items)) throw Object.assign(new Error("invalid_console_input"), { code: "invalid_console_input" }); return record(...items); };
const bridgeCode = (error) => typeof error?.code === "string" && /^[a-z0-9_]+$/.test(error.code) && error.code.length <= 64 ? error.code : "code_execution_failed";
const bridge = async (payload) => { try { bounded(payload, IO_LIMIT, "bridge_limit_exceeded"); const call = JSON.parse(payload); if (!call || typeof call !== "object" || Array.isArray(call) || Object.keys(call).sort().join(",") !== "input,name" || typeof call.name !== "string") throw Object.assign(new Error("capability_denied"), { code: "capability_denied" }); const handler = handlers[call.name]; if (typeof handler !== "function") throw Object.assign(new Error("capability_denied"), { code: "capability_denied" }); const value = await handler(call.input); const response = JSON.stringify(value === undefined ? { ok: true, undefined: true } : { ok: true, value }); if (Buffer.byteLength(response) > IO_LIMIT * 2 + 4096) throw Object.assign(new Error("bridge_limit_exceeded"), { code: "bridge_limit_exceeded" }); return response; } catch (error) { return JSON.stringify({ ok: false, code: bridgeCode(error) }); } };
const context = createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
context.__bridge = bridge;
context.__toolsJson = JSON.stringify(${JSON.stringify(CODE_TOOL_NAMES)});
context.__stateJson = JSON.stringify(I.state.values);
try {
	new Script(${JSON.stringify(SANDBOX_BOOTSTRAP)}).runInContext(context, { timeout: remaining() });
const importDenied = () => new Script("Promise.reject(Object.assign(new Error('capability_denied'), { code: 'capability_denied' }))").runInContext(context);
const script = new Script("(async () => {\\n" + I.request.code + "\\n})()", { filename: "agent-code.js", importModuleDynamically: importDenied });
	const execution = script.runInContext(context, { timeout: remaining() });
	await withinDeadline(execution);
	remaining();
	const valuesJson = new Script("globalThis.__kaliStateJson()").runInContext(context, { timeout: remaining() });
	bounded(valuesJson, STATE_LIMIT, "state_limit_exceeded");
	const outcome = { version: 1, operationId: I.operationId, paramsDigest: I.paramsDigest, output: Buffer.concat(logs).toString("utf8").replace(/\\n$/, ""), state: { version: 1, revision: I.state.revision + 1, values: JSON.parse(valuesJson) }, elapsedMs: Math.max(0, Math.floor(performance.now() - started)) };
	process.stdout.write("__KALI_CODE_MODE_V1__" + Buffer.from(JSON.stringify(outcome)).toString("base64") + "\\n");
} catch (error) { abortAll(); const timeout = error?.code === "code_execution_timed_out" || error?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT"; process.stderr.write(timeout ? "code_execution_timed_out" : "code_execution_failed"); process.exitCode = 1; }`;
}
