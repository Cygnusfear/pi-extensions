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

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
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
	// Track cwd from session_start
	// -----------------------------------------------------------------
	let projectRoot = process.cwd();

	pi.on("session_start", (_event, ctx) => {
		projectRoot = ctx.cwd;
	});

	// -----------------------------------------------------------------
	// Sandbox functions (namespaced callable + backward-compat aliases)
	// -----------------------------------------------------------------

	const runbook = async (input: { name: string; description: string; code: string }) => {
		const filePath = saveRunbook(projectRoot, input.name, input.description, input.code);
		return `Runbook "${input.name}" saved to ${filePath}`;
	};
	(runbook as any).list = async () => listRunbooks(projectRoot);
	(runbook as any).load = async (input: { name: string }) => {
		const { code, raw } = loadRunbook(projectRoot, input.name);
		return { name: input.name, code, raw };
	};
	(runbook as any).run = async (_input: { name: string; args?: Record<string, unknown> }) => {
		throw new Error("runbook.run() must be called from execute_code context");
	};
	(runbook as any).delete = async (input: { name: string }) => {
		const deleted = deleteRunbook(projectRoot, input.name);
		return deleted
			? `Runbook "${input.name}" deleted.`
			: `Runbook "${input.name}" not found.`;
	};

	registerSandboxFn("runbook", runbook);
	registerSandboxFn("runbookSave", runbook);
	registerSandboxFn("runbookList", (runbook as any).list);
	registerSandboxFn("runbookLoad", (runbook as any).load);
	registerSandboxFn("runbookDelete", (runbook as any).delete);

	// Note: runbookRun is NOT registered here — it needs access to the VM context
	// and must be wired in code-mode where vm.runInContext is available.

	// -----------------------------------------------------------------
	// Direct tool (for LLM to use outside code-mode)
	// -----------------------------------------------------------------

	pi.registerTool({
		name: "runbook",
		label: "runbook",
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
		execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
			const root = ctx?.cwd || projectRoot;

			switch (params.action) {
				case "save": {
					if (!params.name || !params.code) return "name and code are required for save";
					const filePath = saveRunbook(root, params.name, params.description || "", params.code);
					return `Saved runbook "${params.name}" to ${filePath}`;
				}
				case "list": {
					const books = listRunbooks(root);
					if (books.length === 0) return "No runbooks found in .pi/runbooks/";
					return books.map((b) => `- **${b.name}**: ${b.description}`).join("\n");
				}
				case "load": {
					if (!params.name) return "name is required for load";
					const { code } = loadRunbook(root, params.name);
					return code;
				}
				case "delete": {
					if (!params.name) return "name is required for delete";
					const deleted = deleteRunbook(root, params.name);
					return deleted ? `Deleted "${params.name}".` : `"${params.name}" not found.`;
				}
				default:
					return `Unknown action: ${params.action}`;
			}
		},
	});
}
