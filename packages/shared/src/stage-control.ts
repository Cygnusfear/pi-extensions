/**
 * Shared stage-control bus.
 *
 * The tab-title stage icon (🧶/🏭/🚓/…) is owned by the session-tab-title
 * extension. Other extensions sometimes need to drive that icon — e.g. the
 * rate-limit-recovery extension flips it to 🚓 when a provider TPM storm kills
 * a turn. They must not hard-import session-tab-title (separate package, and
 * jiti may instantiate modules more than once), so this bus uses globalThis as
 * the single shared rendezvous point — identical to sandbox-registry.
 *
 * session-tab-title calls registerStageController({ setStage, getStage }) on
 * session_start; any other extension calls requestStage()/getActiveStage().
 * Calls before the controller registers are safely ignored.
 */

const KEY = "__pi_stage_controller_v1__";

export interface StageController {
	/** Set the tab-title stage (canonical key or alias). */
	setStage: (stage: string) => void;
	/** Read the current canonical stage key. */
	getStage: () => string;
}

function slot(): { controller?: StageController } {
	const g = globalThis as Record<string, unknown>;
	if (!g[KEY]) g[KEY] = {};
	return g[KEY] as { controller?: StageController };
}

/** Called by the stage authority (session-tab-title) to expose its setter. */
export function registerStageController(controller: StageController): void {
	slot().controller = controller;
}

/** Request a stage change from any extension. No-op if no controller is registered. */
export function requestStage(stage: string): void {
	slot().controller?.setStage(stage);
}

/** Read the current stage, or undefined if no controller is registered yet. */
export function getActiveStage(): string | undefined {
	return slot().controller?.getStage();
}
