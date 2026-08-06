import { describe, expect, test } from "bun:test";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";
import piMeshExtension, { PiMesh, resolveAndSetIdentity } from "./pi-mesh.ts";
import type { AnnouncePayload, PeerInfo } from "./types.ts";
import { readZmxSession, reconcileZmxSession } from "./zmx-session.ts";

const baseIdentity: MeshIdentity = {
	id: "mesh-id",
	nickname: "Anna Galaxy Jayawardhana",
	claimedAt: 1_700_000_000_000,
	host: "test-host",
};

interface CapturedSidecarCommand {
	cmd: string;
	topic?: string;
	payload?: string;
}

interface PiMeshTestHarness {
	myClientId: string;
	mySessionId: string;
	announceIntervalMs: number;
	heartbeatTimer: ReturnType<typeof setInterval> | null;
	_handleEvent(event: Record<string, unknown>): void;
	_handleAnnounce(announcement: AnnouncePayload): void;
	_announce(clientId: string, cwd: string): void;
	_startHeartbeat(clientId: string, cwd: string): void;
	_send(command: CapturedSidecarCommand): void;
}

function harness(mesh: PiMesh): PiMeshTestHarness {
	return mesh as unknown as PiMeshTestHarness;
}

interface MockSessionEntry {
	type: string;
	customType?: string;
	data?: unknown;
}

function runIdentityResolution(input: {
	reason: string;
	identity?: MeshIdentity;
	zmxSession?: string;
	rebirth?: boolean;
}): { identity: MeshIdentity; appended: MeshIdentity[] } {
	const entries: MockSessionEntry[] = [];
	if (input.identity) {
		entries.push({ type: "custom", customType: "mesh_identity", data: input.identity });
	}
	if (input.rebirth) {
		entries.push({
			type: "custom",
			customType: "mesh_rebirth",
			data: { fromSession: "parent-session", transferedAt: "2026-08-03T00:00:00Z" },
		});
	}

	const mesh = new PiMesh();
	const appended: MeshIdentity[] = [];
	const pi = {
		appendEntry(customType: string, data: unknown) {
			if (customType === "mesh_identity") appended.push(data as MeshIdentity);
		},
	} as unknown as ExtensionAPI;
	resolveAndSetIdentity(
		input.reason,
		{
			sessionManager: {
				getEntries: () => entries,
				getSessionId: () => "pi-session",
			},
		},
		mesh,
		pi,
		{ ZMX_SESSION: input.zmxSession },
	);

	return { identity: mesh.getIdentity()!, appended };
}

describe("readZmxSession", () => {
	test("returns no coordinate when ZMX_SESSION is absent or blank", () => {
		expect(readZmxSession({})).toBeUndefined();
		expect(readZmxSession({ ZMX_SESSION: "   	" })).toBeUndefined();
	});

	test("trims the explicit coordinate", () => {
		expect(readZmxSession({ ZMX_SESSION: "  Ghostty-window-21  " })).toBe(
			"Ghostty-window-21",
		);
	});
});

describe("reconcileZmxSession", () => {
	test("preserves a legacy identity by reference when both coordinates are absent", () => {
		const result = reconcileZmxSession(baseIdentity, undefined);
		expect(result).toEqual({ identity: baseIdentity, changed: false });
		expect(result.identity).toBe(baseIdentity);
	});

	test("preserves a matching identity by reference", () => {
		const identity = { ...baseIdentity, zmxSession: "Ghostty-window-21" };
		const result = reconcileZmxSession(identity, "Ghostty-window-21");
		expect(result.changed).toBe(false);
		expect(result.identity).toBe(identity);
	});

	test("adds or changes the current coordinate without changing durable identity fields", () => {
		const added = reconcileZmxSession(baseIdentity, "Ghostty-window-21");
		expect(added).toEqual({
			identity: { ...baseIdentity, zmxSession: "Ghostty-window-21" },
			changed: true,
		});

		const changed = reconcileZmxSession(added.identity, "Ghostty-window-22");
		expect(changed).toEqual({
			identity: { ...baseIdentity, zmxSession: "Ghostty-window-22" },
			changed: true,
		});
	});

	test("removes a stale coordinate completely when the current process is outside zmx", () => {
		const result = reconcileZmxSession(
			{ ...baseIdentity, zmxSession: "Ghostty-window-21" },
			undefined,
		);
		expect(result).toEqual({ identity: baseIdentity, changed: true });
		expect("zmxSession" in result.identity).toBe(false);
	});

	test("normalizes an explicitly undefined stored coordinate by removing the property", () => {
		const result = reconcileZmxSession({ ...baseIdentity, zmxSession: undefined }, undefined);
		expect(result.changed).toBe(true);
		expect("zmxSession" in result.identity).toBe(false);
	});
});

