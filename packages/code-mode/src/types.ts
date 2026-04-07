// Shared interfaces for code-mode modules

/**
 * Context passed into createToolBindings — cwd + accumulated images from readImage()
 */
export interface SandboxContext {
  cwd: string;
  images: Array<{ data: string; mimeType: string }>;
}

/**
 * A single entry in the persistent $ store
 */
export interface StoreEntry {
  value: unknown;
  lastAccessTurn: number;
  pinned: boolean;
}
