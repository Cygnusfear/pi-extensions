/**
 * Shared Foresight CLI configuration.
 *
 * All modules that spawn `foresight` CLI processes import from here
 * to ensure consistent env vars (DB, LLM, embeddings).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const FORESIGHT_BIN = process.env.FORESIGHT_BIN || "foresight";

const LOCAL_DEV_DB_URL = "postgresql://foresight:foresight_dev@localhost:5432/foresight";
const RENDERED_ENV_PATH = "/run/secrets/rendered/foresight-env";
const INTERESTING_KEYS = new Set([
	"MEMORY_DATABASE_URL",
	"FORESIGHT_SESSION_CURSOR_DIR",
	"OPENROUTER_API_KEY",
	"FORESIGHT_LLM_API_KEY",
	"FORESIGHT_LLM_PROVIDER",
	"FORESIGHT_LLM_BASE_URL",
	"FORESIGHT_LLM_MODEL",
	"FORESIGHT_EMBEDDINGS_PROVIDER",
	"FORESIGHT_RERANKER_PROVIDER",
	"RUST_LOG",
]);

type EnvSource = Record<string, string | undefined>;

function normalizeForesightEnv(env: EnvSource): Record<string, string> {
	const normalized: Record<string, string> = {};

	for (const [key, value] of Object.entries(env)) {
		if (value) normalized[key] = value;
	}

	if (!normalized.MEMORY_DATABASE_URL && normalized.DATABASE_URL) {
		normalized.MEMORY_DATABASE_URL = normalized.DATABASE_URL;
	}

	if (!normalized.DATABASE_URL && normalized.MEMORY_DATABASE_URL) {
		normalized.DATABASE_URL = normalized.MEMORY_DATABASE_URL;
	}

	if (!normalized.FORESIGHT_LLM_API_KEY && normalized.OPENROUTER_API_KEY) {
		normalized.FORESIGHT_LLM_API_KEY = normalized.OPENROUTER_API_KEY;
	}

	return normalized;
}

function parseEnvLines(raw: string): Record<string, string> {
	const parsed: Record<string, string> = {};

	for (const line of raw.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eq = trimmed.indexOf("=");
		if (eq <= 0) continue;

		parsed[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
	}

	return parsed;
}

function parseEnv0(raw: string): Record<string, string> {
	const parsed: Record<string, string> = {};

	for (const entry of raw.split("\0")) {
		if (!entry) continue;
		const eq = entry.indexOf("=");
		if (eq <= 0) continue;
		parsed[entry.slice(0, eq)] = entry.slice(eq + 1);
	}

	return parsed;
}

function pickRelevantEnv(env: EnvSource): Record<string, string> {
	const picked: Record<string, string> = {};

	for (const [key, value] of Object.entries(env)) {
		if (value && INTERESTING_KEYS.has(key)) picked[key] = value;
	}

	return normalizeForesightEnv(picked);
}

function readRenderedEnv(): Record<string, string> {
	if (!existsSync(RENDERED_ENV_PATH)) return {};
	return pickRelevantEnv(parseEnvLines(readFileSync(RENDERED_ENV_PATH, "utf8")));
}

function deriveMemoryDatabaseUrl(env: EnvSource): string | undefined {
	const password = env.MEMORY_DATABASE_PASSWORD;
	if (!password) return undefined;

	const host = env.MEMORY_DATABASE_HOST || "localhost";
	const port = env.MEMORY_DATABASE_PORT || "5432";
	const dbName = env.MEMORY_DATABASE_NAME || "foresight";
	const user = env.MEMORY_DATABASE_USER || "foresight";

	return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}

function readInfraSecretsCache(): Record<string, string> {
	const infraRepo = process.env.INFRA_REPO || path.join(os.homedir(), "Projects", "infra");
	const cachePath = path.join(infraRepo, ".tmp", "env-secrets");
	if (!existsSync(cachePath)) return {};

	const parsed = parseEnvLines(readFileSync(cachePath, "utf8"));
	const derivedUrl = parsed.MEMORY_DATABASE_URL || deriveMemoryDatabaseUrl(parsed);
	return pickRelevantEnv({
		...parsed,
		MEMORY_DATABASE_URL: derivedUrl,
	});
}

function loadInfraEnv(): Record<string, string> {
	const infraRepo = process.env.INFRA_REPO || path.join(os.homedir(), "Projects", "infra");
	const loadEnvPath = path.join(infraRepo, "scripts", "load-env.sh");
	if (!existsSync(loadEnvPath)) return {};

	const result = spawnSync(
		"bash",
		["-lc", 'set -euo pipefail; source "$1" >/dev/null; env -0', "bash", loadEnvPath],
		{ encoding: "utf8" },
	);

	if (result.status !== 0) return {};
	return pickRelevantEnv(parseEnv0(result.stdout));
}

function needsFallbackEnv(env: EnvSource): boolean {
	return (!env.MEMORY_DATABASE_URL && !env.DATABASE_URL)
		|| (!env.FORESIGHT_LLM_API_KEY && !env.OPENROUTER_API_KEY);
}

function resolveInfraForesightEnv(): Record<string, string> {
	const rendered = readRenderedEnv();
	if (rendered.MEMORY_DATABASE_URL && rendered.FORESIGHT_LLM_API_KEY) return rendered;

	return normalizeForesightEnv({
		...readInfraSecretsCache(),
		...loadInfraEnv(),
		...rendered,
	});
}

export function createForesightEnv(env: EnvSource, fallbackEnv?: EnvSource): Record<string, string> {
	const resolvedFallback = normalizeForesightEnv(
		fallbackEnv ?? (needsFallbackEnv(env) ? resolveInfraForesightEnv() : {}),
	);
	const llmApiKey =
		env.FORESIGHT_LLM_API_KEY ||
		env.OPENROUTER_API_KEY ||
		resolvedFallback.FORESIGHT_LLM_API_KEY ||
		resolvedFallback.OPENROUTER_API_KEY ||
		"";
	const databaseUrl =
		env.MEMORY_DATABASE_URL ||
		env.DATABASE_URL ||
		resolvedFallback.MEMORY_DATABASE_URL ||
		resolvedFallback.DATABASE_URL ||
		LOCAL_DEV_DB_URL;

	return {
		MEMORY_DATABASE_URL: databaseUrl,
		DATABASE_URL: databaseUrl,
		...(env.FORESIGHT_SESSION_CURSOR_DIR || resolvedFallback.FORESIGHT_SESSION_CURSOR_DIR
			? { FORESIGHT_SESSION_CURSOR_DIR: env.FORESIGHT_SESSION_CURSOR_DIR || resolvedFallback.FORESIGHT_SESSION_CURSOR_DIR || "" }
			: {}),
		FORESIGHT_LLM_PROVIDER: env.FORESIGHT_LLM_PROVIDER || resolvedFallback.FORESIGHT_LLM_PROVIDER || "openai",
		FORESIGHT_LLM_API_KEY: llmApiKey,
		FORESIGHT_LLM_BASE_URL: env.FORESIGHT_LLM_BASE_URL || resolvedFallback.FORESIGHT_LLM_BASE_URL || "https://openrouter.ai/api/v1",
		FORESIGHT_LLM_MODEL: env.FORESIGHT_LLM_MODEL || resolvedFallback.FORESIGHT_LLM_MODEL || "openai/gpt-4o-mini",
		FORESIGHT_EMBEDDINGS_PROVIDER: env.FORESIGHT_EMBEDDINGS_PROVIDER || resolvedFallback.FORESIGHT_EMBEDDINGS_PROVIDER || "local",
		FORESIGHT_RERANKER_PROVIDER: env.FORESIGHT_RERANKER_PROVIDER || resolvedFallback.FORESIGHT_RERANKER_PROVIDER || "rrf",
		RUST_LOG: env.RUST_LOG || resolvedFallback.RUST_LOG || "error",
	};
}

export const FS_ENV: Record<string, string> = createForesightEnv(process.env);

/**
 * Check at load time whether the foresight binary is actually resolvable.
 * Used by spawn sites to bail early instead of crashing on ENOENT.
 */
function checkBinaryExists(bin: string): boolean {
	try {
		const result = spawnSync("which", [bin], { encoding: "utf8", timeout: 2000 });
		return result.status === 0 && result.stdout.trim().length > 0;
	} catch {
		return false;
	}
}

export const FORESIGHT_BIN_EXISTS: boolean = checkBinaryExists(FORESIGHT_BIN);
