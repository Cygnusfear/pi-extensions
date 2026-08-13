import { afterEach, describe, expect, test } from "bun:test";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readlinkSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildBridgeReply,
	buildBridgeRequest,
	formatVerifiedBridgeReply,
	parseBridgeSecret,
} from "../extension/maestri-bridge/protocol.ts";

const SECRET_B64 = Buffer.alloc(32, 7).toString("base64url");
const secret = parseBridgeSecret(SECRET_B64)!;
const TERMINAL = "AA0003FA-0000-4000-A000-0000000000AB";
const LIST_OUTPUT =
	'You:\n  - name: "Self"\n\nConnected agents:\n  - name: "Peer"\n';

type ExecOutcome = { killed?: boolean; code?: number; stdout?: string };

interface Harness {
	handlers: Map<string, (event: any, ctx: any) => any>;
	audits: Array<{ event: string; requestId?: string }>;
	sent: string[];
	tools: Map<string, any>;
	execCalls: string[];
	ctx: any;
	home: string;
}

async function loadBridge(
	exec: ((args: string[]) => ExecOutcome | Promise<ExecOutcome>) | ExecOutcome,
	isIdle = true,
	sendUserMessageImpl?: (text: string) => unknown,
	setup?: (home: string) => void,
	resetProcessOwnership = true,
): Promise<Harness> {
	const execFor = typeof exec === "function" ? exec : () => exec;
	const home = mkdtempSync(join(tmpdir(), "pi-maestri-bridge-test-"));
	process.env.PI_MAESTRI_BRIDGE_HOME = home;
	process.env.MAESTRI_CLI = "/bin/false";
	process.env.MAESTRI_SOCKET = join(home, "sock");
	process.env.MAESTRI_TERMINAL_ID = TERMINAL;
	delete process.env.PI_SESSION_ID;
	// Caller controls wrapper ownership for this harness instance. Always clear
	// the process-local singleton so dynamic module reloads behave like new OS processes.
	const pinning = await import(
		"../extension/maestri-bridge/session-pinning.ts"
	);
	if (resetProcessOwnership) pinning.resetProcessLaunchModeForTests();
	mkdirSync(join(home, ".pi", "agent"), { recursive: true });
	writeFileSync(
		join(home, ".pi", "agent", "maestri-bridge.secret"),
		SECRET_B64,
	);
	setup?.(home);

	const handlers = new Map<string, (event: any, ctx: any) => any>();
	const audits: Array<{ event: string; requestId?: string }> = [];
	const sent: string[] = [];
	const tools = new Map<string, any>();
	const execCalls: string[] = [];
	const pi = {
		on: (event: string, handler: any) => handlers.set(event, handler),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		registerCommand: (name: string, command: any) =>
			tools.set(`command:${name}`, command),
		appendEntry: (_type: string, entry: any) => audits.push(entry),
		sendUserMessage: (text: string) => {
			// sent records SUCCESSFUL deliveries only: a sync throw propagates
			// before recording, a rejected promise never reaches the push.
			const result = sendUserMessageImpl?.(text);
			return Promise.resolve(result as never).then(() => {
				sent.push(text);
			}) as never;
		},
		exec: async (_cli: string, args: string[]) => {
			execCalls.push(args.join(" "));
			if (args[0] === "list") return { code: 0, stdout: LIST_OUTPUT };
			return execFor(args);
		},
	};

	const mod = await import(
		`../extension/maestri-bridge.ts?harness=${Math.random()}`
	);
	mod.default(pi);

	const sessionFile = join(
		home,
		".pi",
		"agent",
		"sessions",
		"--project--",
		"ctx-session-42.jsonl",
	);
	mkdirSync(join(home, ".pi", "agent", "sessions", "--project--"), {
		recursive: true,
	});
	writeFileSync(
		sessionFile,
		`${JSON.stringify({ type: "session", id: "ctx-session-42", cwd: home })}\n`,
	);
	const ctx = {
		ui: { notify: () => {} },
		isIdle: () => isIdle,
		sessionManager: {
			getSessionId: () => "ctx-session-42",
			getSessionFile: () => sessionFile,
		},
	};
	return { handlers, audits, sent, tools, execCalls, ctx, home };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let homes: string[] = [];
afterEach(() => {
	for (const home of homes) rmSync(home, { recursive: true, force: true });
	homes = [];
});

function track(h: Harness): Harness {
	homes.push(h.home);
	return h;
}

function auditEvents(h: Harness, prefix: string): string[] {
	return h.audits.map((a) => a.event).filter((e) => e.startsWith(prefix));
}

function signedRequest(task: string, id?: string): string {
	return buildBridgeRequest({ secret, replyTo: "Peer", task, id }).input;
}

describe("session_start concrete-file pinning", () => {
	test("managed startup records authoritative id + file as v2", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		process.env.PI_MAESTRI_PINNED = "1";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		const expected = h.ctx.sessionManager.getSessionFile();
		expect(
			readlinkSync(join(h.home, ".pi", "agent", "maestri-sessions", TERMINAL)),
		).toBe(expected);
		const entry = h.audits.find(
			(a: any) => a.event === "session-pinned",
		) as any;
		expect(entry).toMatchObject({
			version: 2,
			terminalId: TERMINAL,
			sessionId: "ctx-session-42",
			sessionFile: expected,
			launchMode: "resume",
		});
		expect(process.env.PI_MAESTRI_PIN_MODE).toBeUndefined();
		expect(process.env.PI_MAESTRI_PINNED).toBeUndefined();
	});

	test("every Pi session-replacement reason follows the authoritative file", async () => {
		for (const reason of ["reload", "new", "resume", "fork"] as const) {
			process.env.PI_MAESTRI_PIN_MODE = "adopt";
			const h = track(await loadBridge({ killed: true } as ExecOutcome));
			const firstFile = h.ctx.sessionManager.getSessionFile();
			await h.handlers.get("session_start")?.(
				{ type: "session_start", reason: "startup" },
				h.ctx,
			);
			const replacement = join(
				h.home,
				".pi",
				"agent",
				"sessions",
				"--project--",
				`replacement-${reason}.jsonl`,
			);
			writeFileSync(
				replacement,
				`${JSON.stringify({
					type: "session",
					id: `replacement-${reason}`,
					cwd: h.home,
				})}\n`,
			);
			h.ctx.sessionManager.getSessionId = () => `replacement-${reason}`;
			h.ctx.sessionManager.getSessionFile = () => replacement;
			await h.handlers.get("session_start")?.(
				{ type: "session_start", reason },
				h.ctx,
			);
			expect(
				readlinkSync(
					join(h.home, ".pi", "agent", "maestri-sessions", TERMINAL),
				),
			).toBe(replacement);
			expect(replacement).not.toBe(firstFile);
		}
	});

	test("extension reinitialization during resume retains wrapper ownership", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const initial = track(await loadBridge({ killed: true } as ExecOutcome));
		await initial.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			initial.ctx,
		);

		const resumed = track(
			await loadBridge(
				{ killed: true } as ExecOutcome,
				true,
				undefined,
				undefined,
				false,
			),
		);
		const notices: string[] = [];
		resumed.ctx.ui.notify = (message: string) => notices.push(message);
		const replacement = join(
			resumed.home,
			".pi",
			"agent",
			"sessions",
			"--project--",
			"replacement-reinitialized-resume.jsonl",
		);
		writeFileSync(
			replacement,
			JSON.stringify({
				type: "session",
				id: "replacement-reinitialized-resume",
				cwd: resumed.home,
			}) + "\n",
		);
		resumed.ctx.sessionManager.getSessionId = () =>
			"replacement-reinitialized-resume";
		resumed.ctx.sessionManager.getSessionFile = () => replacement;
		await resumed.handlers.get("session_start")?.(
			{ type: "session_start", reason: "resume" },
			resumed.ctx,
		);

		expect(notices).toEqual([]);
		expect(
			readlinkSync(
				join(resumed.home, ".pi", "agent", "maestri-sessions", TERMINAL),
			),
		).toBe(replacement);
		expect(
			resumed.audits.find((entry: any) => entry.event === "session-pinned"),
		).toMatchObject({
			launchMode: "resume",
			sessionId: "replacement-reinitialized-resume",
			sessionFile: replacement,
		});
	});

	test("restart exposes wrapper ownership only for the deliberate re-exec boundary", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		expect(process.env.PI_MAESTRI_PIN_MODE).toBeUndefined();
		await h.handlers.get("session_shutdown")?.(
			{ type: "session_shutdown", reason: "exit" },
			h.ctx,
		);
		expect(process.env.PI_MAESTRI_PIN_MODE).toBeUndefined();
		await h.handlers.get("session_shutdown")?.(
			{ type: "session_shutdown", reason: "restart" },
			h.ctx,
		);
		expect(process.env.PI_MAESTRI_PIN_MODE).toBe("resume");
		expect(process.env.PI_MAESTRI_PINNED).toBe("1");
		delete process.env.PI_MAESTRI_PIN_MODE;
		delete process.env.PI_MAESTRI_PINNED;
	});

	test("managed launch warns instead of publishing when Pi has no concrete file", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		const notices: string[] = [];
		h.ctx.ui.notify = (message: string) => notices.push(message);
		h.ctx.sessionManager.getSessionFile = () => undefined;
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		expect(notices.join(" ")).toContain("not persistable");
		expect(
			h.audits.find((a: any) => a.event === "session-pinned"),
		).toBeUndefined();
	});

	test("unmanaged bare Pi warns and never creates or steals a terminal map", async () => {
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		const notices: string[] = [];
		h.ctx.ui.notify = (message: string) => notices.push(message);
		const established = join(
			h.home,
			".pi",
			"agent",
			"sessions",
			"--project--",
			"established.jsonl",
		);
		writeFileSync(
			established,
			JSON.stringify({ type: "session", id: "established", cwd: h.home }) +
				"\n",
		);
		const pinning = await import(
			"../extension/maestri-bridge/session-pinning.ts"
		);
		pinning.recordSessionForTerminal(TERMINAL, "established", established);
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "resume" },
			h.ctx,
		);
		expect(notices).toHaveLength(1);
		expect(notices.join(" ")).toContain("not through pi-maestri");
		expect(
			readlinkSync(join(h.home, ".pi", "agent", "maestri-sessions", TERMINAL)),
		).toBe(established);
		expect(
			h.audits.find((a: any) => a.event === "session-pinned"),
		).toBeUndefined();
	});

	test("disabled no-session mode neither warns nor records", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "disabled";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		const notices: string[] = [];
		h.ctx.ui.notify = (message: string) => notices.push(message);
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		expect(notices).toEqual([]);
		expect(
			h.audits.find((a: any) => a.event === "session-pinned"),
		).toBeUndefined();
	});
});

