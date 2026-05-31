/**
 * Guarded confirm — one home for the begin/notify/confirm/end sequence.
 *
 * BOTH the git-safety extension hook (for native tool calls) AND the
 * code-mode sandbox guard (for execute_code's Bash/Write/Edit/applyPatch/
 * hashEdit) call this helper. Before this existed, the guard was
 * duplicated in two files and only one of them was wired into the
 * pending-interactions registry + desktop notification. Sandbox callers
 * fired confirm popups silently, with no desktop ping and no signal to
 * code-mode's auto-promote path — which is the path the agent actually
 * uses ~all the time.
 *
 * Behavior:
 *   1. If no confirmFn is available, returns { approved: false } immediately
 *      so the caller can throw its own guard-error. The caller decides
 *      what to do — this helper does NOT throw.
 *   2. Registers the open dialog with the pending-interactions registry
 *      so code-mode can fast-promote within ~3s and emit the 🚦 stub.
 *   3. Fires a desktop notification IMMEDIATELY so the hooman is pulled
 *      to this pane even if they are in another tab and the agent does
 *      nothing.
 *   4. Awaits the confirm. On approve, logs "✅ Hooman approved …" via
 *      the optional logFn so existing log capture keeps working.
 *   5. Always releases the registry handle in finally.
 */

import { beginConfirm, endConfirm, type PendingConfirmMeta } from "./pending-interactions.ts";
import { fireNotification } from "./desktop-notify.ts";

/** Minimum surface a caller's ctx must expose for the helper. */
export interface GuardedConfirmCtx {
	/**
	 * UI confirm function. When undefined the helper cannot show the
	 * dialog and returns approved=false so the caller can throw its own
	 * guard-error. Wrap `ctx.ui.confirm.bind(ctx.ui)` from an
	 * ExtensionContext, or pass the existing `ctx.confirmFn` from
	 * code-mode's sandbox tools — both shapes work.
	 */
	confirmFn?: (title: string, body: string) => Promise<boolean>;
	/**
	 * Optional approval-log sink. Called ONCE on approve with the full
	 * "✅ Hooman approved …" message. Sandbox callers wire this to their
	 * existing `logFn` so output continues to surface in the same way.
	 */
	logFn?: (msg: string) => void;
}

/** Inputs to a guarded confirm. */
export interface GuardedConfirmInput extends PendingConfirmMeta {
	/** Dialog title shown to the hooman. */
	title: string;
	/** Dialog body shown to the hooman. */
	body: string;
	/**
	 * Optional override for the approval-log message body. Defaults to
	 * `reason`. Use when the existing log message in the caller used a
	 * slightly different phrasing than the registry reason (e.g.
	 * "applyPatch X" in the log vs "applyPatch targets X" in the error).
	 */
	approvalSummary?: string;
}

export interface GuardedConfirmResult {
	approved: boolean;
}

/** See module docstring. */
export async function runGuardedConfirm(
	ctx: GuardedConfirmCtx,
	input: GuardedConfirmInput,
): Promise<GuardedConfirmResult> {
	if (!ctx.confirmFn) {
		// No UI available. Caller decides what to do (typically: throw a
		// guard-error). We do NOT fire desktop notification / register
		// the dialog here because there is no dialog to register.
		return { approved: false };
	}
	const handle = beginConfirm({
		source: input.source,
		tool: input.tool,
		reason: input.reason,
		context: input.context,
	});
	// Strip leading non-alphanumeric (emoji prefix) from the title for
	// the notification — keeps the desktop banner clean.
	const notifyTitle = input.title.replace(/^[^A-Za-z0-9]+/, "").trim() || input.source;
	fireNotification({
		title: notifyTitle,
		subtitle: `${input.tool} needs confirm`,
		body: input.reason,
	});
	try {
		const approved = await ctx.confirmFn(input.title, input.body);
		if (approved) {
			ctx.logFn?.(`✅ Hooman approved ${input.approvalSummary ?? input.reason} [OK]`);
		}
		return { approved };
	} finally {
		endConfirm(handle);
	}
}
