/**
 * TYPECHECK ISOLATION SHIM (NOT for runtime — bun resolves the real package
 * via package.json "exports" field at runtime; this file's createRequire body
 * is defensive dead code that only runs if bun's resolution is bypassed).
 *
 * Why this exists: importing the real @pi-extensions/code-mode/{session-factory,
 * sandbox-tools,types} pulls code-mode's full module graph into RLM's tsc, which
 * inherits baseline errors from sandbox-tools/tool-reference/fff/tldr-code. This
 * shim isolates RLM's typecheck from that transitive type-debt graph.
 *
 * Deletion criterion: when `bunx tsc -p packages/code-mode/tsconfig.json`
 * exits 0 (i.e., code-mode's baseline reaches zero), delete this entire
 * `ts-shims/` directory and the corresponding `paths` redirects in
 * packages/rlm/tsconfig.json. Then RLM imports the real package surface.
 *
 * TODO(pe-tk4s + code-mode-baseline-cleanup): delete on the cleanup ticket.
 */
export interface SandboxContext {
	cwd: string;
	images: Array<{ data: string; mimeType: string }>;
	codeModeManual?: unknown;
	signal?: AbortSignal;
}
