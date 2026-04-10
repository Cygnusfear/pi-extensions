/**
 * Runbooks — agent-saved reusable code_mode scripts.
 *
 * Agents save frequently-used flows as .pi/runbooks/<name>.js files.
 * These are repo-local, git-committable, and executable in the sandbox.
 *
 * Primary interface is via sandbox functions inside execute_code:
 *   runbookSave({ name, description, code })
 *   runbookList()
 *   runbookRun({ name })  — requires code-mode to wire execution
 *   runbookLoad({ name })
 *   runbookDelete({ name })
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { registerSandboxFn } from "../../shared/src/sandbox-registry.js";
import {
	deleteRunbook,
	listRunbooks,
	loadRunbook,
	saveRunbook,
} from "../src/runbook-engine.js";

export default function register(pi: ExtensionAPI) {
	// -----------------------------------------------------------------
	// Resolve project root from cwd (walk up to find .git or package.json)
	// -----------------------------------------------------------------
	function getProjectRoot(): string {
		return pi.getCwd();
	}

	// -----------------------------------------------------------------
	// Sandbox functions (used inside execute_code)
	// -----------------------------------------------------------------

	registerSandboxFn("runbookSave", async (input: { name: string; description: string; code: string }) => {
		const filePath = saveRunbook(getProjectRoot(), input.name, input.description, input.code);
		return `Runbook "${input.name}" saved to ${filePath}`;
	});

	registerSandboxFn("runbookList", async () => {
		return listRunbooks(getProjectRoot());
	});

	registerSandboxFn("runbookLoad", async (input: { name: string }) => {
		const { code, raw } = loadRunbook(getProjectRoot(), input.name);
		return { name: input.name, code, raw };
	});

	registerSandboxFn("runbookDelete", async (input: { name: string }) => {
		const deleted = deleteRunbook(getProjectRoot(), input.name);
		return deleted
			? `Runbook "${input.name}" deleted.`
			: `Runbook "${input.name}" not found.`;
	});

	// Note: runbookRun is NOT registered here — it needs access to the VM context
	// and must be wired in code-mode's sandbox-tools.ts where vm.runInContext is available.
	// The sandbox-tools will read the code via loadRunbook and eval it in-context.

	// -----------------------------------------------------------------
	// Direct pi.tool (for LLM to use outside code-mode)
	// -----------------------------------------------------------------

	pi.tool({
		name: "runbook",
		description:
			"Manage saved code_mode runbooks — reusable scripts stored in .pi/runbooks/.\n" +
			"Actions: save, list, load, delete. Use 'run' inside execute_code via runbookRun().",
		parameters: Type.Object({
			action: Type.Union(
				[
					Type.Literal("save"),
					Type.Literal("list"),
					Type.Literal("load"),
					Type.Literal("delete"),
				],
				{ description: "Action to perform" },
			),
			name: Type.Optional(Type.String({ description: "Runbook name (required for save/load/delete)" })),
			description: Type.Optional(Type.String({ description: "Description (required for save)" })),
			code: Type.Optional(Type.String({ description: "JavaScript code (required for save)" })),
		}),
		execute: async (input) => {
			const root = getProjectRoot();

			switch (input.action) {
				case "save": {
					if (!input.name || !input.code) return "name and code are required for save";
					const filePath = saveRunbook(root, input.name, input.description || "", input.code);
					return `Saved runbook "${input.name}" to ${filePath}`;
				}
				case "list": {
					const books = listRunbooks(root);
					if (books.length === 0) return "No runbooks found in .pi/runbooks/";
					return books.map((b) => `- **${b.name}**: ${b.description}`).join("\n");
				}
				case "load": {
					if (!input.name) return "name is required for load";
					const { code } = loadRunbook(root, input.name);
					return code;
				}
				case "delete": {
					if (!input.name) return "name is required for delete";
					const deleted = deleteRunbook(root, input.name);
					return deleted ? `Deleted "${input.name}".` : `"${input.name}" not found.`;
				}
				default:
					return `Unknown action: ${input.action}`;
			}
		},
	});
}
