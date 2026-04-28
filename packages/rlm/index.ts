import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerContextualSandboxFn, type SandboxCallContext } from "@pi-extensions/shared/sandbox-registry";
import { cancelAllRlmHandles, createRlmHandle } from "./src/handle";
import type { RlmDeps, RlmOptions } from "./src/types";

export function buildDeps(ctx: SandboxCallContext): RlmDeps {
	return {
		signal: ctx.signal,
		cwd: ctx.cwd,
		parentModel: ctx.model,
		modelRegistry: ctx.modelRegistry,
		sendMessage: ctx.sendMessage,
		sendUserMessage: ctx.sendUserMessage,
	};
}

export default function (pi: ExtensionAPI) {
	registerContextualSandboxFn("rlm", (ctx) => {
		return ((opts: RlmOptions) => createRlmHandle(buildDeps(ctx), opts, 0)) as any;
	});

	pi.on("session_shutdown", () => {
		cancelAllRlmHandles(new Error("rlm: session shutdown"));
	});
}
