import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyModelHints } from "../src/model-hints-core";

/**
 * Local pi adapter for the runtime-neutral model-hints transformation.
 */
export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, ctx) => ({
		systemPrompt: applyModelHints(event.systemPrompt, ctx.modelRegistry.getAvailable()),
	}));
}
