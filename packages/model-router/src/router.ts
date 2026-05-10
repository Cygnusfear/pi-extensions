/**
 * model-router — resolves role → concrete model IDs at call time.
 *
 * Three concerns, one resolver:
 *   1. Ordered preference list from team-templates.json (literal IDs, no family magic)
 *   2. Availability filter (API key configured)
 *   3. Liveness filter (unhealthy models with unexpired TTL)
 *
 * The router never reorders. It only filters and picks N from the front.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { AvailableModel, LivenessEntry, ResolveOptions, ResolveResult, ResolvedModel } from "./types.js";

// ── Liveness store ──────────────────────────────────────────────────────────

function getHome() { return process.env.HOME || os.homedir(); }
function getLivenessPath() { return path.join(getHome(), ".pi", "agent", "model-liveness.json"); }

interface LivenessStore {
	[key: string]: LivenessEntry;
}

function loadLiveness(): LivenessStore {
	try {
		const raw = fs.readFileSync(getLivenessPath(), "utf-8");
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

function saveLiveness(store: LivenessStore): void {
	// Prune expired entries before saving
	const now = Date.now();
	const cleaned: LivenessStore = {};
	for (const [key, entry] of Object.entries(store)) {
		const expiresAt = new Date(entry.markedAt).getTime() + entry.ttlSeconds * 1000;
		if (expiresAt > now) {
			cleaned[key] = entry;
		}
	}
	const livenessPath = getLivenessPath();
	fs.mkdirSync(path.dirname(livenessPath), { recursive: true });
	fs.writeFileSync(livenessPath, JSON.stringify(cleaned, null, 2) + "\n");
}

function isUnhealthy(store: LivenessStore, fullId: string): boolean {
	const entry = store[fullId.toLowerCase()];
	if (!entry) return false;
	const expiresAt = new Date(entry.markedAt).getTime() + entry.ttlSeconds * 1000;
	return Date.now() < expiresAt;
}

// ── Template loading ────────────────────────────────────────────────────────

function getTemplatesPath() { return path.join(getHome(), ".pi", "agent", "team-templates.json"); }

interface TemplateEntry {
	model?: string | string[];
	[key: string]: unknown;
}

function loadRoleModels(role: string): string[] | null {
	try {
		const raw = fs.readFileSync(getTemplatesPath(), "utf-8");
		const templates: Record<string, TemplateEntry> = JSON.parse(raw);
		const tmpl = templates[role];
		if (!tmpl || !tmpl.model) return null;
		if (Array.isArray(tmpl.model)) return tmpl.model;
		return [tmpl.model];
	} catch {
		return null;
	}
}

/** Get all defined roles and their model lists from team-templates.json. */
export function loadAllRoles(): Record<string, string[]> {
	try {
		const raw = fs.readFileSync(getTemplatesPath(), "utf-8");
		const templates: Record<string, TemplateEntry> = JSON.parse(raw);
		const out: Record<string, string[]> = {};
		for (const [name, tmpl] of Object.entries(templates)) {
			if (tmpl.model) {
				out[name] = Array.isArray(tmpl.model) ? tmpl.model : [tmpl.model];
			}
		}
		return out;
	} catch {
		return {};
	}
}

// ── Resolver ────────────────────────────────────────────────────────────────

function normalize(id: string): string {
	return id.toLowerCase();
}

function parseFullId(raw: string): { provider: string; modelId: string } | null {
	if (raw.includes("/")) {
		const idx = raw.indexOf("/");
		return { provider: raw.slice(0, idx), modelId: raw.slice(idx + 1) };
	}
	return null;
}

export interface ResolverContext {
	/** Models with configured API keys. */
	getAvailable(): AvailableModel[];
}

/**
 * Resolve N concrete model IDs for a role, filtered by availability and health.
 *
 * Algorithm:
 *   1. Load the role's literal ordered list from team-templates.json.
 *   2. For each entry, check if it's in getAvailable() (API key present).
 *   3. Check if it's in the liveness store with unexpired TTL.
 *   4. Walk in order; pick `count` entries, optionally deduping by provider.
 *   5. Return resolved + skipped lists.
 */
