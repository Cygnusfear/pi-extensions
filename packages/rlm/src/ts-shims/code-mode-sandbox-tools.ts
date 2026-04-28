import { createRequire } from "node:module";
import type { SandboxContext } from "./code-mode-types";

const require = createRequire(import.meta.url);

export function createToolBindings(ctx: SandboxContext): Record<string, unknown> {
	return require("../../../code-mode/src/sandbox-tools.ts").createToolBindings(ctx);
}
