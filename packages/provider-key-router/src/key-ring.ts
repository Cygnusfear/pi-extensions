import type { ProviderErrorMeta, ProviderKeyFailureDiagnosis, ProviderKeyFailureKind, ResolvedKey } from "./types.ts";

/**
 * Sticky-success, bounded-failover state for one provider.
 *
 * The active key remains selected after success. During one recovery episode,
 * each usable key is selected at most once. Exhaustion returns undefined rather
 * than cycling forever.
 */
export class KeyRingEpisode {
	private attempted = new Set<string>();
	private recoveryFollowUpState: "idle" | "queueing" | "queued" = "idle";
	private recoveryRunStartedWhileQueueing = false;

	constructor(
		private keys: ResolvedKey[],
		private activeKeyId: string | undefined,
	) {}

	get active(): ResolvedKey | undefined {
		return this.keys.find((key) => key.id === this.activeKeyId) ?? this.keys[0];
	}

	get attemptedKeyIds(): ReadonlySet<string> {
		return this.attempted;
	}

	replaceKeys(keys: ResolvedKey[], activeKeyId: string | undefined): void {
		this.keys = keys;
		this.activeKeyId = activeKeyId;
		this.reset();
	}

	/** Reset for a genuine new user turn. Keep state for our queued recovery turn. */
	beginAgentRun(): void {
		if (this.recoveryFollowUpState === "queued") {
			this.recoveryFollowUpState = "idle";
			return;
		}
		if (this.recoveryFollowUpState === "queueing") {
			this.recoveryRunStartedWhileQueueing = true;
			return;
		}
		this.reset();
	}

	beginRecoveryFollowUpQueue(): void {
		this.recoveryFollowUpState = "queueing";
		this.recoveryRunStartedWhileQueueing = false;
	}

	commitRecoveryFollowUpQueue(): void {
		if (this.recoveryFollowUpState !== "queueing") return;
		this.recoveryFollowUpState = this.recoveryRunStartedWhileQueueing ? "idle" : "queued";
		this.recoveryRunStartedWhileQueueing = false;
	}

	rollbackRecoveryFollowUpQueue(): void {
		const runStarted = this.recoveryRunStartedWhileQueueing;
		this.recoveryFollowUpState = "idle";
		this.recoveryRunStartedWhileQueueing = false;
		if (runStarted) this.attempted.clear();
	}

	markRecoveryFollowUpQueued(): void {
		this.beginRecoveryFollowUpQueue();
		this.commitRecoveryFollowUpQueue();
	}

	markSuccess(): void {
		this.reset();
	}

	manualNext(): ResolvedKey | undefined {
		if (this.keys.length === 0) return undefined;
		const active = this.active;
		const activeIndex = active ? this.keys.findIndex((key) => key.id === active.id) : -1;
		const next = this.keys[(activeIndex + 1 + this.keys.length) % this.keys.length];
		this.activeKeyId = next.id;
		this.reset();
		return next;
	}

	failureCandidateIds(): string[] {
		if (this.keys.length < 2) return [];
		const active = this.active;
		if (active) this.attempted.add(active.id);
		const activeIndex = active ? this.keys.findIndex((key) => key.id === active.id) : -1;
		const candidates: string[] = [];
		for (let offset = 1; offset <= this.keys.length; offset++) {
			const candidate = this.keys[(activeIndex + offset + this.keys.length) % this.keys.length];
			if (!this.attempted.has(candidate.id)) candidates.push(candidate.id);
		}
		return candidates;
	}

	selectForFailure(keyId: string): ResolvedKey | undefined {
		const key = this.keys.find((candidate) => candidate.id === keyId);
		if (!key || this.attempted.has(keyId)) return undefined;
		this.attempted.add(keyId);
		this.activeKeyId = keyId;
		return key;
	}

	nextForFailure(): ResolvedKey | undefined {
		const [candidateId] = this.failureCandidateIds();
		return candidateId ? this.selectForFailure(candidateId) : undefined;
	}

	private reset(): void {
		this.attempted.clear();
		this.recoveryFollowUpState = "idle";
		this.recoveryRunStartedWhileQueueing = false;
	}
}

/** Classify only failures where another subscription/key can change the result. */
export function diagnoseProviderKeyFailure(
	errorMessage: string | undefined,
	providerError?: ProviderErrorMeta,
): ProviderKeyFailureDiagnosis | undefined {
	const text = `${errorMessage ?? ""} ${providerError?.errorType ?? ""}`.toLowerCase();
	const status = providerError?.status;
	const weekly = /\bweekly\b|\bweek(?:ly)?\s+(?:usage\s+)?limit|limit[^\n]*\bweek/.test(text);
	const quota =
		status === 402 ||
		(status === 403 && /\bquota\b|limit|allocation/.test(text)) ||
		/free.?tier.?only|allocationquota|insufficient[_ -]?quota|insufficient credits?|credit balance/.test(text) ||
		/usage limit reached|plan limit|account limit|quota (?:exceeded|exhausted)|limit exhausted|out of budget/.test(text) ||
		/\b(?:daily|weekly|monthly)\b[^\n]*(?:quota|limit)|(?:quota|limit)[^\n]*\b(?:day|week|month)/.test(text);
	if (quota) return { kind: "quota-exhausted", reason: weekly ? "weekly-quota" : "quota" };

	const auth =
		status === 401 ||
		status === 403 ||
		/\b(?:401|403)\b/.test(text) ||
		/invalid[_ -]?api[_ -]?key|incorrect api key|unauthori[sz]ed|forbidden/.test(text);
	if (auth) return { kind: "auth-invalid", reason: "auth" };

	if (status === 429 || /\b429\b|rate.?limit|too many requests|throttl|tpm limit/.test(text)) {
		return { kind: "cooldown", reason: "rate-limit" };
	}
	return undefined;
}

export function classifyProviderKeyFailure(
	errorMessage: string | undefined,
	providerError?: ProviderErrorMeta,
): ProviderKeyFailureKind {
	const diagnosis = diagnoseProviderKeyFailure(errorMessage, providerError);
	if (!diagnosis) return "none";
	return diagnosis.kind === "cooldown" ? "retryable-limit" : "hard-key-limit";
}
