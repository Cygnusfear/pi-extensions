/**
 * Override the built-in edit tool's result renderer with Shiki syntax-highlighted diffs.
 *
 * Upstream's edit tool produces a unified diff in `result.details.diff`. Its built-in
 * renderResult uses plain theme-colored text. This extension registers an "edit" tool
 * that delegates execution to the real built-in, but overrides renderResult with our
 * Shiki-powered version: syntax-colored code, background tints for add/remove lines,
 * and inline word-level change highlighting.
 *
 * Works because upstream 0.63.1 (1ba899f6) honors extension tool definitions
 * over built-in ones for rendering.
 */

import { createEditToolDefinition, keyHint } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ToolRenderResultOptions, Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
// Eagerly start Shiki loading on import
import "../../shared/src/tui-diff-renderer.ts";

export default function (pi: ExtensionAPI) {
	// Get the full built-in edit tool definition (execution, renderCall, schemas, etc.)
	// process.cwd() matches the session cwd when extensions load.
	let builtIn: ReturnType<typeof createEditToolDefinition>;
	try {
		builtIn = createEditToolDefinition(process.cwd());
	} catch (e) {
		process.stderr.write(`[core-edit-ui] Failed to create edit tool definition: ${e}\n`);
		return;
	}
	process.stderr.write("[core-edit-ui] Loaded, registering edit renderer override\n");

	pi.registerTool({
		...builtIn,

		// Delegate execution to the real built-in edit tool.
		// Re-create with ctx.cwd to handle --cwd or project navigation.
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const realEdit = createEditToolDefinition(ctx.cwd);
			return realEdit.execute(toolCallId, params, signal, onUpdate, ctx);
		},

		renderResult(result: any, options: ToolRenderResultOptions, theme: Theme, context: any) {
			const diff: string | undefined = result?.details?.diff;
			if (!diff) {
				// No diff (error or no-op) — delegate to the built-in renderer
				if (builtIn.renderResult) return builtIn.renderResult(result, options, theme, context);
				return new Text("", 0, 0);
			}

			try {
				const { renderBeautifulDiff, extractThemeColors } = require("../../shared/src/tui-diff-renderer.ts");
				const colors = extractThemeColors(theme);

				// Infer file path from the diff headers
				const pathMatch = diff.match(/^---\s+a\/(.+)$/m);
				const filePath = pathMatch?.[1];

				const body = renderBeautifulDiff(diff, { filePath, colors });

				if (!body) {
					if (builtIn.renderResult) return builtIn.renderResult(result, options, theme, context);
					return new Text("", 0, 0);
				}

				const lines = body.split("\n");
				const hint = keyHint("app.tools.expand", "expand");

				if (!options.expanded && lines.length > 30) {
					const shown = lines.slice(0, 30).join("\n");
					const remaining = lines.length - 30;
					const footer = theme.fg("dim", `... (${remaining} more lines, ${hint})`);
					return new Text(`${shown}\n${footer}`, 0, 0);
				}

				return new Text(body, 0, 0);
			} catch {
				// Shiki not ready — delegate to built-in
				if (builtIn.renderResult) return builtIn.renderResult(result, options, theme, context);
				return new Text("", 0, 0);
			}
		},
	});
}
