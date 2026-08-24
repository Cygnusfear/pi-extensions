import { describe, expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import {
	boundCodeOutput,
	buildBunHandsRunner,
	CODE_MODE_LIMITS,
	CodeExecutionEngine,
	type CodeExecutionOutcomeV1,
	decodeCodeExecutionRequest,
	decodeCodeSessionState,
	decodeSandboxCapabilityGrant,
	type SandboxCapabilityGrantV1,
	type SandboxExecutionIntentV2,
	type SandboxHost,
} from "../src/index.ts";

const state = { version: 1 as const, revision: 0, values: {} };
const request = {
	version: 1 as const,
	thinking: "prove the operation",
	code: `$.count = ($.count ?? 0) + 1; console.log($.count)`,
};
const noTools: SandboxCapabilityGrantV1 = {
	version: 1,
	tools: [],
	environment: [],
	egressOrigins: [],
};
function outcome(): CodeExecutionOutcomeV1 {
	return {
		version: 1,
		operationId: "effect-request-0",
		paramsDigest: "a".repeat(64),
		output: "1",
		state: { version: 1, revision: 1, values: { count: 1 } },
		elapsedMs: 1,
	};
}
function intent(
	code: string,
	grant: SandboxCapabilityGrantV1,
): SandboxExecutionIntentV2 {
	return {
		version: 2,
		operationId: outcome().operationId,
		paramsDigest: outcome().paramsDigest,
		request: { ...request, code },
		state,
		grant,
	};
}
async function runRunner(
	value: SandboxExecutionIntentV2,
	cwd: string,
	environment: Record<string, string> = {},
	preload?: string,
) {
	const command = [
		process.execPath,
		...(preload ? ["--preload", preload] : []),
		"-e",
		buildBunHandsRunner(value),
	];
	const proc = Bun.spawn(command, {
		cwd,
		env: { ...process.env, ...environment },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}
function decodeMarker(stdout: string): CodeExecutionOutcomeV1 {
	const marker = stdout.trim().match(/^__KALI_CODE_MODE_V1__(.+)$/)?.[1];
	if (!marker) throw new Error("outcome marker missing");
	return JSON.parse(
		Buffer.from(marker, "base64").toString(),
	) as CodeExecutionOutcomeV1;
}

describe("CodeExecutionEngine", () => {
	test("queries before execute and replays a terminal outcome", async () => {
		let executes = 0;
		const terminal = outcome();
		const host: SandboxHost = {
			query: async () => ({ kind: "terminal", outcome: terminal }),
			execute: async () => {
				executes++;
				return terminal;
			},
		};
		expect(
			await new CodeExecutionEngine(host).execute(
				terminal.operationId,
				terminal.paramsDigest,
				request,
				state,
				noTools,
			),
		).toEqual(terminal);
		expect(executes).toBe(0);
	});

	test("forwards the caller cancellation signal to a new sandbox execution", async () => {
		const controller = new AbortController();
		let observed: AbortSignal | undefined;
		const terminal = outcome();
		const host: SandboxHost = {
			query: async () => ({ kind: "unknown" }),
			execute: async (_intent, signal) => {
				observed = signal;
				return terminal;
			},
		};
		expect(
			await new CodeExecutionEngine(host).execute(
				terminal.operationId,
				terminal.paramsDigest,
				request,
				state,
				noTools,
				controller.signal,
			),
		).toEqual(terminal);
		expect(observed).toBe(controller.signal);
	});

	test("rejects conflicts and invalid state advancement", async () => {
		const conflict: SandboxHost = {
			query: async () => ({ kind: "conflict" }),
			execute: async () => outcome(),
		};
		await expect(
			new CodeExecutionEngine(conflict).execute(
				"x",
				"b".repeat(64),
				request,
				state,
				noTools,
			),
		).rejects.toThrow("code_operation_conflict");
		const invalid: SandboxHost = {
			query: async () => ({ kind: "unknown" }),
			execute: async () => ({ ...outcome(), state }),
		};
		await expect(
			new CodeExecutionEngine(invalid).execute(
				outcome().operationId,
				outcome().paramsDigest,
				request,
				state,
				noTools,
			),
		).rejects.toThrow("invalid_code_execution_outcome_v1");
	});

	test("strictly rejects non-JSON state and malformed terminal replay", async () => {
		expect(() =>
			decodeCodeSessionState({
				version: 1,
				revision: 0,
				values: { missing: undefined },
			}),
		).toThrow("invalid_code_session_state_v1");
		expect(() =>
			decodeCodeSessionState({
				version: 1,
				revision: 0,
				values: { number: Number.NaN },
			}),
		).toThrow("invalid_code_session_state_v1");
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(() =>
			decodeCodeSessionState({ version: 1, revision: 0, values: cyclic }),
		).toThrow("invalid_code_session_state_v1");
		const malformed: SandboxHost = {
			query: async () => ({
				kind: "terminal",
				outcome: { ...outcome(), elapsedMs: -1 },
			}),
			execute: async () => outcome(),
		};
		await expect(
			new CodeExecutionEngine(malformed).execute(
				outcome().operationId,
				outcome().paramsDigest,
				request,
				state,
				noTools,
			),
		).rejects.toThrow("invalid_code_execution_outcome_v1");
	});

	test("requires typed command authority and a fixed safe environment set", () => {
		expect(() =>
			decodeSandboxCapabilityGrant({
				version: 1,
				tools: ["Bash"],
				environment: [],
				egressOrigins: [],
			}),
		).toThrow("invalid_sandbox_capability_grant_v1");
		expect(() =>
			decodeSandboxCapabilityGrant({
				version: 1,
				tools: [],
				environment: ["OPENAI_API_KEY"],
				egressOrigins: [],
			}),
		).toThrow("invalid_sandbox_capability_grant_v1");
		expect(
			decodeSandboxCapabilityGrant({
				version: 1,
				tools: ["WebFetch"],
				environment: [],
				egressOrigins: ["http://localhost:8080"],
			}).egressOrigins,
		).toEqual(["http://localhost:8080"]);
		expect(() =>
			decodeSandboxCapabilityGrant({
				version: 1,
				tools: ["WebFetch"],
				environment: [],
				egressOrigins: ["ftp://example.com"],
			}),
		).toThrow("invalid_sandbox_capability_grant_v1");
	});

	test("bounds UTF-8 output including the truncation marker", () => {
		const bounded = boundCodeOutput("🐉".repeat(CODE_MODE_LIMITS.outputBytes));
		expect(new TextEncoder().encode(bounded).byteLength).toBeLessThanOrEqual(
			CODE_MODE_LIMITS.outputBytes,
		);
		expect(bounded).toEndWith("[output truncated by code-mode runtime]");
	});
});

test("runner containment rule accepts Windows descendants only", () => {
	const root = "C:\\work\\repo";
	const inside = (target: string): boolean => {
		const relativePath = win32.relative(root, target);
		return (
			relativePath === "" ||
			(relativePath !== ".." &&
				!relativePath.startsWith(`..${win32.sep}`) &&
				!win32.isAbsolute(relativePath))
		);
	};
	expect(inside("C:\\work\\repo\\sub\\file.txt")).toBe(true);
	expect(inside("C:\\work\\repo-other\\file.txt")).toBe(false);
	expect(inside("D:\\work\\repo\\file.txt")).toBe(false);
	const runner = buildBunHandsRunner(intent("console.log('ok')", noTools));
	expect(runner).toContain(
		'import { dirname, isAbsolute, relative, resolve, sep } from "node:path";',
	);
	expect(runner).toContain("!isAbsolute(rel)");
});

test("generated runner keeps a fixed surface while enforcing subset file grants", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-runtime-"));
	const workspace = join(base, "workspace");
	try {
		await mkdir(workspace);
		await mkdir(join(base, "outside-dir"));
		await writeFile(join(base, "outside.txt"), "outside-readable");
		await symlink(join(base, "outside.txt"), join(workspace, "escape.txt"));
		await symlink(join(base, "outside-dir"), join(workspace, "escape-dir"));
		const grant: SandboxCapabilityGrantV1 = {
			version: 1,
			tools: ["Read", "Write"],
			environment: [],
			egressOrigins: [],
		};
		const result = await runRunner(
			intent(
				`await Write({path:"fact.txt",content:"durable 🐉"});
$.fact = await Read({path:"fact.txt"});
try { await Read({path:"escape.txt"}); } catch { console.log("outside denied"); }
try { await Write({path:"escape-dir/created/fact.txt",content:"escaped"}); } catch { console.log("write outside denied"); }
try { await Bash({command:"echo denied"}); } catch (error) { console.log(error.code); }
try { await WebFetch({url:"https://example.com"}); } catch (error) { console.log(error.code); }
try { $.constructor.constructor("return process")(); console.log("state escaped"); } catch { console.log("state denied"); }
try { console.log.constructor("return process")(); console.log("console escaped"); } catch { console.log("console denied"); }
console.log($.fact, typeof Bash, typeof process);`,
				grant,
			),
			workspace,
			{ SECRET_TOKEN: "must-not-leak" },
		);
		expect(result.exitCode, result.stderr).toBe(0);
		const decoded = decodeMarker(result.stdout);
		expect(decoded.output).toBe(
			"outside denied\nwrite outside denied\ncapability_denied\ncapability_denied\nstate denied\nconsole denied\ndurable 🐉 function undefined",
		);
		expect(decoded.output).not.toContain("outside-readable");
		expect(decoded.output).not.toContain("must-not-leak");
		expect(decoded.state.values).toEqual({ fact: "durable 🐉" });
		expect(await readFile(join(workspace, "fact.txt"), "utf8")).toBe(
			"durable 🐉",
		);
		await expect(
			readFile(join(base, "outside-dir", "created", "fact.txt"), "utf8"),
		).rejects.toThrow();
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("generated runner exposes the fixed surface for an empty grant and denies every call explicitly", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "code-mode-empty-grant-"));
	try {
		const result = await runRunner(
			intent(
				`console.log([typeof Read, typeof Write, typeof Edit, typeof Bash, typeof Glob, typeof rg, typeof fd, typeof WebFetch, typeof sleep].join(","));
for (const [name, call] of [["Read",()=>Read({path:"x"})],["Bash",()=>Bash({command:"true"})],["WebFetch",()=>WebFetch({url:"https://example.com"})],["sleep",()=>sleep(0)]]) { try { await call(); } catch (error) { console.log(name, error.code); } }`,
				noTools,
			),
			workspace,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe(
			"function,function,function,function,function,function,function,function,function\nRead capability_denied\nBash capability_denied\nWebFetch capability_denied\nsleep capability_denied",
		);
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
});

test("generated runner supports the complete fixed tool grant in one authority boundary", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-full-grant-"));
	const workspace = join(base, "workspace");
	const adapter = join(base, "adapter.mjs");
	const preload = join(base, "fetch-preload.mjs");
	const calls = join(base, "calls.jsonl");
	const allowedUrl = "https://allowed.example/full-grant";
	try {
		await mkdir(workspace);
		await writeFile(
			adapter,
			`import { appendFile } from "node:fs/promises";
const request = JSON.parse(await Bun.stdin.text());
await appendFile(${JSON.stringify(calls)}, JSON.stringify(request) + "\\n");
process.stdout.write(JSON.stringify({ exitCode: 0, stdout: "adapter-ok", stderr: "", stdoutTruncated: false, stderrTruncated: false }));`,
		);
		await writeFile(
			preload,
			`globalThis.fetch = async (input) => String(input) === ${JSON.stringify(allowedUrl)}
  ? new Response("fetch-ok", { status: 200 })
  : new Response("unexpected", { status: 500 });`,
		);
		const grant: SandboxCapabilityGrantV1 = {
			version: 1,
			tools: [
				"Read",
				"Write",
				"Edit",
				"Bash",
				"Glob",
				"rg",
				"fd",
				"WebFetch",
				"sleep",
			],
			environment: [],
			egressOrigins: ["https://allowed.example"],
			commandAdapter: {
				version: 1,
				executable: process.execPath,
				arguments: [adapter],
			},
		};
		const result = await runRunner(
			intent(
				`console.log([typeof Read, typeof Write, typeof Edit, typeof Bash, typeof Glob, typeof rg, typeof fd, typeof WebFetch, typeof sleep].join(","));
const command = await Bash({command:"full-grant"});
const fetched = await WebFetch({url:${JSON.stringify(allowedUrl)}});
console.log(command.stdout, fetched);`,
				grant,
			),
			workspace,
			{},
			preload,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe(
			"function,function,function,function,function,function,function,function,function\nadapter-ok fetch-ok",
		);
		const adapterCalls = (await readFile(calls, "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(adapterCalls).toHaveLength(1);
		expect(adapterCalls[0]).toMatchObject({
			tool: "Bash",
			input: { command: "full-grant" },
		});
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("generated runner preserves the public file and command tool contract", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-contract-"));
	const workspace = join(base, "workspace");
	const adapter = join(base, "adapter.mjs");
	const calls = join(base, "calls.jsonl");
	try {
		await mkdir(join(workspace, "sub"), { recursive: true });
		await writeFile(join(workspace, "sub", "lines.txt"), "one\ntwo\nthree");
		await writeFile(
			adapter,
			`import { appendFile } from "node:fs/promises";
const request = JSON.parse(await Bun.stdin.text());
await appendFile(${JSON.stringify(calls)}, JSON.stringify(request) + "\\n");
const stdout = request.tool === "Glob" ? "alpha.txt\\nbeta.txt\\n" : request.tool === "rg" ? "match\\n" : request.tool === "fd" ? "found\\n" : "bash-output";
process.stdout.write(JSON.stringify({ exitCode: 0, stdout, stderr: "", stdoutTruncated: false, stderrTruncated: false }));`,
		);
		const grant: SandboxCapabilityGrantV1 = {
			version: 1,
			tools: ["Read", "Write", "Edit", "Bash", "Glob", "rg", "fd", "sleep"],
			environment: [],
			egressOrigins: [],
			commandAdapter: {
				version: 1,
				executable: process.execPath,
				arguments: [adapter],
			},
		};
		const result = await runRunner(
			intent(
				`const page = await Read({path:"lines.txt",cwd:"sub",offset:2,limit:1});
const missing = await Read({path:"missing.txt",cwd:"sub",optional:true});
const writeResult = await Write({path:"nested/fact.txt",cwd:"sub",content:"alpha"});
const editMiss = await Edit({path:"nested/fact.txt",cwd:"sub",oldText:"beta",newText:"gamma"});
const editHit = await Edit({path:"nested/fact.txt",cwd:"sub",oldText:"alpha",newText:"gamma"});
const glob = await Glob({pattern:"*.txt",path:"sub"});
const rgResult = await rg({args:["needle"],cwd:"sub",follow:false});
const fdResult = await fd({args:["-e","txt"],cwd:"sub"});
const bash = await Bash({command:"echo safe",cwd:"sub"});
const sleepResult = await sleep(0);
console.log(JSON.stringify({page,missing,writeIsUndefined:writeResult===undefined,editMiss,editHit,glob,rgResult,fdResult,bash,bashKeys:Object.keys(bash).sort(),sleepIsUndefined:sleepResult===undefined}));`,
				grant,
			),
			workspace,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(JSON.parse(decodeMarker(result.stdout).output)).toEqual({
			page: "two",
			missing: null,
			writeIsUndefined: true,
			editMiss: { matched: false },
			editHit: { matched: true },
			glob: ["alpha.txt", "beta.txt"],
			rgResult: "match\n",
			fdResult: "found\n",
			bash: { stdout: "bash-output", stderr: "", exitCode: 0 },
			bashKeys: ["exitCode", "stderr", "stdout"],
			sleepIsUndefined: true,
		});
		expect(
			await readFile(join(workspace, "sub", "nested", "fact.txt"), "utf8"),
		).toBe("gamma");
		const adapterCalls = (await readFile(calls, "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(adapterCalls.map((call) => call.tool)).toEqual([
			"Glob",
			"rg",
			"fd",
			"Bash",
		]);
		expect(adapterCalls.map((call) => call.input)).toEqual([
			{ pattern: "*.txt", path: "sub" },
			{ args: ["needle"], cwd: "sub", follow: false },
			{ args: ["-e", "txt"], cwd: "sub", follow: true },
			{ command: "echo safe", cwd: "sub" },
		]);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("generated runner reports exact call-shape errors before limits or adapter execution", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-call-shapes-"));
	const workspace = join(base, "workspace");
	const adapter = join(base, "adapter.mjs");
	const calls = join(base, "calls.jsonl");
	try {
		await mkdir(workspace);
		await writeFile(
			adapter,
			`import { appendFile } from "node:fs/promises";
const request = JSON.parse(await Bun.stdin.text());
await appendFile(${JSON.stringify(calls)}, JSON.stringify(request) + "\\n");
process.stdout.write(JSON.stringify({ exitCode: 0, stdout: request.tool + "-ok", stderr: "", stdoutTruncated: false, stderrTruncated: false }));`,
		);
		const grant: SandboxCapabilityGrantV1 = {
			version: 1,
			tools: ["Read", "Write", "Edit", "Bash", "Glob", "rg", "fd", "WebFetch", "sleep"],
			environment: [],
			egressOrigins: [],
			commandAdapter: {
				version: 1,
				executable: process.execPath,
				arguments: [adapter],
			},
		};
		const result = await runRunner(
			intent(
				`const wrong = [
  ["Read", () => Read("x")],
  ["Write", () => Write("x")],
  ["Edit", () => Edit("x")],
  ["Bash", () => Bash("true")],
  ["Glob", () => Glob("*.ts")],
  ["rg", () => rg("needle")],
  ["fd", () => fd("needle")],
  ["WebFetch", () => WebFetch("https://example.com")],
  ["sleep", () => sleep({})],
  ["BashType", () => Bash({command: 1})],
  ["GlobType", () => Glob({pattern: []})],
  ["rgArgs", () => rg({args: ["ok", 1]})],
  ["fdExtra", () => fd({args: ["ok"], invented: true})],
];
for (const [name, call] of wrong) { try { await call(); } catch (error) { console.log(name, error.code); } }
console.log(await rg({args:["needle","two words"]}));
console.log(await fd({args:["-e","txt"]}));`,
				grant,
			),
			workspace,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe([
			"Read invalid_read_input",
			"Write invalid_write_input",
			"Edit invalid_edit_input",
			"Bash invalid_bash_input",
			"Glob invalid_glob_input",
			"rg invalid_rg_input",
			"fd invalid_fd_input",
			"WebFetch invalid_webfetch_input",
			"sleep invalid_sleep",
			"BashType invalid_bash_command",
			"GlobType invalid_glob_pattern",
			"rgArgs invalid_command_arguments",
			"fdExtra invalid_fd_input",
			"rg-ok",
			"fd-ok",
		].join("\n"));
		const adapterCalls = (await readFile(calls, "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(adapterCalls.map((call) => ({ tool: call.tool, args: call.input.args }))).toEqual([
			{ tool: "rg", args: ["needle", "two words"] },
			{ tool: "fd", args: ["-e", "txt"] },
		]);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("generated runner completes on the requested sleep event and rejects legacy deadline authority", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "code-mode-event-completion-"));
	try {
		expect(() => decodeCodeExecutionRequest({ ...request, timeoutMs: 1 })).toThrow("invalid_code_execution_request_v1");
		const result = await runRunner(
			intent(`await sleep(20); console.log("event complete");`, { ...noTools, tools: ["sleep"] }),
			workspace,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe("event complete");
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
});

test("generated runner denies ungranted egress and dynamic module authority", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "code-mode-egress-"));
	try {
		const result = await runRunner(
			intent(
				`try { await WebFetch({url:"https://example.com/private"}); } catch { console.log("egress denied"); }
try { await import("node:fs"); } catch { console.log("import denied"); }`,
				{ ...noTools, tools: ["WebFetch"] },
			),
			workspace,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe(
			"egress denied\nimport denied",
		);
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
});

test("WebFetch preserves formats and follows network completion events", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-webfetch-contract-"));
	const workspace = join(base, "workspace");
	const preload = join(base, "fetch-preload.mjs");
	const attempts = join(base, "fetch-attempts.txt");
	const pageUrl = "https://allowed.example/page";
	const okUrl = "https://allowed.example/ok";
	const html =
		"<h1>Title</h1><script>secret()</script><p>Hello <strong>world</strong></p>";
	try {
		await mkdir(workspace);
		await writeFile(
			preload,
			`import { appendFile } from "node:fs/promises";
const attempts = ${JSON.stringify(attempts)};
globalThis.fetch = async (input) => {
  const url = String(input);
  await appendFile(attempts, url + "\\n");
  if (url === ${JSON.stringify(pageUrl)}) return new Response(${JSON.stringify(html)}, { status: 200 });
  if (url === ${JSON.stringify(okUrl)}) return new Response("ok", { status: 200 });
  return new Response("unexpected", { status: 500 });
};`,
		);
		const result = await runRunner(
			intent(
				`const text = await WebFetch({url:${JSON.stringify(pageUrl)},format:"text"});
const markdown = await WebFetch({url:${JSON.stringify(pageUrl)},format:"markdown"});
const html = await WebFetch({url:${JSON.stringify(pageUrl)},format:"html"});
let legacyCode; try { await WebFetch({url:${JSON.stringify(okUrl)},timeout:1}); } catch (error) { legacyCode = error.code; }
const afterEvent = await WebFetch({url:${JSON.stringify(okUrl)}});
console.log(JSON.stringify({text,markdown,html,legacyCode,afterEvent}));`,
				{
					...noTools,
					tools: ["WebFetch"],
					egressOrigins: ["https://allowed.example"],
				},
			),
			workspace,
			{},
			preload,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(JSON.parse(decodeMarker(result.stdout).output)).toEqual({
			text: "Title Hello world",
			markdown: "# Title\n\nHello **world**",
			html,
			legacyCode: "invalid_webfetch_input",
			afterEvent: "ok",
		});
		expect(await readFile(attempts, "utf8")).toBe(
			`${pageUrl}\n${pageUrl}\n${pageUrl}\n${okUrl}\n`,
		);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("generated runner rejects redirects before an ungranted destination request", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-redirect-"));
	const workspace = join(base, "workspace");
	const preload = join(base, "fetch-preload.mjs");
	const attempts = join(base, "fetch-attempts.txt");
	const allowedUrl = "https://allowed.example/start";
	const destinationUrl = "https://unlisted.example/private";
	try {
		await mkdir(workspace);
		await writeFile(
			preload,
			`import { appendFile } from "node:fs/promises";
const attempts = ${JSON.stringify(attempts)};
const allowed = ${JSON.stringify(allowedUrl)};
const destination = ${JSON.stringify(destinationUrl)};
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  await appendFile(attempts, url + "\\n");
  if (url === allowed && init.redirect === "manual") {
    return new Response("", { status: 302, headers: { location: destination } });
  }
  if (url === allowed) {
    await appendFile(attempts, destination + "\\n");
    return new Response("escaped", { status: 200 });
  }
  return new Response("unexpected", { status: 200 });
};`,
		);
		const result = await runRunner(
			intent(
				`try { await WebFetch({url:${JSON.stringify(allowedUrl)}}); } catch { console.log("redirect denied"); }`,
				{
					...noTools,
					tools: ["WebFetch"],
					egressOrigins: ["https://allowed.example"],
				},
			),
			workspace,
			{},
			preload,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe("redirect denied");
		expect(await readFile(attempts, "utf8")).toBe(`${allowedUrl}\n`);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("redirect cancellation failure remains an egress denial without a second request", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-redirect-cancel-"));
	const workspace = join(base, "workspace");
	const preload = join(base, "fetch-preload.mjs");
	const attempts = join(base, "fetch-attempts.txt");
	const allowedUrl = "https://allowed.example/cancel-rejects";
	const successUrl = "https://allowed.example/ok";
	const destinationUrl = "https://unlisted.example/private";
	try {
		await mkdir(workspace);
		await writeFile(
			preload,
			`import { appendFile } from "node:fs/promises";
const attempts = ${JSON.stringify(attempts)};
const allowed = ${JSON.stringify(allowedUrl)};
const success = ${JSON.stringify(successUrl)};
const destination = ${JSON.stringify(destinationUrl)};
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  await appendFile(attempts, url + "\\n");
  if (url === allowed && init.redirect === "manual") {
    return {
      status: 302,
      type: "default",
      headers: new Headers({ location: destination }),
      body: { cancel: async () => { throw new Error("cancel refused"); } },
    };
  }
  if (url === allowed) {
    await appendFile(attempts, destination + "\\n");
    return new Response("escaped", { status: 200 });
  }
  if (url === success) return new Response("ok", { status: 200 });
  return new Response("unexpected", { status: 200 });
};`,
		);
		const result = await runRunner(
			intent(
				`try { await WebFetch({url:${JSON.stringify(allowedUrl)}}); } catch (error) { console.log(error.code); }
console.log(await WebFetch({url:${JSON.stringify(successUrl)}}));`,
				{
					...noTools,
					tools: ["WebFetch"],
					egressOrigins: ["https://allowed.example"],
				},
			),
			workspace,
			{},
			preload,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe("egress_denied\nok");
		expect(await readFile(attempts, "utf8")).toBe(
			`${allowedUrl}\n${successUrl}\n`,
		);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("fetch overflow cleanup does not poison a later allowed fetch", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-fetch-overflow-"));
	const workspace = join(base, "workspace");
	const preload = join(base, "fetch-preload.mjs");
	const attempts = join(base, "fetch-attempts.txt");
	const oversizedUrl = "https://allowed.example/oversized";
	const successUrl = "https://allowed.example/ok";
	try {
		await mkdir(workspace);
		await writeFile(
			preload,
			`import { appendFile } from "node:fs/promises";
const attempts = ${JSON.stringify(attempts)};
const oversized = ${JSON.stringify(oversizedUrl)};
const success = ${JSON.stringify(successUrl)};
globalThis.fetch = async (input) => {
  const url = String(input);
  await appendFile(attempts, url + "\\n");
  if (url === oversized) {
    return new Response("bounded", { status: 200, headers: { "content-length": "1048577" } });
  }
  if (url === success) return new Response("ok", { status: 200 });
  return new Response("unexpected", { status: 200 });
};`,
		);
		const result = await runRunner(
			intent(
				`try { await WebFetch({url:${JSON.stringify(oversizedUrl)}}); } catch (error) { console.log(error.code); }
console.log(await WebFetch({url:${JSON.stringify(successUrl)}}));`,
				{
					...noTools,
					tools: ["WebFetch"],
					egressOrigins: ["https://allowed.example"],
				},
			),
			workspace,
			{},
			preload,
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe("fetch_limit_exceeded\nok");
		expect(await readFile(attempts, "utf8")).toBe(
			`${oversizedUrl}\n${successUrl}\n`,
		);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("command execution crosses only the granted adapter with an allowlisted environment", async () => {
	const base = await mkdtemp(join(tmpdir(), "code-mode-adapter-"));
	const workspace = join(base, "workspace");
	const adapter = join(base, "adapter.mjs");
	try {
		await mkdir(workspace);
		await writeFile(
			adapter,
			`const request = JSON.parse(await Bun.stdin.text());
const command = request.input.command;
const result = command === "environment"
  ? { exitCode: 0, stdout: process.env.SECRET_TOKEN ?? "absent", stderr: "", stdoutTruncated: false, stderrTruncated: false }
  : { exitCode: 126, stdout: "", stderr: "denied", stdoutTruncated: false, stderrTruncated: false };
process.stdout.write(JSON.stringify(result));`,
		);
		const grant: SandboxCapabilityGrantV1 = {
			version: 1,
			tools: ["Bash"],
			environment: ["LANG"],
			egressOrigins: [],
			commandAdapter: {
				version: 1,
				executable: process.execPath,
				arguments: [adapter],
			},
		};
		const result = await runRunner(
			intent(
				`console.log((await Bash({command:"environment"})).stdout);
console.log((await Bash({command:"read-outside"})).stderr);`,
				grant,
			),
			workspace,
			{ SECRET_TOKEN: "must-not-leak" },
		);
		expect(result.exitCode, result.stderr).toBe(0);
		expect(decodeMarker(result.stdout).output).toBe("absent\ndenied");
		expect(result.stdout).not.toContain("must-not-leak");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});
