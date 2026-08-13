import { describe, expect, test } from "bun:test";
import {
	buildBridgeReply,
	buildBridgeRequest,
	extractFinalAssistantOutcome,
	MAX_ANSWER_BYTES,
	MAX_PROMPT_BYTES,
	parseBridgeInput,
	parseBridgeReplyInput,
	parseBridgeSecret,
	REQUEST_TTL_MS,
} from "../extension/maestri-bridge/protocol.ts";

const secret = parseBridgeSecret(Buffer.alloc(32, 7).toString("base64url"))!;
const otherSecret = parseBridgeSecret(
	Buffer.alloc(32, 9).toString("base64url"),
)!;

describe("buildBridgeRequest + parseBridgeInput", () => {
	test("round trip", () => {
		const built = buildBridgeRequest({
			secret,
			replyTo: "Pi #2",
			task: "summarize the diff",
		});
		const parsed = parseBridgeInput(built.input, secret);
		expect(parsed.kind).toBe("valid");
		if (parsed.kind !== "valid") return;
		expect(parsed.task).toBe("summarize the diff");
		expect(parsed.request.id).toBe(built.request.id);
		expect(parsed.request.replyTo).toBe("Pi #2");
		expect(parsed.request.expiresAt).toBe(built.request.expiresAt);
	});

	test("wrong secret is rejected", () => {
		const built = buildBridgeRequest({
			secret,
			replyTo: "Pi #2",
			task: "hello",
		});
		const parsed = parseBridgeInput(built.input, otherSecret);
		expect(parsed).toEqual({
			kind: "invalid",
			reason: "bridge signature is invalid",
		});
	});

	test("tampered task is rejected by digest", () => {
		const built = buildBridgeRequest({
			secret,
			replyTo: "Pi #2",
			task: "hello",
		});
		const parsed = parseBridgeInput(`${built.marker}\nHELLO TAMPERED`, secret);
		expect(parsed).toEqual({
			kind: "invalid",
			reason: "bridge task digest does not match",
		});
	});

	test("expired request is rejected", () => {
		const now = 1_000_000;
		const built = buildBridgeRequest({
			secret,
			replyTo: "Pi #2",
			task: "hello",
			now,
		});
		const parsed = parseBridgeInput(
			built.input,
			secret,
			now + REQUEST_TTL_MS + 1,
		);
		expect(parsed).toEqual({
			kind: "invalid",
			reason: "bridge request has expired",
		});
	});

	test("TTL above the maximum is rejected at build time", () => {
		expect(() =>
			buildBridgeRequest({
				secret,
				replyTo: "Pi #2",
				task: "x",
				ttlMs: REQUEST_TTL_MS + 1,
			}),
		).toThrow("The bridge request TTL is invalid.");
	});

	test("non-canonical payload is rejected even with a valid signature", async () => {
		const built = buildBridgeRequest({
			secret,
			replyTo: "Pi #2",
			task: "hello",
		});
		const markerLine = built.input.slice(0, built.input.indexOf("\n"));
		const payload = markerLine.split(":")[2]!; // [[...:v1:PAYLOAD:SIG]] → index 2
		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		);
		// Same data, different key order → valid signature over a non-canonical payload.
		const reshuffled = JSON.stringify({
			taskDigest: decoded.taskDigest,
			expiresAt: decoded.expiresAt,
			replyTo: decoded.replyTo,
			id: decoded.id,
			kind: decoded.kind,
			v: decoded.v,
		});
		const reencoded = Buffer.from(reshuffled).toString("base64url");
		const { createHmac } = await import("node:crypto");
		const sig = createHmac("sha256", secret)
			.update(`PMB/1 request\n${reencoded}`, "utf8")
			.digest("base64url");
		const parsed = parseBridgeInput(
			`[[pi-maestri-bridge:v1:${reencoded}:${sig}]]\nhello`,
			secret,
		);
		expect(parsed).toEqual({
			kind: "invalid",
			reason: "bridge payload is not canonical",
		});
	});

	test("oversized task throws at build time", () => {
		expect(() =>
			buildBridgeRequest({
				secret,
				replyTo: "Pi #2",
				task: "x".repeat(MAX_PROMPT_BYTES + 1),
			}),
		).toThrow();
	});

	test("non-bridge input is absent", () => {
		expect(parseBridgeInput("just a normal message", secret)).toEqual({
			kind: "absent",
		});
	});
});

describe("buildBridgeReply + parseBridgeReplyInput", () => {
	test("round trip", () => {
		const built = buildBridgeRequest({ secret, replyTo: "Pi #2", task: "t" });
		const reply = buildBridgeReply({
			secret,
			requestId: built.request.id,
			result: "the answer",
		});
		const parsed = parseBridgeReplyInput(reply.input, secret);
		expect(parsed.kind).toBe("valid");
		if (parsed.kind !== "valid") return;
		expect(parsed.result).toBe("the answer");
		expect(parsed.reply.id).toBe(built.request.id);
	});

	test("tampered result is rejected by digest", () => {
		const built = buildBridgeRequest({ secret, replyTo: "Pi #2", task: "t" });
		const reply = buildBridgeReply({
			secret,
			requestId: built.request.id,
			result: "the answer",
		});
		const parsed = parseBridgeReplyInput(`${reply.marker}\nTAMPERED`, secret);
		expect(parsed).toEqual({
			kind: "invalid",
			reason: "bridge reply digest does not match",
		});
	});

	test("oversized result throws at build time", () => {
		const built = buildBridgeRequest({ secret, replyTo: "Pi #2", task: "t" });
		expect(() =>
			buildBridgeReply({
				secret,
				requestId: built.request.id,
				result: "x".repeat(MAX_ANSWER_BYTES + 1),
			}),
		).toThrow();
	});
});

describe("extractFinalAssistantOutcome", () => {
	test("ok with final text", () => {
		const outcome = extractFinalAssistantOutcome([
			{ role: "user", content: [{ type: "text", text: "hi" }] },
			{
				role: "assistant",
				stopReason: "stop",
				content: [
					{ type: "text", text: "done: " },
					{ type: "text", text: "42" },
				],
			},
		]);
		expect(outcome).toEqual({ status: "ok", text: "done: 42" });
	});

	test("no assistant message", () => {
		expect(extractFinalAssistantOutcome([{ role: "user" }])).toEqual({
			status: "error",
			reason: "target agent produced no assistant message",
		});
	});

	test("unclean stop reason", () => {
		const outcome = extractFinalAssistantOutcome([
			{
				role: "assistant",
				stopReason: "length",
				content: [{ type: "text", text: "x" }],
			},
		]);
		expect(outcome.status).toBe("error");
		if (outcome.status === "error") expect(outcome.reason).toContain("length");
	});

	test("empty text", () => {
		const outcome = extractFinalAssistantOutcome([
			{
				role: "assistant",
				stopReason: "stop",
				content: [{ type: "text", text: "  " }],
			},
		]);
		expect(outcome).toEqual({
			status: "error",
			reason: "target agent produced no final textual answer",
		});
	});

	test("oversize answer", () => {
		const outcome = extractFinalAssistantOutcome([
			{
				role: "assistant",
				stopReason: "stop",
				content: [{ type: "text", text: "x".repeat(MAX_ANSWER_BYTES + 1) }],
			},
		]);
		expect(outcome.status).toBe("error");
		if (outcome.status === "error")
			expect(outcome.reason).toContain("transport limit");
	});
});
