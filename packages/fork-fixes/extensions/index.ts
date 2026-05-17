import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import orphanedToolResults from "./orphaned-tool-results.js";

/**
 * Bundled fork fixes that can be done purely as extensions.
 *
 * These replace fork patches that previously required modifying pi-mono core:
 * - orphaned-tool-results: drop tool_results whose tool_use is on another branch
 */
export default function (pi: ExtensionAPI) {
	orphanedToolResults(pi);
}