describe("status observability", () => {
	test("managed process with a matching concrete pin reports protected", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		const notices: Array<{ message: string; type?: string }> = [];
		h.ctx.ui.notify = (message: string, type?: string) =>
			notices.push({ message, type });
		await h.tools.get("command:maestri-bridge").handler("", h.ctx);
		expect(notices.at(-1)?.message).toContain("continuity: matches");
		expect(notices.at(-1)?.type).toBe("info");
	});

	test("running terminal with consumed resumeCommand reports protected command fallback", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(
			await loadBridge(
				{ killed: true } as ExecOutcome,
				true,
				undefined,
				(home) => {
					const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
					mkdirSync(join(home, ".pi", "agent", "bin"), { recursive: true });
					writeFileSync(wrapper, "#!/bin/sh\nexit 0\n");
					chmodSync(wrapper, 0o755);
					const configHome = join(home, ".maestri");
					process.env.PI_MAESTRI_CONFIG_HOME = configHome;
					const workspace = join(configHome, "workspaces", "running");
					mkdirSync(workspace, { recursive: true });
					writeFileSync(
						join(workspace, "workspace.json"),
						JSON.stringify({
							payload: {
								nodes: [
									{
										content: {
											terminal: {
												_0: {
													id: TERMINAL,
													command: wrapper,
													status: "running",
												},
											},
										},
									},
								],
							},
						}),
					);
				},
			),
		);
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		const notices: Array<{ message: string; type?: string }> = [];
		h.ctx.ui.notify = (message: string, type?: string) =>
			notices.push({ message, type });
		await h.tools.get("command:maestri-bridge").handler("", h.ctx);
		expect(notices.at(-1)?.message).toContain("configured launch: protected");
		expect(notices.at(-1)?.message).toContain(
			"resume=missing command-fallback",
		);
		expect(notices.at(-1)?.message).toContain("lifecycle=running");
		expect(notices.at(-1)?.type).toBe("info");
	});

	test("running non-wrapper terminal is blocked without claiming command fallback", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(
			await loadBridge(
				{ killed: true } as ExecOutcome,
				true,
				undefined,
				(home) => {
					const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
					mkdirSync(join(home, ".pi", "agent", "bin"), { recursive: true });
					writeFileSync(wrapper, "#!/bin/sh\nexit 0\n");
					chmodSync(wrapper, 0o755);
					const configHome = join(home, ".maestri");
					process.env.PI_MAESTRI_CONFIG_HOME = configHome;
					const workspace = join(configHome, "workspaces", "running-bare");
					mkdirSync(workspace, { recursive: true });
					writeFileSync(
						join(workspace, "workspace.json"),
						JSON.stringify({
							payload: {
								nodes: [
									{
										content: {
											terminal: {
												_0: { id: TERMINAL, command: "pi", status: "running" },
											},
										},
									},
								],
							},
						}),
					);
				},
			),
		);
		await h.handlers.get("session_start")?.(
			{ type: "session_start", reason: "startup" },
			h.ctx,
		);
		const notices: Array<{ message: string; type?: string }> = [];
		h.ctx.ui.notify = (message: string, type?: string) =>
			notices.push({ message, type });
		await h.tools.get("command:maestri-bridge").handler("", h.ctx);
		expect(notices.at(-1)?.message).toContain("configured launch: BLOCKED");
		expect(notices.at(-1)?.message).not.toContain("command-fallback");
		expect(notices.at(-1)?.type).toBe("warning");
	});

	test("malformed persisted configuration is reported BLOCKED without throwing", async () => {
		process.env.PI_MAESTRI_PIN_MODE = "resume";
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		const configRoot = join(h.home, ".maestri", "workspaces", "bad");
		mkdirSync(configRoot, { recursive: true });
		writeFileSync(join(configRoot, "workspace.json"), "{ malformed");
		const configuredRoot = join(h.home, ".maestri");
		process.env.PI_MAESTRI_CONFIG_HOME = configuredRoot;
		// The module captured its config root at load time; reload after creating
		// the malformed fixture so this harness mirrors a fresh Pi process.
		const fresh = track(await loadBridge({ killed: true } as ExecOutcome));
		const notices: Array<{ message: string; type?: string }> = [];
		fresh.ctx.ui.notify = (message: string, type?: string) =>
			notices.push({ message, type });
		await fresh.tools.get("command:maestri-bridge").handler("", fresh.ctx);
		expect(notices[0]?.message).toContain("BLOCKED malformed");
		expect(notices[0]?.message).toContain("workspace.json");
		expect(notices[0]?.type).toBe("warning");
	});

	for (const malformed of ["later workspace", "preferences"] as const) {
		test(`protected matching terminal is still BLOCKED by malformed ${malformed}`, async () => {
			process.env.PI_MAESTRI_PIN_MODE = "resume";
			const h = track(
				await loadBridge(
					{ killed: true } as ExecOutcome,
					true,
					undefined,
					(home) => {
						const wrapper = join(home, ".pi", "agent", "bin", "pi-maestri");
						mkdirSync(join(home, ".pi", "agent", "bin"), {
							recursive: true,
						});
						writeFileSync(wrapper, "#!/bin/sh\nexit 0\n");
						chmodSync(wrapper, 0o755);
						const configHome = join(home, ".maestri");
						process.env.PI_MAESTRI_CONFIG_HOME = configHome;
						if (malformed === "preferences") {
							mkdirSync(configHome, { recursive: true });
							writeFileSync(
								join(configHome, "preferences.json"),
								"{ malformed",
							);
						}
						const good = join(configHome, "workspaces", "a-good");
						mkdirSync(good, { recursive: true });
						writeFileSync(
							join(good, "workspace.json"),
							JSON.stringify({
								payload: {
									nodes: [
										{
											content: {
												terminal: {
													_0: {
														id: TERMINAL,
														command: wrapper,
														resumeCommand: wrapper,
													},
												},
											},
										},
									],
								},
							}),
						);
						if (malformed === "later workspace") {
							const bad = join(configHome, "workspaces", "z-bad");
							mkdirSync(bad, { recursive: true });
							writeFileSync(join(bad, "workspace.json"), "{ malformed");
						}
					},
				),
			);
			await h.handlers.get("session_start")?.(
				{ type: "session_start", reason: "startup" },
				h.ctx,
			);
			const notices: Array<{ message: string; type?: string }> = [];
			h.ctx.ui.notify = (message: string, type?: string) =>
				notices.push({ message, type });
			await h.tools.get("command:maestri-bridge").handler("", h.ctx);
			expect(notices.at(-1)?.message).toContain(
				"configured launch: BLOCKED malformed",
			);
			expect(notices.at(-1)?.message).toContain(
				malformed === "preferences" ? "preferences.json" : "z-bad",
			);
			expect(notices.at(-1)?.type).toBe("warning");
		});
	}

	test("unmanaged process reports NOT PROTECTED even when an established map exists", async () => {
		const h = track(await loadBridge({ killed: true } as ExecOutcome));
		const pinning = await import(
			"../extension/maestri-bridge/session-pinning.ts"
		);
		pinning.recordSessionForTerminal(
			TERMINAL,
			"ctx-session-42",
			h.ctx.sessionManager.getSessionFile(),
		);
		const notices: Array<{ message: string; type?: string }> = [];
		h.ctx.ui.notify = (message: string, type?: string) =>
			notices.push({ message, type });
		await h.tools.get("command:maestri-bridge").handler("", h.ctx);
		expect(notices.at(-1)?.message).toContain("process launch: unmanaged");
		expect(notices.at(-1)?.type).toBe("warning");
	});
});

