/**
 * Frontpage — compose editorial HTML frontpages from a structured spec.
 *
 * Registers three tools:
 *  - frontpage_create : { spec } -> writes HTML + creates mai artifact
 *  - frontpage_update : { slug, patch } -> edits HTML + logs mai note
 *  - frontpage_open   : { slug } -> OS open
 *
 * Storage:
 *  ~/.agent/frontpage/<slug>.html        — the page
 *  ~/.agent/frontpage/<slug>.meta.json   — spec + artifact ID sidecar (round-trip)
 */

import { spawn as nodeSpawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
	AgentToolResult,
	ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { type Static, Type } from "@sinclair/typebox";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { getStableNickname } from "@pi-extensions/shared/session-nickname";
import { getMaiBin } from "@pi-extensions/shared/mai-binary";
import {
	formatMermaidFinding,
	lintMermaid,
	type MermaidLintFinding,
} from "./mermaid-lint.js";
import {
	assignIds,
	type FrontpageSpec,
	reloadPartials,
	render,
	type SectionSpec,
} from "./render.js";

/**
 * Scan every mermaid section in the spec and collect lint findings.
 * Returns a flat array tagged with the originating section ID so the
 * agent can locate the problem.
 *
 * SOFT validation: findings are reported back to the agent in the tool
 * result text, but the write is NEVER blocked. The page is always
 * written; the agent sees the findings and can immediately follow up
 * with frontpage_update to fix them.
 */
function collectMermaidFindings(
	spec: FrontpageSpec,
): Array<{ sectionId: string; finding: MermaidLintFinding }> {
	const out: Array<{ sectionId: string; finding: MermaidLintFinding }> = [];
	for (const s of spec.sections) {
		if (s.type !== "mermaid") continue;
		const findings = lintMermaid(s.source);
		for (const f of findings) {
			out.push({ sectionId: s.id ?? "(no-id)", finding: f });
		}
	}
	return out;
}

/**
 * Format a findings list for the tool result text. Splits into ERROR
 * and WARN buckets so the agent's eye lands on the blocking-shape
 * issues first. Returns null if there are no findings (call sites use
 * this to skip the section entirely).
 */
function formatMermaidFindingsSection(
	findings: Array<{ sectionId: string; finding: MermaidLintFinding }>,
): string | null {
	if (findings.length === 0) return null;
	const errors = findings.filter((x) => x.finding.level === "error");
	const warnings = findings.filter((x) => x.finding.level === "warning");
	const parts: string[] = [];
	parts.push(
		`Mermaid lint: ${errors.length} error(s), ${warnings.length} warning(s) — page written, fix and re-run frontpage_update.`,
	);
	for (const e of errors)
		parts.push(formatMermaidFinding(e.sectionId, e.finding));
	for (const w of warnings)
		parts.push(formatMermaidFinding(w.sectionId, w.finding));
	return parts.join("\n");
}

// ---- storage paths ----
const STORE_DIR = path.join(os.homedir(), ".agent", "frontpage");
/**
 * Cap a PNG to Anthropic's image limits before it goes into a tool result.
 *
 * Extension tool-result images are NOT auto-resized by the harness (only the
 * built-in read tool + CLI attachments are), so frontpage_read must guarantee
 * the canvas PNG is within bounds itself — Anthropic rejects images over
 * 8000px or ~5MB base64, which would break the turn.
 *
 * Targets <=1800px long edge and <=4.5MB base64. The client already exports a
 * focused, ~1600px region, so this is normally a no-op pass-through; it only
 * acts if the image is somehow oversized (old bundle, huge drawing spread).
 * Uses macOS `sips` (no deps). NEVER upscales. Returns base64, or null if it
 * cannot be brought under budget — the caller then skips the image rather than
 * break the harness.
 */
export type FrontpageSpawn = typeof nodeSpawn;

export interface FrontpageDependencies {
	spawn: FrontpageSpawn;
	/**
	 * Absolute path to the mai binary. Optional — production resolves it
	 * lazily through the shared PATH-independent resolver; tests inject
	 * "mai" so recorded spawn calls stay deterministic.
	 */
	maiBin?: string;
}

async function capPngForApi(
	bytes: Buffer,
	spawnProcess: FrontpageSpawn,
): Promise<string | null> {
	const MAX_B64 = 4.5 * 1024 * 1024;
	const MAX_DIM = 1800;
	const b64Len = (rawBytes: number) => Math.ceil(rawBytes / 3) * 4;

	const tmp = path.join(
		os.tmpdir(),
		`fp-canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
	);
	const sipsResize = (file: string, dim: number) =>
		new Promise<void>((res) => {
			const p = spawnProcess("sips", ["-Z", String(dim), file], {
				stdio: "ignore",
			});
			p.on("close", () => res());
			p.on("error", () => res());
		});
	const sipsDims = (file: string) =>
		new Promise<{ w: number; h: number } | null>((res) => {
			const p = spawnProcess(
				"sips",
				["-g", "pixelWidth", "-g", "pixelHeight", file],
				{ stdio: ["ignore", "pipe", "ignore"] },
			);
			let out = "";
			p.stdout?.on("data", (d) => {
				out += d.toString();
			});
			p.on("close", () => {
				const w = /pixelWidth:\s*(\d+)/.exec(out)?.[1];
				const h = /pixelHeight:\s*(\d+)/.exec(out)?.[1];
				res(w && h ? { w: Number(w), h: Number(h) } : null);
			});
			p.on("error", () => res(null));
		});

	try {
		await fsp.writeFile(tmp, bytes);
		const dims = await sipsDims(tmp);
		const maxDim = dims ? Math.max(dims.w, dims.h) : 0;

		// Already safe → pass through (no upscaling, no recompression).
		if (maxDim > 0 && maxDim <= MAX_DIM && b64Len(bytes.length) <= MAX_B64) {
			return bytes.toString("base64");
		}

		let dim = maxDim > 0 ? Math.min(MAX_DIM, maxDim) : MAX_DIM;
		await sipsResize(tmp, dim);
		let out = await fsp.readFile(tmp);
		let guard = 0;
		while (b64Len(out.length) > MAX_B64 && dim > 600 && guard++ < 6) {
			dim = Math.floor(dim * 0.8);
			await sipsResize(tmp, dim);
			out = await fsp.readFile(tmp);
		}
		if (b64Len(out.length) > MAX_B64) return null;
		return out.toString("base64");
	} catch {
		// sips unavailable/failed — return original only if already within budget.
		return b64Len(bytes.length) <= MAX_B64 ? bytes.toString("base64") : null;
	} finally {
		fsp.unlink(tmp).catch(() => {});
	}
}

function pagePath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.html`);
}
function metaPath(slug: string): string {
	return path.join(STORE_DIR, `${slug}.meta.json`);
}

async function ensureStoreDir(): Promise<void> {
	await fsp.mkdir(STORE_DIR, { recursive: true });
}

export interface Meta {
	slug: string;
	artifactId?: string;
	createdAt: number;
	updatedAt: number;
	spec: FrontpageSpec;
}

async function readMeta(slug: string): Promise<Meta | null> {
	try {
		const raw = await fsp.readFile(metaPath(slug), "utf8");
		return JSON.parse(raw) as Meta;
	} catch {
		return null;
	}
}

async function writeMeta(meta: Meta): Promise<void> {
	await fsp.writeFile(
		metaPath(meta.slug),
		JSON.stringify(meta, null, 2),
		"utf8",
	);
}

// ---- mai shelling ----

/**
 * Resolve the mai binary. Prefers an injected path (tests); production goes
 * through the shared resolver so the spawn does not depend on PATH at spawn
 * time. Returns an error instead of throwing — callers report it in the tool
 * result rather than losing the artifact behind a wrong label.
 */
function resolveMaiBin(
	dependencies: FrontpageDependencies,
): { bin: string } | { error: string } {
	if (dependencies.maiBin) return { bin: dependencies.maiBin };
	try {
		return { bin: getMaiBin() };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) };
	}
}

interface MaiRun {
	stdout: string;
	stderr: string;
	code: number;
}

