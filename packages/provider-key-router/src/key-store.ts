import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	type LoadedProviderKeyStore,
	PROVIDER_KEY_STORE_VERSION,
	type ProviderDefinition,
	type ProviderKeyStore,
	type ResolvedKey,
	type StoredKeySource,
	type StoredProviderKeyRing,
} from "./types.ts";

export const PROVIDER_KEY_STORE_FILE = "provider-keys.json";

interface LegacyKeyConfig {
	keys?: unknown;
	activeIndex?: unknown;
	autoRotate?: unknown;
}

export type CommandResolver = (command: string) => string;

export function keySourceId(source: string): string {
	return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export function redactKey(key: string | undefined): string {
	if (!key || key.length <= 12) return "***";
	return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function assertStringArray(
	value: unknown,
	field: string,
): asserts value is string[] {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some((item) => typeof item !== "string" || !item)
	) {
		throw new Error(`${field} must be a non-empty string array`);
	}
}

function parseKeySource(value: unknown, field: string): StoredKeySource {
	if (!value || typeof value !== "object")
		throw new Error(`${field} must be an object`);
	const record = value as Record<string, unknown>;
	if (typeof record.source !== "string" || !record.source)
		throw new Error(`${field}.source must be a non-empty string`);
	if (typeof record.id !== "string" || !record.id)
		throw new Error(`${field}.id must be a non-empty string`);
	if (record.label !== undefined && typeof record.label !== "string")
		throw new Error(`${field}.label must be a string`);
	const label =
		typeof record.label === "string" && record.label ? record.label : undefined;
	return { id: record.id, source: record.source, ...(label ? { label } : {}) };
}

function parseProviderRing(
	value: unknown,
	field: string,
): StoredProviderKeyRing {
	if (!value || typeof value !== "object")
		throw new Error(`${field} must be an object`);
	const record = value as Record<string, unknown>;
	if (typeof record.label !== "string" || !record.label)
		throw new Error(`${field}.label must be a non-empty string`);
	assertStringArray(record.providerIds, `${field}.providerIds`);
	if (
		(record.providerIds as string[]).some(
			(id) => !/^[a-z0-9][a-z0-9._-]*$/.test(id),
		)
	) {
		throw new Error(`${field}.providerIds contains an invalid provider ID`);
	}
	if (
		typeof record.command !== "string" ||
		!/^[a-z0-9][a-z0-9-]*$/.test(record.command)
	) {
		throw new Error(`${field}.command must be a slash-command-safe name`);
	}
	if (!Array.isArray(record.keys))
		throw new Error(`${field}.keys must be an array`);
	const keys = record.keys.map((key, index) =>
		parseKeySource(key, `${field}.keys[${index}]`),
	);
	if (new Set(keys.map((key) => key.id)).size !== keys.length)
		throw new Error(`${field}.keys contains duplicate IDs`);
	if (
		record.activeKeyId !== undefined &&
		typeof record.activeKeyId !== "string"
	) {
		throw new Error(`${field}.activeKeyId must be a string`);
	}
	if (
		typeof record.activeKeyId === "string" &&
		!keys.some((key) => key.id === record.activeKeyId)
	) {
		throw new Error(`${field}.activeKeyId must reference a configured key ID`);
	}
	const activeKeyId =
		typeof record.activeKeyId === "string" && record.activeKeyId
			? record.activeKeyId
			: undefined;
	if (typeof record.autoRotate !== "boolean")
		throw new Error(`${field}.autoRotate must be a boolean`);
	return {
		label: record.label,
		providerIds: [...record.providerIds],
		command: record.command,
		keys,
		...(activeKeyId ? { activeKeyId } : {}),
		autoRotate: record.autoRotate,
	};
}

export function parseProviderKeyStore(raw: string): ProviderKeyStore {
	const value = JSON.parse(raw) as unknown;
	if (!value || typeof value !== "object")
		throw new Error("provider key store must be an object");
	const record = value as Record<string, unknown>;
	if (record.version !== PROVIDER_KEY_STORE_VERSION) {
		throw new Error(
			`unsupported provider key store version: ${String(record.version)}`,
		);
	}
	if (
		!record.providers ||
		typeof record.providers !== "object" ||
		Array.isArray(record.providers)
	) {
		throw new Error("provider key store providers must be an object");
	}
	const providers: Record<string, StoredProviderKeyRing> = {};
	const commands = new Set<string>();
	const providerIds = new Set<string>();
	for (const [id, provider] of Object.entries(
		record.providers as Record<string, unknown>,
	)) {
		if (!/^[a-z0-9][a-z0-9._-]*$/.test(id))
			throw new Error(`invalid logical provider ID: ${id}`);
		const parsed = parseProviderRing(provider, `providers.${id}`);
		if (commands.has(parsed.command))
			throw new Error(`duplicate provider key command: ${parsed.command}`);
		commands.add(parsed.command);
		for (const providerId of parsed.providerIds) {
			if (providerIds.has(providerId))
				throw new Error(`duplicate routed provider ID: ${providerId}`);
			providerIds.add(providerId);
		}
		providers[id] = parsed;
	}
	return { version: PROVIDER_KEY_STORE_VERSION, providers };
}

export interface DurableFileOps {
	mkdir(dir: string): void;
	open(file: string, flags: string, mode?: number): number;
	write(fd: number, data: string): void;
	fsync(fd: number): void;
	close(fd: number): void;
	rename(from: string, to: string): void;
	unlink(file: string): void;
}

const NODE_DURABLE_FILE_OPS: DurableFileOps = {
	mkdir: (dir) => {
		fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	},
	open: (file, flags, mode) => fs.openSync(file, flags, mode),
	write: (fd, data) => fs.writeFileSync(fd, data, { encoding: "utf8" }),
	fsync: (fd) => fs.fsyncSync(fd),
	close: (fd) => fs.closeSync(fd),
	rename: (from, to) => fs.renameSync(from, to),
	unlink: (file) => fs.unlinkSync(file),
};

/** Publish a 0600 JSON file and fsync both its bytes and directory entry. */
export function writeJsonFileDurably(
	file: string,
	value: unknown,
	ops: DurableFileOps = NODE_DURABLE_FILE_OPS,
): void {
	const dir = path.dirname(file);
	ops.mkdir(dir);
	const temp = path.join(
		dir,
		`.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
	);
	let tempFd: number | undefined;
	let renamed = false;
	try {
		tempFd = ops.open(temp, "wx", 0o600);
		ops.write(tempFd, JSON.stringify(value, null, 2) + "\n");
		ops.fsync(tempFd);
		ops.close(tempFd);
		tempFd = undefined;
		ops.rename(temp, file);
		renamed = true;
		const dirFd = ops.open(dir, "r");
		try {
			ops.fsync(dirFd);
		} finally {
			ops.close(dirFd);
		}
	} finally {
		if (tempFd !== undefined) {
			try {
				ops.close(tempFd);
			} catch {
				/* preserve original failure */
			}
		}
		if (!renamed) {
			try {
				ops.unlink(temp);
			} catch {
				/* temp may not exist */
			}
		}
	}
}

export function saveProviderKeyStore(
	file: string,
	store: ProviderKeyStore,
	ops?: DurableFileOps,
): void {
	writeJsonFileDurably(file, store, ops);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function discoverEnvKeySources(
	envVar: string,
	env: NodeJS.ProcessEnv = process.env,
): StoredKeySource[] {
	const numbered = new RegExp(`^${escapeRegExp(envVar)}_\\d+$`);
	const names = Object.keys(env)
		.filter((name) => name === envVar || numbered.test(name))
		.sort((a, b) => {
			if (a === envVar) return -1;
			if (b === envVar) return 1;
			return (
				Number(a.slice(envVar.length + 1)) - Number(b.slice(envVar.length + 1))
			);
		});
	return names
		.filter((name) => Boolean(env[name]))
		.map((name) => ({
			id: keySourceId(`$${name}`),
			source: `$${name}`,
			label: name,
		}));
}

function fromLegacy(
	definition: ProviderDefinition,
	legacy: LegacyKeyConfig,
): StoredProviderKeyRing {
	const keys = Array.isArray(legacy.keys)
		? legacy.keys.filter(
				(key): key is string => typeof key === "string" && key.length > 0,
			)
		: [];
	const sources = keys.map((source) => ({ id: keySourceId(source), source }));
	const activeIndex =
		typeof legacy.activeIndex === "number" &&
		Number.isInteger(legacy.activeIndex) &&
		legacy.activeIndex >= 0
			? Math.min(legacy.activeIndex, Math.max(0, sources.length - 1))
			: 0;
	return {
		label: definition.label,
		providerIds: [...definition.providerIds],
		command: definition.command,
		keys: sources,
		...(sources[activeIndex] ? { activeKeyId: sources[activeIndex].id } : {}),
		autoRotate:
			typeof legacy.autoRotate === "boolean" ? legacy.autoRotate : true,
	};
}

function fromDefinition(
	definition: ProviderDefinition,
	env: NodeJS.ProcessEnv,
): StoredProviderKeyRing {
	const keys = discoverEnvKeySources(definition.envVar, env);
	return {
		label: definition.label,
		providerIds: [...definition.providerIds],
		command: definition.command,
		keys,
		...(keys[0] ? { activeKeyId: keys[0].id } : {}),
		autoRotate: true,
	};
}

function reconcileLegacyRing(
	canonical: StoredProviderKeyRing,
	legacy: StoredProviderKeyRing,
): StoredProviderKeyRing {
	const keys = [...canonical.keys];
	const seen = new Set(keys.map((key) => key.id));
	for (const key of legacy.keys) {
		if (seen.has(key.id)) continue;
		seen.add(key.id);
		keys.push(key);
	}
	const activeKeyId =
		canonical.activeKeyId && seen.has(canonical.activeKeyId)
			? canonical.activeKeyId
			: legacy.activeKeyId && seen.has(legacy.activeKeyId)
				? legacy.activeKeyId
				: keys[0]?.id;
	return {
		...canonical,
		keys,
		...(activeKeyId ? { activeKeyId } : {}),
	};
}

export function loadProviderKeyStore(options: {
	agentDir: string;
	definitions: ProviderDefinition[];
	env?: NodeJS.ProcessEnv;
	fileOps?: DurableFileOps;
}): LoadedProviderKeyStore {
	const file = path.join(options.agentDir, PROVIDER_KEY_STORE_FILE);
	const env = options.env ?? process.env;
	let store: ProviderKeyStore;
	let changed = false;
	const migratedLegacyFiles: string[] = [];

	if (fs.existsSync(file)) {
		store = parseProviderKeyStore(fs.readFileSync(file, "utf8"));
	} else {
		store = { version: PROVIDER_KEY_STORE_VERSION, providers: {} };
		changed = true;
	}

	for (const definition of options.definitions) {
		const legacyFile = definition.legacyFile
			? path.join(options.agentDir, definition.legacyFile)
			: undefined;
		const canonical = store.providers[definition.id];
		if (legacyFile && fs.existsSync(legacyFile)) {
			const legacyValue = JSON.parse(
				fs.readFileSync(legacyFile, "utf8"),
			) as LegacyKeyConfig;
			const legacy = fromLegacy(definition, legacyValue);
			store.providers[definition.id] = canonical
				? reconcileLegacyRing(canonical, legacy)
				: legacy;
			migratedLegacyFiles.push(legacyFile);
			changed = true;
		} else if (!canonical) {
			store.providers[definition.id] = fromDefinition(definition, env);
			changed = true;
		}
	}

	if (changed) {
		store = parseProviderKeyStore(JSON.stringify(store));
		saveProviderKeyStore(file, store, options.fileOps);
	}
	for (const legacyFile of migratedLegacyFiles) fs.unlinkSync(legacyFile);
	return { path: file, store, migratedLegacyFiles };
}

function interpolateEnvironment(
	source: string,
	env: NodeJS.ProcessEnv,
): string {
	const DOLLAR = "\u0000DOLLAR\u0000";
	const BANG = "\u0000BANG\u0000";
	return source
		.replaceAll("$$", DOLLAR)
		.replaceAll("$!", BANG)
		.replace(
			/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
			(_match, braced, plain) => {
				const name = braced ?? plain;
				const value = env[name];
				if (value === undefined)
					throw new Error(`environment variable ${name} is not set`);
				return value;
			},
		)
		.replaceAll(DOLLAR, "$")
		.replaceAll(BANG, "!");
}

export function resolveKeySource(
	source: StoredKeySource,
	options: { env?: NodeJS.ProcessEnv; runCommand?: CommandResolver } = {},
): ResolvedKey {
	const env = options.env ?? process.env;
	const runCommand =
		options.runCommand ??
		((command) =>
			execSync(command, {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			}));
	const secret = source.source.startsWith("!")
		? runCommand(source.source.slice(1)).trim()
		: interpolateEnvironment(source.source, env).trim();
	if (!secret)
		throw new Error(`key source ${source.id} resolved to an empty value`);
	return {
		id: source.id,
		source: source.source,
		secret,
		...(source.label ? { label: source.label } : {}),
	};
}

export function resolveProviderKeys(
	ring: StoredProviderKeyRing,
	options: { env?: NodeJS.ProcessEnv; runCommand?: CommandResolver } = {},
): { keys: ResolvedKey[]; errors: Array<{ id: string; message: string }> } {
	const keys: ResolvedKey[] = [];
	const errors: Array<{ id: string; message: string }> = [];
	const seenSecrets = new Set<string>();
	for (const source of ring.keys) {
		try {
			const key = resolveKeySource(source, options);
			if (seenSecrets.has(key.secret)) continue;
			seenSecrets.add(key.secret);
			keys.push(key);
		} catch {
			errors.push({
				id: source.id,
				message: "Key source is unavailable",
			});
		}
	}
	return { keys, errors };
}