describe("ask-back transport states (D2/M2)", () => {
	async function runBridgeTask(h: Harness): Promise<void> {
		const accepted = await h.handlers.get("input")!(
			{ text: signedRequest("do the thing"), source: "interactive" },
			h.ctx,
		);
		expect(accepted.action).toBe("transform");
		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "the answer" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);
		await sleep(30);
	}

	test("killed-at-bound transport audits reply-submitted", async () => {
		const h = track(await loadBridge({ killed: true }));
		await runBridgeTask(h);
		expect(auditEvents(h, "reply-")).toContain("reply-submitted");
	});

	test("clean fast exit audits reply-ok", async () => {
		const h = track(await loadBridge({ code: 0 }));
		await runBridgeTask(h);
		expect(auditEvents(h, "reply-")).toContain("reply-ok");
	});

	test("real non-zero exit audits reply-transport-failed", async () => {
		const h = track(await loadBridge({ code: 1 }));
		await runBridgeTask(h);
		expect(auditEvents(h, "reply-")).toContain("reply-transport-failed");
	});
});

describe("deferred reply race (H1)", () => {
	test("a drained reply passes the pending gate when a new bridge request is active", async () => {
		const h = track(await loadBridge({ killed: true }));

		// bridge task 1 accepted
		const first = await h.handlers.get("input")!(
			{ text: signedRequest("task one"), source: "interactive" },
			h.ctx,
		);
		expect(first.action).toBe("transform");

		// outbound request so a reply can be claimed
		const tool = h.tools.get("maestri_ask")!;
		const result = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "hello peer" },
			undefined,
		);
		const requestId = result.details.requestId;

		// the peer's signed reply arrives while task 1 is pending → deferred
		const replyInput = buildBridgeReply({
			secret,
			requestId,
			result: "peer final answer",
		}).input;
		const deferred = await h.handlers.get("input")!(
			{ text: replyInput, source: "interactive" },
			h.ctx,
		);
		expect(deferred.action).toBe("handled");

		// task 1 completes and settles → drain registers + schedules delivery
		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "answer one" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);

		// task 2 becomes pending BEFORE the scheduled delivery lands
		const second = await h.handlers.get("input")!(
			{ text: signedRequest("task two"), source: "interactive" },
			h.ctx,
		);
		expect(second.action).toBe("transform");

		// scheduled delivery fires
		await sleep(10);
		const delivered = formatVerifiedBridgeReply("peer final answer");
		expect(h.sent).toContain(delivered);

		// the injected follow-up re-enters the input gate while task 2 is pending:
		// it must pass through (undefined), not be eaten as { action: "handled" }
		const reentered = await h.handlers.get("input")!(
			{ text: delivered, source: "extension" },
			h.ctx,
		);
		expect(reentered).toBeUndefined();
	});

	test("an idle delivery consumes its token and cannot later bypass a pending gate", async () => {
		const h = track(await loadBridge({ killed: true }));
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task one"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		const request = await h.tools
			.get("maestri_ask")
			?.execute("call-idle", { target: "Peer", prompt: "q" }, undefined);
		const reply = buildBridgeReply({
			secret,
			requestId: request.details.requestId,
			result: "idle answer",
		}).input;
		expect(
			(
				await h.handlers.get("input")!(
					{ text: reply, source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("handled");
		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "done" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);
		await sleep(10);
		const delivered = formatVerifiedBridgeReply("idle answer");
		expect(
			await h.handlers.get("input")!(
				{ text: delivered, source: "extension" },
				h.ctx,
			),
		).toBeUndefined();
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task two"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		expect(
			(
				await h.handlers.get("input")!(
					{ text: delivered, source: "extension" },
					h.ctx,
				)
			).action,
		).toBe("handled");
	});

	test("unrelated local input is still eaten while a bridge task is pending", async () => {
		const h = track(await loadBridge({ killed: true }));
		const first = await h.handlers.get("input")!(
			{ text: signedRequest("task one"), source: "interactive" },
			h.ctx,
		);
		expect(first.action).toBe("transform");
		const local = await h.handlers.get("input")!(
			{ text: "local typing while busy", source: "interactive" },
			h.ctx,
		);
		expect(local.action).toBe("handled");
	});
});

