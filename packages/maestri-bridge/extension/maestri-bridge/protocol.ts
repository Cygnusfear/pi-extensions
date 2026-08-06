import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const PROTOCOL_VERSION = 1 as const;
export const REQUEST_PREFIX = "[[pi-maestri-bridge:v1:";
export const REPLY_PREFIX = "[[pi-maestri-bridge:reply:v1:";
export const MAX_PROMPT_BYTES = 24 * 1024;
export const MAX_ANSWER_BYTES = 256 * 1024;
export const REQUEST_TTL_MS = 5 * 60 * 1000;
export const REPLY_TTL_MS = 5 * 60 * 1000;
export const MAX_CLOCK_SKEW_MS = 30 * 1000;

const REQUEST_MARKER_RE = /^\[\[pi-maestri-bridge:v1:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)\]\]$/;
const REPLY_MARKER_RE = /^\[\[pi-maestri-bridge:reply:v1:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)\]\]$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export interface BridgeRequest {
	v: typeof PROTOCOL_VERSION;
	kind: "request";
	id: string;
	replyTo: string;
	expiresAt: number;
	taskDigest: string;
}

export interface BridgeReply {
	v: typeof PROTOCOL_VERSION;
	kind: "reply";
	id: string;
	expiresAt: number;
	resultDigest: string;
}

export interface BuiltBridgeRequest {
	request: BridgeRequest;
	marker: string;
	input: string;
}

export interface BuiltBridgeReply {
	reply: BridgeReply;
	marker: string;
	input: string;
}

export type ParsedBridgeInput =
	| { kind: "absent" }
	| { kind: "invalid"; reason: string }
	| { kind: "valid"; request: BridgeRequest; task: string };

export type ParsedBridgeReplyInput =
	| { kind: "absent" }
	| { kind: "invalid"; reason: string }
	| { kind: "valid"; reply: BridgeReply; result: string };

export type AssistantOutcome =
	| { status: "ok"; text: string }
	| { status: "error"; reason: string };

export interface BuildBridgeRequestOptions {
	secret: Buffer;
	replyTo: string;
	task: string;
	now?: number;
	id?: string;
	ttlMs?: number;
}

export interface BuildBridgeReplyOptions {
	secret: Buffer;
	requestId: string;
	result: string;
	now?: number;
	ttlMs?: number;
}