describe("mesh identity lifecycle", () => {
	test("startup persists a changed coordinate and reload does not append a duplicate", () => {
		const startup = runIdentityResolution({
			reason: "startup",
			identity: baseIdentity,
			zmxSession: "Ghostty-window-21",
		});
		expect(startup.identity).toEqual({ ...baseIdentity, zmxSession: "Ghostty-window-21" });
		expect(startup.appended).toEqual([startup.identity]);

		const reload = runIdentityResolution({
			reason: "reload",
			identity: startup.identity,
			zmxSession: "Ghostty-window-21",
		});
		expect(reload.identity).toEqual(startup.identity);
		expect(reload.appended).toEqual([]);
	});

	test("resume outside zmx persists an identity that clears the stale coordinate", () => {
		const resumed = runIdentityResolution({
			reason: "resume",
			identity: { ...baseIdentity, zmxSession: "Ghostty-window-21" },
		});
		expect(resumed.identity).toEqual(baseIdentity);
		expect("zmxSession" in resumed.identity).toBe(false);
		expect(resumed.appended).toEqual([baseIdentity]);
	});

	test("fork mints a fresh identity carrying the current coordinate", () => {
		const forked = runIdentityResolution({
			reason: "fork",
			identity: baseIdentity,
			zmxSession: "Ghostty-window-21",
		});
		expect(forked.identity.id).not.toBe(baseIdentity.id);
		expect(forked.identity.zmxSession).toBe("Ghostty-window-21");
		expect(forked.appended).toEqual([forked.identity]);
	});

	test("rebirth reuses the durable identity but reconciles its current coordinate", () => {
		const reborn = runIdentityResolution({
			reason: "new",
			identity: baseIdentity,
			zmxSession: "Ghostty-window-21",
			rebirth: true,
		});
		expect(reborn.identity).toEqual({ ...baseIdentity, zmxSession: "Ghostty-window-21" });
		expect(reborn.appended).toEqual([reborn.identity]);
	});

	test("rebirth clears a transferred stale coordinate when the child is outside zmx", () => {
		const reborn = runIdentityResolution({
			reason: "new",
			identity: { ...baseIdentity, zmxSession: "Ghostty-window-parent" },
			rebirth: true,
		});
		expect(reborn.identity).toEqual(baseIdentity);
		expect("zmxSession" in reborn.identity).toBe(false);
		expect(reborn.appended).toEqual([baseIdentity]);
	});
});

describe("PiMesh zmx announcement flow", () => {
	test("self and outbound announcements expose the identity coordinate", () => {
		const mesh = new PiMesh();
		const internals = harness(mesh);
		internals.myClientId = "client-self";
		internals.mySessionId = "pi-session-self";
		mesh.setIdentity({ ...baseIdentity, zmxSession: "Ghostty-window-21" });

		expect(mesh.self().zmxSession).toBe("Ghostty-window-21");

		const sent: CapturedSidecarCommand[] = [];
		internals._send = (command) => sent.push(command);
		internals._announce("client-self", "/workspace");
		const announcement = JSON.parse(sent[0]!.payload ?? "null") as AnnouncePayload;
		expect(announcement.zmxSession).toBe("Ghostty-window-21");
		expect(announcement.meshId).toBe(baseIdentity.id);
	});

	test("inbound announcements preserve optional coordinates and accept older peers", () => {
		const mesh = new PiMesh();
		const internals = harness(mesh);
		internals.myClientId = "client-self";

		internals._handleAnnounce({
			clientId: "client-new",
			sessionId: "pi-session-new",
			hostname: "new-host",
			pid: 123,
			cwd: "/new",
			zmxSession: "Ghostty-window-21",
		});
		internals._handleAnnounce({
			clientId: "client-old",
			sessionId: "pi-session-old",
			hostname: "old-host",
			pid: 456,
			cwd: "/old",
		});

		expect(mesh.peers().find((peer) => peer.id === "client-new")?.zmxSession).toBe(
			"Ghostty-window-21",
		);
		expect(mesh.peers().find((peer) => peer.id === "client-old")?.zmxSession).toBeUndefined();
	});

	test("ready announces once before identity resolution and setIdentity immediately corrects it", () => {
		const mesh = new PiMesh();
		const internals = harness(mesh);
		const announcements: AnnouncePayload[] = [];
		internals._send = (command) => {
			if (command.cmd === "publish" && command.topic?.startsWith("pi/mesh/announce/")) {
				announcements.push(JSON.parse(command.payload ?? "null") as AnnouncePayload);
			}
		};
		mesh.on("ready", () => {
			mesh.setIdentity({ ...baseIdentity, zmxSession: "Ghostty-window-21" });
		});

		try {
			internals._handleEvent({ ev: "ready", zid: "zenoh-host", client_id: "client-self" });
		} finally {
			if (internals.heartbeatTimer) clearInterval(internals.heartbeatTimer);
		}

		expect(announcements).toHaveLength(2);
		expect(announcements[0]!.zmxSession).toBeUndefined();
		expect("zmxSession" in announcements[0]!).toBe(false);
		expect(announcements[1]!.zmxSession).toBe("Ghostty-window-21");
	});

	test("heartbeat reads and publishes the current identity coordinate", async () => {
		const mesh = new PiMesh();
		const internals = harness(mesh);
		internals.myClientId = "client-self";
		internals.mySessionId = "pi-session-self";
		internals.announceIntervalMs = 1;
		mesh.setIdentity({ ...baseIdentity, zmxSession: "Ghostty-window-heartbeat" });

		let timeout: ReturnType<typeof setTimeout> | undefined;
		let resolveAnnouncement: (announcement: AnnouncePayload) => void = () => {};
		const nextAnnouncement = new Promise<AnnouncePayload>((resolve, reject) => {
			resolveAnnouncement = (announcement) => {
				if (timeout) clearTimeout(timeout);
				resolve(announcement);
			};
			timeout = setTimeout(() => reject(new Error("heartbeat did not announce")), 250);
		});
		internals._send = (command) => {
			if (command.cmd === "publish" && command.topic?.startsWith("pi/mesh/announce/")) {
				resolveAnnouncement(JSON.parse(command.payload ?? "null") as AnnouncePayload);
			}
		};

		internals._startHeartbeat("client-self", "/workspace");
		try {
			const announcement = await nextAnnouncement;
			expect(announcement.zmxSession).toBe("Ghostty-window-heartbeat");
		} finally {
			if (timeout) clearTimeout(timeout);
			if (internals.heartbeatTimer) clearInterval(internals.heartbeatTimer);
		}
	});
});