describe("bounded rejection transports (H2)", () => {
	test("a busy target never spawns more than maxActive rejection processes", async () => {
		const h = track(
			await loadBridge(
				() =>
					new Promise<ExecOutcome>((resolve) =>
						setTimeout(() => resolve({ killed: true }), 30),
					),
				false,
			),
		);

		for (let i = 0; i < 8; i++) {
			const outcome = await h.handlers.get("input")!(
				{ text: signedRequest(`flood ${i}`), source: "interactive" },
				h.ctx,
			);
			expect(outcome.action).toBe("handled");
		}

		const askCalls = h.execCalls.filter((call) => call.startsWith("ask "));
		expect(askCalls.length).toBe(4); // maxActive, never more
		expect(auditEvents(h, "busy-rejected").length).toBe(8);
		expect(auditEvents(h, "rejection-transport-dropped").length).toBe(4);
		await sleep(60);
	});
});

describe("outbound failure notice (M1)", () => {
	test("a real transport failure drops the outbound record and notices without unhandled rejection", async () => {
		const h = track(await loadBridge({ code: 1 }));
		const originalSend = h.sent;
		void originalSend;
		// make the notice channel reject — must be absorbed by the wired .catch
		const tool = h.tools.get("maestri_ask")!;
		const result = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "hello" },
			undefined,
		);
		expect(result.details.requestId).toBeTruthy();
		await sleep(10);
		expect(auditEvents(h, "transport-failed").length).toBe(1);
	});
});

