import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	AllProviderKeysExhaustedError,
	adaptiveUnknownResetDelayMs,
	EXPIRED_PROBE_LEASE_MS,
	MAX_UNKNOWN_RESET_MS,
	MIN_UNKNOWN_RESET_MS,
	PROVIDER_KEY_HEALTH_FILE,
	PROVIDER_KEY_HEALTH_VERSION,
	ProviderKeyHealthLedger,
	parseProviderKeyHealthStore,
} from "./key-health-store.ts";

const dirs: string[] = [];
const baseNow = Date.parse("2026-08-09T12:00:00Z");
const maxDateTimestamp = 8_640_000_000_000_000;
function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-key-health-"));
	dirs.push(dir);
	return dir;
}
afterEach(() => {
	for (const dir of dirs.splice(0))
		fs.rmSync(dir, { recursive: true, force: true });
});

function diagnosis(
	kind: "cooldown" | "quota-exhausted" | "auth-invalid",
	reason: "rate-limit" | "quota" | "weekly-quota" | "auth",
) {
	return { kind, reason } as const;
}

describe("ProviderKeyHealthLedger", () => {
	test("unknown keys are eligible without creating speculative state", () => {
		const dir = tempDir();
		const ledger = new ProviderKeyHealthLedger(dir, { now: () => baseNow });
		expect(ledger.claimFirst("qwencloud", ["a", "b"])).toEqual({
			keyId: "a",
			probe: false,
		});
		expect(fs.existsSync(path.join(dir, PROVIDER_KEY_HEALTH_FILE))).toBe(false);
	});

	test("resetTimed makes only timed quarantines eligible", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), { now: () => baseNow });
		ledger.recordFailure("qwencloud", "cooldown", diagnosis("cooldown", "rate-limit"));
		ledger.recordFailure("qwencloud", "quota", diagnosis("quota-exhausted", "quota"));
		ledger.recordFailure("qwencloud", "auth", diagnosis("auth-invalid", "auth"));

		expect(ledger.resetTimed("qwencloud", new Set(["cooldown", "quota", "auth"]))).toBe(2);
		const provider = ledger.read().providers.qwencloud;
		expect(provider.cooldown).toBeUndefined();
		expect(provider.quota).toBeUndefined();
		expect(provider.auth?.state).toBe("auth-invalid");
	});

	test("uses provider reset metadata with grace instead of fallback", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		const entry = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("cooldown", "rate-limit"),
			{ headers: { "retry-after": "60" } },
		);
		expect(entry.retryAt).toBe(baseNow + 62_000);
	});

	test("uses adaptive quarantine when reset metadata cannot produce a valid ledger timestamp", () => {
		const cases = [
			{ "retry-after": "9".repeat(400) },
			{ "retry-after-ms": "9".repeat(400) },
			{
				"retry-after-ms": String(maxDateTimestamp - baseNow + 1),
			},
			{
				"retry-after-ms": String(maxDateTimestamp - baseNow),
			},
		];
		for (const [index, headers] of cases.entries()) {
			const dir = tempDir();
			const ledger = new ProviderKeyHealthLedger(dir, { now: () => baseNow });
			const keyId = `key-${index}`;
			const entry = ledger.recordFailure(
				"qwencloud",
				keyId,
				diagnosis("cooldown", "rate-limit"),
				{ headers },
			);
			expect(entry.retryAt).toBe(baseNow + MIN_UNKNOWN_RESET_MS);
			expect(ledger.read().providers.qwencloud[keyId].retryAt).toBe(
				baseNow + MIN_UNKNOWN_RESET_MS,
			);
			expect(
				fs.readFileSync(path.join(dir, PROVIDER_KEY_HEALTH_FILE), "utf8"),
			).not.toContain('"retryAt":null');
		}
	});

	test("uses adaptive 5h backoff, doubles after a failed probe, and caps at 7d", () => {
		let now = baseNow;
		const ledger = new ProviderKeyHealthLedger(tempDir(), { now: () => now });
		const first = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		expect(first.retryAt).toBe(now + MIN_UNKNOWN_RESET_MS);
		if (first.retryAt === undefined)
			throw new Error("expected retry timestamp");
		now = first.retryAt;
		const claim = ledger.claimFirst("qwencloud", ["a"]);
		expect(claim.keyId).toBe("a");
		expect(claim.probe).toBe(true);
		expect(claim.lease).toBeDefined();
		const second = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
			undefined,
			claim.lease,
		);
		expect(second.retryAt).toBe(now + 2 * MIN_UNKNOWN_RESET_MS);
		expect(adaptiveUnknownResetDelayMs(99, false)).toBe(MAX_UNKNOWN_RESET_MS);
	});

	test("weekly quota wording starts at the seven-day cap", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		const entry = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "weekly-quota"),
		);
		expect(entry.retryAt).toBe(baseNow + MAX_UNKNOWN_RESET_MS);
	});

	test("probe lease prevents simultaneous reprobes and expires after a crash", () => {
		let now = baseNow;
		const dir = tempDir();
		const first = new ProviderKeyHealthLedger(dir, { now: () => now });
		const second = new ProviderKeyHealthLedger(dir, { now: () => now });
		const failed = first.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		if (failed.retryAt === undefined)
			throw new Error("expected retry timestamp");
		now = failed.retryAt;
		const firstClaim = first.claimFirst("qwencloud", ["a"]);
		expect(firstClaim.probe).toBe(true);
		expect(() => second.claimFirst("qwencloud", ["a"])).toThrow(
			AllProviderKeysExhaustedError,
		);
		now += EXPIRED_PROBE_LEASE_MS;
		const secondClaim = second.claimFirst("qwencloud", ["a"]);
		expect(secondClaim.probe).toBe(true);
		expect(secondClaim.lease?.ownerToken).not.toBe(
			firstClaim.lease?.ownerToken,
		);
		expect(() =>
			first.recordSuccess("qwencloud", "a", firstClaim.lease),
		).toThrow(/ownership mismatch/);
		expect(
			second.recordSuccess("qwencloud", "a", secondClaim.lease).state,
		).toBe("healthy");
	});

	test("rejects an overflowing new probe without modifying readable health", () => {
		let now = baseNow;
		const dir = tempDir();
		const ledger = new ProviderKeyHealthLedger(dir, { now: () => now });
		ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		const file = path.join(dir, PROVIDER_KEY_HEALTH_FILE);
		const before = fs.readFileSync(file, "utf8");
		now = maxDateTimestamp - 1;

		expect(() => ledger.claimFirst("qwencloud", ["a"])).toThrow(
			/valid Date timestamp/,
		);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(ledger.read().providers.qwencloud.a.state).toBe("quota-exhausted");
	});

	test("rejects an overflowing owned-probe renewal without modifying its lease", () => {
		let now = baseNow;
		const dir = tempDir();
		const ledger = new ProviderKeyHealthLedger(dir, { now: () => now });
		const failure = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		if (failure.retryAt === undefined)
			throw new Error("expected retry timestamp");
		now = failure.retryAt;
		const claim = ledger.claimFirst("qwencloud", ["a"]);
		if (!claim.lease) throw new Error("expected owned probe lease");
		const file = path.join(dir, PROVIDER_KEY_HEALTH_FILE);
		const before = fs.readFileSync(file, "utf8");
		now = maxDateTimestamp - 1;

		expect(() =>
			ledger.claimFirst("qwencloud", ["a"], ["a"], "request", claim.lease),
		).toThrow(/valid Date timestamp/);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(ledger.read().providers.qwencloud.a.retryAt).toBe(
			claim.lease.expiresAt,
		);
	});

	test("rejects invalid-clock failure and success writes without modifying health", () => {
		let now = baseNow;
		const dir = tempDir();
		const ledger = new ProviderKeyHealthLedger(dir, { now: () => now });
		ledger.recordSuccess("qwencloud", "existing");
		const file = path.join(dir, PROVIDER_KEY_HEALTH_FILE);
		const before = fs.readFileSync(file, "utf8");
		now = -MIN_UNKNOWN_RESET_MS - 1;

		expect(() =>
			ledger.recordFailure(
				"qwencloud",
				"existing",
				diagnosis("quota-exhausted", "quota"),
			),
		).toThrow(/observedAt|retryAt/);
		expect(() => ledger.recordSuccess("qwencloud", "new-key")).toThrow(
			/observedAt/,
		);
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(ledger.read().providers.qwencloud.existing.state).toBe("healthy");
		expect(ledger.read().providers.qwencloud["new-key"]).toBeUndefined();
	});

	test("auth-invalid never revives on a timer, while success clears quarantine", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		const invalid = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("auth-invalid", "auth"),
		);
		expect(invalid.retryAt).toBeUndefined();
		try {
			ledger.claimFirst("qwencloud", ["a"]);
			throw new Error("expected exhaustion");
		} catch (error) {
			expect(error).toBeInstanceOf(AllProviderKeysExhaustedError);
			expect(
				(error as AllProviderKeysExhaustedError).nextEligibleAt,
			).toBeUndefined();
		}
		expect(ledger.recordSuccess("qwencloud", "a").state).toBe("healthy");
		expect(ledger.claimFirst("qwencloud", ["a"])).toEqual({
			keyId: "a",
			probe: false,
		});
	});

	test("pool exhaustion reports the earliest eligibility across attempted keys", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		const a = ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		ledger.recordFailure(
			"qwencloud",
			"b",
			diagnosis("quota-exhausted", "weekly-quota"),
		);
		try {
			ledger.claimFirst("qwencloud", [], ["a", "b"]);
			throw new Error("expected exhaustion");
		} catch (error) {
			expect(error).toBeInstanceOf(AllProviderKeysExhaustedError);
			expect((error as AllProviderKeysExhaustedError).nextEligibleAt).toBe(
				a.retryAt,
			);
		}
	});

	test("serializes cross-instance mutations by reloading the latest state", () => {
		const dir = tempDir();
		const one = new ProviderKeyHealthLedger(dir, { now: () => baseNow });
		const two = new ProviderKeyHealthLedger(dir, { now: () => baseNow + 1 });
		one.recordFailure("qwencloud", "a", diagnosis("quota-exhausted", "quota"));
		two.recordFailure("qwencloud", "b", diagnosis("auth-invalid", "auth"));
		const keys = one.read().providers.qwencloud;
		expect(Object.keys(keys).sort()).toEqual(["a", "b"]);
	});

	test("preserves simultaneous cross-process observations", async () => {
		const dir = tempDir();
		const modulePath = path.resolve(import.meta.dir, "key-health-store.ts");
		const run = (keyId: string) => {
			const code = `import { ProviderKeyHealthLedger } from ${JSON.stringify(modulePath)}; const ledger = new ProviderKeyHealthLedger(${JSON.stringify(dir)}); ledger.recordFailure("qwencloud", ${JSON.stringify(keyId)}, { kind: "quota-exhausted", reason: "quota" });`;
			return Bun.spawn({
				cmd: ["bun", "-e", code],
				stdout: "pipe",
				stderr: "pipe",
			});
		};
		const children = [run("a"), run("b"), run("c"), run("d")];
		const exits = await Promise.all(children.map((child) => child.exited));
		expect(exits).toEqual([0, 0, 0, 0]);
		expect(
			Object.keys(
				new ProviderKeyHealthLedger(dir).read().providers.qwencloud,
			).sort(),
		).toEqual(["a", "b", "c", "d"]);
	});

	test("takes over a stale lock but times out on a live lock", () => {
		const staleDir = tempDir();
		let now = baseNow;
		const staleLedger = new ProviderKeyHealthLedger(staleDir, {
			now: () => now,
			lockStaleMs: 100,
		});
		const staleLock = path.join(staleDir, `${PROVIDER_KEY_HEALTH_FILE}.lock`);
		fs.mkdirSync(staleLock);
		fs.writeFileSync(
			path.join(staleLock, "claim-1.json"),
			JSON.stringify({
				version: 1,
				ownerToken: "stale",
				createdAt: now - 10_000,
				status: "waiting",
			}),
		);
		expect(staleLedger.recordSuccess("qwencloud", "a").state).toBe("healthy");

		const liveDir = tempDir();
		const liveLock = path.join(liveDir, `${PROVIDER_KEY_HEALTH_FILE}.lock`);
		fs.mkdirSync(liveLock);
		fs.writeFileSync(
			path.join(liveLock, "claim-1.json"),
			JSON.stringify({
				version: 1,
				ownerToken: "live",
				createdAt: now,
				status: "waiting",
			}),
		);
		const liveLedger = new ProviderKeyHealthLedger(liveDir, {
			now: () => now,
			sleep: (ms) => {
				now += ms;
			},
			lockTimeoutMs: 20,
			lockStaleMs: 60_000,
		});
		expect(() => liveLedger.recordSuccess("qwencloud", "a")).toThrow(
			/Timed out waiting/,
		);
	});

	test("writes mode 0600, stores no provider message, resets and prunes", () => {
		const dir = tempDir();
		const ledger = new ProviderKeyHealthLedger(dir, { now: () => baseNow });
		ledger.recordFailure(
			"qwencloud",
			"a",
			diagnosis("quota-exhausted", "quota"),
		);
		ledger.recordFailure("qwencloud", "b", diagnosis("auth-invalid", "auth"));
		const file = path.join(dir, PROVIDER_KEY_HEALTH_FILE);
		expect(fs.statSync(file).mode & 0o777).toBe(0o600);
		expect(fs.readFileSync(file, "utf8")).not.toContain(
			"raw provider secret message",
		);
		ledger.prune("qwencloud", new Set(["a"]));
		expect(ledger.read().providers.qwencloud.b).toBeUndefined();
		ledger.reset("qwencloud", "a");
		expect(ledger.read().providers.qwencloud.a).toBeUndefined();
	});

	test("rejects malformed state instead of treating exhausted keys as unknown", () => {
		expect(() =>
			parseProviderKeyHealthStore({
				version: 1,
				providers: { qwencloud: { a: { state: "quota-exhausted" } } },
			}),
		).toThrow();
	});

	test("health schema enforces the complete JavaScript Date range", () => {
		expect(() =>
			parseProviderKeyHealthStore({
				version: PROVIDER_KEY_HEALTH_VERSION,
				providers: {
					qwencloud: {
						a: {
							state: "cooldown",
							observedAt: baseNow,
							failureCount: 1,
							retryAt: maxDateTimestamp + 1,
							reason: "rate-limit",
						},
					},
				},
			}),
		).toThrow(/valid Date timestamp/);
		expect(() =>
			parseProviderKeyHealthStore({
				version: PROVIDER_KEY_HEALTH_VERSION,
				providers: {
					qwencloud: {
						a: {
							state: "healthy",
							observedAt: maxDateTimestamp + 1,
							failureCount: 0,
							reason: "rate-limit",
						},
					},
				},
			}),
		).toThrow(/observedAt.*valid Date timestamp/);
		const exactMaximum = parseProviderKeyHealthStore({
			version: PROVIDER_KEY_HEALTH_VERSION,
			providers: {
				qwencloud: {
					a: {
						state: "cooldown",
						observedAt: maxDateTimestamp,
						failureCount: 1,
						retryAt: maxDateTimestamp,
						reason: "rate-limit",
					},
				},
			},
		});
		expect(exactMaximum.providers.qwencloud.a.observedAt).toBe(
			maxDateTimestamp,
		);
		expect(exactMaximum.providers.qwencloud.a.retryAt).toBe(maxDateTimestamp);
	});
	test("prefers observed healthy keys over earlier unknown keys", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		ledger.recordSuccess("qwencloud", "known-good");
		expect(
			ledger.claimFirst("qwencloud", ["unknown-first", "known-good"]),
		).toEqual({
			keyId: "known-good",
			probe: false,
		});
	});

	test("stale cleanup cannot remove a successor claim created during takeover", () => {
		const now = baseNow;
		const dir = tempDir();
		const lock = path.join(dir, `${PROVIDER_KEY_HEALTH_FILE}.lock`);
		fs.mkdirSync(lock);
		const staleClaim = path.join(lock, "claim-1.json");
		const successorClaim = path.join(lock, "claim-3.json");
		fs.writeFileSync(
			staleClaim,
			JSON.stringify({
				version: 1,
				ownerToken: "owner-a",
				createdAt: now - 1_000,
				status: "waiting",
			}),
		);
		let interleaved = false;
		const second = new ProviderKeyHealthLedger(dir, {
			now: () => now,
			lockStaleMs: 100,
			beforeStaleClaimRemoval: (observedPath) => {
				expect(observedPath).toBe(staleClaim);
				fs.unlinkSync(staleClaim); // A releases after B observed its immutable claim.
				fs.writeFileSync(
					successorClaim,
					JSON.stringify({
						version: 1,
						ownerToken: "owner-d",
						createdAt: now + 1,
						status: "waiting",
					}),
				); // D acquires a distinct claim before B completes stale cleanup.
				interleaved = true;
			},
		});
		const acquire = (ledger: ProviderKeyHealthLedger) =>
			(ledger as unknown as { acquireLock(): () => void }).acquireLock();
		const releaseSecond = acquire(second);
		expect(interleaved).toBe(true);
		expect(fs.existsSync(successorClaim)).toBe(true);
		releaseSecond();
		expect(fs.existsSync(successorClaim)).toBe(true);
	});

	test("retires an epoch-old legacy owner through an inode fence", () => {
		let now = baseNow;
		const dir = tempDir();
		const lock = path.join(dir, `${PROVIDER_KEY_HEALTH_FILE}.lock`);
		fs.mkdirSync(lock);
		const owner = path.join(lock, "owner");
		fs.writeFileSync(owner, "legacy-owner", { mode: 0o600 });
		fs.utimesSync(owner, new Date(now - 1_000), new Date(now - 1_000));
		const ledger = new ProviderKeyHealthLedger(dir, {
			now: () => now,
			sleep: (milliseconds) => {
				now += milliseconds;
			},
			lockStaleMs: 100,
			lockTimeoutMs: 100,
		});

		expect(ledger.recordSuccess("qwencloud", "a").state).toBe("healthy");
		expect(fs.existsSync(owner)).toBe(true);
		expect(
			fs
				.readdirSync(lock)
				.filter((name) => name.startsWith(".legacy-retired-")),
		).toHaveLength(1);
		expect(ledger.read().providers.qwencloud.a.state).toBe("healthy");
	});

	test("legacy owner ABA fencing preserves a recreated successor", () => {
		let now = baseNow;
		const dir = tempDir();
		const lock = path.join(dir, `${PROVIDER_KEY_HEALTH_FILE}.lock`);
		fs.mkdirSync(lock);
		const owner = path.join(lock, "owner");
		fs.writeFileSync(owner, "legacy-owner", { mode: 0o600 });
		fs.utimesSync(owner, new Date(now - 1_000), new Date(now - 1_000));
		let interleaved = false;
		const ledger = new ProviderKeyHealthLedger(dir, {
			now: () => now,
			sleep: (milliseconds) => {
				now += milliseconds;
			},
			lockStaleMs: 100,
			lockTimeoutMs: 20,
			beforeStaleClaimRemoval: (observedPath) => {
				if (interleaved) return;
				expect(observedPath).toBe(owner);
				fs.unlinkSync(owner);
				fs.writeFileSync(owner, "successor-owner", { mode: 0o600 });
				interleaved = true;
			},
		});

		expect(() => ledger.recordSuccess("qwencloud", "a")).toThrow(
			/Timed out waiting/,
		);
		expect(interleaved).toBe(true);
		expect(fs.readFileSync(owner, "utf8")).toBe("successor-owner");
		expect(
			fs.readdirSync(lock).some((name) => name.startsWith(".owner-fence-")),
		).toBe(false);
	});

	test("migrates v1 probes to timed state and requires owner metadata for v2 probes", () => {
		const legacy = parseProviderKeyHealthStore({
			version: 1,
			providers: {
				qwencloud: {
					a: {
						state: "probe",
						observedAt: baseNow,
						failureCount: 2,
						retryAt: baseNow + 60_000,
						reason: "quota",
					},
				},
			},
		});
		expect(legacy.version).toBe(PROVIDER_KEY_HEALTH_VERSION);
		expect(legacy.providers.qwencloud.a.state).toBe("quota-exhausted");
		expect(() =>
			parseProviderKeyHealthStore({
				version: PROVIDER_KEY_HEALTH_VERSION,
				providers: {
					qwencloud: {
						a: {
							state: "probe",
							observedAt: baseNow,
							failureCount: 2,
							retryAt: baseNow + 60_000,
							reason: "quota",
						},
					},
				},
			}),
		).toThrow(/probeOwner/);
	});

	test("exhaustion reports request and alternate scopes with state counts", () => {
		const ledger = new ProviderKeyHealthLedger(tempDir(), {
			now: () => baseNow,
		});
		ledger.recordFailure(
			"qwencloud",
			"timed",
			diagnosis("quota-exhausted", "quota"),
		);
		ledger.recordFailure(
			"qwencloud",
			"invalid",
			diagnosis("auth-invalid", "auth"),
		);
		try {
			ledger.claimFirst("qwencloud", [], ["timed", "invalid"], "request");
			throw new Error("expected exhaustion");
		} catch (error) {
			const exhausted = error as AllProviderKeysExhaustedError;
			expect(exhausted.scope).toBe("request");
			expect(exhausted.summary).toEqual({
				timed: 1,
				authInvalid: 1,
				unknown: 0,
				healthy: 0,
			});
			expect(exhausted.message).toContain("No request-eligible");
			expect(exhausted.message).toContain(
				"Replace or explicitly reset auth-invalid",
			);
		}
		try {
			ledger.claimFirst("qwencloud", [], ["timed"], "alternate");
			throw new Error("expected exhaustion");
		} catch (error) {
			expect((error as AllProviderKeysExhaustedError).message).toContain(
				"No eligible alternate",
			);
		}
	});
});
