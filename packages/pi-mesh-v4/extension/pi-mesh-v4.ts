/**
 * pi on the v4 mesh: the same job pi-mesh does, over the mesh's MCP face instead of a local sidecar.
 *
 * WHY A SECOND PACKAGE RATHER THAN A REWRITE: this replaces the transport under live conversations,
 * and the transport is the channel the agents talk to each other on. Both extensions therefore
 * install side by side, and the switch is deliberate:
 *
 *   - The extension is INERT without a credential file. No credential, no connection, one notice,
 *     and the session behaves exactly as it did before.
 *   - Inbound delivery is the v4 mesh's own mail: a message that arrives is handed to the session
 *     at its run boundary, the same way the courier hands it to any other client.
 *   - The TOOLS stay behind `PI_MESH_V4_TOOLS=1`, because pi-mesh already registers `mesh_tell`,
 *     `mesh_peers` and `mesh_inbox`, and two extensions owning one name is a fight nobody wins.
 *     Flipping a machine means turning that on and taking pi-mesh out of its extension list.
 *
 * THE CREDENTIAL IS A FILE, never an argument and never the environment: it is this session's own
 * capability, and it is read again — not cached — when the mesh answers 401, because per-activation
 * tokens rotate and a session that outlives its token should re-read rather than die.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { MeshMcpClient, MeshMcpHttpError } from "./mcp-client.ts";
import { runCourier, type CourierMessage, type MeshCall } from "./courier-loop.ts";
import { createRunBoundaryDelivery } from "../../pi-mesh/extension/run-boundary-delivery.ts";

const ENV_CREDENTIAL_FILE = "KALIV4_MESH_CREDENTIAL_FILE";
const ENV_URL = "KALIV4_MESH_URL";
const ENV_TOOLS = "PI_MESH_V4_TOOLS";
const DEFAULT_URL = "http://127.0.0.1:7800/mcp";
const DEFAULT_CREDENTIAL_FILE = ".pi/mesh-v4.capability";
const CURSOR_DIR = ".pi/mesh-v4";

function notify(message: string, level: "info" | "error", ctx: { ui?: { notify?: (text: string, level?: "info" | "error") => void } }): void {
	// A notice must never be the reason a session fails: the mesh is a side channel, the session is not.
	try {
		ctx.ui?.notify?.(message, level);
	} catch {
		// Ignored by design.
	}
}

export function credentialPath(env: Record<string, string | undefined> = process.env): string {
	const fromEnv = env[ENV_CREDENTIAL_FILE];
	return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : join(homedir(), DEFAULT_CREDENTIAL_FILE);
}

export function meshUrl(env: Record<string, string | undefined> = process.env): string {
	const fromEnv = env[ENV_URL];
	return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : DEFAULT_URL;
}

/** Undefined when there is no usable credential: absent, unreadable, or empty. */
export function readCredential(path: string): string | undefined {
	try {
		const raw = readFileSync(path, "utf8").trim();
		return raw.length > 0 ? raw : undefined;
	} catch {
		return undefined;
	}
}

/** What a session sees when mail arrives: the sender, the topic, and the body as it was written. */
export function formatInbound(message: CourierMessage, scope?: string): string {
	const from = scope !== undefined && scope.length > 0 ? scope + "/" + message.from : message.from;
	return "[mesh] " + from + (message.topic !== undefined ? " · " + message.topic : "") + "\n" + message.body;
}

