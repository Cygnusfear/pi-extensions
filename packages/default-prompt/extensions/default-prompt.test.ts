import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import { setStableId } from "@pi-extensions/shared/session-nickname";
import { composeCodeModeSystemPrompt } from "../../code-mode/src/code-mode-manual.ts";
import { TOOL_REFERENCE_MAX_BYTES } from "../../code-mode/src/tool-reference.ts";

const STABLE_ID_KEY = "__piMeshStableId";

function clearStableId() {
	delete (globalThis as Record<string, unknown>)[STABLE_ID_KEY];
}

// We can't easily test the extension's before_agent_start handler in isolation
// without a full pi runtime. Instead we exercise the buildIdentityBlock function
// by re-importing the module and asserting on the systemPrompt that comes out
// of a fake before_agent_start fire.

async function captureSystemPromptResult(
	eventInput: any,
	ctxInput: any,
): Promise<any> {
	const { default: register } = await import(
		"../extensions/default-prompt.ts?test-bust=" + Math.random()
	);
	let handler: any = null;
	const fakePi = {
		on(event: string, h: any) {
			if (event === "before_agent_start") handler = h;
		},
		registerTool() {},
	};
	register(fakePi as any);
	if (!handler) throw new Error("handler not registered");
	return handler(eventInput, ctxInput);
}

