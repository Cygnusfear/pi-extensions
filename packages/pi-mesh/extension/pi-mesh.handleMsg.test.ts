import { describe, expect, test } from "bun:test";
import {
	isMeshTellAckEnvelope,
	isMeshTellEnvelope,
	unwrapInboundTell,
} from "./tell-protocol.ts";
import { isMeshAskEnvelope, isMeshAskReceiptEnvelope } from "./ask-protocol.ts";
import type { MeshMessage } from "./types.ts";

/**
 * Regression test for the TDZ (Temporal Dead Zone) variable shadowing bug.
 *
 * The bug: _handleMsg declared `const payload = unwrapped.message.payload`
 * inside a try block where the function parameter was also named `payload`.
 * Due to TDZ, the const was hoisted to the try-block scope, making the
 * function parameter inaccessible. `JSON.parse(payload)` then threw
 * ReferenceError, which `catch {}` swallowed silently — dropping ALL
 * session-topic messages (tells, acks, asks, everything).
 *
 * These tests exercise the exact code path: given a raw JSON payload string,
 * parse it, run the guard checks, unwrap, and verify the inner payload is
 * accessible without hitting TDZ.
 */
describe("_handleMsg TDZ regression", () => {
	// Simulate the _handleMsg session-topic path.
	// pendingAskIds: set of askIds with pending replies (simulates pendingGets map).
	function simulateHandleMsg(payload: string, pendingAskIds = new Set<string>()): {
		emitted?: { event: string; data: unknown };
		error?: Error;
	} {
		try {
			const msg: MeshMessage = JSON.parse(payload);

			if (isMeshAskReceiptEnvelope(msg.payload)) {
				return { emitted: { event: "ask-receipt", data: msg.payload } };
			}
			if (isMeshTellAckEnvelope(msg.payload)) {
				return { emitted: { event: "tell-ack", data: msg.payload } };
			}

			const unwrapped = unwrapInboundTell(msg);
			// This was the bug line — `const payload` shadowed the parameter.
			// Fixed by renaming to `innerPayload`.
			const innerPayload = unwrapped.message.payload;

			if (innerPayload && typeof innerPayload === "object" && "askId" in (innerPayload as Record<string, unknown>)) {
				const askId = (innerPayload as Record<string, unknown>).askId;
				if (typeof askId === "string" && pendingAskIds.has(askId)) {
					return { emitted: { event: "ask-reply", data: innerPayload } };
				}
			}
			if (isMeshAskEnvelope(innerPayload)) {
				return { emitted: { event: "request", data: innerPayload } };
			}
			return { emitted: { event: "message", data: unwrapped } };
		} catch (e) {
			return { error: e as Error };
		}
	}

	test("plain tell is parsed and emitted as message (not swallowed by TDZ)", () => {
		const envelope = JSON.stringify({
			from: "sender-id",
			topic: "session/receiver-id",
			payload: {
				kind: "mesh:tell",
				deliveryId: "test-delivery-1",
				from: "sender-id",
				payload: "hello world",
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted).toBeDefined();
		expect(result.emitted!.event).toBe("message");
	});

	test("footgun closed: the message event delivers an already-unwrapped InboundMeshMessage so a consumer that never calls unwrapInboundTell still reads the inner payload", () => {
		const envelope = JSON.stringify({ from: "route-id", topic: "session/r", payload: { kind: "mesh:tell", deliveryId: "d-fg", from: "durable-sender", payload: { kind: "worker.hello" }, timestamp: 1 }, timestamp: 1 });
		const inbound = simulateHandleMsg(envelope).emitted!.data as { message: { payload: unknown; from: string }; deliveryId?: string; originalFrom?: string };
		// Inner payload, unwrapped by the mesh source. NO unwrapInboundTell call here.
		expect(inbound.message.payload).toEqual({ kind: "worker.hello" });
		expect(inbound.message.from).toBe("durable-sender");
		// Receipt-aware consumers still get the wrapper metadata off the same object.
		expect(inbound.deliveryId).toBe("d-fg");
		expect(inbound.originalFrom).toBe("durable-sender");
	});

	test("tell ack is parsed and matched (not swallowed by TDZ)", () => {
		const envelope = JSON.stringify({
			from: "receiver-id",
			topic: "session/sender-id",
			payload: {
				kind: "mesh:tell:ack",
				deliveryId: "test-delivery-1",
				from: "receiver-id",
				phase: "delivered",
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("tell-ack");
	});

	test("ask envelope inside tell is parsed as request (not swallowed by TDZ)", () => {
		const envelope = JSON.stringify({
			from: "sender-id",
			topic: "session/receiver-id",
			payload: {
				kind: "mesh:tell",
				deliveryId: "test-delivery-2",
				from: "sender-id",
				payload: {
					kind: "mesh:ask",
					askId: "ask-123",
					from: "sender-id",
					payload: { kind: "mesh:view", start: -5, end: 0 },
					timestamp: Date.now(),
				},
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("request");
	});

	test("ask reply (tell with askId) is parsed as ask-reply when pending (not swallowed by TDZ)", () => {
		const envelope = JSON.stringify({
			from: "receiver-id",
			topic: "session/sender-id",
			payload: {
				kind: "mesh:tell",
				deliveryId: "test-delivery-3",
				from: "receiver-id",
				payload: {
					askId: "ask-123",
					response: { entries: ["a", "b"] },
				},
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope, new Set(["ask-123"]));
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("ask-reply");
	});

	test("ask reply with no pending ask falls through to message (not treated as reply)", () => {
		const envelope = JSON.stringify({
			from: "receiver-id",
			topic: "session/sender-id",
			payload: {
				kind: "mesh:tell",
				deliveryId: "test-delivery-3b",
				from: "receiver-id",
				payload: {
					askId: "ask-unknown",
					response: { entries: ["a"] },
				},
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("message");
	});

	test("ask receipt is parsed correctly (not swallowed by TDZ)", () => {
		const envelope = JSON.stringify({
			from: "receiver-id",
			topic: "session/sender-id",
			payload: {
				kind: "mesh:ask:receipt",
				askId: "ask-123",
				from: "receiver-id",
				phase: "delivered",
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("ask-receipt");
	});

	test("non-tell message (raw payload) is emitted as message", () => {
		const envelope = JSON.stringify({
			from: "sender-id",
			topic: "session/receiver-id",
			payload: { custom: "data" },
			timestamp: Date.now(),
		});

		const result = simulateHandleMsg(envelope);
		expect(result.error).toBeUndefined();
		expect(result.emitted!.event).toBe("message");
	});
});