function runMai(
	spawnProcess: FrontpageSpawn,
	bin: string,
	args: string[],
	opts: { input?: string; cwd?: string } = {},
): Promise<MaiRun> {
	return new Promise((resolve) => {
		const proc = spawnProcess(bin, args, {
			stdio: ["pipe", "pipe", "pipe"],
			...(opts.cwd ? { cwd: opts.cwd } : {}),
		});
		let stdout = "",
			stderr = "";
		proc.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		proc.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		proc.on("error", (e) => {
			resolve({ stdout, stderr: stderr + String(e), code: -1 });
		});
		proc.on("close", (code) => {
			resolve({ stdout, stderr, code: code ?? -1 });
		});
		if (opts.input) {
			proc.stdin.write(opts.input);
			proc.stdin.end();
		} else {
			proc.stdin.end();
		}
	});
}

/** Format a non-zero mai exit as EVIDENCE: exit code + captured stderr. */
function maiFailure(action: string, run: MaiRun, cwd: string): string {
	const detail = (
		run.stderr.trim() ||
		run.stdout.trim() ||
		"(no output)"
	).replace(/\s+/g, " ");
	return `mai ${action} failed (exit ${run.code}) in cwd=${cwd}: ${detail}`;
}

// Extract "Created <id>" from mai artifact create output.
function extractArtifactId(out: string): string | undefined {
	const m = out.match(/\b([a-z]+-[a-z0-9]+)\b/);
	return m?.[1];
}

interface ArtifactResult {
	artifactId?: string;
	error?: string;
	cwd: string;
}

async function createArtifact(
	dependencies: FrontpageDependencies,
	spec: FrontpageSpec,
	htmlPath: string,
	cwd: string,
): Promise<ArtifactResult> {
	const resolved = resolveMaiBin(dependencies);
	if ("error" in resolved) return { error: resolved.error, cwd };
	const desc = spec.description ?? spec.thesis.slice(0, 200);
	const run = await runMai(
		dependencies.spawn,
		resolved.bin,
		[
			"artifact",
			spec.title,
			"--target",
			htmlPath,
			"-l",
			"frontpage",
			"-d",
			desc,
		],
		{ cwd },
	);
	if (run.code !== 0)
		return { error: maiFailure("artifact create", run, cwd), cwd };
	const artifactId = extractArtifactId(run.stdout);
	if (!artifactId) {
		return {
			error: `mai artifact create exited 0 but printed no id (stdout: ${JSON.stringify(
				run.stdout.trim() || "(empty)",
			)})`,
			cwd,
		};
	}
	return { artifactId, cwd };
}

async function addNote(
	dependencies: FrontpageDependencies,
	artifactId: string,
	note: string,
	cwd: string,
): Promise<string | undefined> {
	const resolved = resolveMaiBin(dependencies);
	if ("error" in resolved) return resolved.error;
	const run = await runMai(
		dependencies.spawn,
		resolved.bin,
		["add-note", artifactId, note],
		{ cwd },
	);
	if (run.code !== 0) return maiFailure("add-note", run, cwd);
	return undefined;
}

// ---- artifact cwd ----

/**
 * Nearest git work-tree root at or above `start`, or undefined.
 * `.git` is a directory in a normal clone and a file in worktrees/submodules,
 * so existence is the right test. Mirrors how git walks up to find a repo.
 */
export function findGitRoot(start: string): string | undefined {
	let dir = path.resolve(start);
	for (;;) {
		if (fs.existsSync(path.join(dir, ".git"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

/**
 * Pick the working directory for mai.
 *
 * mai stores notes in a git repo's notes refs and HARD-FAILS when cwd is not
 * inside one ("mai: not a git repository (or any parent)", exit 1). Order:
 *   1. FRONTPAGE_MAI_CWD — explicit escape hatch for sessions started outside
 *      a repo (used as-is; a bad value surfaces as a spawn error).
 *   2. The git root of the pi session cwd — the project the page documents.
 *   3. The git root of the frontpage store, if that store ever becomes one.
 *   4. The session cwd itself — so a failure carries mai's real stderr
 *      instead of losing the artifact behind a wrong label.
 */
export function resolveMaiCwd(
	sessionCwd: string | undefined,
	env: NodeJS.ProcessEnv = process.env,
): string {
	const override = env.FRONTPAGE_MAI_CWD?.trim();
	if (override) return path.resolve(override);
	for (const candidate of [sessionCwd, STORE_DIR]) {
		if (!candidate) continue;
		const root = findGitRoot(candidate);
		if (root) return root;
	}
	return sessionCwd ?? process.cwd();
}

// ---- OS open ----
function osOpen(spawnProcess: FrontpageSpawn, file: string): Promise<void> {
	return new Promise((resolve) => {
		const bin =
			process.platform === "darwin"
				? "open"
				: process.platform === "win32"
					? "start"
					: "xdg-open";
		const proc = spawnProcess(bin, [file], { stdio: "ignore", detached: true });
		proc.on("error", () => resolve());
		proc.unref();
		resolve();
	});
}

// ---- Typebox schemas ----

const SectionCommon = {
	id: Type.Optional(
		Type.String({
			description: "Stable section ID (auto-assigned if omitted)",
		}),
	),
	label: Type.Optional(
		Type.String({
			description: "Small-caps metadata label, e.g. 'MEASURING VOLATILITY'",
		}),
	),
};

const LeadSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("lead"),
	text: Type.String(),
});
const ProseSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("prose"),
	body: Type.String({
		description: "Markdown (default) or HTML if format=html",
	}),
	format: Type.Optional(
		Type.Union([Type.Literal("markdown"), Type.Literal("html")]),
	),
});
const PullQuoteSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("pull-quote"),
	text: Type.String(),
	attribution: Type.Optional(Type.String()),
});
const CalloutSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("callout"),
	kind: Type.Optional(
		Type.Union([
			Type.Literal("warning"),
			Type.Literal("info"),
			Type.Literal("tip"),
		]),
	),
	body: Type.String({
		description: "HTML allowed; <strong>, <code>, <a> recommended",
	}),
});
const KpiGridSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("kpi-grid"),
	items: Type.Array(
		Type.Object({
			label: Type.String(),
			value: Type.String(),
			sub: Type.Optional(Type.String()),
			accent: Type.Optional(Type.Boolean()),
		}),
	),
});
const TableSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("table"),
	columns: Type.Array(
		Type.Object({
			key: Type.String(),
			title: Type.String(),
			align: Type.Optional(
				Type.Union([
					Type.Literal("left"),
					Type.Literal("right"),
					Type.Literal("center"),
				]),
			),
			mono: Type.Optional(Type.Boolean()),
		}),
	),
	rows: Type.Array(Type.Record(Type.String(), Type.String())),
	notes: Type.Optional(Type.String()),
});
const TimelineSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("timeline"),
	entries: Type.Array(
		Type.Object({
			phase: Type.String(),
			title: Type.String(),
			body: Type.String(),
		}),
	),
});
const CardGridSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("card-grid"),
	cards: Type.Array(
		Type.Object({
			title: Type.String(),
			body: Type.String(),
			depth: Type.Optional(
				Type.Union([
					Type.Literal("hero"),
					Type.Literal("default"),
					Type.Literal("recessed"),
				]),
			),
		}),
	),
});
const MermaidSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("mermaid"),
	source: Type.String({
		description: `Mermaid diagram source. ONE-SHOT RULES so it renders first try: (1) QUOTE every node AND edge label containing anything beyond letters/digits/spaces — node A["a/b (x)"], edge A -->|"spawn (x)"| B. Labels MUST use DOUBLE quotes — single quotes are NOT valid mermaid. Unquoted ( ) [ ] {} in any label is a hard parse error. (2) Line breaks = <br/>, never a literal newline escape. (3) No accidental self-loops (X-->X). (4) 6-digit hex in classDef. (5) explicit direction TD/LR. Sections are linted at write time.`,
	}),
	fontSize: Type.Optional(Type.Number()),
	initialZoom: Type.Optional(Type.Number()),
});
const D3Schema = Type.Object({
	...SectionCommon,
	type: Type.Literal("d3"),
	script: Type.String({
		description: "D3 body with access to: target (div), data, width, height",
	}),
	data: Type.Optional(Type.Unknown()),
	width: Type.Optional(Type.Number()),
	height: Type.Optional(Type.Number()),
});
const ChartJsSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("chartjs"),
	config: Type.Unknown({
		description: "Chart.js config object {type, data, options}",
	}),
	height: Type.Optional(Type.Number()),
});
const SvgSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("svg"),
	markup: Type.String(),
});
const AnnotationChartSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("annotation-chart"),
	data: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number() })),
	annotations: Type.Array(
		Type.Object({
			x: Type.Number(),
			y: Type.Number(),
			label: Type.String(),
			dx: Type.Optional(Type.Number()),
			dy: Type.Optional(Type.Number()),
		}),
	),
	width: Type.Optional(Type.Number()),
	height: Type.Optional(Type.Number()),
});
const RawHtmlSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("raw_html"),
	html: Type.String(),
});
const MarkdownTableSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("markdown_table"),
	body: Type.String({
		description:
			"Raw markdown table text: | col | col |\\n|---|---|\\n| val | val |",
	}),
	notes: Type.Optional(Type.String()),
});

