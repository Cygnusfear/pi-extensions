/**
 * Shared mai binary resolution.
 *
 * Every extension that spawns `mai` should go through `getMaiBin()`. It
 * returns an ABSOLUTE path to the mai executable, so child processes do not
 * depend on PATH being healthy at spawn time — fixing the posix_spawn 'mai'
 * ENOENT class of failure.
 *
 * Resolution order (see tool-availability.checkBinary):
 *   1. `MAI_BIN` env var (absolute + existing)
 *   2. `command -v mai` (absolute + existing)
 *   3. explicit absolute fallbacks: ~/go/bin/mai, /opt/homebrew/bin/mai, /usr/local/bin/mai
 *
 * The singleton `maiDep` is registered once here and imported by all
 * extensions, so `showMissingDeps()` only reports mai once.
 */

import os from "node:os";
import path from "node:path";
import { createDep, type Dep } from "./tool-availability.js";

export const maiDep: Dep = createDep({
  binary: "mai",
  name: "mai",
  install: "Install: go install github.com/cygnusfear/maitake/cmd/mai@latest",
  envOverride: "MAI_BIN",
  fallbacks: [
    path.join(os.homedir(), "go", "bin", "mai"),
    "/opt/homebrew/bin/mai",
    "/usr/local/bin/mai",
  ],
});

/**
 * Return the absolute path to the mai binary for spawning.
 * Throws a descriptive error if mai is not installed.
 *
 * Callers should always spawn the returned string rather than the literal
 * "mai" — that's the whole point of this helper.
 */
export function getMaiBin(): string {
  maiDep.guard();
  return maiDep.resolved!;
}
