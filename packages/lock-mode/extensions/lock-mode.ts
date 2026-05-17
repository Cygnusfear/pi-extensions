/**
 * Lock Mode -- /lock disables all write tools, /unlock restores them.
 *
 * Sets PI_LOCK_MODE env var. Code-mode checks this and blocks write
 * sandbox functions (Bash, Write, Edit, applyPatch, hashEdit, Python)
 * while keeping execute_code available for read-only operations.
 *
 * Without code-mode, falls back to removing write tools from active set.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const WRITE_TOOLS = new Set([
	"bash",
	"bash_bg_start",
	"bash_bg_stop",
	"write",
	"edit",
	"apply_patch",
	"hash_edit",
	"teams",
	"todos_oneshot",
	// Note: execute_code is NOT here -- code-mode handles it internally
	// by checking PI_LOCK_MODE and blocking write sandbox functions.
]);

export default function (pi: ExtensionAPI) {
	let savedTools: string[] | null = null;

	pi.registerCommand("lock", {
		description: "Read-only mode -- disable all write tools",
		handler: async (_args, ctx) => {
			if (process.env.PI_LOCK_MODE === "1") {
				ctx.ui.notify("Already locked", "warning");
				return;
			}
			process.env.PI_LOCK_MODE = "1";
			savedTools = pi.getActiveTools();
			// In code-mode, execute_code is the only tool -- keep it so the agent
			// can still read/search. Code-mode's sandbox enforces the write block.
			const readOnly = savedTools.filter((name) => !WRITE_TOOLS.has(name));
			pi.setActiveTools(readOnly.length > 0 ? readOnly : savedTools);
			ctx.ui.notify("Locked -- write operations disabled", "info");
		},
	});

	pi.registerCommand("unlock", {
		description: "Restore write tools",
		handler: async (_args, ctx) => {
			if (process.env.PI_LOCK_MODE !== "1") {
				ctx.ui.notify("Not locked", "warning");
				return;
			}
			delete process.env.PI_LOCK_MODE;
			if (savedTools) {
				pi.setActiveTools(savedTools);
				savedTools = null;
			}
			ctx.ui.notify("Unlocked -- all tools restored", "info");
		},
	});
}