describe("default-prompt identity injection", () => {
	beforeEach(clearStableId);
	afterEach(clearStableId);

	test("injects identity block when stable id is set", async () => {
		setStableId("test-id-injection");
		const result = await captureSystemPromptResult(
			{ systemPrompt: "base" },
			{ cwd: "/tmp/no-such-repo" },
		);
		expect(result).toBeDefined();
		expect(result.systemPrompt).toContain(
			"Your identity (re-anchored every turn)",
		);
		// Stable nickname: "First Cosmic Last" — name parts may include apostrophes
		// (D'Souza), hyphens (López-Morales, Lynden-Bell), accents (Hložek, Özel),
		// even spaces (single-astronomer easter eggs). Just require three bolded
		// tokens after "You are **" and before "** on the mesh".
		expect(result.systemPrompt).toMatch(/You are \*\*[^*]+\*\* on the mesh\./);
		expect(result.systemPrompt).toContain("does NOT change between turns");
		expect(result.systemPrompt).toMatch(
			/Current time: \*\*[^*]+\*\* \(\d{4}-\d{2}-\d{2}T/,
		);
	});

	test("identity block appears AFTER the base prompt and bundled global prompt", async () => {
		setStableId("test-id-order");
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE_PROMPT_MARKER" },
			{ cwd: "/tmp/no-such-repo" },
		);
		const idx_base = result.systemPrompt.indexOf("BASE_PROMPT_MARKER");
		const idx_identity = result.systemPrompt.indexOf(
			"Your identity (re-anchored every turn)",
		);
		expect(idx_base).toBeGreaterThanOrEqual(0);
		expect(idx_identity).toBeGreaterThan(idx_base);
	});

	test("does NOT inject identity when no stable id is available", async () => {
		// Don't call setStableId — globalThis.__piMeshStableId is undefined
		const result = await captureSystemPromptResult(
			{ systemPrompt: "base" },
			{ cwd: "/tmp/no-such-repo" },
		);
		// result may still be defined (from bundled global prompt) but must NOT
		// contain the identity block
		const text = result?.systemPrompt ?? "";
		expect(text).not.toContain("Your identity (re-anchored every turn)");
	});

	test("still injects the current time when no stable id is available", async () => {
		// Off-mesh sessions get the standalone time block instead of the identity block
		const result = await captureSystemPromptResult(
			{ systemPrompt: "base" },
			{ cwd: "/tmp/no-such-repo" },
		);
		const text = result?.systemPrompt ?? "";
		expect(text).toContain("Current time (re-anchored every turn)");
		expect(text).toMatch(/Current time: \*\*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/);
		expect(text).toMatch(/\(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});

	test("identity block contains both ISO and local-time formats", async () => {
		setStableId("test-id-time-format");
		const result = await captureSystemPromptResult(
			{ systemPrompt: "" },
			{ cwd: "/tmp/no-such-repo" },
		);
		// ISO timestamp
		expect(result.systemPrompt).toMatch(
			/\(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
		);
		// Local timestamp with weekday — e.g. "Mon, May 23, 2026, 03:00 PM EDT"
		expect(result.systemPrompt).toMatch(
			/Current time: \*\*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/,
		);
	});
});

describe("default-prompt TPV checklist injection", () => {
	beforeEach(clearStableId);
	afterEach(clearStableId);

	test("system prompt includes the TPV checklist on every turn", async () => {
		setStableId("test-tpv-injection");
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE" },
			{ cwd: "/tmp" },
		);
		expect(result?.systemPrompt).toContain("TPV — what to track for handoff");
		expect(result?.systemPrompt).toContain("Session context");
		expect(result?.systemPrompt).toContain("Key decisions");
		expect(result?.systemPrompt).toContain("Dead ends");
		expect(result?.systemPrompt).toContain("DEFERRED AND NOT TICKETED IS LOST");
	});

	test("TPV checklist appears BEFORE the identity block (identity is last)", async () => {
		setStableId("test-tpv-order");
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE" },
			{ cwd: "/tmp" },
		);
		const text = result.systemPrompt;
		const tpvIdx = text.indexOf("TPV — what to track");
		const identityIdx = text.indexOf("Your identity (re-anchored every turn)");
		expect(tpvIdx).toBeGreaterThanOrEqual(0);
		expect(identityIdx).toBeGreaterThan(tpvIdx);
	});
});

describe("default-prompt progressive disclosure instructions", () => {
	test("makes bounded tool-output handling explicit", async () => {
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE" },
			{ cwd: "/tmp" },
		);
		const text = result?.systemPrompt ?? "";
		expect(text).toContain("Output discipline");
		expect(text).toContain("Start discovery with `rg`/`fd`");
		expect(text).toContain("must not turn routine recovery into a store dump");
		expect(text).toContain("session.tokens()");
		expect(text).toContain("prompt_manual");
		expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(24 * 1024);
	});

	test("keeps the worst-case extension-owned every-turn baseline within budget", async () => {
		setStableId("test-prompt-budget");
		const base = "PROMPT_BUDGET_BASE";
		const result = await captureSystemPromptResult(
			{ systemPrompt: base },
			{ cwd: "/tmp" },
		);
		const codeModePrompt = fs.readFileSync(
			new URL(
				"../../code-mode/extensions/code-mode-prompt.md",
				import.meta.url,
			),
			"utf8",
		);

		// This simulates the largest permitted every-turn tool reference. The
		// base host prompt is deliberately excluded: this budget guards only the
		// extension-owned structural additions introduced by this ticket.
		const composed = composeCodeModeSystemPrompt(
			result.systemPrompt,
			codeModePrompt,
			"x".repeat(TOOL_REFERENCE_MAX_BYTES),
		);
		const extensionBytes =
			Buffer.byteLength(composed, "utf8") - Buffer.byteLength(base, "utf8");

		expect(extensionBytes).toBeLessThanOrEqual(48 * 1024);
	});
});

describe("default-prompt Mesh Telegram media instructions", () => {
	beforeEach(clearStableId);
	afterEach(clearStableId);

	test("makes the existing Hooman photo tell contract explicit", async () => {
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE" },
			{ cwd: "/tmp" },
		);
		const text = result?.systemPrompt ?? "";
		expect(text).toContain('prompt_manual({ topic: "notifications-media" })');
		expect(text).toContain("never invent a Telegram API");
		expect(text).toContain("Mesh receipt as Telegram/Hooman confirmation");
	});
});

describe("default-prompt recorded action rationale contract", () => {
	test("keeps same-call rationale without forced checkpoint generations", async () => {
		const result = await captureSystemPromptResult(
			{ systemPrompt: "BASE" },
			{ cwd: "/tmp" },
		);
		const text = result?.systemPrompt ?? "";
		expect(text).toContain("execute_code.thinking");
		expect(text).toContain("same-call rationale");
		expect(text).toContain("Never include secrets");
		expect(text).toContain("call direct `done` alone");
		expect(text).not.toContain("[THINKING STATE]");
		expect(text).not.toContain("/think status");
		expect(text).not.toContain("requestedEffort");
		expect(text).not.toContain("assess + analyze");
	});
});