interface CapturedTool {
	name: string;
	execute(...args: unknown[]): Promise<unknown> | unknown;
}

interface CapturedCommand {
	handler(args: string, context: ExtensionCommandContext): Promise<void> | void;
}

describe("registered peer displays", () => {
	test("mesh_peers details/text and /mesh list expose coordinates while legacy peers omit them", async () => {
		const tools = new Map<string, CapturedTool>();
		const commands = new Map<string, CapturedCommand>();
		const pi = {
			on() {},
			registerTool(tool: CapturedTool) {
				tools.set(tool.name, tool);
			},
			registerCommand(name: string, command: CapturedCommand) {
				commands.set(name, command);
			},
			registerMessageRenderer() {},
		} as unknown as ExtensionAPI;
		const globals = globalThis as typeof globalThis & { __piMesh?: PiMesh };
		const previousMesh = globals.__piMesh;

		try {
			piMeshExtension(pi);
			const mesh = globals.__piMesh!;
			const internals = harness(mesh);
			internals.myClientId = "client-self";
			internals.mySessionId = "pi-session-self";
			mesh.setIdentity({ ...baseIdentity, zmxSession: "Ghostty-window-self" });
			internals._handleAnnounce({
				clientId: "client-peer",
				sessionId: "pi-session-peer",
				hostname: "peer-host",
				pid: 123,
				cwd: "/peer",
				nickname: "Peer Galaxy Person",
				zmxSession: "Ghostty-window-peer",
			});
			internals._handleAnnounce({
				clientId: "client-legacy",
				sessionId: "pi-session-legacy",
				hostname: "legacy-host",
				pid: 456,
				cwd: "/legacy",
				nickname: "Legacy Galaxy Person",
			});

			const result = (await tools.get("mesh_peers")!.execute()) as {
				content: Array<{ type: string; text: string }>;
				details: { self: PeerInfo; peers: PeerInfo[] };
			};
			expect(result.details.self.zmxSession).toBe("Ghostty-window-self");
			expect(result.details.peers.find((peer) => peer.id === "client-peer")?.zmxSession).toBe(
				"Ghostty-window-peer",
			);
			expect(
				result.details.peers.find((peer) => peer.id === "client-legacy")?.zmxSession,
			).toBeUndefined();
			expect(result.content[0]!.text).toContain("zmx: Ghostty-window-self");
			expect(result.content[0]!.text).toContain("zmx: Ghostty-window-peer");
			expect(result.content[0]!.text).not.toContain("zmx: undefined");

			const notifications: string[] = [];
			await commands.get("mesh")!.handler("list", {
				ui: { notify: (message: string) => notifications.push(message) },
			} as unknown as ExtensionCommandContext);
			expect(notifications).toHaveLength(1);
			expect(notifications[0]!).toContain("zmx: Ghostty-window-self");
			expect(notifications[0]!).toContain("zmx: Ghostty-window-peer");
			expect(notifications[0]!).not.toContain("zmx: undefined");
		} finally {
			if (previousMesh) globals.__piMesh = previousMesh;
			else delete globals.__piMesh;
		}
	});
});
