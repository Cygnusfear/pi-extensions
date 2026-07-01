import os from "node:os";
import path from "node:path";
import { createDep, type Dep } from "@pi-extensions/shared/tool-availability";

/**
 * rtk (https://github.com/rtk-ai/rtk) — OPTIONAL CLI proxy that filters/compresses
 * noisy dev-command output (cargo / tsc / test / lint / git / search) by 60-90%
 * before it reaches the agent's context. code-mode's Bash() routes commands rtk
 * handles through it automatically (see sandbox-tools.ts); when rtk is absent,
 * commands run raw and result.rtk is false — nothing breaks, you just don't get the
 * savings.
 *
 * Registering it as a dep means a fresh machine (nix, a new user, a homebrew-less
 * box) gets the consolidated "Optional dependencies not found: • rtk — install…"
 * notice on session start + in /deps, instead of silently missing the feature. The
 * resolver also probes absolute fallbacks (nix + homebrew + ~/.local/bin) so a
 * stripped PATH doesn't hide an installed rtk, and Bash() spawns the ABSOLUTE path.
 *
 * Override the path explicitly with PI_RTK_BIN; disable rtk entirely with PI_RTK=0.
 */
export const rtkDep: Dep = createDep({
	binary: "rtk",
	name: "rtk",
	install:
		"brew install rtk  (nix: add rtk to your flake/profile · cargo: cargo install --git https://github.com/rtk-ai/rtk) — auto-compacts cargo/tsc/test/git/lint output 60-90% in Bash(); use result.raw() for the full output. Disable with PI_RTK=0.",
	envOverride: "PI_RTK_BIN",
	fallbacks: [
		path.join(os.homedir(), ".local", "bin", "rtk"),
		"/opt/homebrew/bin/rtk",
		"/run/current-system/sw/bin/rtk", // nix-darwin / NixOS system profile
		path.join(os.homedir(), ".nix-profile", "bin", "rtk"),
		"/usr/local/bin/rtk",
	],
});