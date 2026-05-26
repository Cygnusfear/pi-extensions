/**
 * Mermaid lint — catches the high-frequency syntax mistakes documented in
 * SKILL.md so the agent surfaces them at write time and can correct
 * immediately, instead of finding out after opening the page that the
 * mermaid block renders as an error overlay.
 *
 * Scope: SOFT validation. Reports findings but never blocks the write.
 * The page is still written; the tool result includes the findings so
 * the agent sees them in the response.
 *
 * What we check (all pattern-based, zero deps):
 *
 *   ERROR-level (almost certainly broken):
 *     - Empty source
 *     - `\n` literal inside a node label or edge label (renders as text
 *       — see SKILL.md "line breaks inside quoted labels: <br/>. Never
 *       \n.")
 *     - Bracket imbalance ([], (), {}, "")
 *     - Defining `.node` as a class (SKILL.md anti-pattern — bitecs uses
 *       `.node` internally)
 *
 *   WARN-level (probably wrong but not always):
 *     - Missing direction on graph/flowchart (defaults to TB; explicit
 *       TD/LR/BT/RL is clearer)
 *     - State-diagram with colons inside unquoted edge labels (SKILL.md:
 *       "transition label parser is strict")
 *     - 15+ nodes in a flat flowchart (SKILL.md: "For 15+ nodes split
 *       into simple overview + detail card-grid")
 *
 * Why pattern lint instead of `mermaid.parse()`: the full mermaid package
 * brings ~216 transitive packages and requires DOM shims (DOMPurify) to
 * parse half the diagram types in Node/Bun. The SKILL.md anti-patterns
 * are language-feature-stable and detectable with pure regex. If real
 * parse-level validation becomes necessary later, layer it on top —
 * pattern lint stays as the always-on first line.
 */

export type MermaidLintLevel = "error" | "warning";

export interface MermaidLintFinding {
	level: MermaidLintLevel;
	rule: string;
	message: string;
	/** 1-indexed line number where the issue occurs (or undefined for whole-source issues). */
	line?: number;
}

const STATE_LIKE = /^\s*(?:stateDiagram(?:-v2)?)\b/m;
const FLOWCHART_LIKE = /^\s*(?:graph|flowchart)\b/m;

function detectDiagramKind(source: string): "flowchart" | "state" | "other" {
	if (FLOWCHART_LIKE.test(source)) return "flowchart";
	if (STATE_LIKE.test(source)) return "state";
	return "other";
}

function findFirstLine(source: string, needleRe: RegExp): number | undefined {
	const lines = source.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		if (needleRe.test(lines[i])) return i + 1;
	}
	return undefined;
}

