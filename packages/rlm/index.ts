import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerContextualSandboxFn, type SandboxCallContext } from "@pi-extensions/shared/sandbox-registry";
import { cancelAllRlmHandles, createRlmHandle } from "./src/handle";
import type { RlmDeps, RlmHandle, RlmOptions } from "./src/types";

type RlmSandboxFn = (opts: RlmOptions) => RlmHandle;

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
		const deps = buildDeps(ctx);
		const rlm: RlmSandboxFn = (opts) => createRlmHandle(deps, opts, 0);
		return rlm;
	});

	pi.on("session_shutdown", () => {
		cancelAllRlmHandles(new Error("rlm: session shutdown"));
	});
}