export default function piMeshV4(pi: ExtensionAPI): void {
	let runLive = false;
	let actor = "";
	let client: MeshMcpClient | undefined;
	let credentialFile = credentialPath();
	const controller = new AbortController();
	const runDelivery = createRunBoundaryDelivery(() => runLive);

	/** The verbs, as the courier and the tools call them. Undefined means the session is not attached. */
	const call: MeshCall = async (verb, args) => {
		const active = client;
		if (active === undefined) throw new Error("this session is not attached to the v4 mesh");
		let result;
		try {
			result = await active.callTool(verb, args);
		} catch (error) {
			if (error instanceof MeshMcpHttpError && error.status === 401) {
				// A ROTATED CREDENTIAL, NOT A DEAD SESSION: read the file again and rebuild once.
				const credential = readCredential(credentialFile);
				if (credential === undefined) throw new Error("the mesh refused the credential and the file no longer has one");
				const rebuilt = new MeshMcpClient({ url: meshUrl(), credential, clientName: "pi-mesh-v4" });
				await rebuilt.initialize();
				client = rebuilt;
				result = await rebuilt.callTool(verb, args);
			} else {
				throw error;
			}
		}
		if (result.isError) throw new Error(result.text.length > 0 ? result.text : verb + " was refused");
		if (result.structured === undefined) throw new Error(verb + " returned no value");
		return result.structured;
	};

	pi.on("agent_start", () => {
		runLive = true;
	});

	pi.on("agent_settled", () => {
		// THE BOUNDARY: the run is over and the session is idle, which is exactly where a delivery can
		// open a fresh turn instead of parking in a queue an aborted run never drains.
		runLive = false;
		runDelivery.drain();
	});

	pi.on("session_shutdown", async () => {
		controller.abort();
		await client?.close();
		client = undefined;
	});

	pi.on("session_start", async (_event, ctx) => {
		credentialFile = credentialPath();
		const credential = readCredential(credentialFile);
		if (credential === undefined) {
			// INERT, AND THE REASON IS SAID ONCE: a machine that has not been flipped keeps working exactly
			// as it did, which is the whole point of installing this beside pi-mesh.
			notify("mesh v4: no credential at " + credentialFile + ", staying idle", "info", ctx);
			return;
		}
		const candidate = new MeshMcpClient({ url: meshUrl(), credential, clientName: "pi-mesh-v4" });
		try {
			await candidate.initialize();
			const me = (await candidate.callTool("whoami", {})) as { isError: boolean; structured?: unknown; text: string };
			if (me.isError) throw new Error(me.text);
			const who = me.structured as { actor?: unknown; scope?: unknown };
			if (typeof who?.actor !== "string" || who.actor.length === 0) throw new Error("the mesh answered whoami without an actor");
			actor = who.actor;
			client = candidate;
			notify("mesh v4: attached as " + actor + (typeof who.scope === "string" ? " (" + who.scope + ")" : ""), "info", ctx);
		} catch (error) {
			// A FAILED ATTACHMENT IS NOT A FAILED SESSION: report it and leave the session alone.
			notify("mesh v4: could not attach — " + (error instanceof Error ? error.message : String(error)), "error", ctx);
			await candidate.close();
			return;
		}

		// The loop runs for the life of the session and is deliberately not awaited: attaching must not
		// hold up the session, and the loop's own errors are logged rather than thrown into a turn.
		void runCourier({
			call,
			deliver: (message) => {
				runDelivery.send(() =>
					pi.sendMessage(
						{ customType: "mesh-v4", content: formatInbound(message), display: false },
						{ deliverAs: "followUp", triggerTurn: true },
					),
				);
			},
			stateDir: join(homedir(), CURSOR_DIR),
			actor,
			signal: controller.signal,
			log: (line) => notify("mesh v4: " + line, "info", ctx),
		}).catch((error) => {
			notify("mesh v4: the inbox loop stopped — " + (error instanceof Error ? error.message : String(error)), "error", ctx);
		});
	});

	// THE TOOLS STAY BEHIND A SWITCH while pi-mesh is still installed: both register the same names.
	if (process.env[ENV_TOOLS] !== "1") return;

	const text = (value: string) => ({ content: [{ type: "text" as const, text: value }], details: {} });

	pi.registerTool({
		name: "mesh_peers",
		label: "Mesh Peers",
		description: "List the actors this mesh currently knows, as the credential's scope sees them.",
		parameters: Type.Object({}),
		async execute() {
			const value = (await call("peers", {})) as { peers?: unknown };
			const peers = Array.isArray(value.peers) ? value.peers : [];
			if (peers.length === 0) return text("no peers visible");
			const lines = peers.map((peer) => {
				const entry = peer as { actor?: unknown; name?: unknown; lastSeen?: unknown; online?: unknown };
				const label = typeof entry.name === "string" && entry.name.length > 0 ? entry.name : String(entry.actor ?? "?");
				const seen = typeof entry.lastSeen === "string" ? " · " + entry.lastSeen : "";
				return label + (entry.online === false ? " (offline)" : "") + seen;
			});
			return text(lines.join("\n"));
		},
	});

	pi.registerTool({
		name: "mesh_inbox",
		label: "Mesh Inbox",
		description: "Read this actor's own mailbox. The mailbox belongs to the credential and cannot be chosen.",
		parameters: Type.Object({ limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })) }),
		async execute(_toolCallId: string, args: { limit?: number }) {
			const value = (await call("inbox", args.limit === undefined ? {} : { limit: args.limit })) as { messages?: unknown };
			const messages = Array.isArray(value.messages) ? value.messages : [];
			if (messages.length === 0) return text("the inbox is empty");
			const lines = messages.map((raw) => {
				const message = raw as { from?: unknown; topic?: unknown; body?: unknown; id?: unknown };
				return "- " + String(message.from ?? "?") + (message.topic !== undefined ? " [" + String(message.topic) + "]" : "") + ": " + String(message.body ?? "");
			});
			return text(lines.join("\n"));
		},
	});

	pi.registerTool({
		name: "mesh_tell",
		label: "Mesh Tell",
		description: "Send a message to another actor on the mesh. The sender is the credential, never an argument.",
		parameters: Type.Object({
			to: Type.String({ description: "The actor to address" }),
			topic: Type.String({ description: "A topic label; metadata only, never an access rule" }),
			body: Type.String({ description: "The message" }),
		}),
		async execute(_toolCallId: string, args: { to: string; topic: string; body: string }) {
			const value = (await call("tell", { to: args.to, topic: args.topic, body: args.body })) as { id?: unknown; delivered?: unknown };
			return text("told " + args.to + (typeof value.id === "string" ? " (id " + value.id + ")" : "") + (value.delivered === false ? " — not delivered, it will wait" : ""));
		},
	});
}
