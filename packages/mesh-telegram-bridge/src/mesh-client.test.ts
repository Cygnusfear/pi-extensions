import { describe, expect, test } from "bun:test";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MeshClient } from "./mesh-client.ts";

/**
 * A stand-in for the mesh sidecar: accepts the client connection, records every
 * newline-delimited JSON frame the client publishes, and answers the handshake
 * with a `ready` event exactly like the real sidecar.
 *
 * Testing over the real wire (rather than stubbing `publish`) is the point: the
 * preempt flag has to survive both the envelope construction AND the JSON
 * encoding, because what the receiving pi-mesh reads is the encoded payload.
 */
async function fakeSidecar() {
	const dir = mkdtempSync(join(tmpdir(), "mesh-client-test-"));
	const sockPath = join(dir, "mesh.sock");
	const frames: Array<Record<string, unknown>> = [];
	let buffer = "";
	let markConnected: () => void = () => {};
	const connected = new Promise<void>((resolve) => {
		markConnected = resolve;
	});

	const server = createServer((sock) => {
		markConnected();
		sock.write(`${JSON.stringify({ ev: "ready", client_id: "bridge-client" })}\n`);
		sock.on("data", (chunk) => {
			buffer += chunk.toString();
			let nl: number;
			while ((nl = buffer.indexOf("\n")) !== -1) {
				const line = buffer.slice(0, nl).trim();
				buffer = buffer.slice(nl + 1);
				if (line) frames.push(JSON.parse(line) as Record<string, unknown>);
			}
		});
	});
	await new Promise<void>((resolve) => server.listen(sockPath, () => resolve()));

	return {
		sockPath,
		frames,
		connected,
		close() {
			server.close();
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

function envelopePublishedTo(
	frames: Array<Record<string, unknown>>,
	topic: string,
): Record<string, unknown> | undefined {
	const frame = frames.find((f) => f.cmd === "publish" && f.topic === topic);
	if (!frame) return undefined;
	return JSON.parse(frame.payload as string) as Record<string, unknown>;
}

/**
 * Socket delivery is ASYNCHRONOUS: a frame the client writes is not visible to the
 * fake sidecar until a later tick, so every assertion waits for the frame it
 * expects instead of racing the event loop. Bounded, so a genuine regression still
 * fails fast rather than hanging the suite.
 */
/**
 * The mesh:tell envelope published to a topic. The wire nests two envelopes —
 * MeshMessage { from, topic, payload, timestamp } wrapping MeshTellEnvelope —
 * so this unwrap mirrors exactly what the receiving pi-mesh reads.
 */
async function waitForTell(
	frames: Array<Record<string, unknown>>,
	topic: string,
	timeoutMs = 1000,
): Promise<Record<string, unknown> | undefined> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const outer = envelopePublishedTo(frames, topic);
		const inner = outer?.payload;
		if (inner && typeof inner === "object") return inner as Record<string, unknown>;
		if (Date.now() > deadline) return undefined;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

async function waitForEnvelope(
	frames: Array<Record<string, unknown>>,
	topic: string,
	timeoutMs = 1000,
): Promise<Record<string, unknown> | undefined> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const env = envelopePublishedTo(frames, topic);
		if (env) return env;
		if (Date.now() > deadline) return undefined;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

async function withClient(
	run: (client: MeshClient, sidecar: Awaited<ReturnType<typeof fakeSidecar>>) => Promise<void> | void,
): Promise<void> {
	const sidecar = await fakeSidecar();
	const client = new MeshClient({
		meshId: "hooman-durable-id",
		nickname: "The Hooman",
		channel: "team-channel",
		sockPath: sidecar.sockPath,
	});
	// Wait for the CLIENT's readiness, not the server's accept: until the sidecar's
	// ready frame has been processed MeshClient.send() drops frames silently because
	// the socket is not yet writable.
	const ready = new Promise<void>((resolve) => client.once("ready", () => resolve()));
	try {
		client.start();
		await ready;
		await run(client, sidecar);
	} finally {
		client.stop();
		sidecar.close();
	}
}

describe("MeshClient — a hooman tell always interrupts", () => {
	test("a direct tell to an agent is published with preempt=steer", async () => {
		await withClient(async (client, sidecar) => {
			client.tellAgent({ clientId: "peer-client-1" }, "look at this now");

			const env = await waitForTell(sidecar.frames, "pi/mesh/session/peer-client-1");
			expect(env?.kind).toBe("mesh:tell");
			expect(env?.preempt).toBe("abort");
			expect(env?.from).toBe("bridge-client"); // the id from the sidecar handshake
			expect(env?.payload).toEqual({ text: "look at this now", from: "The Hooman" });
		});
	});

	test("a tell routed by durable meshId is preempted too", async () => {
		await withClient(async (client, sidecar) => {
			client.tellAgent({ clientId: "peer-client-2", meshId: "peer-durable-2" }, "hi");

			const env = await waitForTell(sidecar.frames, "pi/mesh/session/peer-durable-2");
			expect(env?.preempt).toBe("abort");
		});
	});

	test("a control-plane tell is preempted as well (one choke point)", async () => {
		await withClient(async (client, sidecar) => {
			client.tellAgentControl({ clientId: "peer-client-3" }, { control: "setModel", model: "x" });

			const env = await waitForTell(sidecar.frames, "pi/mesh/session/peer-client-3");
			expect(env?.kind).toBe("mesh:tell");
			expect(env?.preempt).toBe("abort");
			expect(env?.payload).toEqual({ control: "setModel", model: "x" });
		});
	});

	test("the level is abort, so the hooman can stop a running agent", async () => {
		await withClient(async (client, sidecar) => {
			client.tellAgent({ clientId: "peer-client-4" }, "anything");

			const env = await waitForTell(sidecar.frames, "pi/mesh/session/peer-client-4");
			expect(env?.preempt).toBe("abort");
		});
	});

	test("announcements and channel broadcasts are not tells and carry no preempt", async () => {
		await withClient(async (client, sidecar) => {
			client.broadcast("hello channel");

			const announce = await waitForEnvelope(sidecar.frames, "pi/mesh/announce/bridge-client");
			expect(announce).toBeDefined();
			expect("preempt" in (announce ?? {})).toBe(false);

			const channel = await waitForEnvelope(sidecar.frames, "pi/mesh/channel/team-channel");
			expect(channel?.channel).toBe("team-channel");
			expect("preempt" in (channel ?? {})).toBe(false);
		});
	});
});