describe("H1: duplicate deferred reply bodies each cross the gate", () => {
	test("two identical deferred results pass the pending gate once each", async () => {
		const h = track(await loadBridge({ killed: true }));

		// task 1 accepted
		const first = await h.handlers.get("input")!(
			{ text: signedRequest("task one"), source: "interactive" },
			h.ctx,
		);
		expect(first.action).toBe("transform");

		// two outbound requests → two claimable reply ids
		const tool = h.tools.get("maestri_ask")!;
		const r1 = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "q1" },
			undefined,
		);
		const r2 = await tool.execute(
			"call-2",
			{ target: "Peer", prompt: "q2" },
			undefined,
		);

		// two signed replies with the SAME body arrive while task 1 is pending
		const reply1 = buildBridgeReply({
			secret,
			requestId: r1.details.requestId,
			result: "same answer",
		}).input;
		const reply2 = buildBridgeReply({
			secret,
			requestId: r2.details.requestId,
			result: "same answer",
		}).input;
		expect(
			(
				await h.handlers.get("input")!(
					{ text: reply1, source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("handled");
		expect(
			(
				await h.handlers.get("input")!(
					{ text: reply2, source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("handled");

		// task 1 settles → both deliveries registered + scheduled
		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "a1" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);

		// task 2 pending before the timer lands
		const second = await h.handlers.get("input")!(
			{ text: signedRequest("task two"), source: "interactive" },
			h.ctx,
		);
		expect(second.action).toBe("transform");

		await sleep(10);
		const delivered = formatVerifiedBridgeReply("same answer");
		expect(h.sent.filter((t) => t === delivered).length).toBe(2);

		// BOTH re-entries must pass the gate — the Set collapse must not eat the second
		expect(
			await h.handlers.get("input")!(
				{ text: delivered, source: "extension" },
				h.ctx,
			),
		).toBeUndefined();
		expect(
			await h.handlers.get("input")!(
				{ text: delivered, source: "extension" },
				h.ctx,
			),
		).toBeUndefined();

		// a third identical text (not ours) is ordinary input and still eaten
		expect(
			(
				await h.handlers.get("input")!(
					{ text: delivered, source: "extension" },
					h.ctx,
				)
			).action,
		).toBe("handled");
	});
});

describe("H2: reply-capacity reservation at admission", () => {
	test("accepted replies are never dropped; the over-capacity request is rejected at admission", async () => {
		// slow transports: each lives ~40ms so capacity (4 active + 16 queued) commits
		const h = track(
			await loadBridge(
				() =>
					new Promise<ExecOutcome>((resolve) =>
						setTimeout(() => resolve({ killed: true }), 300),
					),
			),
		);

		const total = 25;
		for (let i = 0; i < total; i++) {
			const accepted = await h.handlers.get("input")!(
				{ text: signedRequest(`rapid ${i}`), source: "interactive" },
				h.ctx,
			);
			if (accepted.action !== "transform") continue; // capacity-rejected at admission
			h.handlers.get("agent_end")!(
				{
					messages: [
						{
							role: "assistant",
							stopReason: "stop",
							content: [{ type: "text", text: `answer ${i}` }],
						},
					],
				},
				h.ctx,
			);
			await h.handlers.get("agent_settled")!({}, h.ctx);
		}

		for (
			let t = 0;
			t < 80 && auditEvents(h, "reply-submitted").length < 20;
			t++
		)
			await sleep(50); // drain 5 waves of 300ms

		// exactly 20 replies were reserved and delivered; none was dropped
		expect(auditEvents(h, "reply-submitted").length).toBe(20);
		expect(auditEvents(h, "reply-transport-dropped").length).toBe(0);
		// the 5 over-capacity requests were rejected at admission instead
		expect(auditEvents(h, "capacity-rejected").length).toBe(5);
	});
});

describe("M1: both failure shapes of the failure notice are absorbed", () => {
	test("synchronous throw inside sendUserMessage", async () => {
		const h = track(
			await loadBridge({ code: 1 }, true, () => {
				throw new Error("assertActive exploded");
			}),
		);
		await h.tools
			.get("maestri_ask")
			?.execute("call-1", { target: "Peer", prompt: "x" }, undefined);
		await sleep(10);
		expect(auditEvents(h, "transport-failed").length).toBe(1);
	});

	test("returned promise rejection from sendUserMessage", async () => {
		const h = track(
			await loadBridge({ code: 1 }, true, () =>
				Promise.reject(new Error("nope")),
			),
		);
		await h.tools
			.get("maestri_ask")
			?.execute("call-1", { target: "Peer", prompt: "x" }, undefined);
		await sleep(10);
		expect(auditEvents(h, "transport-failed").length).toBe(1);
	});
});

describe("G1: delivery provenance and retry", () => {
	test("an interactive message with identical text does NOT consume the injection", async () => {
		const h = track(await loadBridge({ killed: true }));

		// task 1 accepted; outbound; peer reply deferred
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task one"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		const tool = h.tools.get("maestri_ask")!;
		const result = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "q" },
			undefined,
		);
		const replyInput = buildBridgeReply({
			secret,
			requestId: result.details.requestId,
			result: "identical body",
		}).input;
		expect(
			(
				await h.handlers.get("input")!(
					{ text: replyInput, source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("handled");

		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "a1" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);

		// task 2 pending; scheduled delivery fired
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task two"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		await sleep(10);
		const delivered = formatVerifiedBridgeReply("identical body");
		expect(h.sent).toContain(delivered);

		// an INTERACTIVE message with the identical text is ordinary input: eaten, token intact
		expect(
			(
				await h.handlers.get("input")!(
					{ text: delivered, source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("handled");
		// the real extension-sourced delivery still passes
		expect(
			await h.handlers.get("input")!(
				{ text: delivered, source: "extension" },
				h.ctx,
			),
		).toBeUndefined();
		// and only once
		expect(
			(
				await h.handlers.get("input")!(
					{ text: delivered, source: "extension" },
					h.ctx,
				)
			).action,
		).toBe("handled");
	});

	test("a rejected delivery is requeued and retried exactly once at the next settle", async () => {
		let calls = 0;
		const h = track(
			await loadBridge({ killed: true }, true, () => {
				calls += 1;
				if (calls === 1) return Promise.reject(new Error("flaky runtime"));
				return undefined;
			}),
		);

		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task one"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		const tool = h.tools.get("maestri_ask")!;
		const result = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "q" },
			undefined,
		);
		const replyInput = buildBridgeReply({
			secret,
			requestId: result.details.requestId,
			result: "retry me",
		}).input;
		await h.handlers.get("input")!(
			{ text: replyInput, source: "interactive" },
			h.ctx,
		);

		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "a1" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);
		await sleep(10);
		expect(calls).toBe(1);
		expect(h.sent.length).toBe(0); // rejected before recording a send
		expect(auditEvents(h, "verified-reply-requeued").length).toBe(1);

		// next settle boundary retries the same reply
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task two"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		h.handlers.get("agent_end")!(
			{
				messages: [
					{
						role: "assistant",
						stopReason: "stop",
						content: [{ type: "text", text: "a2" }],
					},
				],
			},
			h.ctx,
		);
		await h.handlers.get("agent_settled")!({}, h.ctx);
		await sleep(10);

		expect(calls).toBe(2);
		expect(h.sent).toEqual([formatVerifiedBridgeReply("retry me")]);
		expect(auditEvents(h, "verified-reply-delivered").length).toBe(1);
	});

	test("three failed deliveries give up with an audited undeliverable", async () => {
		const h = track(
			await loadBridge({ killed: true }, true, () =>
				Promise.reject(new Error("down")),
			),
		);
		expect(
			(
				await h.handlers.get("input")!(
					{ text: signedRequest("task one"), source: "interactive" },
					h.ctx,
				)
			).action,
		).toBe("transform");
		const tool = h.tools.get("maestri_ask")!;
		const result = await tool.execute(
			"call-1",
			{ target: "Peer", prompt: "q" },
			undefined,
		);
		const replyInput = buildBridgeReply({
			secret,
			requestId: result.details.requestId,
			result: "doomed",
		}).input;
		await h.handlers.get("input")!(
			{ text: replyInput, source: "interactive" },
			h.ctx,
		);

		for (let cycle = 0; cycle < 3; cycle++) {
			h.handlers.get("agent_end")!(
				{
					messages: [
						{
							role: "assistant",
							stopReason: "stop",
							content: [{ type: "text", text: `a${cycle}` }],
						},
					],
				},
				h.ctx,
			);
			await h.handlers.get("agent_settled")!({}, h.ctx);
			await sleep(10);
			if (cycle < 2) {
				expect(
					(
						await h.handlers.get("input")!(
							{ text: signedRequest(`again ${cycle}`), source: "interactive" },
							h.ctx,
						)
					).action,
				).toBe("transform");
			}
		}
		expect(auditEvents(h, "verified-reply-undeliverable").length).toBe(1);
		expect(h.sent.length).toBe(0);
	});
});
