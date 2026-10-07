/**
 * A client for the v4 mesh's MCP face, hand-written because this extension must not grow a
 * dependency its transport does not need.
 *
 * The face speaks Streamable HTTP: one POST per request, answered with a JSON body or with a
 * text/event-stream carrying the same JSON-RPC response. Four things decide whether this works
 * in production, and all four are here:
 *
 *   1. BOTH accept types. The MCP transport refuses a request that does not accept
 *      `text/event-stream` — it may answer with a stream at any time, and a client that says it
 *      cannot read one is a client the server is right to turn away.
 *   2. The session id. The server issues one at `initialize` and expects it on every later
 *      request, so every reply is inspected for it before its body is even read.
 *   3. The idle eviction. The face drops a session that has gone quiet, and a courier IS quiet by
 *      nature: it holds `wait` open and then hears nothing for minutes. A reply that says the
 *      session is gone rebuilds it ONCE and repeats the request.
 *   4. Typed failures. "The mesh refused" and "the socket died" are different problems for the
 *      caller: a non-2xx answer throws MeshMcpHttpError carrying the status and the body, while a
 *      refusal the face MEANT to make arrives as an ordinary tool result with `isError`.
 *
 * ONE RETRY, NOT A LOOP: a client that re-handshakes forever on a broken handshake is a client
 * nobody can diagnose. The second failure belongs to the caller.
 */

export interface McpToolResult {
	readonly isError: boolean;
	/** Every text part of the result, joined by newlines: what a model would have been shown. */
	readonly text: string;
	/** The result's structured content when the tool returned any, unmodified. */
	readonly structured?: unknown;
}

export interface MeshMcpClientOptions {
	/** The face's endpoint, e.g. http://127.0.0.1:7800/mcp */
	readonly url: string;
	/** The client's OWN capability, read from a file by the caller: never from arguments. */
	readonly credential: string;
	/** Per-request ceiling. `wait` holds a request open up to its own cap, so keep this above it. */
	readonly timeoutMs?: number;
	readonly clientName?: string;
	readonly clientVersion?: string;
	/** Injected so a test can drive a REAL server through a modified transport, without a network. */
	readonly fetch?: typeof fetch;
}

export class MeshMcpHttpError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
		message: string,
	) {
		super(message);
		this.name = "MeshMcpHttpError";
	}
}

const DEFAULT_TIMEOUT_MS = 60_000;
const PROTOCOL_VERSION = "2025-06-18";
const SESSION_HEADER = "mcp-session-id";

interface JsonRpcResponse {
	readonly id?: number | string | null;
	readonly result?: unknown;
	readonly error?: { readonly code?: number; readonly message?: string };
}

export class MeshMcpClient {
	private sessionId?: string;
	private nextId = 1;
	private readonly fetchImpl: typeof fetch;
	private readonly timeoutMs: number;

	constructor(private readonly options: MeshMcpClientOptions) {
		this.fetchImpl = options.fetch ?? fetch;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	/** The session the server issued, once there is one. For diagnostics, not control flow. */
	get session(): string | undefined {
		return this.sessionId;
	}

	async initialize(): Promise<void> {
		const result = await this.#rpc(
			"initialize",
			{
				protocolVersion: PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: {
					name: this.options.clientName ?? "pi-mesh-v4",
					version: this.options.clientVersion ?? "0.0.1",
				},
			},
			{ allowReinitialize: false },
		);
		if (result === undefined) throw new Error("the face answered initialize without a result");
		// The notification is part of the handshake, not a courtesy: the face may hold tool calls
		// until it arrives.
		await this.#notify("notifications/initialized");
	}

	async listTools(): Promise<readonly { name: string; description?: string }[]> {
		const result = (await this.#call("tools/list", {})) as { tools?: unknown };
		if (!Array.isArray(result.tools)) return [];
		return result.tools
			.filter((tool): tool is { name: string; description?: string } => typeof (tool as { name?: unknown }).name === "string")
			.map((tool) => ({
				name: tool.name,
				...(typeof tool.description === "string" ? { description: tool.description } : {}),
			}));
	}

	async callTool(name: string, args: unknown): Promise<McpToolResult> {
		const result = (await this.#call("tools/call", { name, arguments: args })) as {
			content?: unknown;
			isError?: unknown;
			structuredContent?: unknown;
		};
		const parts: string[] = [];
		if (Array.isArray(result.content)) {
			for (const part of result.content) {
				const text =
					(part as { type?: unknown }).type === "text" ? (part as { text?: unknown }).text : undefined;
				if (typeof text === "string") parts.push(text);
			}
		}
		return {
			isError: result.isError === true,
			text: parts.join("\n"),
			...(result.structuredContent !== undefined ? { structured: result.structuredContent } : {}),
		};
	}

	/** Ends the session politely. A failure is not the caller's problem: the face evicts it anyway. */
	async close(): Promise<void> {
		const session = this.sessionId;
		if (session === undefined) return;
		this.sessionId = undefined;
		try {
			await this.fetchImpl(this.options.url, {
				method: "DELETE",
				headers: this.#headers(session),
				signal: AbortSignal.timeout(this.timeoutMs),
			});
		} catch {
			// Best effort, by design.
		}
	}

	async #notify(method: string): Promise<void> {
		const response = await this.#send({ jsonrpc: "2.0", method });
		this.#rememberSession(response);
		if (!response.ok) {
			throw new MeshMcpHttpError(response.status, await safeText(response), method + " was refused");
		}
	}

