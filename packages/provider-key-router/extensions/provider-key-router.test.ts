import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import rateLimitRecovery from "../../rate-limit-recovery/extensions/rate-limit-recovery.ts";
import { createProviderKeyRecoveryGate } from "../../shared/src/provider-limits.ts";
import { ProviderKeyHealthLedger } from "../src/key-health-store.ts";
import { keySourceId, saveProviderKeyStore } from "../src/key-store.ts";
import type { ProviderDefinition, ProviderKeyStore } from "../src/types.ts";
import { registerProviderKeyRouter } from "./provider-key-router.ts";

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0))
		fs.rmSync(dir, { recursive: true, force: true });
});

function harness(
	storedLogin = false,
	existingDir?: string,
	gateBeforeRouter = false,
	rejectFollowUp = false,
	options: {
		providerIds?: string[];
		onRegister?: (providerId: string, apiKey: string) => void;
		rateRecoveryOrder?: "before-router" | "after-router";
		saveStore?: typeof saveProviderKeyStore;
	} = {},
) {
	const dir =
		existingDir ??
		fs.mkdtempSync(path.join(os.tmpdir(), "provider-router-extension-"));
	if (!existingDir) dirs.push(dir);
	const sources = ["fake-key-a", "fake-key-b", "fake-key-c"];
	const keys = sources.map((source) => ({ id: keySourceId(source), source }));
	const providerIds = options.providerIds ?? ["qwencloud"];
	const store: ProviderKeyStore = {
		version: 1,
		providers: {
			qwencloud: {
				label: "QwenCloud",
				providerIds,
				command: "qwen",
				keys,
				activeKeyId: keys[0].id,
				autoRotate: true,
			},
		},
	};
	if (!existingDir)
		saveProviderKeyStore(path.join(dir, "provider-keys.json"), store);
	const handlers = new Map<string, Array<(event: any, ctx: any) => any>>();
	const commands = new Map<string, any>();
	const busHandlers = new Map<string, Array<(data: unknown) => void>>();
	const registered: string[] = [];
	const registrations: Array<{ providerId: string; apiKey: string }> = [];
	const activeRegistrations = new Map<string, string>();
	const changed: unknown[] = [];
	let followUps = 0;
	let aborts = 0;
	const notifications: string[] = [];
	const sentMessages: unknown[] = [];
	const scheduledRecoveryDelays: number[] = [];
	const pi: any = {
		on: (name: string, handler: (event: any, ctx: any) => any) => {
			const list = handlers.get(name) ?? [];
			list.push(handler);
			handlers.set(name, list);
		},
		registerProvider: (providerId: string, config: { apiKey: string }) => {
			options.onRegister?.(providerId, config.apiKey);
			registered.push(config.apiKey);
			registrations.push({ providerId, apiKey: config.apiKey });
			activeRegistrations.set(providerId, config.apiKey);
		},
		unregisterProvider: (providerId: string) => {
			activeRegistrations.delete(providerId);
		},
		registerCommand: (name: string, command: any) =>
			commands.set(name, command),
		sendUserMessage: () => {
			if (rejectFollowUp) return Promise.reject(new Error("queue rejected"));
			followUps++;
			return Promise.resolve();
		},
		sendMessage: (message: unknown) => {
			sentMessages.push(message);
		},
		events: {
			on: (name: string, handler: (data: unknown) => void) => {
				const list = busHandlers.get(name) ?? [];
				list.push(handler);
				busHandlers.set(name, list);
				return () => {
					const current = busHandlers.get(name) ?? [];
					busHandlers.set(
						name,
						current.filter((candidate) => candidate !== handler),
					);
				};
			},
			emit: (name: string, data: unknown) => {
				changed.push({ name, data });
				for (const handler of busHandlers.get(name) ?? []) handler(data);
			},
		},
	};
	const ctx: any = {
		model: { provider: "qwencloud", id: "qwen3.8-max" },
		modelRegistry: {
			getProviderAuthStatus: () => ({
				configured: true,
				source: storedLogin ? "stored" : "fallback",
			}),
		},
		ui: {
			notify: (message: string) => {
				notifications.push(message);
			},
		},
		abort: () => {
			aborts++;
		},
	};
	const definition: ProviderDefinition = {
		id: "qwencloud",
		label: "QwenCloud",
		providerIds,
		command: "qwen",
		envVar: "QWENCLOUD_API_KEY",
	};
	const rateRecoveryDependencies = {
		setTimeout: ((_callback: () => void, delay?: number) => {
			scheduledRecoveryDelays.push(delay ?? 0);
			return scheduledRecoveryDelays.length as unknown as ReturnType<
				typeof setTimeout
			>;
		}) as typeof setTimeout,
		clearTimeout: (() => {}) as typeof clearTimeout,
		fireNotification: () => {},
		relayProviderLimitNotice: () => {},
	};
	const earlyGate = gateBeforeRouter
		? createProviderKeyRecoveryGate(pi.events)
		: undefined;
	if (options.rateRecoveryOrder === "before-router")
		rateLimitRecovery(pi, rateRecoveryDependencies);
	registerProviderKeyRouter(pi, {
		agentDir: dir,
		definitions: [definition],
		saveStore: options.saveStore,
	});
	if (options.rateRecoveryOrder === "after-router")
		rateLimitRecovery(pi, rateRecoveryDependencies);
	const recoveryGate = earlyGate ?? createProviderKeyRecoveryGate(pi.events);
	const emit = async (name: string, event: any) => {
		let result: any;
		for (const handler of handlers.get(name) ?? [])
			result = await handler(event, ctx);
		return result;
	};
	const emitConcurrently = async (name: string, event: any) => {
		const results = (handlers.get(name) ?? []).map((handler) =>
			handler(event, ctx),
		);
		return Promise.all(results.map((result) => Promise.resolve(result)));
	};
	return {
		dir,
		handlers,
		commands,
		registered,
		registrations,
		activeRegistrations,
		changed,
		emit,
		ctx,
		pi,
		recoveryGate,
		emitConcurrently,
		notifications,
		sentMessages,
		scheduledRecoveryDelays,
		followUps: () => followUps,
		aborts: () => aborts,
	};
}