function byteLength(value: string): number {
	return Buffer.byteLength(value, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function encodeBase64Url(value: string | Buffer): string {
	return Buffer.from(value).toString("base64url");
}

function decodeCanonicalBase64Url(value: string): string | undefined {
	if (!BASE64URL_RE.test(value)) return undefined;

	try {
		const decoded = Buffer.from(value, "base64url");
		const text = decoded.toString("utf8");
		return encodeBase64Url(text) === value ? text : undefined;
	} catch {
		return undefined;
	}
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalRequest(request: BridgeRequest): string {
	return JSON.stringify({
		v: request.v,
		kind: request.kind,
		id: request.id,
		replyTo: request.replyTo,
		expiresAt: request.expiresAt,
		taskDigest: request.taskDigest,
	});
}

function canonicalReply(reply: BridgeReply): string {
	return JSON.stringify({
		v: reply.v,
		kind: reply.kind,
		id: reply.id,
		expiresAt: reply.expiresAt,
		resultDigest: reply.resultDigest,
	});
}

function signatureFor(secret: Buffer, domain: "request" | "reply", payload: string): string {
	return createHmac("sha256", secret).update(`PMB/1 ${domain}\n${payload}`, "utf8").digest("base64url");
}

function hasValidSignature(secret: Buffer, domain: "request" | "reply", payload: string, supplied: string): boolean {
	if (!BASE64URL_RE.test(supplied)) return false;

	const expected = Buffer.from(signatureFor(secret, domain, payload), "base64url");
	const received = Buffer.from(supplied, "base64url");
	return expected.length === received.length && timingSafeEqual(expected, received);
}

function validTtl(now: number, ttlMs: number, maximum: number): boolean {
	return Number.isSafeInteger(now) && Number.isSafeInteger(ttlMs) && ttlMs > 0 && ttlMs <= maximum;
}

function validEnvelopeExpiration(expiresAt: number, now: number, maximumTtl: number): boolean {
	return Number.isSafeInteger(expiresAt) && expiresAt > now && expiresAt - now <= maximumTtl + MAX_CLOCK_SKEW_MS;
}

export function isValidBridgeSecret(secret: Buffer): boolean {
	return secret.byteLength === 32;
}

export function parseBridgeSecret(value: string): Buffer | undefined {
	const normalized = value.trim();
	if (!BASE64URL_RE.test(normalized)) return undefined;

	try {
		const secret = Buffer.from(normalized, "base64url");
		return isValidBridgeSecret(secret) && secret.toString("base64url") === normalized ? secret : undefined;
	} catch {
		return undefined;
	}
}

export function isValidTerminalName(value: string): boolean {
	return value.length > 0 && value.trim() === value && byteLength(value) <= 128 && !/[\u0000-\u001F\u007F]/.test(value);
}

export function isBridgeCandidate(input: string): boolean {
	return input.startsWith(REQUEST_PREFIX);
}

export function isBridgeReplyCandidate(input: string): boolean {
	return input.startsWith(REPLY_PREFIX);
}

export function buildBridgeRequest(options: BuildBridgeRequestOptions): BuiltBridgeRequest {
	if (!isValidBridgeSecret(options.secret)) {
		throw new Error("The Pi↔Maestri bridge secret must be exactly 32 bytes.");
	}
	if (!isValidTerminalName(options.replyTo)) {
		throw new Error("The bridge reply target must be a non-empty Maestri terminal name of at most 128 UTF-8 bytes.");
	}
	if (options.task.trim().length === 0 || byteLength(options.task) > MAX_PROMPT_BYTES) {
		throw new Error(`The bridge task must be non-empty and at most ${MAX_PROMPT_BYTES} UTF-8 bytes.`);
	}

	const now = options.now ?? Date.now();
	const ttlMs = options.ttlMs ?? REQUEST_TTL_MS;
	if (!validTtl(now, ttlMs, REQUEST_TTL_MS)) throw new Error("The bridge request TTL is invalid.");

	const request: BridgeRequest = {
		v: PROTOCOL_VERSION,
		kind: "request",
		id: options.id ?? randomUUID(),
		replyTo: options.replyTo,
		expiresAt: now + ttlMs,
		taskDigest: sha256(options.task),
	};
	if (!UUID_V4_RE.test(request.id)) throw new Error("The bridge request ID must be an RFC 4122 UUID v4.");

	const payload = encodeBase64Url(canonicalRequest(request));
	const marker = `[[pi-maestri-bridge:v1:${payload}:${signatureFor(options.secret, "request", payload)}]]`;
	return { request, marker, input: `${marker}\n${options.task}` };
}

export function buildBridgeReply(options: BuildBridgeReplyOptions): BuiltBridgeReply {
	if (!isValidBridgeSecret(options.secret)) throw new Error("The Pi↔Maestri bridge secret must be exactly 32 bytes.");
	if (!UUID_V4_RE.test(options.requestId)) throw new Error("The bridge reply request ID must be an RFC 4122 UUID v4.");
	if (options.result.trim().length === 0 || byteLength(options.result) > MAX_ANSWER_BYTES) {
		throw new Error(`The bridge result must be non-empty and at most ${MAX_ANSWER_BYTES} UTF-8 bytes.`);
	}

	const now = options.now ?? Date.now();
	const ttlMs = options.ttlMs ?? REPLY_TTL_MS;
	if (!validTtl(now, ttlMs, REPLY_TTL_MS)) throw new Error("The bridge reply TTL is invalid.");

	const reply: BridgeReply = {
		v: PROTOCOL_VERSION,
		kind: "reply",
		id: options.requestId,
		expiresAt: now + ttlMs,
		resultDigest: sha256(options.result),
	};
	const payload = encodeBase64Url(canonicalReply(reply));
	const marker = `[[pi-maestri-bridge:reply:v1:${payload}:${signatureFor(options.secret, "reply", payload)}]]`;
	return { reply, marker, input: `${marker}\n${options.result}` };
}

export function parseBridgeInput(input: string, secret: Buffer, now = Date.now()): ParsedBridgeInput {
	if (!isBridgeCandidate(input)) return { kind: "absent" };
	if (!isValidBridgeSecret(secret)) return { kind: "invalid", reason: "bridge secret is invalid" };
	if (byteLength(input) > MAX_PROMPT_BYTES + 2048) return { kind: "invalid", reason: "bridge input exceeds the size limit" };

	const newline = input.indexOf("\n");
	if (newline <= 0) return { kind: "invalid", reason: "bridge marker must occupy the first line" };

	const markerMatch = input.slice(0, newline).match(REQUEST_MARKER_RE);
	const task = input.slice(newline + 1);
	if (!markerMatch) return { kind: "invalid", reason: "bridge marker syntax is invalid" };
	if (task.trim().length === 0 || byteLength(task) > MAX_PROMPT_BYTES) return { kind: "invalid", reason: "bridge task is invalid" };

	const [, payload, suppliedSignature] = markerMatch;
	const decodedPayload = decodeCanonicalBase64Url(payload);
	if (!decodedPayload) return { kind: "invalid", reason: "bridge payload encoding is invalid" };

	let parsed: unknown;
	try {
		parsed = JSON.parse(decodedPayload);
	} catch {
		return { kind: "invalid", reason: "bridge payload is not JSON" };
	}
	if (!isRecord(parsed) || !hasExactKeys(parsed, ["v", "kind", "id", "replyTo", "expiresAt", "taskDigest"])) {
		return { kind: "invalid", reason: "bridge payload fields are invalid" };
	}
	if (
		parsed.v !== PROTOCOL_VERSION ||
		parsed.kind !== "request" ||
		typeof parsed.id !== "string" ||
		typeof parsed.replyTo !== "string" ||
		typeof parsed.expiresAt !== "number" ||
		typeof parsed.taskDigest !== "string"
	) {
		return { kind: "invalid", reason: "bridge payload types are invalid" };
	}

	const request: BridgeRequest = {
		v: PROTOCOL_VERSION,
		kind: "request",
		id: parsed.id,
		replyTo: parsed.replyTo,
		expiresAt: parsed.expiresAt,
		taskDigest: parsed.taskDigest,
	};
	if (!UUID_V4_RE.test(request.id) || !isValidTerminalName(request.replyTo) || !SHA256_HEX_RE.test(request.taskDigest)) {
		return { kind: "invalid", reason: "bridge payload values are invalid" };
	}
	if (!validEnvelopeExpiration(request.expiresAt, now, REQUEST_TTL_MS)) return { kind: "invalid", reason: "bridge request has expired" };
	if (encodeBase64Url(canonicalRequest(request)) !== payload) return { kind: "invalid", reason: "bridge payload is not canonical" };
	if (!hasValidSignature(secret, "request", payload, suppliedSignature)) return { kind: "invalid", reason: "bridge signature is invalid" };
	if (sha256(task) !== request.taskDigest) return { kind: "invalid", reason: "bridge task digest does not match" };

	return { kind: "valid", request, task };
}

export function parseBridgeReplyInput(input: string, secret: Buffer, now = Date.now()): ParsedBridgeReplyInput {
	if (!isBridgeReplyCandidate(input)) return { kind: "absent" };
	if (!isValidBridgeSecret(secret)) return { kind: "invalid", reason: "bridge secret is invalid" };
	if (byteLength(input) > MAX_ANSWER_BYTES + 2048) return { kind: "invalid", reason: "bridge reply exceeds the size limit" };

	const newline = input.indexOf("\n");
	if (newline <= 0) return { kind: "invalid", reason: "bridge reply marker must occupy the first line" };

	const markerMatch = input.slice(0, newline).match(REPLY_MARKER_RE);
	const result = input.slice(newline + 1);
	if (!markerMatch) return { kind: "invalid", reason: "bridge reply marker syntax is invalid" };
	if (result.trim().length === 0 || byteLength(result) > MAX_ANSWER_BYTES) return { kind: "invalid", reason: "bridge reply body is invalid" };

	const [, payload, suppliedSignature] = markerMatch;
	const decodedPayload = decodeCanonicalBase64Url(payload);
	if (!decodedPayload) return { kind: "invalid", reason: "bridge reply payload encoding is invalid" };

	let parsed: unknown;
	try {
		parsed = JSON.parse(decodedPayload);
	} catch {
		return { kind: "invalid", reason: "bridge reply payload is not JSON" };
	}
	if (!isRecord(parsed) || !hasExactKeys(parsed, ["v", "kind", "id", "expiresAt", "resultDigest"])) {
		return { kind: "invalid", reason: "bridge reply fields are invalid" };
	}
	if (
		parsed.v !== PROTOCOL_VERSION ||
		parsed.kind !== "reply" ||
		typeof parsed.id !== "string" ||
		typeof parsed.expiresAt !== "number" ||
		typeof parsed.resultDigest !== "string"
	) {
		return { kind: "invalid", reason: "bridge reply types are invalid" };
	}

	const reply: BridgeReply = {
		v: PROTOCOL_VERSION,
		kind: "reply",
		id: parsed.id,
		expiresAt: parsed.expiresAt,
		resultDigest: parsed.resultDigest,
	};
	if (!UUID_V4_RE.test(reply.id) || !SHA256_HEX_RE.test(reply.resultDigest)) return { kind: "invalid", reason: "bridge reply values are invalid" };
	if (!validEnvelopeExpiration(reply.expiresAt, now, REPLY_TTL_MS)) return { kind: "invalid", reason: "bridge reply has expired" };
	if (encodeBase64Url(canonicalReply(reply)) !== payload) return { kind: "invalid", reason: "bridge reply payload is not canonical" };
	if (!hasValidSignature(secret, "reply", payload, suppliedSignature)) return { kind: "invalid", reason: "bridge reply signature is invalid" };
	if (sha256(result) !== reply.resultDigest) return { kind: "invalid", reason: "bridge reply digest does not match" };

	return { kind: "valid", reply, result };
}

export function formatBridgeTask(task: string): string {
	return [
		"A connected Pi peer sent this signed Maestri bridge request.",
		"Complete the task normally. When you finish, the bridge will deliver only your final answer to the requesting terminal.",
		"Do not call maestri ask yourself for this request.",
		"",
		task,
	].join("\n");
}

export function formatVerifiedBridgeReply(result: string): string {
	return [
		"A verified Pi↔Maestri peer reply arrived for a request you sent.",
		"",
		result,
	].join("\n");
}

export function extractFinalAssistantOutcome(messages: readonly unknown[]): AssistantOutcome {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (!isRecord(message) || message.role !== "assistant") continue;

		const stopReason = typeof message.stopReason === "string" ? message.stopReason : undefined;
		if (stopReason !== "stop") {
			return { status: "error", reason: `target agent did not end cleanly (stop reason: ${stopReason ?? "missing"})` };
		}

		const content = Array.isArray(message.content) ? message.content : [];
		const text = content
			.filter((block): block is Record<string, unknown> => isRecord(block) && block.type === "text" && typeof block.text === "string")
			.map((block) => block.text as string)
			.join("");
		if (text.trim().length === 0) return { status: "error", reason: "target agent produced no final textual answer" };
		if (byteLength(text) > MAX_ANSWER_BYTES) return { status: "error", reason: `target answer exceeds the ${MAX_ANSWER_BYTES}-byte transport limit` };
		return { status: "ok", text };
	}

	return { status: "error", reason: "target agent produced no assistant message" };
}
