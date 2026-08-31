export const PROVIDER_KEY_STORE_VERSION = 1 as const;

export interface StoredKeySource {
	/** Stable identity derived from the source, never from its array position. */
	id: string;
	/** Literal key, $ENV reference, or !command. */
	source: string;
	label?: string;
}

export interface StoredProviderKeyRing {
	label: string;
	/** All Pi provider IDs that share this subscription pool. */
	providerIds: string[];
	/** Slash-command prefix, e.g. "qwen" -> /qwen-keys. */
	command: string;
	keys: StoredKeySource[];
	activeKeyId?: string;
	autoRotate: boolean;
}

export interface ProviderKeyStore {
	version: typeof PROVIDER_KEY_STORE_VERSION;
	providers: Record<string, StoredProviderKeyRing>;
}

export interface ProviderDefinition {
	id: string;
	label: string;
	providerIds: string[];
	command: string;
	envVar: string;
	legacyFile?: string;
}

export interface ResolvedKey {
	id: string;
	source: string;
	secret: string;
	label?: string;
}

export interface LoadedProviderKeyStore {
	path: string;
	store: ProviderKeyStore;
	/** Legacy files imported and removed after the unified store was saved. */
	migratedLegacyFiles: string[];
}

export interface ProviderErrorMeta {
	status?: number;
	headers?: Record<string, string>;
	errorType?: string | null;
}

export type ProviderKeyFailureKind = "none" | "retryable-limit" | "hard-key-limit";

export type ProviderKeyHealthFailureKind = "cooldown" | "quota-exhausted" | "auth-invalid";

export interface ProviderKeyFailureDiagnosis {
	kind: ProviderKeyHealthFailureKind;
	reason: "rate-limit" | "quota" | "weekly-quota" | "auth";
}
