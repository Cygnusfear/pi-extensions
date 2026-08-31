// Shared interfaces for code-mode modules

import type { CodeModeManual } from "./code-mode-manual";

/**
 * Context passed into createToolBindings — cwd + accumulated images from readImage()
 */
export interface SandboxContext {
  cwd: string;
  images: Array<{ data: string; mimeType: string }>;
  /** Optional per-session manual override for isolated sandboxes such as RLM. */
  codeModeManual?: CodeModeManual;
  /** Current model — used by image-prepare to size attachments to the request budget */
  model?: { provider: string; id: string };
  /** Model registry — resolves model compat (e.g. maxRequestBodyBytes) for image budgeting */
  modelRegistry?: unknown;
  /** Optional UI confirm dialog — when available, git-safety shows interactive prompt */
  confirmFn?: (
		title: string,
		body: string,
		opts?: { signal?: AbortSignal; timeout?: number },
	) => Promise<boolean>;
  /** Optional log function — writes to sandbox console output */
  logFn?: (msg: string) => void;
  /** Optional abort signal — when provided, sandbox tools check it and abort early */
  signal?: AbortSignal;
  /** Optional read-only SessionManager — passed through to edit hooks so extensions
   *  (git-ai, etc.) can attribute edits to the current session/agent. */
  sessionManager?: any;
  /** Optional git identity — when set, Bash spawns get GIT_AUTHOR/COMMITTER and
   *  PI_AGENT_* env vars so git-ai commit hooks attribute work to the agent. */
  agentGitIdentity?: { name: string; email: string; model?: string; sessionId?: string; sessionName?: string };
}

/**
 * A single entry in the persistent $ store
 */
export interface StoreEntry {
  value: unknown;
  lastAccessTurn: number;
  pinned: boolean;
}