const DecisionSchema = Type.Object({
	...SectionCommon,
	type: Type.Literal("decision"),
	prompt: Type.String({
		description: "The question for the hooman. Frame it as one clear ask.",
	}),
	options: Type.Optional(
		Type.Array(
			Type.Object({
				key: Type.String({
					description:
						"Short stable key, e.g. 'a' or 'navy' — what the answer reports back.",
				}),
				label: Type.String(),
				detail: Type.Optional(
					Type.String({ description: "One line of context under the label." }),
				),
				recommended: Type.Optional(
					Type.Boolean({ description: "Marks your recommended pick." }),
				),
			}),
			{
				description:
					"Choice cards (radio). Omit for a free-text-only question.",
			},
		),
	),
	allowText: Type.Optional(
		Type.Boolean({
			description:
				"Show a free-text answer field (with or instead of options).",
		}),
	),
});

const SectionSchema = Type.Union([
	LeadSchema,
	ProseSchema,
	PullQuoteSchema,
	CalloutSchema,
	KpiGridSchema,
	TableSchema,
	MarkdownTableSchema,
	TimelineSchema,
	CardGridSchema,
	MermaidSchema,
	D3Schema,
	ChartJsSchema,
	SvgSchema,
	AnnotationChartSchema,
	RawHtmlSchema,
	DecisionSchema,
]);

const SpecSchema = Type.Object({
	slug: Type.String({ description: "kebab-case, used as filename" }),
	title: Type.String(),
	thesis: Type.String({
		description: "The argument of the page in one sentence",
	}),
	palette: Type.Union([
		Type.Literal("crimson"),
		Type.Literal("navy"),
		Type.Literal("rust"),
		Type.Literal("teal"),
		Type.Literal("gold"),
	]),
	register: Type.Union([
		Type.Literal("nyt-editorial"),
		Type.Literal("working-newspaper"),
		Type.Literal("magazine-monograph"),
	]),
	description: Type.Optional(Type.String()),
	extra_head: Type.Optional(Type.String()),
	byline: Type.Optional(
		Type.String({
			description:
				"Author shown in byline. Auto-populated from the stable agent nickname (e.g. 'Gerard Stargate Freedman') when omitted. Sticky across updates.",
		}),
	),
	contributors: Type.Optional(
		Type.Array(Type.String(), {
			description:
				"Later editors. Auto-appended on update when a different agent edits.",
		}),
	),
	byline_date: Type.Optional(
		Type.String({
			description:
				"ISO-8601 timestamp shown beside the byline. Auto-populated on create/update.",
		}),
	),
	sections: Type.Array(SectionSchema),
});

// All "required" fields are typed as Optional in the schema so a malformed
// tool call (e.g. `frontpage_create({})`) does NOT trigger pi's framework
// validation reject path. That path can emit a tool_use block without a
// matching tool_result, which breaks the Anthropic API conversation chain
// with a 400 ("tool_use ids were found without tool_result blocks"). Instead
// we accept any shape, validate inside execute(), and always return a
// well-formed tool_result with isError when something is missing.
const CreateParams = Type.Object({
	spec: Type.Optional(SpecSchema),
	// Opt-IN open. Was opt-out (default true). Reason: agents who write a
	// frontpage often follow up with an explicit `frontpage_open` call —
	// an auto-open here makes the file open TWICE (two browser tabs, surprise
	// open). Default false so the agent's own instinct controls when the
	// file shows up in front of the hooman. Pass `{ open: true }` to keep the
	// old behavior in a single call.
	open: Type.Optional(
		Type.Boolean({
			description:
				"Open the file after writing (default false — call frontpage_open explicitly when you want the hooman to see it)",
		}),
	),
});

const PatchOp = Type.Union([
	Type.Object({
		op: Type.Literal("replace_section"),
		section_id: Type.String(),
		new_section: SectionSchema,
	}),
	Type.Object({
		op: Type.Literal("append_section"),
		new_section: SectionSchema,
	}),
	Type.Object({
		op: Type.Literal("remove_section"),
		section_id: Type.String(),
	}),
	Type.Object({
		op: Type.Literal("update_meta"),
		title: Type.Optional(Type.String()),
		thesis: Type.Optional(Type.String()),
		palette: Type.Optional(Type.String()),
		register: Type.Optional(Type.String()),
		byline: Type.Optional(Type.String()),
		contributors: Type.Optional(Type.Array(Type.String())),
	}),
]);

// Same defensive pattern as CreateParams — schema accepts anything, execute()
// validates and returns a proper tool_result on missing fields.
const UpdateParams = Type.Object({
	slug: Type.Optional(Type.String()),
	patch: Type.Optional(
		Type.Array(PatchOp, {
			description:
				'ARRAY of ops, never a string. Example: [{ "op": "replace_section", "section_id": "s3", "new_section": { "type": "prose", "body": "..." } }]. Ops: replace_section | append_section | remove_section | update_meta.',
		}),
	),
	note: Type.Optional(
		Type.String({ description: "Short summary of the change, logged to mai" }),
	),
	open: Type.Optional(Type.Boolean()),
});

const OpenParams = Type.Object({ slug: Type.Optional(Type.String()) });

// ---- Byline ----
// Author = creator (sticky). Contributors = anyone else who has edited.
// Auto-derived from the stable agent nickname so the hooman always knows
// who wrote any given frontpage, even without explicit attribution.
// Exported for unit testing.

export function applyBylineForCreate(
	spec: FrontpageSpec,
	existing: Meta | null,
): void {
	// Recreating an existing slug → preserve original byline + contributors.
	if (existing) {
		spec.byline = spec.byline ?? existing.spec.byline;
		spec.contributors = spec.contributors ?? existing.spec.contributors;
		applyBylineForUpdate(spec); // recreates are edits — track editor
		return;
	}
	if (!spec.byline) {
		const nick = getStableNickname();
		if (nick) spec.byline = nick;
	}
	spec.byline_date = new Date().toISOString();
}

export function applyBylineForUpdate(spec: FrontpageSpec): void {
	const nick = getStableNickname();
	spec.byline_date = new Date().toISOString();
	if (!nick) return;
	if (!spec.byline) {
		// Frontpage predates byline tracking — claim authorship for this update.
		spec.byline = nick;
		return;
	}
	if (nick === spec.byline) return;
	const existing = spec.contributors ?? [];
	if (existing.includes(nick)) return;
	spec.contributors = [...existing, nick];
}

// ---- Defensive parameter validation ----
// Pi's framework validation reject path can emit a tool_use without a matching
// tool_result, breaking the Anthropic API conversation chain. We accept any
// shape at the schema layer and validate here so the tool always returns a
// well-formed tool_result on bad inputs.

function missingParamError(
	toolName: string,
	fieldDescription: string,
	received: unknown,
): AgentToolResult<Record<string, unknown>> & { isError: true } {
	return {
		content: [
			{
				type: "text" as const,
				text: [
					`${toolName}: missing required parameter — ${fieldDescription}.`,
					`Received: ${JSON.stringify(received) || "(empty)"}`,
					toolName === "frontpage_create"
						? "Call shape: frontpage_create({ spec: { slug, title, thesis, palette, register, sections: [...] } })"
						: toolName === "frontpage_update"
							? "Call shape: frontpage_update({ slug, patch: [...], note })"
							: "Call shape: frontpage_open({ slug })",
				].join("\n"),
			},
		],
		isError: true,
		details: { error: `missing-parameter`, field: fieldDescription },
	};
}

// ---- Extension entry ----
// The Hono server runs as a CHILD PROCESS (spawned bun) because the compiled
// pi binary's extension loader uses jiti virtualModules and cannot resolve
// external packages (hono, react, tldraw) from extension code. The
// subprocess has its own module resolution and imports whatever it needs.

