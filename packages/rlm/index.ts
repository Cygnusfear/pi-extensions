import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	registerContextualSandboxFn,
	type SandboxCallContext,
} from "@pi-extensions/shared/sandbox-registry";
import { relayProviderLimitNotice } from "@pi-extensions/shared/relay-to-hooman";
import { teamsLauncherProvenance, type ProviderLimitNotice } from "@pi-extensions/shared/alert-provenance";
import { resolve } from "@pi-extensions/model-router/router";
import { cancelAllRlmHandles, createRlmHandle } from "./src/handle";
import type { RlmDeps, RlmHandle, RlmOptions } from "./src/types";

type RlmSandboxFn = (opts: RlmOptions) => RlmHandle;

export function buildDeps(ctx: SandboxCallContext): RlmDeps {
	const resolveModelRole = (role: string) => {
		const result = resolve(
			{ getAvailable: () => ctx.modelRegistry.getAvailable() },
			{ role, count: 1, dedupProviders: false },
		);
		const selected = result.resolved[0];
		return selected ? { provider: selected.provider, id: selected.modelId } : undefined;
	};
	const notifyProviderLimit = (notice: ProviderLimitNotice): void => {
		// An RLM running inside a Teams worker inherits that worker's spawn facts;
		// resolve the coordinator from the trusted environment, never from task text.
		const launcher = teamsLauncherProvenance(process.env);
		relayProviderLimitNotice(launcher ? { ...notice, launcher } : notice);
	};
	return {
		signal: ctx.signal,
		cwd: ctx.cwd,
		resolveModelRole,
		modelRegistry: ctx.modelRegistry,
		sendMessage: ctx.sendMessage,
		sendUserMessage: ctx.sendUserMessage,
		parentSession: ctx.parentSession,
		notifyProviderLimit,
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
