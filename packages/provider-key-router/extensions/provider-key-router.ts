import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
	PROVIDER_KEY_CHANGED_CHANNEL,
	PROVIDER_KEY_RECOVERY_HANDLED_CHANNEL,
	PROVIDER_KEY_RECOVERY_QUERY_CHANNEL,
	type ProviderKeyRecoveryHandled,
	type ProviderKeyRecoveryQuery,
} from "../../shared/src/provider-limits.ts";
import {
	AllProviderKeysExhaustedError,
	type ClaimedKey,
	ProviderKeyHealthLedger,
	type ProviderKeyProbeLease,
	type StoredKeyHealth,
} from "../src/key-health-store.ts";
import { diagnoseProviderKeyFailure, KeyRingEpisode } from "../src/key-ring.ts";
import {
	keySourceId,
	loadProviderKeyStore,
	parseProviderKeyStore,
	redactKey,
	resolveProviderKeys,
	saveProviderKeyStore,
} from "../src/key-store.ts";
import type {
	ProviderDefinition,
	ProviderErrorMeta,
	ProviderKeyFailureDiagnosis,
	ProviderKeyStore,
	ResolvedKey,
	StoredProviderKeyRing,
} from "../src/types.ts";

export const DEFAULT_PROVIDER_DEFINITIONS: ProviderDefinition[] = [
	{
		id: "zai",
		label: "ZAI",
		providerIds: ["zai-coding", "zai"],
		command: "zai",
		envVar: "ZAI_API_KEY",
		legacyFile: "zai-keys.json",
	},
	{
		id: "kimi",
		label: "Kimi",
		providerIds: ["kimi-coding"],
		command: "kimi",
		envVar: "KIMI_API_KEY",
		legacyFile: "kimi-keys.json",
	},
	{
		id: "qwencloud",
		label: "QwenCloud",
		providerIds: ["qwencloud"],
		command: "qwen",
		envVar: "QWENCLOUD_API_KEY",
		legacyFile: "qwencloud-keys.json",
	},
];

interface RetryStartEvent {
	type: "auto_retry_start";
	errorMessage: string;
	providerError?: ProviderErrorMeta;
}

interface RetryEndEvent {
	type: "auto_retry_end";
	success: boolean;
	finalError?: string;
	providerError?: ProviderErrorMeta;
}

interface TurnEndMessage {
	role?: string;
	stopReason?: string;
	errorMessage?: string;
	providerError?: ProviderErrorMeta;
}

interface TurnEndEvent {
	type: "turn_end";
	message: TurnEndMessage;
}

interface MessageEndEvent {
	type: "message_end";
	message: TurnEndMessage;
}

type RouterAwareOn = {
	(
		event: "auto_retry_start",
		handler: (event: RetryStartEvent, ctx: ExtensionContext) => void,
	): void;
	(
		event: "auto_retry_end",
		handler: (event: RetryEndEvent, ctx: ExtensionContext) => void,
	): void;
	(
		event: "turn_end",
		handler: (event: TurnEndEvent, ctx: ExtensionContext) => void,
	): void;
	(
		event: "message_end",
		handler: (event: MessageEndEvent, ctx: ExtensionContext) => void,
	): void;
};

interface RuntimeRing {
	id: string;
	stored: StoredProviderKeyRing;
	keys: ResolvedKey[];
	resolutionErrors: Array<{ id: string; message: string }>;
	episode: KeyRingEpisode;
	exhaustionFingerprint?: string;
	lastResponseMeta?: ProviderErrorMeta;
	pendingFailure?: {
		keyId: string;
		diagnosis: ProviderKeyFailureDiagnosis;
		providerError?: ProviderErrorMeta;
	};
	probeLease?: ProviderKeyProbeLease;
}

function storedLoginActive(ctx: ExtensionContext, ring: RuntimeRing): boolean {
	try {
		return ring.stored.providerIds.some((provider) => {
			const status = ctx.modelRegistry.getProviderAuthStatus(provider);
			return status.configured && status.source === "stored";
		});
	} catch {
		return false;
	}
}

function matchingRing(
	rings: Map<string, RuntimeRing>,
	providerId: string | undefined,
): RuntimeRing | undefined {
	if (!providerId) return undefined;
	return [...rings.values()].find((ring) =>
		ring.stored.providerIds.includes(providerId),
	);
}

function parseCommand(args: string): { subcommand: string; argument: string } {
	const trimmed = args.trim();
	if (!trimmed) return { subcommand: "keys", argument: "" };
	const firstSpace = trimmed.search(/\s/);
	if (firstSpace === -1)
		return { subcommand: trimmed.toLowerCase(), argument: "" };
	return {
		subcommand: trimmed.slice(0, firstSpace).toLowerCase(),
		argument: trimmed.slice(firstSpace).trim(),
	};
}