function checkBracketBalance(source: string): MermaidLintFinding[] {
	// Count after stripping (a) comment lines (`%% ...`) and (b) the contents
	// of quoted strings ("..."). Inside a label string, brackets are literal
	// text and don't need to balance with the structural ones.
	const out: MermaidLintFinding[] = [];
	const stripped = source
		.split(/\r?\n/)
		.map((l) => (/^\s*%%/.test(l) ? "" : l)) // strip comment lines
		.join("\n")
		.replace(/"(?:\\.|[^"\\])*"/g, '""'); // strip quoted-string contents

	const pairs: Array<[string, string, string]> = [
		["[", "]", "square brackets [ ]"],
		["(", ")", "parens ( )"],
		["{", "}", "braces { }"],
	];
	for (const [open, close, label] of pairs) {
		let depth = 0;
		for (const ch of stripped) {
			if (ch === open) depth++;
			else if (ch === close) depth--;
			if (depth < 0) {
				out.push({
					level: "error",
					rule: "mermaid/bracket-balance",
					message: `Unbalanced ${label}: extra closing '${close}'.`,
				});
				return out;
			}
		}
		if (depth !== 0) {
			out.push({
				level: "error",
				rule: "mermaid/bracket-balance",
				message: `Unbalanced ${label}: ${depth} unclosed '${open}'.`,
			});
		}
	}

	// Quote balance — count unescaped `"` chars; should be even.
	const quoteCount = (source.match(/(?<!\\)"/g) || []).length;
	if (quoteCount % 2 !== 0) {
		out.push({
			level: "error",
			rule: "mermaid/quote-balance",
			message: `Unbalanced double-quote: ${quoteCount} unescaped \`"\` chars (must be even).`,
		});
	}

	return out;
}

function checkBackslashN(source: string): MermaidLintFinding[] {
	// Detect a literal `\n` (backslash followed by lowercase n) inside a
	// quoted label, e.g. `A["line1\nline2"]`. Mermaid does NOT translate
	// this — it renders as the literal text "line1\nline2". Use `<br/>`.
	const re = /"(?:[^"\\]|\\.)*\\n(?:[^"\\]|\\.)*"/;
	const line = findFirstLine(source, re);
	if (line !== undefined) {
		return [
			{
				level: "error",
				rule: "mermaid/literal-newline-in-label",
				message:
					"Found `\\n` inside a quoted label. Mermaid renders this as the literal characters " +
					'`\\n` — use `<br/>` for line breaks inside labels.',
				line,
			},
		];
	}
	return [];
}

function checkNodeClassRedefinition(source: string): MermaidLintFinding[] {
	// `classDef node ...` or `class X node` defining .node — Mermaid uses
	// .node internally; redefining it silently breaks rendering. SKILL.md
	// anti-pattern.
	const re = /^\s*classDef\s+node\b|^\s*class\s+\S+\s+node\b/m;
	const line = findFirstLine(source, re);
	if (line !== undefined) {
		return [
			{
				level: "error",
				rule: "mermaid/node-class-redefinition",
				message:
					"Defining `.node` as a class is forbidden — Mermaid uses it internally. " +
					"Pick a different class name (e.g. `highlight`, `critical`).",
				line,
			},
		];
	}
	return [];
}

function checkFlowchartDirection(source: string): MermaidLintFinding[] {
	const re = /^\s*(?:graph|flowchart)(?:\s+(TD|TB|BT|LR|RL))?\b/m;
	const m = re.exec(source);
	if (!m) return [];
	if (!m[1]) {
		return [
			{
				level: "warning",
				rule: "mermaid/missing-direction",
				message:
					"`graph` / `flowchart` without an explicit direction defaults to `TB`. " +
					"Prefer `TD`, `LR`, `BT`, or `RL` explicitly for clarity.",
				line: findFirstLine(source, re),
			},
		];
	}
	return [];
}

function checkFlowchartNodeCount(source: string): MermaidLintFinding[] {
	if (detectDiagramKind(source) !== "flowchart") return [];
	// Rough heuristic: count distinct node IDs by scanning for tokens that
	// look like node-introducers (alphanumeric followed by `[`, `(`, `{`,
	// or directly used in an edge `-->`/`---`/`-.->`/`==>`).
	const ids = new Set<string>();
	const re = /\b([A-Za-z][A-Za-z0-9_]*)\s*(?:[[({]|-->|---|-\.->|==>|==)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(source))) ids.add(m[1]);
	if (ids.size >= 15) {
		return [
			{
				level: "warning",
				rule: "mermaid/too-many-nodes",
				message:
					`Flowchart has ${ids.size}+ nodes. SKILL.md recommends splitting into ` +
					"a simple overview (mermaid) + detail card-grid for 15+ nodes.",
			},
		];
	}
	return [];
}

function checkStateColonsInEdgeLabel(source: string): MermaidLintFinding[] {
	if (detectDiagramKind(source) !== "state") return [];
	// State diagram transition: `A --> B : label with : colon` — the strict
	// label parser doesn't accept unquoted colons after the first one.
	// Detect: `-->` (or similar) followed by ` : ` then any `:` later on the
	// same line that is NOT inside a quoted segment.
	const lines = source.split(/\r?\n/);
	const out: MermaidLintFinding[] = [];
	for (let i = 0; i < lines.length; i++) {
		const l = lines[i];
		const arrowMatch = /-->|->|-\.->|==>/.exec(l);
		if (!arrowMatch) continue;
		const after = l.slice(arrowMatch.index + arrowMatch[0].length);
		const firstColon = after.indexOf(":");
		if (firstColon < 0) continue;
		const rest = after.slice(firstColon + 1);
		// Look for additional unquoted colons or parens
		const stripped = rest.replace(/"(?:\\.|[^"\\])*"/g, '""');
		if (/[:()]/.test(stripped)) {
			out.push({
				level: "warning",
				rule: "mermaid/state-strict-label",
				message:
					"State-diagram edge label contains characters the strict parser rejects (`:` `(` `)`). " +
					'Use `flowchart TD` with quoted edge labels `|"..."|` if you need rich labels.',
				line: i + 1,
			});
		}
	}
	return out;
}

function checkEmpty(source: string): MermaidLintFinding[] {
	if (source.trim().length === 0) {
		return [
			{
				level: "error",
				rule: "mermaid/empty",
				message: "Mermaid section source is empty.",
			},
		];
	}
	return [];
}

/**
 * Lint a mermaid source. Returns an array of findings (may be empty).
 * Findings include both errors and warnings; callers decide how to
 * surface them. The function NEVER throws — bad input still produces
 * a findings array.
 */
export function lintMermaid(source: string): MermaidLintFinding[] {
	const findings: MermaidLintFinding[] = [];
	findings.push(...checkEmpty(source));
	if (findings.length > 0 && findings[0].rule === "mermaid/empty") {
		return findings; // nothing else to check
	}
	findings.push(...checkBackslashN(source));
	findings.push(...checkNodeClassRedefinition(source));
	findings.push(...checkBracketBalance(source));
	findings.push(...checkFlowchartDirection(source));
	findings.push(...checkFlowchartNodeCount(source));
	findings.push(...checkStateColonsInEdgeLabel(source));
	return findings;
}

/**
 * Format a finding for inclusion in the tool-result text. Short, agent-
 * friendly — opens with the rule name so the agent can search for the
 * specific check that fired.
 */
export function formatMermaidFinding(sectionId: string | undefined, f: MermaidLintFinding): string {
	const section = sectionId ? `[${sectionId}] ` : "";
	const at = f.line !== undefined ? ` (line ${f.line})` : "";
	const tag = f.level === "error" ? "ERROR" : "WARN ";
	return `  ${tag} ${section}${f.rule}${at}: ${f.message}`;
}
