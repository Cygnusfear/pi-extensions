import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	getPrimaryRateLimitDelayMs,
	isRepresentableDateTimestamp,
} from "../../shared/src/provider-reset.ts";
import { writeJsonFileDurably } from "./key-store.ts";
import type {
	ProviderErrorMeta,
	ProviderKeyFailureDiagnosis,
} from "./types.ts";

export const PROVIDER_KEY_HEALTH_FILE = "provider-key-health.json";
export const PROVIDER_KEY_HEALTH_VERSION = 2 as const;
export const MIN_UNKNOWN_RESET_MS = 5 * 60 * 60_000;
export const MAX_UNKNOWN_RESET_MS = 7 * 24 * 60 * 60_000;
export const EXPIRED_PROBE_LEASE_MS = 10 * 60_000;
const RESET_GRACE_MS = 2_000;

export type StoredKeyHealthState =
	| "healthy"
	| "cooldown"
	| "quota-exhausted"
	| "auth-invalid"
	| "probe";
export type StoredKeyHealthReason =
	| "rate-limit"
	| "quota"
	| "weekly-quota"
	| "auth";

interface StoredKeyHealthBase {
	observedAt: number;
	failureCount: number;
	reason: StoredKeyHealthReason;
}

export type StoredKeyHealth =
	| (StoredKeyHealthBase & {
			state: "healthy" | "auth-invalid";
			retryAt?: never;
			probeOwner?: never;
			probePreviousState?: never;
	  })
	| (StoredKeyHealthBase & {
			state: "cooldown" | "quota-exhausted";
			retryAt: number;
			probeOwner?: never;
			probePreviousState?: never;
	  })
	| (StoredKeyHealthBase & {
			state: "probe";
			retryAt: number;
			probeOwner: string;
			probePreviousState: "cooldown" | "quota-exhausted";
	  });

export interface ProviderKeyHealthStore {
	version: typeof PROVIDER_KEY_HEALTH_VERSION;
	providers: Record<string, Record<string, StoredKeyHealth>>;
}

export interface ClaimedKey {
	keyId: string;
	probe: boolean;
	lease?: ProviderKeyProbeLease;
}

export interface ProviderKeyProbeLease {
	providerId: string;
	keyId: string;
	ownerToken: string;
	expiresAt: number;
}

export type ProviderKeyExhaustionScope = "request" | "alternate";

export interface ProviderKeyExhaustionSummary {
	timed: number;
	authInvalid: number;
	unknown: number;
	healthy: number;
}

export class AllProviderKeysExhaustedError extends Error {
	readonly summary: ProviderKeyExhaustionSummary;

