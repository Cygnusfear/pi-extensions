import { describe, expect, test } from "bun:test";
import {
	buildReviveDescriptor,
	isReviveDescriptor,
	pickReviveDescriptorEnv,
	REVIVE_DESCRIPTOR_ENV_ALLOWLIST,
	REVIVE_DESCRIPTOR_KIND,
	REVIVE_DESCRIPTOR_VERSION,
} from "./revive-descriptor.ts";

describe("revive descriptor — shared schema", () => {
	test("buildReviveDescriptor stamps kind/version/updatedAt", () => {
		const d = buildReviveDescriptor({
			sessionFile: "/s/session.jsonl",
			cwd: "/repo",
			command: "pi",
			args: ["--session", "/s/session.jsonl"],
		});
		expect(d.kind).toBe(REVIVE_DESCRIPTOR_KIND);
		expect(d.version).toBe(REVIVE_DESCRIPTOR_VERSION);
		expect(typeof d.updatedAt).toBe("number");
		expect(isReviveDescriptor(d)).toBe(true);
	});

	test("round-trips through JSON (spawner writes → activator reads)", () => {
		const partial = buildReviveDescriptor({
			sessionFile: "/s/session.jsonl",
			cwd: "/repo",
			command: "pi",
			args: ["--session", "/s/session.jsonl", "--model", "anthropic/claude-opus-4-8"],
			model: "anthropic/claude-opus-4-8",
			ticketId: "pe-xyz",
			worktreePath: "/wt",
			env: { PI_TEAMS_TICKET_ID: "pe-xyz" },
			supervisors: ["coord-durable-id"],
			updatedAt: 123,
		});
		const wire = JSON.parse(JSON.stringify(partial));
		expect(isReviveDescriptor(wire)).toBe(true);
		// Activator reconstructs the canonical descriptor by filling durableId.
		const canonical = { ...wire, durableId: "worker-durable-id", sessionId: "sess-1", nickname: "Nova Star Test" };
		expect(isReviveDescriptor(canonical)).toBe(true);
		expect(canonical.args).toEqual(partial.args);
		expect(canonical.supervisors).toEqual(["coord-durable-id"]);
	});

	test("guard rejects malformed / wrong-kind / wrong-version", () => {
		expect(isReviveDescriptor(null)).toBe(false);
		expect(isReviveDescriptor({})).toBe(false);
		expect(isReviveDescriptor({ kind: "other", version: 1, sessionFile: "x", cwd: "y", command: "pi", args: [], updatedAt: 1 })).toBe(false);
		expect(isReviveDescriptor({ kind: REVIVE_DESCRIPTOR_KIND, version: 2, sessionFile: "x", cwd: "y", command: "pi", args: [], updatedAt: 1 })).toBe(false);
		// missing sessionFile
		expect(isReviveDescriptor({ kind: REVIVE_DESCRIPTOR_KIND, version: 1, cwd: "y", command: "pi", args: [], updatedAt: 1 })).toBe(false);
		// args not string[]
		expect(isReviveDescriptor({ kind: REVIVE_DESCRIPTOR_KIND, version: 1, sessionFile: "x", cwd: "y", command: "pi", args: [1], updatedAt: 1 })).toBe(false);
		// env with non-string value
		expect(isReviveDescriptor({ kind: REVIVE_DESCRIPTOR_KIND, version: 1, sessionFile: "x", cwd: "y", command: "pi", args: [], updatedAt: 1, env: { A: 2 } })).toBe(false);
	});

	test("pickReviveDescriptorEnv projects only allow-listed keys, drops secrets", () => {
		const picked = pickReviveDescriptorEnv({
			PI_TEAMS_TICKET_ID: "pe-1",
			PI_TEAMS_COORDINATOR_ID: "coord",
			AWS_SECRET_ACCESS_KEY: "leak-me",
			HOME: "/home/u",
			PI_TEAMS_EMPTY: "",
		});
		expect(picked).toEqual({ PI_TEAMS_TICKET_ID: "pe-1", PI_TEAMS_COORDINATOR_ID: "coord" });
		expect(picked).not.toHaveProperty("AWS_SECRET_ACCESS_KEY");
		expect(picked).not.toHaveProperty("HOME");
		// empty values are dropped
		expect(picked).not.toHaveProperty("PI_TEAMS_EMPTY");
	});

	test("allowlist contains the teams coordination vars a revive needs", () => {
		for (const key of ["PI_TEAMS_TICKET_ID", "PI_TEAMS_COORDINATOR_ID", "PI_TEAMS_WORKER_NAME"]) {
			expect(REVIVE_DESCRIPTOR_ENV_ALLOWLIST).toContain(key);
		}
	});
});