const FRONTPAGE_SERVER_PORT = 39288;
const FRONTPAGE_SERVER_HOST = "127.0.0.1";

interface ServerProcessState {
	child: ReturnType<FrontpageSpawn> | null;
	pid: number | null;
	startedAt: number | null;
	/** True when a peer (different pi process) owns the port. We didn't spawn
	 *  the subprocess but the server IS reachable. */
	peerDetected: boolean;
}
const serverState: ServerProcessState = {
	child: null,
	pid: null,
	startedAt: null,
	peerDetected: false,
};

function frontpageServerScript(): string {
	return path.resolve(__dirname, "..", "server-process", "server.ts");
}

function frontpageClientBundle(): string {
	return path.resolve(__dirname, "..", "dist-client", "bundle.js");
}

function frontpageBuildScript(): string {
	return path.resolve(__dirname, "..", "scripts", "build-client.ts");
}

async function ensureClientBundleBuilt(
	spawnProcess: FrontpageSpawn,
): Promise<void> {
	if (fs.existsSync(frontpageClientBundle())) return;
	const scriptPath = frontpageBuildScript();
	if (!fs.existsSync(scriptPath)) return;
	await new Promise<void>((resolve) => {
		const proc = spawnProcess("bun", ["run", scriptPath], { stdio: "ignore" });
		proc.on("error", () => resolve());
		proc.on("close", () => resolve());
	});
}

/** Probe the running server. Returns true if a healthy peer is on the port. */
async function probeServer(timeoutMs = 1500): Promise<boolean> {
	try {
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), timeoutMs);
		const resp = await fetch(
			`http://${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}/healthz`,
			{ signal: ctrl.signal },
		);
		clearTimeout(t);
		return resp.ok;
	} catch {
		return false;
	}
}

async function startFrontpageServer(
	spawnProcess: FrontpageSpawn,
): Promise<{ status: "started" | "peer-running" | "error"; message: string }> {
	// If a peer is already on the port (different pi process or our own
	// surviving subprocess from before reload), don't spawn — record that one
	// is reachable so frontpageServerInfo() reports running=true.
	if (await probeServer(800)) {
		serverState.peerDetected = true;
		return {
			status: "peer-running",
			message: `Frontpage server peer already on ${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}; not spawning.`,
		};
	}
	const script = frontpageServerScript();
	if (!fs.existsSync(script)) {
		return { status: "error", message: `Server script missing at ${script}` };
	}
	const child = spawnProcess("bun", ["run", script], {
		stdio: "ignore",
		detached: false,
		env: {
			...process.env,
			FRONTPAGE_PORT: String(FRONTPAGE_SERVER_PORT),
			FRONTPAGE_HOST: FRONTPAGE_SERVER_HOST,
		},
	});
	serverState.child = child;
	serverState.pid = child.pid ?? null;
	serverState.startedAt = Date.now();
	child.on("exit", () => {
		if (serverState.child === child) {
			serverState.child = null;
			serverState.pid = null;
		}
	});
	// Verify it actually booted
	for (let i = 0; i < 10; i++) {
		await new Promise((r) => setTimeout(r, 150));
		if (await probeServer(400)) {
			return {
				status: "started",
				message: `Frontpage server pid=${child.pid} on ${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}`,
			};
		}
	}
	return {
		status: "error",
		message: `Server child pid=${child.pid} did not become healthy within 1.5s`,
	};
}

async function stopFrontpageServer(): Promise<void> {
	const child = serverState.child;
	if (!child) return;
	try {
		child.kill("SIGTERM");
	} catch {}
	// wait up to 800ms for graceful exit, then SIGKILL
	await new Promise<void>((resolve) => {
		const onExit = () => resolve();
		child.once("exit", onExit);
		setTimeout(() => {
			try {
				child.kill("SIGKILL");
			} catch {}
			resolve();
		}, 800);
	});
	serverState.child = null;
	serverState.pid = null;
}

function frontpageServerInfo(): {
	running: boolean;
	port: number;
	host: string;
	pid: number | null;
} {
	return {
		running: serverState.pid !== null || serverState.peerDetected,
		port: FRONTPAGE_SERVER_PORT,
		host: FRONTPAGE_SERVER_HOST,
		pid: serverState.pid,
	};
}

function frontpagePageUrl(slug: string): string {
	return `http://${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}/page/${encodeURIComponent(slug)}`;
}

/** Fire a history snapshot trigger. Returns the created entry's ts (or null
 *  if the server didn't answer). Best-effort; never throws. */
async function triggerHistorySnapshot(
	slug: string,
	author: string,
): Promise<number | null> {
	try {
		const r = await fetch(
			`http://${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}/api/page/${encodeURIComponent(slug)}/history`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ author }),
			},
		);
		if (!r.ok) return null;
		const body = (await r.json()) as { ts?: number };
		return typeof body.ts === "number" ? body.ts : null;
	} catch {
		return null;
	}
}

/** Tell open browsers the page was revised so they freeze the current embed
 *  at `priorTs` and append a fresh live embed to the right. Retries a few
 *  times if no client received it (EventSource may be mid-reconnect), so the
 *  side-by-side reliably lands without the hooman refreshing. Best-effort. */
async function broadcastRevision(
	slug: string,
	priorTs: number | null,
	author: string,
	summary?: string,
): Promise<void> {
	const url = `http://${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}/api/page/${encodeURIComponent(slug)}/revised`;
	for (let attempt = 0; attempt < 6; attempt++) {
		try {
			const r = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ priorTs, author, summary }),
			});
			if (r.ok) {
				const body = (await r.json()) as { delivered?: number };
				if ((body.delivered ?? 0) > 0) return; // a browser got it — done
			}
		} catch {
			/* server not up; non-fatal */
		}
		// No client received it yet — wait and retry (EventSource reconnect window).
		await new Promise((res) => setTimeout(res, 500));
	}
}

interface SectionDiff {
	ts: number;
	author: string;
	/** spec.sections IDs whose JSON content changed between previous and new */
	changedSectionIds: string[];
	/** new IDs that didn't exist before */
	addedSectionIds: string[];
	/** old IDs that are gone */
	removedSectionIds: string[];
	/** Brief human-readable summary */
	summary: string;
}

/** Diff old vs new spec sections by id + content. Returns null when there's
 *  nothing meaningful to report (the diff would be empty). */
function computeSectionDiff(
	oldSections: ReadonlyArray<{ id?: string }> | undefined,
	newSections: ReadonlyArray<{ id?: string }>,
	author: string,
): SectionDiff | null {
	const oldById = new Map<string, unknown>();
	for (const s of oldSections ?? []) {
		if (s.id) oldById.set(s.id, s);
	}
	const newIds = new Set<string>();
	const changed: string[] = [];
	const added: string[] = [];
	for (const s of newSections) {
		if (!s.id) continue;
		newIds.add(s.id);
		const prev = oldById.get(s.id);
		if (prev === undefined) {
			added.push(s.id);
		} else if (JSON.stringify(prev) !== JSON.stringify(s)) {
			changed.push(s.id);
		}
	}
	const removed: string[] = [];
	for (const id of oldById.keys()) {
		if (!newIds.has(id)) removed.push(id);
	}
	if (changed.length === 0 && added.length === 0 && removed.length === 0)
		return null;
	const parts: string[] = [];
	if (changed.length > 0) parts.push(`updated ${changed.join(", ")}`);
	if (added.length > 0) parts.push(`added ${added.join(", ")}`);
	if (removed.length > 0) parts.push(`removed ${removed.join(", ")}`);
	return {
		ts: Date.now(),
		author,
		changedSectionIds: changed,
		addedSectionIds: added,
		removedSectionIds: removed,
		summary: `${author} ${parts.join("; ")}`,
	};
}

async function writeSectionDiff(
	slug: string,
	diff: SectionDiff,
): Promise<void> {
	const diffPath = path.join(STORE_DIR, `${slug}.diff.json`);
	await fsp.writeFile(diffPath, JSON.stringify(diff, null, 2), "utf8");
}

