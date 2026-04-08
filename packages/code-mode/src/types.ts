// Shared interfaces for code-mode modules

/**
 * Context passed into createToolBindings — cwd + accumulated images from readImage()
 */
export interface SandboxContext {
  cwd: string;
  images: Array<{ data: string; mimeType: string }>;
  /** Optional UI confirm dialog — when available, git-safety shows interactive prompt */
  confirmFn?: (title: string, body: string) => Promise<boolean>;
  /** Optional log function — writes to sandbox console output */
  logFn?: (msg: string) => void;
  /** Optional abort signal — when provided, sandbox tools check it and abort early */
  signal?: AbortSignal;
}

/**
 * A single entry in the persistent $ store
 */
export interface StoreEntry {
  value: unknown;
  lastAccessTurn: number;
  pinned: boolean;
}
