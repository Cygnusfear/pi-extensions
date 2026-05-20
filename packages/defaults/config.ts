/**
 * Configuration for the defaults extension.
 *
 * DefaultsConfig is the user-facing schema (all fields optional).
 * ResolvedDefaultsConfig is the internal schema (all fields required, defaults applied).
 */

import { ConfigLoader } from "@aliou/pi-utils-settings";
import type { ConventionFileSpec } from "./lib/agents-discovery";

export interface DefaultsConfig {
  catalog?: string[];
  catalogDepth?: number;
  agentsIgnorePaths?: string[];
  /** Extra convention files to auto-inject alongside AGENTS.md and CLAUDE.md. */
  conventionFiles?: ConventionFileSpec[];
  /** Replace the default AGENTS.md/CLAUDE.md specs instead of extending them. */
  conventionFilesReplace?: boolean;
}

export interface ResolvedDefaultsConfig {
  catalog: string[];
  catalogDepth: number;
  agentsIgnorePaths: string[];
  conventionFiles: ConventionFileSpec[];
  conventionFilesReplace: boolean;
}

const DEFAULT_CONFIG: ResolvedDefaultsConfig = {
  catalog: [],
  catalogDepth: 3,
  agentsIgnorePaths: [],
  conventionFiles: [],
  conventionFilesReplace: false,
};

export const configLoader = new ConfigLoader<
  DefaultsConfig,
  ResolvedDefaultsConfig
>("defaults", DEFAULT_CONFIG, {
});