/** Clear all canvas annotations (everything except the frontpage-embed shape).
 *  Called after a frontpage_update so a page revision starts with a clean
 *  canvas — the prior annotations belonged to the prior content and would
 *  drift visually with content reflow. The pre-clear state is preserved in
 *  history (triggerHistorySnapshot is always called BEFORE this), so the
 *  hooman can Time Machine back if they want their old annotations. */
async function clearCanvasAnnotations(slug: string): Promise<void> {
	try {
		await fetch(
			`http://${FRONTPAGE_SERVER_HOST}:${FRONTPAGE_SERVER_PORT}/api/page/${encodeURIComponent(slug)}/clear-annotations`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
			},
		);
	} catch {
		/* server not up; non-fatal */
	}
}

export function createFrontpageExtension(
	dependencies: FrontpageDependencies,
): (pi: ExtensionAPI) => void {
	return (pi) => registerFrontpage(pi, dependencies);
}

function registerFrontpage(
	pi: ExtensionAPI,
	dependencies: FrontpageDependencies,
): void {
	// Boot the Hono server SUBPROCESS. Non-blocking; if it fails the file://
	// fallback in frontpage_open keeps pages accessible.
	void (async () => {
		try {
			await ensureClientBundleBuilt(dependencies.spawn);
			await startFrontpageServer(dependencies.spawn);
		} catch {}
	})();

	// Kill the subprocess on session_shutdown so the port releases.
	pi.on("session_shutdown", async () => {
		await stopFrontpageServer();
	});

	pi.registerTool({
		name: "frontpage_create",
		label: "Frontpage · create",
		description:
			"Compose an editorial HTML frontpage from a structured spec. " +
			"Writes ~/.agent/frontpage/<slug>.html, creates a mai artifact labeled 'frontpage'. " +
			"Use for evolving structured output — tables, architecture, comparisons, diagrams.",
		promptSnippet:
			"Compose an editorial HTML frontpage from a spec (palette, register, sections).",
		promptGuidelines: [
			"Pick ONE palette + ONE register per page. Commit to the register. Do not mix.",
			"Write a thesis (the argument) as a full sentence — not 'here is the data'.",
			"Use Tier 1 sections by default. Use d3/chartjs/svg/raw_html only when Tier 1 cannot express the shape.",
			"Slug is kebab-case, short. Tell the user the file path after creating.",
			"frontpage_create does NOT auto-open the file. If the hooman should see it now, follow up with a separate frontpage_open call. Do NOT also pass { open: true } — that opens twice.",
		],
		parameters: CreateParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			if (
				!params ||
				typeof params !== "object" ||
				!params.spec ||
				typeof params.spec !== "object"
			) {
				return missingParamError(
					"frontpage_create",
					"spec (object with at minimum slug, title, thesis, palette, register, sections)",
					params,
				);
			}
			const incomingSpec = params.spec as Partial<FrontpageSpec>;
			const missing: string[] = [];
			for (const k of [
				"slug",
				"title",
				"thesis",
				"palette",
				"register",
				"sections",
			] as const) {
				if (incomingSpec[k] === undefined || incomingSpec[k] === null)
					missing.push(k);
			}
			if (missing.length > 0) {
				return missingParamError(
					"frontpage_create",
					`spec.${missing.join(", spec.")}`,
					params,
				);
			}
			const spec = assignIds(params.spec as FrontpageSpec);
			const existingMeta = await readMeta(spec.slug);
			applyBylineForCreate(spec, existingMeta);
			await ensureStoreDir();
			const html = render(spec);
			const filePath = pagePath(spec.slug);
			await fsp.writeFile(filePath, html, "utf8");

			const maiCwd = resolveMaiCwd(ctx?.cwd);
			let artifactId = existingMeta?.artifactId;
			let artifactError: string | undefined;
			let noteError: string | undefined;
			if (!artifactId) {
				const created = await createArtifact(dependencies, spec, filePath, maiCwd);
				artifactId = created.artifactId;
				artifactError = created.error;
			} else {
				// Updating via create — log a note
				noteError = await addNote(
					dependencies,
					artifactId,
					`Regenerated frontpage (${spec.sections.length} sections).`,
					maiCwd,
				);
			}

			const now = Date.now();
			const meta: Meta = {
				slug: spec.slug,
				artifactId,
				createdAt: existingMeta?.createdAt ?? now,
				updatedAt: now,
				spec,
			};
			await writeMeta(meta);
			void triggerHistorySnapshot(
				spec.slug,
				`agent:${getStableNickname() ?? "frontpage_create"}`,
			);

			// Opt-in: default false (agents typically follow up with frontpage_open;
			// double-opening on every create surprised the hooman with extra tabs).
			if (params.open === true) void osOpen(dependencies.spawn, filePath);

			// Collect mermaid lint findings AFTER the write — SOFT validation, never
			// blocks. Surfaces back to the agent in the tool result text so they can
			// immediately follow up with frontpage_update to correct. The page is
			// already on disk; the hooman can see it AND the agent can see the
			// findings in the same turn.
			const mermaidFindings = collectMermaidFindings(spec);
			const mermaidBlock = formatMermaidFindingsSection(mermaidFindings);

			const maiLines: string[] = [];
			if (artifactId) {
				maiLines.push(`mai artifact: ${artifactId}`);
				if (noteError) maiLines.push(`mai note NOT added — ${noteError}`);
			} else {
				maiLines.push(
					`mai artifact NOT recorded — ${artifactError ?? "unknown error"}`,
				);
				if (artifactError && /not a git repository/i.test(artifactError)) {
					maiLines.push(
						`  (${maiCwd} is not inside a git repo; run pi from one or set FRONTPAGE_MAI_CWD to record artifacts. The page was written regardless.)`,
					);
				}
			}
			const textLines = [
				`Frontpage written: ${filePath}`,
				...maiLines,
				`Sections: ${spec.sections.length}`,
				`Palette: ${spec.palette} · Register: ${spec.register}`,
			];
			if (mermaidBlock) textLines.push("", mermaidBlock);

			return {
				content: [{ type: "text", text: textLines.join("\n") }],
				details: {
					slug: spec.slug,
					path: filePath,
					artifactId,
					artifactError: artifactError ?? null,
					maiCwd,
					sectionCount: spec.sections.length,
					mermaidFindings: mermaidFindings.map((x) => ({
						sectionId: x.sectionId,
						...x.finding,
					})),
				},
			};
		},
	});

	pi.registerTool({
		name: "frontpage_update",
		label: "Frontpage · update",
		description:
			"Edit an existing frontpage via a patch (replace/append/remove sections or update meta). " +
			"Rewrites the HTML and logs a note on the mai artifact.",
		promptSnippet:
			"Patch an existing frontpage — replace/append/remove sections without rewriting boilerplate.",
		promptGuidelines: [
			"Prefer update over create when structure is stable — keeps section IDs stable for round-trips.",
			"Always provide a short 'note' describing what changed — it becomes the artifact history.",
		],
		parameters: UpdateParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			if (!params || typeof params !== "object") {
				return missingParamError(
					"frontpage_update",
					"slug, patch, note",
					params,
				);
			}
			const missing: string[] = [];
			if (typeof params.slug !== "string" || params.slug.length === 0)
				missing.push("slug (string)");
			if (!Array.isArray(params.patch)) missing.push("patch (array of ops)");
			if (typeof params.note !== "string" || params.note.length === 0)
				missing.push("note (string)");
			if (missing.length > 0) {
				return missingParamError(
					"frontpage_update",
					missing.join(", "),
					params,
				);
			}
			const meta = await readMeta(params.slug);
			if (!meta) {
				return {
					content: [
						{
							type: "text",
							text: `No frontpage named '${params.slug}' found. Use frontpage_create first.`,
						},
					],
					isError: true,
					details: {},
				};
			}

			const spec: FrontpageSpec = JSON.parse(JSON.stringify(meta.spec));
			const applied: string[] = [];
			const skipped: Array<{
				op: string;
				reason: string;
				section_id?: string;
			}> = [];

			for (const op of params.patch) {
				switch (op.op) {
					case "replace_section": {
						const i = spec.sections.findIndex((s) => s.id === op.section_id);
						if (i >= 0) {
							spec.sections[i] = {
								...(op.new_section as SectionSpec),
								id: op.section_id,
							};
							applied.push(`replace ${op.section_id}`);
						} else {
							skipped.push({
								op: "replace_section",
								section_id: op.section_id,
								reason: "section_id not found",
							});
						}
						break;
					}
					case "append_section":
						spec.sections.push(op.new_section as SectionSpec);
						applied.push(`append (${(op.new_section as SectionSpec).type})`);
						break;
					case "remove_section": {
						const before = spec.sections.length;
						spec.sections = spec.sections.filter((s) => s.id !== op.section_id);
						if (spec.sections.length < before) {
							applied.push(`remove ${op.section_id}`);
						} else {
							skipped.push({
								op: "remove_section",
								section_id: op.section_id,
								reason: "section_id not found",
							});
						}
						break;
					}
					case "update_meta": {
						const fields: string[] = [];
						if (op.title) {
							spec.title = op.title;
							fields.push("title");
						}
						if (op.thesis) {
							spec.thesis = op.thesis;
							fields.push("thesis");
						}
						if (op.palette) {
							spec.palette = op.palette as FrontpageSpec["palette"];
							fields.push("palette");
						}
						if (op.register) {
							spec.register = op.register as FrontpageSpec["register"];
							fields.push("register");
						}
						if (typeof op.byline === "string") {
							spec.byline = op.byline;
							fields.push("byline");
						}
						if (Array.isArray(op.contributors)) {
							spec.contributors = op.contributors;
							fields.push("contributors");
						}
						if (fields.length > 0) {
							applied.push(`update_meta (${fields.join(",")})`);
						} else {
							skipped.push({
								op: "update_meta",
								reason: "no fields to update",
							});
						}
						break;
					}
				}
			}

			// If everything was skipped, do not write — tell the model what's there.
			if (applied.length === 0) {
				const availableIds = spec.sections
					.map((s) => `${s.id} (${s.type})`)
					.join(", ");
				return {
					content: [
						{
							type: "text",
							text: [
								`No ops applied to '${params.slug}'. ${skipped.length} op(s) skipped.`,
								...skipped.map(
									(s) =>
										`  - ${s.op}${s.section_id ? ` ${s.section_id}` : ""}: ${s.reason}`,
								),
								`Available section IDs: ${availableIds}`,
							].join("\n"),
						},
					],
					isError: true,
					details: {
						slug: params.slug,
						applied: 0,
						skipped,
						availableSectionIds: spec.sections.map((s) => s.id),
					},
				};
			}

			const withIds = assignIds(spec);
			applyBylineForUpdate(withIds);
			const filePath = pagePath(withIds.slug);
			const now = Date.now();
			// Compute section-level diff BEFORE writing the new meta so we still
			// have the old spec in hand (`meta.spec` is the on-disk pre-update
			// version; `withIds` is the post-patch version).
			const authorTag = `agent:${getStableNickname() ?? "frontpage_update"}`;
			const sectionDiff = computeSectionDiff(
				meta.spec.sections,
				withIds.sections,
				authorTag,
			);

			// SIDE-BY-SIDE VERSION MODEL:
			// 1. Snapshot the PRE-update surface (OLD html + meta + canvas-with-
			//    annotations) into history FIRST, while the old content is still
			//    on disk. priorTs identifies that frozen version.
			const priorTs = await triggerHistorySnapshot(params.slug, authorTag);
			// 2. NOW write the new content to disk.
			const html = render(withIds);
			await fsp.writeFile(filePath, html, "utf8");
			await writeMeta({ ...meta, spec: withIds, updatedAt: now });
			// 3. Persist the section diff so the new version's /embed render shows
			//    "★ UPDATED" / "★ NEW" badges on changed sections.
			if (sectionDiff) await writeSectionDiff(params.slug, sectionDiff);
			// 4. Broadcast the revision. Open browsers freeze their current live
			//    embed at priorTs (so the hooman's annotations stay pinned to the
			//    OLD content, frozen via embed-versioned?ts=priorTs) and append a
			//    fresh live embed to the RIGHT showing the new content. No
			//    annotation clearing — they belong to the old frozen doc and never
			//    drift, because the doc they sit on never changes again.
			await broadcastRevision(
				params.slug,
				priorTs,
				authorTag,
				sectionDiff?.summary,
			);

			const maiCwd = resolveMaiCwd(ctx?.cwd);
			let noteError: string | undefined;
			if (meta.artifactId)
				noteError = await addNote(
					dependencies,
					meta.artifactId,
					params.note,
					maiCwd,
				);
			if (params.open) void osOpen(dependencies.spawn, filePath);

			// Mermaid lint surfaces back to the agent — SOFT, never blocks the write.
			const mermaidFindings = collectMermaidFindings(withIds);
			const mermaidBlock = formatMermaidFindingsSection(mermaidFindings);

			const textLines = [
				`Frontpage updated: ${filePath}`,
				meta.artifactId
					? noteError
						? `mai note NOT added to ${meta.artifactId} — ${noteError}`
						: `mai note added to ${meta.artifactId}`
					: "mai artifact unknown — no note",
				`Ops applied: ${applied.length}/${params.patch.length}`,
				...applied.map((a) => `  ✓ ${a}`),
				...(skipped.length > 0
					? [
							`Skipped: ${skipped.length}`,
							...skipped.map(
								(s) =>
									`  ✗ ${s.op}${s.section_id ? ` ${s.section_id}` : ""}: ${s.reason}`,
							),
						]
					: []),
			];
			if (mermaidBlock) textLines.push("", mermaidBlock);

			return {
				content: [{ type: "text", text: textLines.join("\n") }],
				details: {
					slug: withIds.slug,
					path: filePath,
					artifactId: meta.artifactId,
					noteError: noteError ?? null,
					maiCwd,
					applied: applied.length,
					skipped: skipped.length,
					sectionIds: withIds.sections.map((s) => s.id),
					mermaidFindings: mermaidFindings.map((x) => ({
						sectionId: x.sectionId,
						...x.finding,
					})),
				},
			};
		},
	});

	pi.registerTool({
		name: "frontpage_open",
		label: "Frontpage · open",
		description: "Open an existing frontpage in the default browser.",
		parameters: OpenParams,
		async execute(_id, params) {
			if (
				!params ||
				typeof params !== "object" ||
				typeof params.slug !== "string" ||
				params.slug.length === 0
			) {
				return missingParamError("frontpage_open", "slug (string)", params);
			}
			const filePath = pagePath(params.slug);
			if (!fs.existsSync(filePath)) {
				return {
					content: [{ type: "text", text: `No frontpage at ${filePath}` }],
					isError: true,
					details: {},
				};
			}
			// v2: open via the Hono server when running (tldraw canvas wrapper).
			// Probe the server LIVE rather than trusting serverState.pid — right
			// after a /reload the spawn promise may not have resolved yet, so
			// serverState.pid can be null even though the server is reachable
			// (or a peer process owns it). Falls back to file:// only if the
			// server genuinely doesn't answer.
			const reachable = await probeServer(1200);
			const target = reachable ? frontpagePageUrl(params.slug) : filePath;
			void osOpen(dependencies.spawn, target);
			return {
				content: [{ type: "text", text: `Opening ${target}` }],
				details: {
					path: filePath,
					url: reachable ? frontpagePageUrl(params.slug) : null,
				},
			};
		},
	});

	pi.registerTool({
		name: "frontpage_read",
		label: "Frontpage · read",
		description:
			"Read a frontpage's current annotation state — every sticky note / arrow / drawing the hooman has placed on the tldraw canvas, with each annotation mapped to the section AND specific item it overlaps. " +
			"Always call this when the hooman says they 'added notes', 'annotated', or 'drew on' a page — it returns the spatial mapping (sticky → section + item) AND a PNG IMAGE of the whole canvas so you can SEE freehand drawings, handwriting, and arrows the text mapping can't capture. Read the image, don't just the text.",
		promptSnippet:
			"Read sticky-note annotations on a frontpage with section + item attribution. Call any time the hooman annotates.",
		promptGuidelines: [
			"Call frontpage_read whenever the hooman annotates a frontpage. Don't guess what they meant — the tool returns the exact section + item each shape overlaps.",
			"Item attribution is the gold. When a sticky has '› item#N <tag> \"text\"', the hooman is targeting that specific card / kpi-item / paragraph. Don't generalise to the whole section.",
			"Arrows ARE the strongest signal: from-section/item → to-section/item is a literal 'these are linked' statement. Read both endpoints.",
			"The result includes a PNG of the canvas when the hooman has drawn. READ IT — handwritten notes, freehand sketches, and what an arrow physically points at are only visible in the image, not the text mapping.",
			"After reading, act: patch the page via frontpage_update for substantive changes, or just acknowledge in chat for thumbs-up / agreement stickies.",
			"Do NOT delete the hooman's stickies as part of any patch — they clear them themselves.",
		],
		parameters: Type.Object({
			slug: Type.Optional(Type.String({ description: "Frontpage slug" })),
		}),
		async execute(_id, params) {
			if (
				!params ||
				typeof params !== "object" ||
				typeof params.slug !== "string" ||
				params.slug.length === 0
			) {
				return missingParamError("frontpage_read", "slug (string)", params);
			}
			const info = frontpageServerInfo();
			const url = `http://${info.host}:${info.port}/api/page/${encodeURIComponent(params.slug)}/state`;
			try {
				const resp = await fetch(url);
				if (!resp.ok) {
					return {
						content: [
							{
								type: "text",
								text: `frontpage_read: server returned HTTP ${resp.status}`,
							},
						],
						isError: true,
						details: { status: resp.status },
					};
				}
				type ItemAttr = {
					idx: number;
					tag: string;
					cls: string;
					text: string;
				} | null;
				type Annotation = {
					id: string;
					type: string;
					text: string | null;
					color: string | null;
					refersToSection?: string | null;
					refersToSectionReason?: string | null;
					refersToItem?: ItemAttr;
					refersToItemReason?: string | null;
					// Arrows have from/to instead of refersToSection
					from?: { section: string | null; item: ItemAttr } | null;
					to?: { section: string | null; item: ItemAttr } | null;
				};
				const state = (await resp.json()) as {
					slug: string;
					sections: Array<{
						id: string;
						label: string | null;
						type: string | null;
					}>;
					annotations: Annotation[];
					annotationCount: number;
				};

				// Canvas vision: pull the PNG the browser exports on every draw, so the
				// agent SEES handwriting/arrows/sketches the spatial text-mapping can't
				// convey (the gap that forced the hooman to paste screenshots manually).
				let imageBlock: {
					type: "image";
					data: string;
					mimeType: string;
				} | null = null;
				try {
					const imgResp = await fetch(
						`http://${info.host}:${info.port}/api/page/${encodeURIComponent(params.slug)}/canvas-image`,
					);
					if (imgResp.ok) {
						const ab = await imgResp.arrayBuffer();
						if (ab.byteLength > 0) {
							// Hard-guarantee the image is within Anthropic's limits (extension
							// tool images are NOT auto-resized by the harness).
							const data = await capPngForApi(
								Buffer.from(ab),
								dependencies.spawn,
							);
							if (data)
								imageBlock = { type: "image", data, mimeType: "image/png" };
						}
					}
				} catch {
					/* no canvas image yet — non-fatal */
				}

				// Decision Points: surface the hooman's answers two ways, because inside
				// the tldraw embed the page is pointer-events:none unless they hit
				// 'Interact'. (1) CLICKED answers, persisted server-side; (2) answers
				// MARKED BY DRAWING on an option card (an annotation whose item is a
				// fp-decision__option). Read both — a mark on an option IS the pick.
				let decisionsText = "";
				try {
					const meta = await readMeta(params.slug);
					const decSecs = (
						(meta?.spec?.sections ?? []) as unknown as Array<
							Record<string, unknown>
						>
					).filter((s) => s.type === "decision");
					if (decSecs.length > 0) {
						let answered: Record<
							string,
							{ chosenKey?: string; text?: string }
						> = {};
						try {
							const decResp = await fetch(
								`http://${info.host}:${info.port}/api/page/${encodeURIComponent(params.slug)}/decision`,
							);
							if (decResp.ok)
								answered = (await decResp.json()) as typeof answered;
						} catch {
							/* server optional */
						}
						const promptOf = (sec: Record<string, unknown>) => {
							const p = String(sec.prompt ?? "");
							return p.length > 80 ? p.slice(0, 79) + "\u2026" : p;
						};
						// (1) clicked
						const clicked: string[] = [];
						for (const sec of decSecs) {
							const id = String(sec.id ?? "");
							const ans = answered[id];
							if (!ans) continue;
							const opts =
								(sec.options as
									| Array<{ key: string; label: string }>
									| undefined) ?? [];
							const opt = opts.find((o) => o.key === ans.chosenKey);
							const choice = opt
								? `chose "${opt.label}" (key=${ans.chosenKey})`
								: ans.chosenKey
									? `chose key=${ans.chosenKey}`
									: "";
							const wrote = ans.text
								? `${choice ? " \u00b7 " : ""}wrote: "${ans.text}"`
								: "";
							clicked.push(
								`  \u2713 ${id} "${promptOf(sec)}": ${choice}${wrote}`,
							);
						}
						// (2) marked by drawing on an option card
						const marked: string[] = [];
						const markedIds = new Set<string>();
						const decById = new Map(
							decSecs.map((s) => [String(s.id ?? ""), s]),
						);
						for (const a of (state.annotations ?? []) as Array<{
							refersToSection?: string;
							refersToItem?: {
								cls?: string;
								tag?: string;
								text?: string;
							} | null;
						}>) {
							const secId = a.refersToSection;
							const it = a.refersToItem;
							if (!secId || !it || !decById.has(secId)) continue;
							const cls = String(it.cls || it.tag || "");
							if (!cls.includes("fp-decision__option")) continue;
							const sec = decById.get(secId)!;
							const optText = (it.text || "")
								.replace(/Recommended/g, "")
								.trim();
							marked.push(
								`  \u270e ${secId} "${promptOf(sec)}": MARKED "${optText}"`,
							);
							markedIds.add(secId);
						}
						const parts: string[] = [];
						if (clicked.length)
							parts.push(
								`Decision answers CLICKED on '${params.slug}':`,
								...clicked,
							);
						if (marked.length)
							parts.push(
								`Decision choices MARKED BY DRAWING on '${params.slug}' (the embed isn't clickable in tldraw unless the hooman hits 'Interact' — treat a mark on an option AS the pick):`,
								...marked,
							);
						const open = decSecs.filter(
							(s) =>
								!answered[String(s.id ?? "")] &&
								!markedIds.has(String(s.id ?? "")),
						);
						if ((clicked.length || marked.length) && open.length) {
							parts.push(
								`  still open: ${open.map((s) => String(s.id ?? "")).join(", ")}`,
							);
						}
						decisionsText = parts.join("\n");
					}
				} catch {
					/* decisions optional */
				}

				if (state.annotationCount === 0) {
					const baseNote = imageBlock
						? `No section-mapped annotations on '${params.slug}', but the hooman HAS drawn on the canvas — read the image below (freehand notes/handwriting/arrows the text mapping can't capture).`
						: `No annotations on '${params.slug}'. Either the hooman hasn't drawn anything yet, or the page hasn't been opened in the browser (which is when section bounds get measured).`;
					const noteText = decisionsText
						? `${decisionsText}\n\n${baseNote}`
						: baseNote;
					return {
						content: [
							{ type: "text", text: noteText },
							...(imageBlock ? [imageBlock] : []),
						],
						details: state,
					};
				}

				const sectionLabel = (id: string | null | undefined) => {
					if (!id) return "(unmapped)";
					const s = state.sections.find((x) => x.id === id);
					return s?.label ? `${id} "${s.label}"` : id;
				};
				const itemSummary = (it: ItemAttr) => {
					if (!it) return "";
					const tag = it.cls || it.tag;
					const snippet =
						it.text.length > 100 ? it.text.slice(0, 99) + "\u2026" : it.text;
					return ` › item#${it.idx} <${tag}> "${snippet}"`;
				};

				// Group non-arrow annotations by section. Arrows render as their own
				// bullet at the end because they straddle sections.
				const arrows: Annotation[] = [];
				const bySection = new Map<string, Annotation[]>();
				for (const a of state.annotations) {
					if (a.type === "arrow") {
						arrows.push(a);
						continue;
					}
					const key = a.refersToSection ?? "__unmapped__";
					const list = bySection.get(key) ?? [];
					list.push(a);
					bySection.set(key, list);
				}

				const lines: string[] = [
					`Annotations on '${params.slug}' (${state.annotationCount}):`,
				];
				for (const [secId, items] of bySection) {
					lines.push(
						`  → ${sectionLabel(secId === "__unmapped__" ? null : secId)}`,
					);
					for (const a of items) {
						const text = a.text ?? `[${a.type}]`;
						const colorTag = a.color ? ` [${a.color}]` : "";
						const item = itemSummary(a.refersToItem ?? null);
						lines.push(`    • ${a.type}${colorTag}: "${text}"${item}`);
					}
				}
				if (arrows.length > 0) {
					lines.push(`  → arrows (${arrows.length})`);
					for (const a of arrows) {
						const label = a.text ? ` "${a.text}"` : "";
						const fromS = sectionLabel(a.from?.section ?? null);
						const toS = sectionLabel(a.to?.section ?? null);
						const fromI = itemSummary(a.from?.item ?? null);
						const toI = itemSummary(a.to?.item ?? null);
						lines.push(
							`    • arrow${label}: ${fromS}${fromI}  →  ${toS}${toI}`,
						);
					}
				}
				const textOut =
					lines.join("\n") +
					(decisionsText ? "\n\n" + decisionsText : "") +
					(imageBlock
						? "\n\nThe canvas image below shows the hooman's drawings in full — READ IT to catch what the text mapping above can't convey: freehand handwriting, sketches, and exactly what each arrow points at."
						: "");
				return {
					content: [
						{ type: "text", text: textOut },
						...(imageBlock ? [imageBlock] : []),
					],
					details: state,
				};
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `frontpage_read failed: ${err instanceof Error ? err.message : String(err)}`,
						},
					],
					isError: true,
					details: {},
				};
			}
		},
	});

	pi.registerTool({
		name: "frontpage_annotate",
		label: "Frontpage · annotate",
		description:
			"Place agent-owned shapes onto a frontpage's tldraw canvas: sticky notes, plain text, geometric shapes (rectangles, ellipses, diamonds, etc.), arrows. " +
			"Use for: answering a hooman sticky inline; drawing an ad-hoc flowchart on the canvas; pointing at sections with arrows; leaving structured notes. " +
			"Shapes can be anchored to sections/items (server resolves the position from layout bounds) or placed at explicit page-space coordinates. " +
			"Mermaid-as-tldraw: compose flowcharts from geo + arrow shapes — same primitive set, but interactive on the canvas.",
		promptSnippet:
			"Place tldraw shapes on a frontpage canvas (notes / text / geo / arrows).",
		promptGuidelines: [
			"Use anchor: { section: 's3' } or anchor: { section: 's3', item: 5 } to drop a shape next to a section/item — the server resolves the page-space position from layout bounds.",
			"Use xy: { x, y } when you need exact placement. Coords are in PAGE space (relative to the frontpage's top-left, not the canvas).",
			"Agent-placed shapes use color 'violet' by default so they're distinguishable from the hooman's stickies (usually yellow/black).",
			"Anchored notes land OFFSET to the right of the section/item — they don't visually cover what they refer to. To replace existing content, use frontpage_update instead.",
			"For ad-hoc diagrams: combine geo shapes (rectangles/ellipses/diamonds + text) with arrows (from/to anchors). This is the equivalent of mermaid but interactive.",
			"The page must have been opened in a browser at least once before annotate works (the canvas needs an embed shape to compute offsets).",
		],
		parameters: Type.Object({
			slug: Type.String({ description: "Frontpage slug" }),
			shapes: Type.Array(
				Type.Object({
					kind: Type.Union([
						Type.Literal("note"),
						Type.Literal("text"),
						Type.Literal("geo"),
						Type.Literal("arrow"),
					]),
					text: Type.Optional(Type.String()),
					anchor: Type.Optional(
						Type.Object({
							section: Type.Optional(Type.String()),
							item: Type.Optional(Type.Number()),
						}),
					),
					xy: Type.Optional(
						Type.Object({ x: Type.Number(), y: Type.Number() }),
					),
					w: Type.Optional(Type.Number()),
					h: Type.Optional(Type.Number()),
					geo: Type.Optional(
						Type.String({
							description:
								"rectangle | ellipse | diamond | hexagon | star | triangle | cloud | check-box | x-box | etc.",
						}),
					),
					color: Type.Optional(
						Type.String({
							description:
								"black | grey | violet | red | orange | yellow | green | blue | light-blue | light-green | light-red | light-violet",
						}),
					),
					size: Type.Optional(Type.String({ description: "s | m | l | xl" })),
					from: Type.Optional(
						Type.Object({
							section: Type.Optional(Type.String()),
							item: Type.Optional(Type.Number()),
							x: Type.Optional(Type.Number()),
							y: Type.Optional(Type.Number()),
						}),
					),
					to: Type.Optional(
						Type.Object({
							section: Type.Optional(Type.String()),
							item: Type.Optional(Type.Number()),
							x: Type.Optional(Type.Number()),
							y: Type.Optional(Type.Number()),
						}),
					),
				}),
			),
			author: Type.Optional(
				Type.String({
					description:
						"Author tag stored in shape meta. Defaults to the stable nickname.",
				}),
			),
		}),
		async execute(_id, params) {
			if (
				!params ||
				typeof params !== "object" ||
				typeof params.slug !== "string" ||
				!Array.isArray(params.shapes)
			) {
				return missingParamError(
					"frontpage_annotate",
					"slug (string), shapes (array)",
					params,
				);
			}
			const info = frontpageServerInfo();
			const author =
				typeof params.author === "string" && params.author
					? params.author
					: (getStableNickname() ?? "agent");
			const url = `http://${info.host}:${info.port}/api/page/${encodeURIComponent(params.slug)}/annotate`;
			try {
				// Coerce shape input: rename "from/to" embedded {section,item,x,y}
				// into the union the server expects.
				const shapes = (params.shapes as Array<Record<string, unknown>>).map(
					(s) => {
						const out: Record<string, unknown> = { kind: s.kind };
						if (typeof s.text === "string") out.text = s.text;
						if (s.anchor && typeof s.anchor === "object") out.anchor = s.anchor;
						if (s.xy && typeof s.xy === "object") out.xy = s.xy;
						if (typeof s.w === "number") out.w = s.w;
						if (typeof s.h === "number") out.h = s.h;
						if (typeof s.geo === "string") out.geo = s.geo;
						if (typeof s.color === "string") out.color = s.color;
						if (typeof s.size === "string") out.size = s.size;
						if (s.from) {
							const f = s.from as Record<string, unknown>;
							out.from =
								typeof f.x === "number" && typeof f.y === "number"
									? { x: f.x, y: f.y }
									: { section: f.section, item: f.item };
						}
						if (s.to) {
							const t = s.to as Record<string, unknown>;
							out.to =
								typeof t.x === "number" && typeof t.y === "number"
									? { x: t.x, y: t.y }
									: { section: t.section, item: t.item };
						}
						return out;
					},
				);
				const resp = await fetch(url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ shapes, author }),
				});
				if (!resp.ok) {
					const errText = await resp.text();
					return {
						content: [
							{
								type: "text",
								text: `frontpage_annotate: server returned HTTP ${resp.status} — ${errText.slice(0, 200)}`,
							},
						],
						isError: true,
						details: { status: resp.status },
					};
				}
				const result = (await resp.json()) as {
					created: number;
					createdIds: string[];
					skipped: Array<{ index: number; reason: string }>;
				};
				const lines = [
					`Placed ${result.created} shape(s) on '${params.slug}'${result.skipped.length > 0 ? ` (${result.skipped.length} skipped)` : ""}.`,
				];
				for (const sk of result.skipped)
					lines.push(`  ✗ shape[${sk.index}]: ${sk.reason}`);
				lines.push(
					"Hooman sees the new shapes the next time the canvas re-renders (already-open tab updates within ~1s via the persist-listen loop).",
				);
				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: result,
				};
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `frontpage_annotate failed: ${err instanceof Error ? err.message : String(err)}`,
						},
					],
					isError: true,
					details: {},
				};
			}
		},
	});

	// /frontpage-reload — dev helper to flush the partials cache
	pi.registerCommand("frontpage-reload", {
		description: "Reload frontpage partials from disk (dev).",
		handler: async (_args, ctx) => {
			reloadPartials();
			if (ctx.hasUI) ctx.ui.notify("Frontpage partials reloaded", "info");
		},
	});
}

export default createFrontpageExtension({ spawn: nodeSpawn });
