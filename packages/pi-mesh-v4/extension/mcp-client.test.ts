import { describe, expect, test } from "bun:test";
import { MeshMcpClient, MeshMcpHttpError } from "./mcp-client.ts";

interface Seen {
	readonly accept?: string;
	readonly session?: string;
	readonly authorization?: string;
	readonly method?: string;
	readonly body?: { method?: string; id?: number; params?: unknown };
}

function rpcBody(result: unknown, id: number): string {
	return JSON.stringify({ jsonrpc: "2.0", id, result });
}

/** A face that answers exactly what a test asks for, and records what it was asked. */
function startFace(
	reply: (seen: Seen, id: number, send: (status: number, body: string, headers?: Record<string, string>) => Response) => Response,
): { url: string; seen: Seen[]; stop: () => void } {
	const seen: Seen[] = [];
	const server = Bun.serve({
		port: 0,
		async fetch(request) {
			const headers = request.headers;
			const record: Seen = {
				accept: headers.get("accept") ?? undefined,
				session: headers.get("mcp-session-id") ?? undefined,
				authorization: headers.get("authorization") ?? undefined,
				method: request.method,
			};
			let parsed: Seen["body"];
			if (request.method === "POST") {
				try {
					parsed = (await request.json()) as Seen["body"];
				} catch {
					parsed = undefined;
				}
				record.body = parsed;
			}
			seen.push(record);
			const id = typeof parsed?.id === "number" ? parsed.id : 0;
			return reply(record, id, (status, body, extra) =>
				new Response(body, { status, headers: { "content-type": "application/json", ...(extra ?? {}) } }),
			);
		},
	});
	return { url: "http://127.0.0.1:" + server.port + "/mcp", seen, stop: () => void server.stop(true) };
}

describe("the mesh MCP client", () => {
	test("initializes with both accept types, keeps the session, and carries it on later requests", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") {
				return send(200, rpcBody({ protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "mesh" } }, id), {
					"mcp-session-id": "session-1",
				});
			}
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			return send(200, rpcBody({ tools: [{ name: "mesh_tell" }] }, id));
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			expect(client.session).toBe("session-1");
			const tools = await client.listTools();
			expect(tools.map((tool) => tool.name)).toEqual(["mesh_tell"]);
			// THE ACCEPT HEADER IS A CONTRACT, not a preference: the transport refuses a client that
			// cannot read an event stream.
			for (const record of face.seen) {
				expect(record.accept).toContain("application/json");
				expect(record.accept).toContain("text/event-stream");
				expect(record.authorization).toBe("Bearer cap");
			}
			// The notification and the call both carry the session the face issued.
			expect(face.seen[1]?.body?.method).toBe("notifications/initialized");
			expect(face.seen.filter((record) => record.body?.method === "tools/list").every((record) => record.session === "session-1")).toBe(true);
		} finally {
			face.stop();
		}
	});

	test("reads an answer that arrives as an event stream", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") return send(200, rpcBody({}, id), { "mcp-session-id": "s" });
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			const payload = JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "over a stream" }] } });
			return new Response("event: message\ndata: " + payload + "\n\n", {
				status: 200,
				headers: { "content-type": "text/event-stream" },
			});
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			const result = await client.callTool("mesh_peers", {});
			expect(result.text).toBe("over a stream");
			expect(result.isError).toBe(false);
		} finally {
			face.stop();
		}
	});

	test("a refusal the face MEANT is a tool result, not an exception", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") return send(200, rpcBody({}, id), { "mcp-session-id": "s" });
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			return send(
				200,
				rpcBody(
					{
						content: [{ type: "text", text: "receiver_rate_limited" }],
						isError: true,
						structuredContent: { code: "receiver_rate_limited" },
					},
					id,
				),
			);
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			const result = await client.callTool("mesh_tell", {});
			expect(result.isError).toBe(true);
			expect(result.text).toBe("receiver_rate_limited");
			expect(result.structured).toEqual({ code: "receiver_rate_limited" });
		} finally {
			face.stop();
		}
	});

	test("a transport failure is typed, with the status and the body kept", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") return send(200, rpcBody({}, id), { "mcp-session-id": "s" });
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			return send(500, "the mesh fell over " + id);
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			let thrown: unknown;
			try {
				await client.listTools();
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBeInstanceOf(MeshMcpHttpError);
			expect((thrown as MeshMcpHttpError).status).toBe(500);
			expect((thrown as MeshMcpHttpError).body).toContain("the mesh fell over");
		} finally {
			face.stop();
		}
	});

	test("an evicted session is rebuilt ONCE and the request repeated", async () => {
		let initializes = 0;
		// HOW MANY times the face drops the session: 1 proves the rebuild-and-repeat, 2 proves it is not a loop.
	let evictionsLeft = 0;
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") {
				initializes += 1;
				return send(200, rpcBody({}, id), { "mcp-session-id": "session-" + initializes });
			}
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			if (evictionsLeft > 0) {
				evictionsLeft -= 1;
				return send(404, "no such session");
			}
			return send(200, rpcBody({ tools: [] }, id));
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			expect(initializes).toBe(1);
			// THE IDLE EVICTION: the courier was quiet long enough for the face to drop the session.
			evictionsLeft = 1;
			await client.listTools();
			expect(initializes).toBe(2);
			expect(client.session).toBe("session-2");
			// AND IT IS NOT A LOOP: a second eviction on the same call is the caller's to see.
			evictionsLeft = 2;
			let thrown: unknown;
			try {
				await client.listTools();
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBeInstanceOf(MeshMcpHttpError);
			expect((thrown as MeshMcpHttpError).status).toBe(404);
			expect(initializes).toBe(3);
		} finally {
			face.stop();
		}
	});

	test("a body that is not JSON is a loud failure, never a silent empty answer", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") return send(200, rpcBody({}, id), { "mcp-session-id": "s" });
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			return new Response("<html>a proxy got in the way</html>", { status: 200, headers: { "content-type": "text/html" } });
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			await expect(client.listTools()).rejects.toThrow(/not JSON/);
		} finally {
			face.stop();
		}
	});

	test("closing sends a DELETE and forgets the session", async () => {
		const face = startFace((seen, id, send) => {
			if (seen.body?.method === "initialize") return send(200, rpcBody({}, id), { "mcp-session-id": "s" });
			if (seen.body?.method === "notifications/initialized") return new Response("", { status: 202 });
			return send(200, rpcBody({}, id));
		});
		const client = new MeshMcpClient({ url: face.url, credential: "cap" });
		try {
			await client.initialize();
			await client.close();
			expect(client.session).toBeUndefined();
			const deletes = face.seen.filter((record) => record.method === "DELETE");
			expect(deletes.length).toBe(1);
			expect(deletes[0]?.session).toBe("s");
		} finally {
			face.stop();
		}
	});
});