export function resolve(
	ctx: ResolverContext,
	options: ResolveOptions,
): ResolveResult {
	const { role, count = 1, dedupProviders = true } = options;

	const preferenceList = loadRoleModels(role);
	if (!preferenceList || preferenceList.length === 0) {
		return { resolved: [], skipped: [], role, count };
	}

	const available = ctx.getAvailable();
	const availableSet = new Set(
		available.map(m => normalize(`${m.provider}/${m.id}`)),
	);
	const availableBare = new Set(available.map(m => normalize(m.id)));

	const liveness = loadLiveness();

	const resolved: ResolvedModel[] = [];
	const skipped: ResolvedModel[] = [];
	const seenProviders = new Set<string>();

	for (const rawId of preferenceList) {
		const fullId = normalize(rawId);
		const parsed = parseFullId(fullId);

		// Check availability
		const isAvailable = availableSet.has(fullId) || (parsed && availableBare.has(parsed.modelId));
		if (!isAvailable) {
			skipped.push({
				id: rawId,
				provider: parsed?.provider ?? "?",
				modelId: parsed?.modelId ?? rawId,
				skipReason: "no_api_key",
			});
			continue;
		}

		// Check liveness
		if (isUnhealthy(liveness, fullId)) {
			const entry = liveness[fullId];
			skipped.push({
				id: rawId,
				provider: parsed?.provider ?? "?",
				modelId: parsed?.modelId ?? rawId,
				skipReason: `unhealthy: ${entry?.reason ?? "unknown"}`,
			});
			continue;
		}

		// DEI dedup
		const provider = parsed?.provider ?? "?";
		if (dedupProviders && seenProviders.has(provider)) {
			skipped.push({
				id: rawId,
				provider,
				modelId: parsed?.modelId ?? rawId,
				skipReason: "dedup_provider",
			});
			continue;
		}

		seenProviders.add(provider);
		resolved.push({
			id: rawId,
			provider,
			modelId: parsed?.modelId ?? rawId,
		});

		if (resolved.length >= count) break;
	}

	return { resolved, skipped, role, count };
}

// ── Liveness mutations ──────────────────────────────────────────────────────

export interface MarkUnhealthyOptions {
	/** Full "provider/model" ID. Case-insensitive. */
	id: string;
	/** Why it was marked unhealthy (e.g. "rate_limited", "auth_error"). */
	reason: string;
	/** Seconds until auto-expiry. Default: 1800 (30 min). */
	ttlSeconds?: number;
}

/** Mark a model as unhealthy. Auto-expires after ttlSeconds. */
export function markUnhealthy(opts: MarkUnhealthyOptions): LivenessEntry {
	const store = loadLiveness();
	const entry: LivenessEntry = {
		id: opts.id,
		reason: opts.reason,
		markedAt: new Date().toISOString(),
		ttlSeconds: opts.ttlSeconds ?? 1800,
	};
	store[opts.id.toLowerCase()] = entry;
	saveLiveness(store);
	return entry;
}

/** Remove a model from the unhealthy list (e.g. after a successful retry). */
export function markHealthy(id: string): boolean {
	const store = loadLiveness();
	const key = id.toLowerCase();
	if (!store[key]) return false;
	delete store[key];
	saveLiveness(store);
	return true;
}

/** Get all current liveness entries (excluding expired). */
export function getLiveness(): LivenessEntry[] {
	const store = loadLiveness();
	const now = Date.now();
	return Object.values(store).filter(e => {
		const expiresAt = new Date(e.markedAt).getTime() + e.ttlSeconds * 1000;
		return expiresAt > now;
	});
}

/** Clear all liveness entries. For debugging. */
export function clearLiveness(): void {
	saveLiveness({});
}