	async #call(method: string, params: unknown): Promise<unknown> {
		const result = await this.#rpc(method, params, { allowReinitialize: true });
		if (result === undefined) throw new Error(method + " returned no result");
		return result;
	}

	/**
	 * One request. The single place a session is rebuilt, and the only place a retry happens: after
	 * a rebuild the request is sent once more and its failure is final.
	 */
	async #rpc(
		method: string,
		params: unknown,
		options: { allowReinitialize: boolean },
	): Promise<unknown> {
		const request = { jsonrpc: "2.0" as const, id: this.nextId++, method, params };
		let response = await this.#send(request);
		this.#rememberSession(response);
		if (response.ok) return readReply(response, request.id);

		const status = response.status;
		const body = await safeText(response);
		if (options.allowReinitialize && isMissingSession(status, body)) {
			// THE IDLE EVICTION: our session was dropped while the courier was quiet.
			this.sessionId = undefined;
			await this.initialize();
			response = await this.#send(request);
			this.#rememberSession(response);
			if (response.ok) return readReply(response, request.id);
			throw new MeshMcpHttpError(
				response.status,
				await safeText(response),
				method + " failed after one re-handshake with HTTP " + response.status,
			);
		}
		throw new MeshMcpHttpError(
			status,
			body,
			method + " failed with HTTP " + status + (body.length > 0 ? ": " + body.slice(0, 200) : ""),
		);
	}

	async #send(body: unknown): Promise<Response> {
		return this.fetchImpl(this.options.url, {
			method: "POST",
			headers: this.#headers(this.sessionId),
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(this.timeoutMs),
		});
	}

	/** Every reply is inspected for the session header before its body matters. */
	#rememberSession(response: Response): void {
		const session = response.headers.get(SESSION_HEADER);
		if (session !== null && session.length > 0) this.sessionId = session;
	}

	#headers(session: string | undefined): Record<string, string> {
		return {
			"content-type": "application/json",
			// BOTH, by contract: the transport refuses a client that cannot read a stream.
			accept: "application/json, text/event-stream",
			authorization: "Bearer " + this.options.credential,
			...(session !== undefined ? { [SESSION_HEADER]: session } : {}),
		};
	}
}

async function readReply(response: Response, id: number): Promise<unknown> {
	const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
	if (contentType.includes("text/event-stream")) return readSse(response, id);
	const text = await safeText(response);
	if (text.length === 0) return undefined;
	let parsed: JsonRpcResponse;
	try {
		parsed = JSON.parse(text) as JsonRpcResponse;
	} catch {
		throw new Error("the face answered with something that is not JSON: " + text.slice(0, 200));
	}
	return unwrap(parsed);
}

async function readSse(response: Response, id: number): Promise<unknown> {
	const stream = response.body;
	if (stream === null) throw new Error("the face answered with an event stream and no body");
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) break;
			buffer += decoder.decode(chunk.value, { stream: true });
			// Events are separated by a blank line, and a data line holds one JSON-RPC message.
			let separator = buffer.indexOf("\n\n");
			while (separator !== -1) {
				const event = buffer.slice(0, separator);
				buffer = buffer.slice(separator + 2);
				const data = event
					.split("\n")
					.filter((line) => line.startsWith("data:"))
					.map((line) => line.slice(5).trim())
					.join("");
				if (data.length > 0) {
					const parsed = JSON.parse(data) as JsonRpcResponse;
					if (parsed.id === id) return unwrap(parsed);
				}
				separator = buffer.indexOf("\n\n");
			}
		}
	} finally {
		reader.releaseLock();
	}
	throw new Error("the event stream ended without an answer to request " + id);
}

function unwrap(parsed: JsonRpcResponse): unknown {
	if (parsed.error !== undefined) {
		throw new Error("the face refused the request: " + (parsed.error.message ?? JSON.stringify(parsed.error)));
	}
	return parsed.result;
}

/** An unknown session is reported differently by different revisions: a message, or a bare 404. */
function isMissingSession(status: number, body: string): boolean {
	return status === 404 && (body.length === 0 || /session/i.test(body));
}

async function safeText(response: Response): Promise<string> {
	try {
		return await response.text();
	} catch {
		return "";
	}
}