describe("provider-key-router host lifecycle", () => {
	test("rotates synchronously before each built-in retry and stops after exhaustion", async () => {
		const h = harness();
		expect(h.registered.at(-1)).toBe("fake-key-a");
		await h.emit("agent_start", { type: "agent_start" });
		const first = {
			type: "auto_retry_start",
			errorMessage: "429 rate limit",
			providerError: { status: 429 },
		};
		await h.emit("auto_retry_start", first);
		expect(h.registered.at(-1)).toBe("fake-key-b");
		await h.emit("auto_retry_start", { ...first });
		expect(h.registered.at(-1)).toBe("fake-key-c");
		const count = h.registered.length;
		await h.emit("auto_retry_start", { ...first });
		expect(h.registered).toHaveLength(count);
	});

	test("coordinates recovery independently of extension listener order", async () => {
		for (const gateFirst of [false, true]) {
			const h = harness(false, undefined, gateFirst);
			const event = {
				type: "auto_retry_start",
				errorMessage: "429 rate limit",
				providerError: { status: 429 },
			};
			expect(await h.recoveryGate.claim(event, h.ctx)).toBe(true);
			expect(h.registered.at(-1)).toBe("fake-key-b");
			const count = h.registered.length;
			await h.emit("auto_retry_start", event);
			expect(h.registered).toHaveLength(count);
		}
	});

	test("same-stack router and rate recovery mutate one retry event once in either listener order", async () => {
		for (const rateRecoveryOrder of [
			"before-router",
			"after-router",
		] as const) {
			const h = harness(false, undefined, false, false, { rateRecoveryOrder });
			const event = {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 10,
				errorMessage: "429 rate limit",
				providerError: { status: 429 },
			};

			await h.emitConcurrently("auto_retry_start", event);

			expect(h.registered).toEqual(["fake-key-a", "fake-key-b"]);
			const provider = new ProviderKeyHealthLedger(h.dir).read().providers
				.qwencloud;
			expect(provider[keySourceId("fake-key-a")].failureCount).toBe(1);
			expect(provider[keySourceId("fake-key-b")]).toBeUndefined();
			expect(h.scheduledRecoveryDelays).toEqual([]);
		}
	});

	test("Pi-style sequential listeners mutate one retry-start event once in either order", async () => {
		for (const rateRecoveryOrder of [
			"before-router",
			"after-router",
		] as const) {
			const h = harness(false, undefined, false, false, { rateRecoveryOrder });
			await h.emit("auto_retry_start", {
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 10,
				errorMessage: "429 rate limit",
				providerError: { status: 429 },
			});
			expect(h.registered).toEqual(["fake-key-a", "fake-key-b"]);
			const provider = new ProviderKeyHealthLedger(h.dir).read().providers
				.qwencloud;
			expect(provider[keySourceId("fake-key-a")].failureCount).toBe(1);
			expect(provider[keySourceId("fake-key-b")]).toBeUndefined();
			expect(h.scheduledRecoveryDelays).toEqual([]);
		}
	});

	test("Pi-style sequential retry-end rejection shares one transition in either listener order", async () => {
		for (const rateRecoveryOrder of [
			"before-router",
			"after-router",
		] as const) {
			const h = harness(false, undefined, false, true, { rateRecoveryOrder });
			const event = {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "429 rate limit",
				providerError: { status: 429 },
			};

			await h.emit("auto_retry_end", event);
			for (let i = 0; i < 3; i++) await Promise.resolve();

			expect(h.registered).toEqual(["fake-key-a", "fake-key-b"]);
			const provider = new ProviderKeyHealthLedger(h.dir).read().providers
				.qwencloud;
			expect(provider[keySourceId("fake-key-a")].failureCount).toBe(1);
			expect(provider[keySourceId("fake-key-b")]).toBeUndefined();
			expect(h.scheduledRecoveryDelays).toHaveLength(3);
			expect(
				h.notifications.filter((message) =>
					message.includes("automatic retry was rejected"),
				).length,
			).toBe(1);
		}
	});

	test("same-stack retry-end rejection shares one transition in either listener order", async () => {
		for (const rateRecoveryOrder of [
			"before-router",
			"after-router",
		] as const) {
			const h = harness(false, undefined, false, true, { rateRecoveryOrder });
			await h.emitConcurrently("auto_retry_end", {
				type: "auto_retry_end",
				success: false,
				attempt: 3,
				finalError: "429 rate limit",
				providerError: { status: 429 },
			});
			for (let i = 0; i < 3; i++) await Promise.resolve();
			expect(h.registered).toEqual(["fake-key-a", "fake-key-b"]);
			const provider = new ProviderKeyHealthLedger(h.dir).read().providers
				.qwencloud;
			expect(provider[keySourceId("fake-key-a")].failureCount).toBe(1);
			expect(provider[keySourceId("fake-key-b")]).toBeUndefined();
			expect(h.scheduledRecoveryDelays).toHaveLength(3);
			expect(
				h.notifications.filter((message) =>
					message.includes("automatic retry was rejected"),
				).length,
			).toBe(1);
		}
	});

	test("reports an unclaimed lifecycle event when the host rejects follow-up enqueue", async () => {
		const h = harness(false, undefined, true, true);
		const event = {
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "quota exhausted",
				providerError: { status: 402 },
			},
		};
		expect(await h.recoveryGate.claim(event, h.ctx)).toBe(false);
		expect(h.followUps()).toBe(0);
		expect(
			h.notifications.some((message) =>
				message.includes("automatic retry was rejected"),
			),
		).toBe(true);
	});

	test("hard failures queue one follow-up per alternate key and never loop", async () => {
		const h = harness();
		await h.emit("agent_start", { type: "agent_start" });
		const failure = () => ({
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "403 quota",
				providerError: { status: 403 },
			},
		});
		await h.emit("turn_end", failure());
		expect(h.followUps()).toBe(1);
		await h.emit("agent_start", { type: "agent_start" });
		await h.emit("turn_end", failure());
		expect(h.followUps()).toBe(2);
		await h.emit("agent_start", { type: "agent_start" });
		await h.emit("turn_end", failure());
		expect(h.followUps()).toBe(2);
	});

	test("stored login blocks manual and automatic key changes", async () => {
		const h = harness(true);
		const initial = h.registered.length;
		await h.commands.get("qwen-swap").handler("", h.ctx);
		await h.emit("auto_retry_start", {
			type: "auto_retry_start",
			errorMessage: "429",
			providerError: { status: 429 },
		});
		expect(h.registered).toHaveLength(initial);
	});

	test("swap check prepares timed keys without probing or clearing auth-invalid state", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		const cooldown = keySourceId("fake-key-b");
		const auth = keySourceId("fake-key-c");
		ledger.recordFailure("qwencloud", cooldown, { kind: "cooldown", reason: "rate-limit" });
		ledger.recordFailure("qwencloud", auth, { kind: "auth-invalid", reason: "auth" });
		const registrationsBefore = h.registered.length;

		await h.commands.get("swap").handler("check", h.ctx);

		expect(h.registered).toHaveLength(registrationsBefore);
		expect(ledger.read().providers.qwencloud[cooldown]).toBeUndefined();
		expect(ledger.read().providers.qwencloud[auth]?.state).toBe("auth-invalid");
		expect(h.notifications.at(-1)).toContain("1 timed key made eligible");
		expect(h.notifications.at(-1)).toContain("No provider request was sent");
	});

	test("swap check releases this process's probe lease without touching the active credential", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		const target = keySourceId("fake-key-b");
		ledger.recordFailure("qwencloud", target, { kind: "quota-exhausted", reason: "quota" });
		ledger.recordFailure("qwencloud", keySourceId("fake-key-c"), {
			kind: "auth-invalid",
			reason: "auth",
		});
		const store = ledger.read();
		const entry = store.providers.qwencloud[target];
		if (entry.state !== "quota-exhausted") throw new Error("expected timed fixture");
		entry.retryAt = Date.now() - 1;
		fs.writeFileSync(ledger.path, JSON.stringify(store), { mode: 0o600 });
		await h.commands.get("qwen-swap").handler("", h.ctx);
		expect(ledger.read().providers.qwencloud[target]?.state).toBe("probe");
		const registrationsBefore = h.registered.length;

		await h.commands.get("swap").handler("check", h.ctx);

		expect(h.registered).toHaveLength(registrationsBefore);
		expect(ledger.read().providers.qwencloud[target]).toBeUndefined();
	});

	test("provider-specific swap check has completion and rejects unknown arguments", async () => {
		const h = harness();
		const command = h.commands.get("qwen-swap");
		expect(command.getArgumentCompletions("c")).toEqual([
			{ value: "check", label: "prepare recheck" },
		]);
		await command.handler("bogus", h.ctx);
		expect(h.notifications.at(-1)).toBe("Usage: /qwen-swap [check]");
	});

	test("manual swap reports alternate-pool exhaustion without reselecting the healthy active key", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		ledger.recordSuccess("qwencloud", keySourceId("fake-key-a"));
		for (const source of ["fake-key-b", "fake-key-c"]) {
			ledger.recordFailure("qwencloud", keySourceId(source), {
				kind: "auth-invalid",
				reason: "auth",
			});
		}
		const registrationsBefore = h.registered.length;
		await h.commands.get("qwen-swap").handler("", h.ctx);
		expect(h.registered).toHaveLength(registrationsBefore);
		expect(
			h.notifications.some((message) =>
				message.includes("No eligible alternate qwencloud API key"),
			),
		).toBe(true);
		expect(
			h.notifications.some((message) =>
				message.includes("2 auth-invalid key(s)"),
			),
		).toBe(true);
		expect(
			JSON.parse(
				fs.readFileSync(path.join(h.dir, "provider-keys.json"), "utf8"),
			).providers.qwencloud.activeKeyId,
		).toBe(keySourceId("fake-key-a"));
	});

	test("partial multi-provider activation restores every changed provider and persistent state", async () => {
		let rejectSecondProvider = false;
		const h = harness(false, undefined, false, false, {
			providerIds: ["qwen-primary", "qwen-alias"],
			onRegister: (providerId, apiKey) => {
				if (
					rejectSecondProvider &&
					providerId === "qwen-alias" &&
					apiKey === "fake-key-b"
				) {
					throw new Error("registration rejected");
				}
			},
		});
		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-a");
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-a");
		rejectSecondProvider = true;
		await h.commands.get("qwen-swap").handler("", h.ctx);

		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-a");
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-a");
		const persisted = JSON.parse(
			fs.readFileSync(path.join(h.dir, "provider-keys.json"), "utf8"),
		);
		expect(persisted.providers.qwencloud.activeKeyId).toBe(
			keySourceId("fake-key-a"),
		);
		expect(
			h.notifications.some((message) =>
				message.includes("Could not switch QwenCloud key"),
			),
		).toBe(true);
	});

	test("failed add publication leaves runtime and disk unchanged so the same add can retry", async () => {
		let failWrites = true;
		const saveStore: typeof saveProviderKeyStore = (file, store, fileOps) => {
			if (failWrites) throw new Error("sensitive-publication-marker");
			saveProviderKeyStore(file, store, fileOps);
		};
		const h = harness(false, undefined, false, false, { saveStore });
		const file = path.join(h.dir, "provider-keys.json");
		const before = fs.readFileSync(file, "utf8");

		await h.commands.get("qwen-keys").handler("add fake-key-d", h.ctx);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(h.notifications.at(-1)).toBe("Could not add QwenCloud key source.");
		failWrites = false;
		await h.commands.get("qwen-keys").handler("add fake-key-d", h.ctx);
		const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
		expect(persisted.providers.qwencloud.keys).toHaveLength(4);
		expect(h.notifications.at(-1)).toBe("Added QwenCloud key #4.");
	});

	test("failed auto publication preserves the live setting and remains retryable", async () => {
		let failWrites = true;
		const saveStore: typeof saveProviderKeyStore = (file, store, fileOps) => {
			if (failWrites) throw new Error("publication rejected");
			saveProviderKeyStore(file, store, fileOps);
		};
		const h = harness(false, undefined, false, false, { saveStore });
		const file = path.join(h.dir, "provider-keys.json");
		const before = fs.readFileSync(file, "utf8");

		await h.commands.get("qwen-keys").handler("auto-off", h.ctx);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		await h.commands.get("qwen-keys").handler("keys", h.ctx);
		expect(h.notifications.at(-1)).toContain("Auto-rotate: on");
		failWrites = false;
		await h.commands.get("qwen-keys").handler("auto-off", h.ctx);
		const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
		expect(persisted.providers.qwencloud.autoRotate).toBe(false);
	});

	test("active removal rolls back alias rejection and publication failure before committing", async () => {
		let rejectAlias = true;
		let failWrites = false;
		const saveStore: typeof saveProviderKeyStore = (file, store, fileOps) => {
			if (failWrites) throw new Error("publication rejected");
			saveProviderKeyStore(file, store, fileOps);
		};
		const h = harness(false, undefined, false, false, {
			providerIds: ["qwen-primary", "qwen-alias"],
			saveStore,
			onRegister: (providerId, apiKey) => {
				if (
					rejectAlias &&
					providerId === "qwen-alias" &&
					apiKey === "fake-key-b"
				)
					throw new Error("alias rejected");
			},
		});
		const file = path.join(h.dir, "provider-keys.json");
		const before = fs.readFileSync(file, "utf8");

		await h.commands.get("qwen-keys").handler("remove 1", h.ctx);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-a");
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-a");
		await h.emit("input", { type: "input", text: "still old", source: "rpc" });
		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-a");

		rejectAlias = false;
		failWrites = true;
		await h.commands.get("qwen-keys").handler("remove 1", h.ctx);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-a");
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-a");
		await h.emit("input", { type: "input", text: "still old", source: "rpc" });
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-a");

		failWrites = false;
		await h.commands.get("qwen-keys").handler("remove 1", h.ctx);
		const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
		expect(persisted.providers.qwencloud.activeKeyId).toBe(
			keySourceId("fake-key-b"),
		);
		expect(persisted.providers.qwencloud.keys).toHaveLength(2);
		expect(h.activeRegistrations.get("qwen-primary")).toBe("fake-key-b");
		expect(h.activeRegistrations.get("qwen-alias")).toBe("fake-key-b");
	});

	test("failed command resolution never exposes source or stderr text", async () => {
		const h = harness();
		const marker = "synthetic-source-secret-marker";
		const source = `!printf '${marker}' >&2; exit 1`;
		await h.commands.get("qwen-keys").handler(`add ${source}`, h.ctx);
		const output = h.notifications.join("\n");
		expect(output).toContain("Could not add QwenCloud key source.");
		expect(output).not.toContain(marker);
		expect(output).not.toContain(source);
		const persisted = fs.readFileSync(
			path.join(h.dir, "provider-keys.json"),
			"utf8",
		);
		expect(persisted).not.toContain(marker);
	});

	test("manual expired-key recheck retains its owner lease through input and blocks another instance", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		const targetId = keySourceId("fake-key-b");
		ledger.recordFailure("qwencloud", targetId, {
			kind: "quota-exhausted",
			reason: "quota",
		});
		ledger.recordFailure("qwencloud", keySourceId("fake-key-c"), {
			kind: "auth-invalid",
			reason: "auth",
		});
		const healthStore = ledger.read();
		const target = healthStore.providers.qwencloud[targetId];
		if (target.state !== "quota-exhausted")
			throw new Error("expected quota fixture");
		target.retryAt = Date.now() - 1;
		fs.writeFileSync(ledger.path, JSON.stringify(healthStore), { mode: 0o600 });

		await h.commands.get("qwen-swap").handler("", h.ctx);
		const claimed = ledger.read().providers.qwencloud[targetId];
		expect(claimed.state).toBe("probe");
		if (claimed.state !== "probe") throw new Error("expected probe lease");
		const owner = claimed.probeOwner;

		expect(
			await h.emit("input", {
				type: "input",
				text: "probe request",
				source: "interactive",
			}),
		).toEqual({ action: "continue" });
		const afterOwnerInput = ledger.read().providers.qwencloud[targetId];
		expect(afterOwnerInput.state).toBe("probe");
		if (afterOwnerInput.state !== "probe")
			throw new Error("expected retained probe lease");
		expect(afterOwnerInput.probeOwner).toBe(owner);

		const second = harness(false, h.dir);
		expect(
			await second.emit("input", {
				type: "input",
				text: "concurrent request",
				source: "rpc",
			}),
		).toEqual({ action: "continue" });
		expect(second.registered.at(-1)).toBe("fake-key-a");
		const afterSecondInput = ledger.read().providers.qwencloud[targetId];
		expect(afterSecondInput.state).toBe("probe");
		if (afterSecondInput.state !== "probe")
			throw new Error("expected original probe lease");
		expect(afterSecondInput.probeOwner).toBe(owner);
	});

	test("orderly shutdown releases only the local probe lease for immediate peer recheck", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		const targetId = keySourceId("fake-key-b");
		ledger.recordFailure("qwencloud", targetId, {
			kind: "quota-exhausted",
			reason: "quota",
		});
		ledger.recordFailure("qwencloud", keySourceId("fake-key-c"), {
			kind: "auth-invalid",
			reason: "auth",
		});
		const healthStore = ledger.read();
		const target = healthStore.providers.qwencloud[targetId];
		if (target.state !== "quota-exhausted")
			throw new Error("expected quota fixture");
		target.retryAt = Date.now() - 1;
		fs.writeFileSync(ledger.path, JSON.stringify(healthStore), { mode: 0o600 });

		await h.commands.get("qwen-swap").handler("", h.ctx);
		const beforeShutdown = ledger.read().providers.qwencloud[targetId];
		if (beforeShutdown.state !== "probe")
			throw new Error("expected owned probe before shutdown");
		const oldLease = {
			providerId: "qwencloud",
			keyId: targetId,
			ownerToken: beforeShutdown.probeOwner,
			expiresAt: beforeShutdown.retryAt,
		};

		await h.emit("session_shutdown", { type: "session_shutdown" });
		expect(ledger.read().providers.qwencloud[targetId].state).toBe(
			"quota-exhausted",
		);
		const peerClaim = ledger.claimFirst("qwencloud", [targetId]);
		expect(peerClaim.probe).toBe(true);
		expect(peerClaim.lease?.ownerToken).not.toBe(oldLease.ownerToken);
		expect(ledger.releaseProbeLease(oldLease)).toBe(false);
		const afterLateRelease = ledger.read().providers.qwencloud[targetId];
		expect(afterLateRelease.state).toBe("probe");
		if (afterLateRelease.state !== "probe")
			throw new Error("expected successor probe");
		expect(afterLateRelease.probeOwner).toBe(peerClaim.lease?.ownerToken);
	});

	test("registers compatibility commands and restores persisted active key on reload", async () => {
		const h = harness();
		for (const command of ["swap", "provider-keys", "qwen-keys", "qwen-swap"])
			expect(h.commands.has(command)).toBe(true);
		await h.commands.get("qwen-swap").handler("", h.ctx);
		const reloaded = harness(false, h.dir);
		const persisted = JSON.parse(
			fs.readFileSync(path.join(h.dir, "provider-keys.json"), "utf8"),
		);
		expect(persisted.providers.qwencloud.activeKeyId).toBe(
			keySourceId("fake-key-b"),
		);
		expect(
			h.changed.some(
				(entry: any) => entry.name === "provider-key-router:key-changed",
			),
		).toBe(true);
		expect(reloaded.registered.at(-1)).toBe("fake-key-b");
	});
	test("input preflight skips keys already known to be exhausted", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		ledger.recordFailure("qwencloud", keySourceId("fake-key-a"), {
			kind: "quota-exhausted",
			reason: "quota",
		});
		const result = await h.emit("input", {
			type: "input",
			text: "hello",
			source: "interactive",
		});
		expect(result).toEqual({ action: "continue" });
		expect(h.registered.at(-1)).toBe("fake-key-b");
	});

	test("all-exhausted input is handled before an LLM request and announced once", async () => {
		const h = harness();
		const ledger = new ProviderKeyHealthLedger(h.dir);
		for (const source of ["fake-key-a", "fake-key-b", "fake-key-c"]) {
			ledger.recordFailure("qwencloud", keySourceId(source), {
				kind: "quota-exhausted",
				reason: "quota",
			});
		}
		const event = { type: "input", text: "hello", source: "interactive" };
		expect(await h.emit("input", event)).toEqual({ action: "handled" });
		expect(await h.emit("input", event)).toEqual({ action: "handled" });
		expect(h.sentMessages).toHaveLength(1);
		expect(
			h.notifications.some((message) =>
				message.includes("No request-eligible qwencloud API key remains"),
			),
		).toBe(true);
	});

	test("pool exhaustion aborts retry and persists every failed key without a follow-up loop", async () => {
		const h = harness();
		await h.emit("agent_start", { type: "agent_start" });
		for (let attempt = 0; attempt < 3; attempt++) {
			await h.emit("auto_retry_start", {
				type: "auto_retry_start",
				errorMessage: "429 rate limit",
				providerError: { status: 429 },
			});
		}
		const provider = new ProviderKeyHealthLedger(h.dir).read().providers
			.qwencloud;
		expect(
			Object.values(provider).every((entry) => entry.state === "cooldown"),
		).toBe(true);
		expect(h.aborts()).toBe(1);
		expect(h.followUps()).toBe(0);
		expect(h.sentMessages).toHaveLength(1);
	});

	test("a successful response marks the working key healthy across reloads", async () => {
		const h = harness();
		await h.emit("agent_start", { type: "agent_start" });
		await h.emit("turn_end", {
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "quota exhausted",
				providerError: { status: 402 },
			},
		});
		await h.emit("message_end", {
			type: "message_end",
			message: { role: "assistant", stopReason: "end_turn" },
		});
		const activeId = keySourceId("fake-key-b");
		expect(
			new ProviderKeyHealthLedger(h.dir).read().providers.qwencloud[activeId]
				.state,
		).toBe("healthy");
		const reloaded = harness(false, h.dir);
		expect(
			await reloaded.emit("input", {
				type: "input",
				text: "next",
				source: "rpc",
			}),
		).toEqual({ action: "continue" });
		expect(reloaded.registered.at(-1)).toBe("fake-key-b");
	});

	test("stored login bypasses router health preflight", async () => {
		const h = harness(true);
		const ledger = new ProviderKeyHealthLedger(h.dir);
		for (const source of ["fake-key-a", "fake-key-b", "fake-key-c"]) {
			ledger.recordFailure("qwencloud", keySourceId(source), {
				kind: "auth-invalid",
				reason: "auth",
			});
		}
		expect(
			await h.emit("input", {
				type: "input",
				text: "hello",
				source: "interactive",
			}),
		).toEqual({ action: "continue" });
	});

	test("rejected follow-up rolls back queue state before the next genuine run", async () => {
		const h = harness(false, undefined, false, true);
		await h.emit("agent_start", { type: "agent_start" });
		const failure = {
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "quota exhausted",
				providerError: { status: 402 },
			},
		};
		await h.emit("turn_end", failure);
		expect(h.followUps()).toBe(0);
		expect(
			h.notifications.some((message) =>
				message.includes("automatic retry was rejected"),
			),
		).toBe(true);
		await h.emit("agent_start", { type: "agent_start" });
		await h.emit("turn_end", { ...failure, message: { ...failure.message } });
		expect(h.registered.at(-1)).toBe("fake-key-c");
	});

	test("records turn metadata once and carries it into metadata-less retry events", async () => {
		const h = harness();
		const before = Date.now();
		await h.emit("after_provider_response", {
			type: "after_provider_response",
			status: 429,
			headers: { "retry-after": "60" },
		});
		const turn = {
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "429 rate limit",
			},
		};
		await h.emit("turn_end", turn);
		await h.emit("auto_retry_start", {
			type: "auto_retry_start",
			errorMessage: "429 rate limit",
		});
		const entry = new ProviderKeyHealthLedger(h.dir).read().providers.qwencloud[
			keySourceId("fake-key-a")
		];
		expect(entry.failureCount).toBe(1);
		expect(entry.retryAt).toBeGreaterThanOrEqual(before + 60_000);
		expect(entry.retryAt).toBeLessThanOrEqual(Date.now() + 63_000);
		expect(h.registered.at(-1)).toBe("fake-key-b");
	});

	test("persists a retryable failure even when no auto-retry event follows", async () => {
		const h = harness();
		await h.emit("turn_end", {
			type: "turn_end",
			message: {
				role: "assistant",
				stopReason: "error",
				errorMessage: "429 rate limit",
				providerError: { status: 429 },
			},
		});
		expect(
			new ProviderKeyHealthLedger(h.dir).read().providers.qwencloud[
				keySourceId("fake-key-a")
			].state,
		).toBe("cooldown");
		expect(
			await h.emit("input", {
				type: "input",
				text: "next request",
				source: "interactive",
			}),
		).toEqual({ action: "continue" });
		expect(h.registered.at(-1)).toBe("fake-key-b");
	});

	test("reload disposes the old shared-bus query listener", async () => {
		const h = harness();
		await h.emit("session_shutdown", {
			type: "session_shutdown",
			reason: "reload",
		});
		registerProviderKeyRouter(h.pi, {
			agentDir: h.dir,
			definitions: [
				{
					id: "qwencloud",
					label: "QwenCloud",
					providerIds: ["qwencloud"],
					command: "qwen",
					envVar: "QWENCLOUD_API_KEY",
				},
			],
		});
		const before = h.registered.length;
		const event = {
			type: "auto_retry_start",
			errorMessage: "429 rate limit",
			providerError: { status: 429 },
		};
		expect(await h.recoveryGate.claim(event, h.ctx)).toBe(true);
		expect(h.registered).toHaveLength(before + 1);
	});
});
