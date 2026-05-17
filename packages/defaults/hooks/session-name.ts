import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isStaleCtxError } from "@pi-extensions/shared/tool-availability";
import { generateAndSetTitle } from "../lib/title";

interface SessionNameState {
  hasAutoNamed: boolean;
}

export function setupSessionNameHook(pi: ExtensionAPI) {
  const state: SessionNameState = {
    hasAutoNamed: false,
  };

  pi.on("session_start", async () => {
    state.hasAutoNamed = false;
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (state.hasAutoNamed) return;

    // pi.getSessionName is an assertActive-guarded action. If the runtime was
    // already invalidated (e.g. tooling re-entered after a switch), skip.
    let existingName: string | undefined;
    try {
      existingName = pi.getSessionName();
    } catch (err) {
      if (isStaleCtxError(err)) return;
      throw err;
    }
    if (existingName) {
      state.hasAutoNamed = true;
      return;
    }

    // generateAndSetTitle makes an LLM call that can take seconds. Pi can
    // dispose the session before the await resolves; the post-await action
    // calls inside generateAndSetTitle then hit assertActive and throw.
    // The inner function uses safeAction on its own action calls; here we
    // also guard the entry call in case the very first pi.* read trips.
    try {
      await generateAndSetTitle(pi, ctx);
      state.hasAutoNamed = true;
    } catch (err) {
      if (isStaleCtxError(err)) return;
      throw err;
    }
  });
}