export function registerProviderKeyRouter(
	pi: ExtensionAPI,
	options: {
		agentDir?: string;
		definitions?: ProviderDefinition[];
		saveStore?: typeof saveProviderKeyStore;
	} = {},
): void {
	const agentDir = options.agentDir ?? getAgentDir();
	const persistStore = options.saveStore ?? saveProviderKeyStore;
	const loaded = loadProviderKeyStore({
		agentDir,
		definitions: options.definitions ?? DEFAULT_PROVIDER_DEFINITIONS,
	});
	const store = loaded.store;
	const health = new ProviderKeyHealthLedger(agentDir);
	const rings = new Map<string, RuntimeRing>();

	for (const [id, stored] of Object.entries(store.providers)) {
		const { keys, errors } = resolveProviderKeys(stored);
		const activeKeyId = keys.some((key) => key.id === stored.activeKeyId)
			? stored.activeKeyId
			: keys[0]?.id;
		const runtime: RuntimeRing = {
			id,
			stored,
			keys,
			resolutionErrors: errors,
			episode: new KeyRingEpisode(keys, activeKeyId),
		};
		rings.set(id, runtime);
	}

	const duplicateCommands = new Set<string>();
	const commands = new Set<string>();
	for (const ring of rings.values()) {
		if (commands.has(ring.stored.command))
			duplicateCommands.add(ring.stored.command);
		commands.add(ring.stored.command);
	}
	if (duplicateCommands.size > 0) {
		throw new Error(
			`Duplicate provider key command names: ${[...duplicateCommands].join(", ")}`,
		);
	}

	interface KeyActivationTransition {
		previous: ResolvedKey | undefined;
		target: ResolvedKey;
		persist: boolean;
	}

	function snapshotStore(): ProviderKeyStore {
		return parseProviderKeyStore(JSON.stringify(store));
	}

	function rollbackProviderAliases(
		providerIds: readonly string[],
		previous: ResolvedKey | undefined,
	): unknown[] {
		const errors: unknown[] = [];
		for (const providerId of [...providerIds].reverse()) {
			try {
				if (previous)
					pi.registerProvider(providerId, { apiKey: previous.secret });
				else pi.unregisterProvider(providerId);
			} catch (error) {
				errors.push(error);
			}
		}
		return errors;
	}

	function registerProviderAliases(
		ring: RuntimeRing,
		target: ResolvedKey,
		previous: ResolvedKey | undefined,
	): string[] {
		const changedProviderIds: string[] = [];
		try {
			for (const providerId of ring.stored.providerIds) {
				pi.registerProvider(providerId, { apiKey: target.secret });
				changedProviderIds.push(providerId);
			}
			return changedProviderIds;
		} catch (error) {
			const rollbackErrors = rollbackProviderAliases(
				changedProviderIds,
				previous,
			);
			if (rollbackErrors.length > 0)
				throw new AggregateError(
					[error, ...rollbackErrors],
					`Could not activate or fully roll back ${ring.stored.label} key`,
				);
			throw error;
		}
	}

	function restoreFailedPublication(
		ring: RuntimeRing,
		originalError: unknown,
		previousStore: ProviderKeyStore,
		changedProviderIds: readonly string[],
		previous: ResolvedKey | undefined,
	): never {
		const rollbackErrors: unknown[] = [];
		try {
			// A durable writer can throw after rename. Republishing the untouched
			// snapshot makes the failure atomic from the next reader's perspective.
			persistStore(loaded.path, previousStore);
		} catch (error) {
			rollbackErrors.push(error);
		}
		rollbackErrors.push(
			...rollbackProviderAliases(changedProviderIds, previous),
		);
		if (rollbackErrors.length > 0)
			throw new AggregateError(
				[originalError, ...rollbackErrors],
				`Could not publish or fully roll back ${ring.stored.label} key configuration`,
			);
		throw originalError;
	}

	function activate(
		ring: RuntimeRing,
		transition: KeyActivationTransition,
	): void {
		const { previous, target, persist } = transition;
		const changedProviderIds = registerProviderAliases(ring, target, previous);
		if (!persist) return;

		const previousStore = snapshotStore();
		const candidateStore = snapshotStore();
		candidateStore.providers[ring.id].activeKeyId = target.id;
		const validatedStore = parseProviderKeyStore(
			JSON.stringify(candidateStore),
		);
		try {
			persistStore(loaded.path, validatedStore);
		} catch (error) {
			restoreFailedPublication(
				ring,
				error,
				previousStore,
				changedProviderIds,
				previous,
			);
		}
		const committed = validatedStore.providers[ring.id];
		store.providers[ring.id] = committed;
		ring.stored = committed;
	}

	function rememberClaim(ring: RuntimeRing, claim: ClaimedKey): void {
		ring.probeLease = claim.lease;
	}

	function releaseProbeLease(lease: ProviderKeyProbeLease | undefined): void {
		if (!lease) return;
		health.releaseProbeLease(lease);
	}

	// Provider registration is an auth override. It takes precedence over the
	// models.json key and is re-resolved for every request.
	for (const ring of rings.values()) {
		const key = ring.episode.active;
		if (key)
			activate(ring, { previous: undefined, target: key, persist: false });
	}

	interface ConfigurationTransitionOptions {
		refreshRuntime: boolean;
		requireUsableActive?: boolean;
		requireResolvedSourceId?: string;
	}

	interface ConfigurationTransitionResult {
		previousActive: ResolvedKey | undefined;
		active: ResolvedKey | undefined;
		previousLease: ProviderKeyProbeLease | undefined;
		activeChanged: boolean;
		keyCount: number;
	}

	function transitionConfiguration(
		ring: RuntimeRing,
		mutate: (candidate: StoredProviderKeyRing) => void,
		options: ConfigurationTransitionOptions,
	): ConfigurationTransitionResult {
		const previousStore = snapshotStore();
		const candidateStore = snapshotStore();
		const candidate = candidateStore.providers[ring.id];
		mutate(candidate);

		let keys = ring.keys;
		let errors = ring.resolutionErrors;
		if (options.refreshRuntime) {
			const resolved = resolveProviderKeys(candidate);
			keys = resolved.keys;
			errors = resolved.errors;
			if (
				options.requireResolvedSourceId &&
				errors.some((error) => error.id === options.requireResolvedSourceId)
			)
				throw new Error("Key source is unusable");
			const activeKeyId = keys.some((key) => key.id === candidate.activeKeyId)
				? candidate.activeKeyId
				: keys[0]?.id;
			if (activeKeyId) candidate.activeKeyId = activeKeyId;
			else delete candidate.activeKeyId;
		}

		const validatedStore = parseProviderKeyStore(
			JSON.stringify(candidateStore),
		);
		const committed = validatedStore.providers[ring.id];
		const previousActive = ring.episode.active;
		const active = options.refreshRuntime
			? (keys.find((key) => key.id === committed.activeKeyId) ?? keys[0])
			: previousActive;
		if (options.requireUsableActive && !active)
			throw new Error("No usable key source remains");
		const activeChanged = Boolean(
			options.refreshRuntime &&
				active &&
				(previousActive?.id !== active.id ||
					previousActive.secret !== active.secret),
		);
		const changedProviderIds = activeChanged
			? registerProviderAliases(ring, active as ResolvedKey, previousActive)
			: [];
		try {
			persistStore(loaded.path, validatedStore);
		} catch (error) {
			restoreFailedPublication(
				ring,
				error,
				previousStore,
				changedProviderIds,
				previousActive,
			);
		}

		store.providers[ring.id] = committed;
		ring.stored = committed;
		if (options.refreshRuntime) {
			ring.keys = keys;
			ring.resolutionErrors = errors;
			ring.episode = new KeyRingEpisode(keys, committed.activeKeyId);
			ring.pendingFailure = undefined;
			ring.lastResponseMeta = undefined;
			ring.exhaustionFingerprint = undefined;
		}
		return {
			previousActive,
			active,
			previousLease: ring.probeLease,
			activeChanged,
			keyCount: committed.keys.length,
		};
	}

	function finalizeConfigurationActivation(
		ring: RuntimeRing,
		result: ConfigurationTransitionResult,
		ctx: ExtensionContext,
	): void {
		if (!result.activeChanged) return;
		ring.probeLease = undefined;
		try {
			releaseProbeLease(result.previousLease);
		} catch {
			ctx.ui.notify(
				`The ${ring.stored.label} key changed, but its previous probe lease could not be released.`,
				"warning",
			);
		}
		emitKeyChanged(ring);
	}

	function storedLoginWarning(ring: RuntimeRing): string {
		return `A /login credential is stored for ${ring.stored.providerIds.join(", ")} and overrides key routing. Run /logout for that provider.`;
	}

	function healthLabel(
		entry: StoredKeyHealth | undefined,
		now: number,
	): string {
		if (!entry) return "unknown";
		if (entry.state === "healthy") return "healthy";
		if (entry.state === "auth-invalid") return "auth invalid";
		if (entry.retryAt !== undefined && entry.retryAt <= now)
			return `${entry.state}; ready to recheck`;
		return entry.retryAt === undefined
			? entry.state
			: `${entry.state} until ${new Date(entry.retryAt).toLocaleString()}`;
	}

	function notifyKeys(ring: RuntimeRing, ctx: ExtensionContext): void {
		const resolvedById = new Map(ring.keys.map((key) => [key.id, key]));
		let providerHealth: Record<string, StoredKeyHealth> = {};
		let healthError: string | undefined;
		try {
			providerHealth = health.read().providers[ring.id] ?? {};
		} catch (error) {
			healthError = error instanceof Error ? error.message : String(error);
		}
		const now = Date.now();
		const lines = [
			`${ring.stored.label} API keys:`,
			"",
			...ring.stored.keys.map((source, index) => {
				const key = resolvedById.get(source.id);
				const marker = source.id === ring.stored.activeKeyId ? " ← active" : "";
				return `  #${index + 1}: ${key ? redactKey(key.secret) : "unavailable"} — ${healthLabel(providerHealth[source.id], now)}${marker}`;
			}),
			"",
			`Auto-rotate: ${ring.stored.autoRotate ? "on" : "off"}`,
			...(ring.resolutionErrors.length > 0
				? [
						"",
						`${ring.resolutionErrors.length} key source(s) could not be resolved.`,
					]
				: []),
			...(healthError
				? ["", `Health state is unavailable: ${healthError}`]
				: []),
			...(storedLoginActive(ctx, ring) ? ["", storedLoginWarning(ring)] : []),
		];
		ctx.ui.notify(lines.join("\n"), healthError ? "error" : "info");
	}

	function orderedFromActive(
		ring: RuntimeRing,
		includeActive: boolean,
	): string[] {
		if (ring.keys.length === 0) return [];
		const active = ring.episode.active;
		const activeIndex = active
			? ring.keys.findIndex((key) => key.id === active.id)
			: 0;
		const ids: string[] = [];
		for (
			let offset = includeActive ? 0 : 1;
			offset < ring.keys.length;
			offset++
		) {
			ids.push(
				ring.keys[(activeIndex + offset + ring.keys.length) % ring.keys.length]
					.id,
			);
		}
		return ids;
	}

	function manualSwap(ring: RuntimeRing, ctx: ExtensionContext): void {
		if (storedLoginActive(ctx, ring)) {
			ctx.ui.notify(storedLoginWarning(ring), "error");
			return;
		}
		if (ring.keys.length < 2) {
			ctx.ui.notify(
				`${ring.stored.label} has fewer than two usable keys.`,
				"warning",
			);
			return;
		}
		const previous = ring.episode.active;
		const previousLease = ring.probeLease;
		let claimedLease: ProviderKeyProbeLease | undefined;
		try {
			const alternates = orderedFromActive(ring, false);
			const claim = health.claimFirst(
				ring.id,
				alternates,
				alternates,
				"alternate",
			);
			claimedLease = claim.lease;
			const next = ring.keys.find((key) => key.id === claim.keyId);
			if (!next) throw new Error("Selected key source is unavailable");
			activate(ring, { previous, target: next, persist: true });
			ring.episode.replaceKeys(ring.keys, next.id);
			if (
				previousLease &&
				previousLease.ownerToken !== claimedLease?.ownerToken
			) {
				releaseProbeLease(previousLease);
			}
			rememberClaim(ring, claim);
			emitKeyChanged(ring);
			ctx.ui.notify(
				`${ring.stored.label} key: ${redactKey(previous?.secret)} → ${redactKey(next.secret)}${claim.probe ? " (recheck)" : ""}`,
				"info",
			);
		} catch (error) {
			if (
				claimedLease &&
				claimedLease.ownerToken !== previousLease?.ownerToken
			) {
				releaseProbeLease(claimedLease);
			}
			ring.probeLease = previousLease;
			ring.episode.replaceKeys(ring.keys, previous?.id);
			ctx.ui.notify(
				error instanceof AllProviderKeysExhaustedError
					? error.message
					: `Could not switch ${ring.stored.label} key: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
		}
	}

	function prepareRecheck(ring: RuntimeRing, ctx: ExtensionContext): void {
		if (storedLoginActive(ctx, ring)) {
			ctx.ui.notify(storedLoginWarning(ring), "error");
			return;
		}
		const ownedLease = ring.probeLease;
		if (ownedLease) {
			releaseProbeLease(ownedLease);
			ring.probeLease = undefined;
		}
		const reset = health.resetTimed(
			ring.id,
			new Set(ring.keys.map((key) => key.id)),
		);
		ring.exhaustionFingerprint = undefined;
		ctx.ui.notify(
			`${ring.stored.label} recheck prepared: ${reset} timed key${reset === 1 ? "" : "s"} made eligible. No provider request was sent; the next real request is authoritative.`,
			"info",
		);
	}
	function emitHandled(
		event: object,
		ring: RuntimeRing,
		kind: "retryable-limit" | "hard-key-limit" | "all-keys-exhausted",
	): void {
		const payload: ProviderKeyRecoveryHandled = {
			event,
			provider: ring.id,
			kind,
		};
		pi.events.emit(PROVIDER_KEY_RECOVERY_HANDLED_CHANNEL, payload);
	}

	function emitKeyChanged(ring: RuntimeRing): void {
		pi.events.emit(PROVIDER_KEY_CHANGED_CHANNEL, {
			providerIds: [...ring.stored.providerIds],
		});
	}

	function surfaceExhaustion(
		ring: RuntimeRing,
		ctx: ExtensionContext,
		error: AllProviderKeysExhaustedError,
		event?: object,
		abort = false,
	): void {
		const fingerprint = `${error.nextEligibleAt ?? "never"}:${Object.values(
			error.health,
		)
			.map((entry) => `${entry?.state ?? "unknown"}:${entry?.observedAt ?? 0}`)
			.join(",")}`;
		if (ring.exhaustionFingerprint !== fingerprint) {
			ring.exhaustionFingerprint = fingerprint;
			ctx.ui.notify(error.message, "error");
			try {
				pi.sendMessage(
					{
						customType: "provider-keys-exhausted",
						content: error.message,
						display: true,
						details: {
							provider: ring.id,
							nextEligibleAt: error.nextEligibleAt,
						},
					},
					{ deliverAs: "followUp", triggerTurn: false },
				);
			} catch {
				// The UI notification remains the authoritative fallback.
			}
		}
		if (abort) ctx.abort();
		if (event) emitHandled(event, ring, "all-keys-exhausted");
	}

	type RecoveryOutcome = "rotated" | "exhausted" | "unhandled";

	function rotateForFailure(
		ring: RuntimeRing,
		ctx: ExtensionContext,
		diagnosis: NonNullable<ReturnType<typeof diagnoseProviderKeyFailure>>,
		event: object,
		providerError?: ProviderErrorMeta,
	): RecoveryOutcome {
		if (
			!ring.stored.autoRotate ||
			ring.keys.length === 0 ||
			storedLoginActive(ctx, ring)
		)
			return "unhandled";
		const previous = ring.episode.active;
		if (!previous) return "unhandled";
		const previousLease = ring.probeLease;
		let claimedLease: ProviderKeyProbeLease | undefined;
		try {
			if (ring.pendingFailure?.keyId !== previous.id) {
				health.recordFailure(
					ring.id,
					previous.id,
					diagnosis,
					providerError,
					previousLease,
				);
			}
			if (previousLease?.keyId === previous.id) ring.probeLease = undefined;
			ring.pendingFailure = undefined;
			const claim = health.claimFirst(
				ring.id,
				ring.episode.failureCandidateIds(),
				ring.keys.map((key) => key.id),
			);
			claimedLease = claim.lease;
			const next = ring.episode.selectForFailure(claim.keyId);
			if (!next)
				throw new Error("Health ledger selected an invalid recovery key");
			activate(ring, { previous, target: next, persist: false });
			rememberClaim(ring, claim);
			emitKeyChanged(ring);
			ring.exhaustionFingerprint = undefined;
			ctx.ui.notify(
				`${ring.stored.label} limit: key ${redactKey(previous.secret)} → ${redactKey(next.secret)}${claim.probe ? " (recheck)" : ""}`,
				"warning",
			);
			return "rotated";
		} catch (error) {
			if (claimedLease) releaseProbeLease(claimedLease);
			ring.pendingFailure = undefined;
			if (error instanceof AllProviderKeysExhaustedError) {
				surfaceExhaustion(ring, ctx, error, event, true);
				return "exhausted";
			}
			ring.episode.replaceKeys(ring.keys, previous.id);
			ctx.ui.notify(
				`Provider key health routing failed closed for ${ring.stored.label}: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
			ctx.abort();
			emitHandled(event, ring, "all-keys-exhausted");
			return "exhausted";
		}
	}
	function addKeySource(
		ring: RuntimeRing,
		source: string,
		ctx: ExtensionContext,
	): void {
		if (!source) {
			ctx.ui.notify(
				`Usage: /${ring.stored.command}-keys add <literal | $ENV | !command>`,
				"error",
			);
			return;
		}
		const id = keySourceId(source);
		if (ring.stored.keys.some((key) => key.id === id)) {
			ctx.ui.notify("Key source already exists.", "warning");
			return;
		}
		let result: ConfigurationTransitionResult;
		try {
			result = transitionConfiguration(
				ring,
				(candidate) => {
					candidate.keys.push({ id, source });
					if (!candidate.activeKeyId) candidate.activeKeyId = id;
				},
				{
					refreshRuntime: true,
					requireUsableActive: true,
					requireResolvedSourceId: id,
				},
			);
		} catch {
			ctx.ui.notify(`Could not add ${ring.stored.label} key source.`, "error");
			return;
		}
		finalizeConfigurationActivation(ring, result, ctx);
		ctx.ui.notify(
			`Added ${ring.stored.label} key #${result.keyCount}.`,
			"info",
		);
	}

	function removeKeySource(
		ring: RuntimeRing,
		argument: string,
		ctx: ExtensionContext,
	): void {
		const index = Number.parseInt(argument, 10);
		if (
			!Number.isInteger(index) ||
			index < 1 ||
			index > ring.stored.keys.length
		) {
			ctx.ui.notify(
				`Usage: /${ring.stored.command}-keys remove <1-${ring.stored.keys.length}>`,
				"error",
			);
			return;
		}
		if (ring.stored.keys.length <= 1) {
			ctx.ui.notify("Cannot remove the last key source.", "error");
			return;
		}
		const removed = ring.stored.keys[index - 1];
		let result: ConfigurationTransitionResult;
		try {
			result = transitionConfiguration(
				ring,
				(candidate) => {
					candidate.keys.splice(index - 1, 1);
					if (candidate.activeKeyId === removed.id)
						delete candidate.activeKeyId;
				},
				{ refreshRuntime: true, requireUsableActive: true },
			);
		} catch {
			ctx.ui.notify(
				`Could not remove ${ring.stored.label} key source.`,
				"error",
			);
			return;
		}
		finalizeConfigurationActivation(ring, result, ctx);
		try {
			health.prune(ring.id, new Set(ring.stored.keys.map((key) => key.id)));
		} catch {
			ctx.ui.notify(
				`${ring.stored.label} configuration was updated, but stale key health could not be pruned.`,
				"warning",
			);
		}
		ctx.ui.notify(`Removed ${ring.stored.label} key #${index}.`, "info");
	}

	function resetKeyHealth(
		ring: RuntimeRing,
		argument: string,
		ctx: ExtensionContext,
	): void {
		const trimmed = argument.trim().toLowerCase();
		if (!trimmed || trimmed === "all") {
			health.reset(ring.id);
			ring.probeLease = undefined;
			ring.exhaustionFingerprint = undefined;
			ctx.ui.notify(
				`${ring.stored.label} key health reset; all keys are eligible for recheck.`,
				"warning",
			);
			return;
		}
		const index = Number.parseInt(trimmed, 10);
		const source = ring.stored.keys[index - 1];
		if (!Number.isInteger(index) || !source) {
			ctx.ui.notify(
				`Usage: /${ring.stored.command}-keys reset-health [all|1-${ring.stored.keys.length}]`,
				"error",
			);
			return;
		}
		health.reset(ring.id, source.id);
		if (ring.probeLease?.keyId === source.id) ring.probeLease = undefined;
		ring.exhaustionFingerprint = undefined;
		ctx.ui.notify(
			`${ring.stored.label} key #${index} is eligible for recheck.`,
			"warning",
		);
	}

	function setAutoRotate(
		ring: RuntimeRing,
		enabled: boolean,
		ctx: ExtensionContext,
	): void {
		try {
			transitionConfiguration(
				ring,
				(candidate) => {
					candidate.autoRotate = enabled;
				},
				{ refreshRuntime: false },
			);
		} catch {
			ctx.ui.notify(
				`Could not update ${ring.stored.label} auto-rotate setting.`,
				"error",
			);
			return;
		}
		ctx.ui.notify(
			`${ring.stored.label} auto-rotate: ${enabled ? "on" : "off"}`,
			"info",
		);
	}
	function handleRingCommand(
		ring: RuntimeRing,
		args: string,
		ctx: ExtensionContext,
	): void {
		const { subcommand, argument } = parseCommand(args);
		switch (subcommand) {
			case "keys":
			case "status":
				notifyKeys(ring, ctx);
				return;
			case "swap":
				manualSwap(ring, ctx);
				return;
			case "auto-on":
				setAutoRotate(ring, true, ctx);
				return;
			case "auto-off":
				setAutoRotate(ring, false, ctx);
				return;
			case "add":
				addKeySource(ring, argument, ctx);
				return;
			case "remove":
				removeKeySource(ring, argument, ctx);
				return;
			case "reset-health":
				resetKeyHealth(ring, argument, ctx);
				return;
			default:
				ctx.ui.notify(
					`Usage: /${ring.stored.command}-keys [swap|keys|auto-on|auto-off|add <source>|remove <#>|reset-health [all|#]]`,
					"error",
				);
		}
	}

	const subcommands = [
		"swap",
		"keys",
		"auto-on",
		"auto-off",
		"add",
		"remove",
		"reset-health",
	];
	for (const ring of rings.values()) {
		pi.registerCommand(`${ring.stored.command}-keys`, {
			description: `Manage ${ring.stored.label} API keys`,
			getArgumentCompletions: (prefix) => {
				const items = subcommands
					.filter((value) => value.startsWith(prefix))
					.map((value) => ({ value, label: value }));
				return items.length > 0 ? items : null;
			},
			handler: async (args, ctx) => handleRingCommand(ring, args, ctx),
		});
		pi.registerCommand(`${ring.stored.command}-swap`, {
			description: `Swap ${ring.stored.label} API key, or prepare a real-request recheck`,
			getArgumentCompletions: (prefix) =>
				"check".startsWith(prefix) ? [{ value: "check", label: "prepare recheck" }] : null,
			handler: async (args, ctx) => {
				if (!args.trim()) return manualSwap(ring, ctx);
				if (args.trim().toLowerCase() === "check") return prepareRecheck(ring, ctx);
				ctx.ui.notify(`Usage: /${ring.stored.command}-swap [check]`, "error");
			},
		});
	}

	pi.registerCommand("swap", {
		description: "Swap the active provider API key, or prepare a real-request recheck",
		getArgumentCompletions: (prefix) =>
			"check".startsWith(prefix) ? [{ value: "check", label: "prepare recheck" }] : null,
		handler: async (args, ctx) => {
			const ring = matchingRing(rings, ctx.model?.provider);
			if (!ring) {
				ctx.ui.notify(
					`No key ring is configured for ${ctx.model?.provider ?? "the active model"}.`,
					"warning",
				);
				return;
			}
			if (!args.trim()) return manualSwap(ring, ctx);
			if (args.trim().toLowerCase() === "check") return prepareRecheck(ring, ctx);
			ctx.ui.notify("Usage: /swap [check]", "error");
		},
	});

	pi.registerCommand("provider-keys", {
		description: "Manage API keys for any configured provider",
		getArgumentCompletions: (prefix) => {
			const items = [...rings.keys()]
				.filter((value) => value.startsWith(prefix))
				.map((value) => ({ value, label: value }));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			const { subcommand: providerId, argument } = parseCommand(args);
			if (!args.trim()) {
				ctx.ui.notify(
					`Provider key rings: ${[...rings.keys()].join(", ")}`,
					"info",
				);
				return;
			}
			const ring = rings.get(providerId);
			if (!ring) {
				ctx.ui.notify(`Unknown provider key ring: ${providerId}`, "error");
				return;
			}
			handleRingCommand(ring, argument, ctx);
		},
	});

	function prepareForInput(
		ring: RuntimeRing,
		ctx: ExtensionContext,
	): { action: "continue" } | { action: "handled" } {
		if (!ring.stored.autoRotate || storedLoginActive(ctx, ring))
			return { action: "continue" };
		const previous = ring.episode.active;
		const previousLease = ring.probeLease;
		let claimedLease: ProviderKeyProbeLease | undefined;
		try {
			const claim = health.claimFirst(
				ring.id,
				orderedFromActive(ring, true),
				undefined,
				"request",
				previousLease,
			);
			claimedLease = claim.lease;
			const selected = ring.keys.find((key) => key.id === claim.keyId);
			if (!selected)
				throw new Error("Health ledger selected an unavailable key");
			if (ring.episode.active?.id !== selected.id) {
				activate(ring, { previous, target: selected, persist: false });
				ring.episode.replaceKeys(ring.keys, selected.id);
				emitKeyChanged(ring);
			}
			if (
				previousLease &&
				previousLease.ownerToken !== claimedLease?.ownerToken
			) {
				releaseProbeLease(previousLease);
			}
			rememberClaim(ring, claim);
			ring.exhaustionFingerprint = undefined;
			ring.pendingFailure = undefined;
			return { action: "continue" };
		} catch (error) {
			if (
				claimedLease &&
				claimedLease.ownerToken !== previousLease?.ownerToken
			) {
				releaseProbeLease(claimedLease);
			}
			ring.probeLease = previousLease;
			if (error instanceof AllProviderKeysExhaustedError) {
				surfaceExhaustion(ring, ctx, error);
			} else {
				ctx.ui.notify(
					`Provider key health is unavailable for ${ring.stored.label}; request blocked: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			}
			return { action: "handled" };
		}
	}

	pi.on("input", (event, ctx) => {
		const streamingBehavior = (
			event as typeof event & { streamingBehavior?: string }
		).streamingBehavior;
		if (streamingBehavior === "steer") return { action: "continue" as const };
		const ring = matchingRing(rings, ctx.model?.provider);
		if (!ring) return { action: "continue" as const };
		return prepareForInput(ring, ctx);
	});

	const on = pi.on.bind(pi) as unknown as RouterAwareOn;

	pi.on("agent_start", () => {
		for (const ring of rings.values()) ring.episode.beginAgentRun();
	});

	pi.on("session_start", (_event, ctx) => {
		if (loaded.migratedLegacyFiles.length > 0) {
			ctx.ui.notify(
				`Migrated ${loaded.migratedLegacyFiles.length} legacy provider key file(s).`,
				"info",
			);
		}
		for (const ring of rings.values()) {
			if (ring.resolutionErrors.length > 0) {
				ctx.ui.notify(
					`${ring.stored.label}: ${ring.resolutionErrors.length} key source(s) are unavailable.`,
					"warning",
				);
			}
			if (ring.keys.length >= 2 && storedLoginActive(ctx, ring)) {
				ctx.ui.notify(storedLoginWarning(ring), "warning");
			}
		}
	});

	const settledRecoveryEvents = new WeakMap<object, boolean>();
	const inFlightRecoveryEvents = new WeakMap<object, Promise<boolean>>();
	const observedFailureEvents = new WeakSet<object>();

	pi.on("after_provider_response", (event, ctx) => {
		const ring = matchingRing(rings, ctx.model?.provider);
		if (!ring) return;
		ring.lastResponseMeta =
			event.status >= 400
				? { status: event.status, headers: event.headers }
				: undefined;
	});

	function observeTurnFailure(
		event: TurnEndEvent,
		ring: RuntimeRing,
		ctx: ExtensionContext,
	): ProviderKeyFailureDiagnosis | undefined {
		if (observedFailureEvents.has(event)) return ring.pendingFailure?.diagnosis;
		observedFailureEvents.add(event);
		const providerError = event.message.providerError ?? ring.lastResponseMeta;
		ring.lastResponseMeta = undefined;
		const diagnosis = diagnoseProviderKeyFailure(
			event.message.errorMessage,
			providerError,
		);
		if (!diagnosis || storedLoginActive(ctx, ring)) return diagnosis;
		const active = ring.episode.active;
		if (!active) return diagnosis;
		health.recordFailure(
			ring.id,
			active.id,
			diagnosis,
			providerError,
			ring.probeLease,
		);
		if (ring.probeLease?.keyId === active.id) ring.probeLease = undefined;
		ring.pendingFailure = { keyId: active.id, diagnosis, providerError };
		return diagnosis;
	}

	async function queueRecoveryFollowUp(
		ring: RuntimeRing,
		ctx: ExtensionContext,
		event: object,
		kind: "retryable-limit" | "hard-key-limit",
	): Promise<boolean> {
		ring.episode.beginRecoveryFollowUpQueue();
		try {
			await pi.sendUserMessage("continue", { deliverAs: "followUp" });
			ring.episode.commitRecoveryFollowUpQueue();
			emitHandled(event, ring, kind);
			return true;
		} catch (error) {
			ring.episode.rollbackRecoveryFollowUpQueue();
			ctx.ui.notify(
				`Key changed, but automatic retry was rejected: ${error instanceof Error ? error.message : String(error)}`,
				"warning",
			);
			return false;
		}
	}

	const handleRetryStart = (
		event: RetryStartEvent,
		ctx: ExtensionContext,
	): boolean => {
		const ring = matchingRing(rings, ctx.model?.provider);
		if (!ring) return false;
		const pending = ring.pendingFailure;
		const diagnosis =
			pending?.diagnosis ??
			diagnoseProviderKeyFailure(event.errorMessage, event.providerError);
		if (!diagnosis) return false;
		const outcome = rotateForFailure(
			ring,
			ctx,
			diagnosis,
			event,
			pending?.providerError ?? event.providerError,
		);
		if (outcome === "rotated") emitHandled(event, ring, "retryable-limit");
		return outcome !== "unhandled";
	};

	const handleRetryEnd = async (
		event: RetryEndEvent,
		ctx: ExtensionContext,
	): Promise<boolean> => {
		if (event.success) return false;
		const ring = matchingRing(rings, ctx.model?.provider);
		if (!ring) return false;
		const pending = ring.pendingFailure;
		const diagnosis =
			pending?.diagnosis ??
			diagnoseProviderKeyFailure(event.finalError, event.providerError);
		if (!diagnosis) return false;
		const outcome = rotateForFailure(
			ring,
			ctx,
			diagnosis,
			event,
			pending?.providerError ?? event.providerError,
		);
		if (outcome === "exhausted") return true;
		if (outcome !== "rotated") return false;
		return queueRecoveryFollowUp(ring, ctx, event, "retryable-limit");
	};

	const handleTurnEnd = async (
		event: TurnEndEvent,
		ctx: ExtensionContext,
	): Promise<boolean> => {
		if (
			event.message.role !== "assistant" ||
			event.message.stopReason !== "error"
		)
			return false;
		const ring = matchingRing(rings, ctx.model?.provider);
		if (!ring) return false;
		let diagnosis: ProviderKeyFailureDiagnosis | undefined;
		try {
			diagnosis = observeTurnFailure(event, ring, ctx);
		} catch (error) {
			ctx.ui.notify(
				`Could not persist ${ring.stored.label} key failure; request aborted: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
			ctx.abort();
			emitHandled(event, ring, "all-keys-exhausted");
			return true;
		}
		if (!diagnosis || diagnosis.kind === "cooldown") return false;
		const outcome = rotateForFailure(
			ring,
			ctx,
			diagnosis,
			event,
			ring.pendingFailure?.providerError ?? event.message.providerError,
		);
		if (outcome === "exhausted") return true;
		if (outcome !== "rotated") return false;
		return queueRecoveryFollowUp(ring, ctx, event, "hard-key-limit");
	};

	/**
	 * Own one lifecycle event before invoking either recovery entrance.
	 *
	 * Extension listeners are dispatched in registration order. A query can
	 * therefore re-enter the router while its ordinary listener is still
	 * settling (or vice versa). Publish the shared Promise synchronously before
	 * calling the handler so both entrances observe one transition, regardless
	 * of whether that transition ultimately succeeds, declines, or rejects.
	 */
	function claimRecoveryEvent(
		event: object,
		handle: () => boolean | Promise<boolean>,
	): Promise<boolean> {
		if (settledRecoveryEvents.has(event))
			return Promise.resolve(settledRecoveryEvents.get(event) ?? false);
		const existing = inFlightRecoveryEvents.get(event);
		if (existing) return existing;

		let resolveResult!: (handled: boolean) => void;
		let rejectResult!: (error: unknown) => void;
		const result = new Promise<boolean>((resolve, reject) => {
			resolveResult = resolve;
			rejectResult = reject;
		});
		const pending = result.then(
			(handled) => {
				if (inFlightRecoveryEvents.get(event) === pending)
					inFlightRecoveryEvents.delete(event);
				settledRecoveryEvents.set(event, handled);
				return handled;
			},
			(error) => {
				if (inFlightRecoveryEvents.get(event) === pending)
					inFlightRecoveryEvents.delete(event);
				throw error;
			},
		);
		inFlightRecoveryEvents.set(event, pending);
		try {
			Promise.resolve(handle()).then(resolveResult, rejectResult);
		} catch (error) {
			rejectResult(error);
		}
		return pending;
	}

	const disposeRecoveryQuery = pi.events.on(
		PROVIDER_KEY_RECOVERY_QUERY_CHANNEL,
		(data) => {
			if (!data || typeof data !== "object") return;
			const query = data as Partial<ProviderKeyRecoveryQuery>;
			if (
				!query.event ||
				typeof query.event !== "object" ||
				!query.context ||
				typeof query.context !== "object"
			)
				return;
			const event = query.event as
				| RetryStartEvent
				| RetryEndEvent
				| TurnEndEvent;
			const ctx = query.context as ExtensionContext;
			let handle: (() => boolean | Promise<boolean>) | undefined;
			if (event.type === "auto_retry_start")
				handle = () => handleRetryStart(event, ctx);
			else if (event.type === "auto_retry_end")
				handle = () => handleRetryEnd(event, ctx);
			else if (event.type === "turn_end")
				handle = () => handleTurnEnd(event, ctx);
			else return;
			query.pending = claimRecoveryEvent(event, handle).then((handled) => {
				query.handled = handled;
				return handled;
			});
		},
	);

	on("auto_retry_start", (event, ctx) => {
		return claimRecoveryEvent(event, () => handleRetryStart(event, ctx));
	});

	on("auto_retry_end", (event, ctx) => {
		return claimRecoveryEvent(event, () => handleRetryEnd(event, ctx));
	});

	on("turn_end", (event, ctx) => {
		return claimRecoveryEvent(event, () => handleTurnEnd(event, ctx));
	});

	pi.on("session_shutdown", () => {
		disposeRecoveryQuery();
		for (const ring of rings.values()) {
			const lease = ring.probeLease;
			ring.probeLease = undefined;
			try {
				releaseProbeLease(lease);
			} catch {
				// Shutdown is best-effort, and the owner token prevents releasing a
				// successor's lease. Continue so other local leases are not stranded.
			}
		}
	});

	on("message_end", (event, ctx) => {
		if (
			event.message.role !== "assistant" ||
			event.message.stopReason === "error"
		)
			return;
		const ring = matchingRing(rings, ctx.model?.provider);
		const active = ring?.episode.active;
		if (ring) {
			ring.pendingFailure = undefined;
			ring.lastResponseMeta = undefined;
		}
		if (!ring || !active || storedLoginActive(ctx, ring)) return;
		try {
			health.recordSuccess(ring.id, active.id, ring.probeLease);
			if (ring.probeLease?.keyId === active.id) ring.probeLease = undefined;
			ring.exhaustionFingerprint = undefined;
			ring.episode.markSuccess();
		} catch (error) {
			ctx.ui.notify(
				`Could not persist ${ring.stored.label} key health: ${error instanceof Error ? error.message : String(error)}`,
				"warning",
			);
		}
	});
}

export default function providerKeyRouter(pi: ExtensionAPI): void {
	registerProviderKeyRouter(pi);
}