	constructor(
		readonly providerId: string,
		readonly nextEligibleAt: number | undefined,
		readonly health: Readonly<Record<string, StoredKeyHealth | undefined>>,
		readonly scope: ProviderKeyExhaustionScope = "request",
	) {
		const entries = Object.values(health);
		const summary = {
			timed: entries.filter(
				(entry) =>
					entry &&
					["cooldown", "quota-exhausted", "probe"].includes(entry.state),
			).length,
			authInvalid: entries.filter((entry) => entry?.state === "auth-invalid")
				.length,
			unknown: entries.filter((entry) => entry === undefined).length,
			healthy: entries.filter((entry) => entry?.state === "healthy").length,
		};
		const prefix =
			scope === "alternate"
				? `No eligible alternate ${providerId} API key; the active key remains selected.`
				: `No request-eligible ${providerId} API key remains.`;
		const stateDetail = ` ${summary.timed} timed/quota key(s), ${summary.authInvalid} auth-invalid key(s).`;
		const resetDetail =
			nextEligibleAt === undefined
				? " No automatic reset is known."
				: ` Next automatic recheck: ${new Date(nextEligibleAt).toISOString()}.`;
		const authDetail =
			summary.authInvalid > 0
				? " Replace or explicitly reset auth-invalid sources."
				: "";
		super(prefix + stateDetail + resetDetail + authDetail);
		this.name = "AllProviderKeysExhaustedError";
		this.summary = summary;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseHealth(
	value: unknown,
	location: string,
	version: 1 | 2,
): StoredKeyHealth {
	if (!isRecord(value)) throw new Error(`${location} must be an object`);
	const states: StoredKeyHealthState[] = [
		"healthy",
		"cooldown",
		"quota-exhausted",
		"auth-invalid",
		"probe",
	];
	const reasons: StoredKeyHealthReason[] = [
		"rate-limit",
		"quota",
		"weekly-quota",
		"auth",
	];
	if (!states.includes(value.state as StoredKeyHealthState))
		throw new Error(`${location}.state is invalid`);
	if (!reasons.includes(value.reason as StoredKeyHealthReason))
		throw new Error(`${location}.reason is invalid`);
	if (
		typeof value.observedAt !== "number" ||
		value.observedAt < 0 ||
		!isRepresentableDateTimestamp(value.observedAt)
	) {
		throw new Error(
			`${location}.observedAt must be a non-negative finite valid Date timestamp`,
		);
	}
	if (
		typeof value.failureCount !== "number" ||
		!Number.isInteger(value.failureCount) ||
		value.failureCount < 0
	) {
		throw new Error(`${location}.failureCount must be a non-negative integer`);
	}
	if (
		value.retryAt !== undefined &&
		(typeof value.retryAt !== "number" ||
			value.retryAt < 0 ||
			!isRepresentableDateTimestamp(value.retryAt))
	) {
		throw new Error(
			`${location}.retryAt must be a non-negative finite valid Date timestamp`,
		);
	}
	const state = value.state as StoredKeyHealthState;
	if (
		(state === "cooldown" ||
			state === "quota-exhausted" ||
			state === "probe") &&
		value.retryAt === undefined
	) {
		throw new Error(`${location}.retryAt is required for ${state}`);
	}
	if (
		(state === "healthy" || state === "auth-invalid") &&
		value.retryAt !== undefined
	) {
		throw new Error(`${location}.retryAt is not allowed for ${state}`);
	}
	const base = {
		observedAt: value.observedAt,
		failureCount: value.failureCount,
		reason: value.reason as StoredKeyHealthReason,
	};
	if (state === "probe") {
		if (version === 1) {
			return {
				...base,
				state: base.reason === "rate-limit" ? "cooldown" : "quota-exhausted",
				retryAt: value.retryAt as number,
			};
		}
		if (typeof value.probeOwner !== "string" || value.probeOwner.length === 0) {
			throw new Error(
				`${location}.probeOwner must be a non-empty string for probe`,
			);
		}
		if (
			value.probePreviousState !== "cooldown" &&
			value.probePreviousState !== "quota-exhausted"
		) {
			throw new Error(`${location}.probePreviousState is invalid`);
		}
		return {
			...base,
			state,
			retryAt: value.retryAt as number,
			probeOwner: value.probeOwner,
			probePreviousState: value.probePreviousState,
		};
	}
	if (
		value.probeOwner !== undefined ||
		value.probePreviousState !== undefined
	) {
		throw new Error(
			`${location} probe ownership is only allowed for probe state`,
		);
	}
	if (state === "cooldown" || state === "quota-exhausted") {
		return { ...base, state, retryAt: value.retryAt as number };
	}
	return { ...base, state };
}

export function parseProviderKeyHealthStore(
	value: unknown,
): ProviderKeyHealthStore {
	if (!isRecord(value))
		throw new Error("provider key health store must be an object");
	if (value.version !== 1 && value.version !== PROVIDER_KEY_HEALTH_VERSION) {
		throw new Error(
			`unsupported provider key health store version: ${String(value.version)}`,
		);
	}
	const version = value.version as 1 | 2;
	if (!isRecord(value.providers))
		throw new Error("provider key health providers must be an object");
	const providers: Record<string, Record<string, StoredKeyHealth>> = {};
	for (const [providerId, providerValue] of Object.entries(value.providers)) {
		if (!isRecord(providerValue))
			throw new Error(`providers.${providerId} must be an object`);
		providers[providerId] = Object.fromEntries(
			Object.entries(providerValue).map(([keyId, health]) => [
				keyId,
				parseHealth(health, `providers.${providerId}.${keyId}`, version),
			]),
		);
	}
	return { version: PROVIDER_KEY_HEALTH_VERSION, providers };
}

function defaultStore(): ProviderKeyHealthStore {
	return { version: PROVIDER_KEY_HEALTH_VERSION, providers: {} };
}

function isEligible(health: StoredKeyHealth | undefined, now: number): boolean {
	if (!health || health.state === "healthy") return true;
	if (health.state === "auth-invalid") return false;
	return health.retryAt !== undefined && health.retryAt <= now;
}

export function adaptiveUnknownResetDelayMs(
	failureCount: number,
	weekly: boolean,
): number {
	if (weekly) return MAX_UNKNOWN_RESET_MS;
	const exponent = Math.max(0, failureCount - 1);
	return Math.min(MIN_UNKNOWN_RESET_MS * 2 ** exponent, MAX_UNKNOWN_RESET_MS);
}

export interface ProviderKeyHealthLedgerOptions {
	now?: () => number;
	sleep?: (milliseconds: number) => void;
	lockTimeoutMs?: number;
	lockStaleMs?: number;
	/** Deterministic failure-injection seam for the stale-claim interleaving test. */
	beforeStaleClaimRemoval?: (claimPath: string) => void;
}

export class ProviderKeyHealthLedger {
	readonly path: string;
	private readonly lockPath: string;
	private readonly now: () => number;
	private readonly sleep: (milliseconds: number) => void;
	private readonly lockTimeoutMs: number;
	private readonly lockStaleMs: number;
	private readonly beforeStaleClaimRemoval?: (claimPath: string) => void;

	constructor(agentDir: string, options: ProviderKeyHealthLedgerOptions = {}) {
		this.path = path.join(agentDir, PROVIDER_KEY_HEALTH_FILE);
		this.lockPath = `${this.path}.lock`;
		this.now = options.now ?? Date.now;
		this.sleep =
			options.sleep ??
			((milliseconds) => {
				Atomics.wait(
					new Int32Array(new SharedArrayBuffer(4)),
					0,
					0,
					milliseconds,
				);
			});
		this.lockTimeoutMs = options.lockTimeoutMs ?? 1_000;
		this.lockStaleMs = options.lockStaleMs ?? 30_000;
		this.beforeStaleClaimRemoval = options.beforeStaleClaimRemoval;
	}

	read(): ProviderKeyHealthStore {
		if (!fs.existsSync(this.path)) return defaultStore();
		return parseProviderKeyHealthStore(
			JSON.parse(fs.readFileSync(this.path, "utf8")),
		);
	}

	claimFirst(
		providerId: string,
		candidateIds: readonly string[],
		poolKeyIds: readonly string[] = candidateIds,
		scope: ProviderKeyExhaustionScope = "request",
		ownedLease?: ProviderKeyProbeLease,
	): ClaimedKey {
		return this.withMutation<ClaimedKey>((store, now) => {
			const provider = store.providers[providerId] ?? {};
			if (
				ownedLease?.providerId === providerId &&
				candidateIds.includes(ownedLease.keyId)
			) {
				const ownedEntry = provider[ownedLease.keyId];
				if (
					ownedEntry?.state === "probe" &&
					ownedEntry.probeOwner === ownedLease.ownerToken
				) {
					const expiresAt = now + EXPIRED_PROBE_LEASE_MS;
					provider[ownedLease.keyId] = { ...ownedEntry, retryAt: expiresAt };
					store.providers[providerId] = provider;
					const lease = {
						providerId,
						keyId: ownedLease.keyId,
						ownerToken: ownedLease.ownerToken,
						expiresAt,
					};
					return {
						value: { keyId: ownedLease.keyId, probe: true, lease },
						changed: true,
					};
				}
			}
			const ranked = [
				candidateIds.filter((keyId) => provider[keyId]?.state === "healthy"),
				candidateIds.filter((keyId) => provider[keyId] === undefined),
				candidateIds.filter((keyId) => {
					const entry = provider[keyId];
					return Boolean(
						entry && entry.state !== "healthy" && isEligible(entry, now),
					);
				}),
			].flat();
			const keyId = ranked[0];
			if (keyId) {
				const entry = provider[keyId];
				const probe = Boolean(entry && entry.state !== "healthy");
				if (probe) {
					const ownerToken = randomUUID();
					const expiresAt = now + EXPIRED_PROBE_LEASE_MS;
					const probePreviousState =
						entry?.state === "cooldown"
							? "cooldown"
							: entry?.state === "probe"
								? entry.probePreviousState
								: "quota-exhausted";
					provider[keyId] = {
						state: "probe",
						observedAt: now,
						failureCount: entry?.failureCount ?? 0,
						retryAt: expiresAt,
						reason: entry?.reason ?? "quota",
						probeOwner: ownerToken,
						probePreviousState,
					};
					store.providers[providerId] = provider;
					const lease = { providerId, keyId, ownerToken, expiresAt };
					return { value: { keyId, probe: true, lease }, changed: true };
				}
				return { value: { keyId, probe: false }, changed: false };
			}
			const health = Object.fromEntries(
				poolKeyIds.map((keyId) => [keyId, provider[keyId]]),
			);
			const retryTimes = Object.values(health)
				.map((entry) => entry?.retryAt)
				.filter(
					(value): value is number => typeof value === "number" && value > now,
				);
			throw new AllProviderKeysExhaustedError(
				providerId,
				retryTimes.length > 0 ? Math.min(...retryTimes) : undefined,
				health,
				scope,
			);
		});
	}

	recordFailure(
		providerId: string,
		keyId: string,
		diagnosis: ProviderKeyFailureDiagnosis,
		providerError?: ProviderErrorMeta,
		probeLease?: ProviderKeyProbeLease,
	): StoredKeyHealth {
		return this.withMutation((store, now) => {
			const provider = store.providers[providerId] ?? {};
			const previous = provider[keyId];
			this.assertProbeOwner(providerId, keyId, previous, probeLease);
			const failureCount = (previous?.failureCount ?? 0) + 1;
			let next: StoredKeyHealth;
			if (diagnosis.kind === "auth-invalid") {
				next = {
					state: "auth-invalid",
					observedAt: now,
					failureCount,
					reason: "auth",
				};
			} else {
				const providerDelay = getPrimaryRateLimitDelayMs(providerError, now);
				const fallbackDelay = adaptiveUnknownResetDelayMs(
					failureCount,
					diagnosis.reason === "weekly-quota",
				);
				const providerRetryAt =
					providerDelay === undefined
						? undefined
						: now + providerDelay + RESET_GRACE_MS;
				const retryAt =
					providerRetryAt !== undefined &&
					isRepresentableDateTimestamp(providerRetryAt)
						? providerRetryAt
						: now + fallbackDelay;
				if (!isRepresentableDateTimestamp(retryAt)) {
					throw new Error(
						"Cannot record provider key health with an invalid retry timestamp",
					);
				}
				next = {
					state: diagnosis.kind,
					observedAt: now,
					failureCount,
					retryAt,
					reason: diagnosis.reason,
				};
			}
			provider[keyId] = next;
			store.providers[providerId] = provider;
			return { value: next, changed: true };
		});
	}

	recordSuccess(
		providerId: string,
		keyId: string,
		probeLease?: ProviderKeyProbeLease,
	): StoredKeyHealth {
		return this.withMutation((store, now) => {
			const provider = store.providers[providerId] ?? {};
			const existing = provider[keyId];
			this.assertProbeOwner(providerId, keyId, existing, probeLease);
			if (existing?.state === "healthy")
				return { value: existing, changed: false };
			const next: StoredKeyHealth = {
				state: "healthy",
				observedAt: now,
				failureCount: 0,
				reason: existing?.reason ?? "rate-limit",
			};
			provider[keyId] = next;
			store.providers[providerId] = provider;
			return { value: next, changed: true };
		});
	}

	releaseProbeLease(lease: ProviderKeyProbeLease): boolean {
		return this.withMutation((store, now) => {
			const provider = store.providers[lease.providerId];
			const existing = provider?.[lease.keyId];
			if (
				existing?.state !== "probe" ||
				existing.probeOwner !== lease.ownerToken
			) {
				return { value: false, changed: false };
			}
			provider[lease.keyId] = {
				state: existing.probePreviousState,
				observedAt: now,
				failureCount: existing.failureCount,
				retryAt: now,
				reason: existing.reason,
			};
			return { value: true, changed: true };
		});
	}

	reset(providerId: string, keyId?: string): void {
		this.withMutation((store) => {
			const provider = store.providers[providerId];
			if (!provider) return { value: undefined, changed: false };
			if (keyId) delete provider[keyId];
			else delete store.providers[providerId];
			return { value: undefined, changed: true };
		});
	}

	/**
	 * Makes timed quarantine entries eligible for a new real-request recheck.
	 * Authentication failures deliberately remain durable: availability recovery
	 * cannot prove that a credential which failed authentication is now valid.
	 * Probe leases are intentionally untouched because another Pi process may own
	 * the authoritative in-flight recheck.
	 */
	resetTimed(providerId: string, keyIds: ReadonlySet<string>): number {
		return this.withMutation((store) => {
			const provider = store.providers[providerId];
			if (!provider) return { value: 0, changed: false };
			let reset = 0;
			for (const keyId of keyIds) {
				const entry = provider[keyId];
				if (
					entry?.state !== "cooldown" &&
					entry?.state !== "quota-exhausted"
				)
					continue;
				delete provider[keyId];
				reset++;
			}
			return { value: reset, changed: reset > 0 };
		});
	}

	prune(providerId: string, validKeyIds: ReadonlySet<string>): void {
		this.withMutation((store) => {
			const provider = store.providers[providerId];
			if (!provider) return { value: undefined, changed: false };
			let changed = false;
			for (const keyId of Object.keys(provider)) {
				if (validKeyIds.has(keyId)) continue;
				delete provider[keyId];
				changed = true;
			}
			return { value: undefined, changed };
		});
	}

	private withMutation<T>(
		mutate: (
			store: ProviderKeyHealthStore,
			now: number,
		) => { value: T; changed: boolean },
	): T {
		const release = this.acquireLock();
		try {
			const store = this.read();
			const result = mutate(store, this.now());
			if (result.changed) {
				const validatedStore = parseProviderKeyHealthStore(store);
				writeJsonFileDurably(this.path, validatedStore);
			}
			return result.value;
		} finally {
			release();
		}
	}

	private assertProbeOwner(
		providerId: string,
		keyId: string,
		entry: StoredKeyHealth | undefined,
		lease: ProviderKeyProbeLease | undefined,
	): void {
		if (entry?.state !== "probe") return;
		if (
			lease?.providerId === providerId &&
			lease.keyId === keyId &&
			lease.ownerToken === entry.probeOwner
		)
			return;
		throw new Error(
			`Probe lease ownership mismatch for ${providerId}/${keyId}`,
		);
	}

	private acquireLock(): () => void {
		fs.mkdirSync(path.dirname(this.path), { recursive: true, mode: 0o700 });
		const startedAt = this.now();
		type LockClaim = {
			ticket: number;
			path: string;
			ownerToken: string;
			createdAt: number;
			status: "waiting" | "released";
		};

		const readClaims = (): LockClaim[] => {
			let names: string[];
			try {
				names = fs.readdirSync(this.lockPath);
			} catch (error) {
				const code =
					error && typeof error === "object" && "code" in error
						? String(error.code)
						: "";
				if (code === "ENOENT") return [];
				throw error;
			}
			type RetiredLegacyOwner = {
				dev: number;
				ino: number;
				mtimeMs: number;
				ownerToken: string;
			};
			const retiredLegacyOwners: RetiredLegacyOwner[] = [];
			for (const name of names) {
				if (!/^\.legacy-retired-[0-9a-f-]+\.json$/.test(name)) continue;
				try {
					const parsed = JSON.parse(
						fs.readFileSync(path.join(this.lockPath, name), "utf8"),
					) as Partial<RetiredLegacyOwner>;
					if (
						typeof parsed.dev === "number" &&
						Number.isFinite(parsed.dev) &&
						typeof parsed.ino === "number" &&
						Number.isFinite(parsed.ino) &&
						typeof parsed.mtimeMs === "number" &&
						Number.isFinite(parsed.mtimeMs) &&
						typeof parsed.ownerToken === "string"
					)
						retiredLegacyOwners.push(parsed as RetiredLegacyOwner);
				} catch {
					// A malformed marker never suppresses a legacy owner.
				}
			}
			const claims: LockClaim[] = [];
			for (const name of names) {
				if (name === "owner") {
					const legacyPath = path.join(this.lockPath, name);
					try {
						const ownerToken = fs.readFileSync(legacyPath, "utf8");
						const stat = fs.lstatSync(legacyPath);
						if (
							stat.isFile() &&
							retiredLegacyOwners.some(
								(retired) =>
									retired.dev === stat.dev &&
									retired.ino === stat.ino &&
									retired.mtimeMs === stat.mtimeMs &&
									retired.ownerToken === ownerToken,
							)
						)
							continue;
						claims.push({
							ticket: 0,
							path: legacyPath,
							ownerToken,
							createdAt: stat.mtimeMs,
							status: "waiting",
						});
					} catch (error) {
						const code =
							error && typeof error === "object" && "code" in error
								? String(error.code)
								: "";
						if (code !== "ENOENT") throw error;
					}
					continue;
				}
				const match = /^claim-(\d+)\.json$/.exec(name);
				if (!match) continue;
				const ticket = Number(match[1]);
				if (!Number.isSafeInteger(ticket) || ticket < 1) continue;
				const claimPath = path.join(this.lockPath, name);
				try {
					const parsed = JSON.parse(fs.readFileSync(claimPath, "utf8")) as {
						ownerToken?: unknown;
						createdAt?: unknown;
						status?: unknown;
					};
					claims.push({
						ticket,
						path: claimPath,
						ownerToken:
							typeof parsed.ownerToken === "string"
								? parsed.ownerToken
								: "malformed",
						createdAt:
							typeof parsed.createdAt === "number" &&
							Number.isFinite(parsed.createdAt)
								? parsed.createdAt
								: fs.statSync(claimPath).mtimeMs,
						status: parsed.status === "released" ? "released" : "waiting",
					});
				} catch (error) {
					const code =
						error && typeof error === "object" && "code" in error
							? String(error.code)
							: "";
					if (code === "ENOENT") continue;
					claims.push({
						ticket,
						path: claimPath,
						ownerToken: "malformed",
						createdAt: fs.statSync(claimPath).mtimeMs,
						status: "waiting",
					});
				}
			}
			return claims.sort((a, b) => a.ticket - b.ticket);
		};

		const allocateClaim = (): LockClaim => {
			for (;;) {
				fs.mkdirSync(this.lockPath, { recursive: true, mode: 0o700 });
				const claims = readClaims();
				const ticket = (claims.at(-1)?.ticket ?? 0) + 1;
				if (!Number.isSafeInteger(ticket))
					throw new Error("Provider key health lock ticket overflow");
				const claim: LockClaim = {
					ticket,
					path: path.join(this.lockPath, `claim-${ticket}.json`),
					ownerToken: randomUUID(),
					createdAt: this.now(),
					status: "waiting",
				};
				try {
					fs.writeFileSync(
						claim.path,
						JSON.stringify({
							version: 1,
							ownerToken: claim.ownerToken,
							createdAt: claim.createdAt,
							status: claim.status,
						}),
						{ encoding: "utf8", mode: 0o600, flag: "wx" },
					);
					return claim;
				} catch (error) {
					const code =
						error && typeof error === "object" && "code" in error
							? String(error.code)
							: "";
					if (code !== "EEXIST" && code !== "ENOENT") throw error;
				}
			}
		};

		const retireClaim = (claim: LockClaim): void => {
			try {
				const current = readClaims().find(
					(candidate) => candidate.path === claim.path,
				);
				if (!current || current.ownerToken !== claim.ownerToken) return;
				writeJsonFileDurably(claim.path, {
					version: 1,
					ownerToken: claim.ownerToken,
					createdAt: claim.createdAt,
					status: "released",
				});
			} catch (error) {
				const code =
					error && typeof error === "object" && "code" in error
						? String(error.code)
						: "";
				if (code !== "ENOENT") throw error;
			}
		};

		const retireLegacyOwner = (claim: LockClaim): void => {
			const fencePath = path.join(
				this.lockPath,
				`.owner-fence-${randomUUID()}.tmp`,
			);
			try {
				fs.linkSync(claim.path, fencePath);
			} catch {
				// Hard-link identity fencing is unavailable. Fail closed rather than
				// deleting a reusable legacy pathname by observation alone.
				return;
			}
			try {
				const fenced = fs.lstatSync(fencePath);
				const current = fs.lstatSync(claim.path);
				const sameRegularFile =
					fenced.isFile() &&
					current.isFile() &&
					fenced.ino !== 0 &&
					fenced.dev === current.dev &&
					fenced.ino === current.ino;
				if (
					!sameRegularFile ||
					this.now() - fenced.mtimeMs <= this.lockStaleMs ||
					fs.readFileSync(fencePath, "utf8") !== claim.ownerToken
				)
					return;

				// The hook runs only after the old inode is pinned. A successor may
				// replace owner, but it cannot acquire the fence's identity.
				this.beforeStaleClaimRemoval?.(claim.path);
				const finalOwner = fs.lstatSync(claim.path);
				if (
					!finalOwner.isFile() ||
					finalOwner.dev !== fenced.dev ||
					finalOwner.ino !== fenced.ino ||
					fs.readFileSync(claim.path, "utf8") !== claim.ownerToken
				)
					return;
				// Retire by immutable identity, never by deleting the reusable owner path.
				writeJsonFileDurably(
					path.join(this.lockPath, `.legacy-retired-${randomUUID()}.json`),
					{
						version: 1,
						dev: fenced.dev,
						ino: fenced.ino,
						mtimeMs: fenced.mtimeMs,
						ownerToken: claim.ownerToken,
					},
				);
			} catch (error) {
				const code =
					error && typeof error === "object" && "code" in error
						? String(error.code)
						: "";
				if (code !== "ENOENT") throw error;
			} finally {
				try {
					fs.unlinkSync(fencePath);
				} catch {
					// A private fence leak is harmless and must not override the lock
					// transition that already completed or failed above.
				}
			}
		};

		let ownClaim = allocateClaim();

		try {
			for (;;) {
				let claims = readClaims();
				if (
					!claims.some(
						(claim) =>
							claim.path === ownClaim.path &&
							claim.ownerToken === ownClaim.ownerToken,
					)
				) {
					ownClaim = allocateClaim();
					continue;
				}
				for (const claim of claims) {
					if (
						claim.status !== "waiting" ||
						claim.path === ownClaim.path ||
						this.now() - claim.createdAt <= this.lockStaleMs
					)
						continue;
					if (claim.ticket === 0) retireLegacyOwner(claim);
					else {
						this.beforeStaleClaimRemoval?.(claim.path);
						retireClaim(claim);
					}
				}
				claims = readClaims();
				const firstWaiting = claims.find((claim) => claim.status === "waiting");
				if (
					firstWaiting?.path === ownClaim.path &&
					firstWaiting.ownerToken === ownClaim.ownerToken
				) {
					const highestTicket = claims.at(-1)?.ticket ?? ownClaim.ticket;
					for (const claim of claims) {
						if (claim.status !== "released" || claim.ticket >= highestTicket)
							continue;
						try {
							fs.unlinkSync(claim.path);
						} catch (error) {
							const code =
								error && typeof error === "object" && "code" in error
									? String(error.code)
									: "";
							if (code !== "ENOENT") throw error;
						}
					}
					return () => retireClaim(ownClaim);
				}
				if (this.now() - startedAt >= this.lockTimeoutMs) {
					throw new Error(
						`Timed out waiting for provider key health lock: ${this.lockPath}`,
					);
				}
				this.sleep(10);
			}
		} catch (error) {
			retireClaim(ownClaim);
			throw error;
		}
	}
}
