/**
 * Delivery across the run boundary.
 *
 * pi hands an extension message to a running agent by parking it in that run's queue: while
 * the session is streaming, `sendCustomMessage` calls `agent.followUp()` instead of opening
 * a turn. The run drains that queue only if it reaches its post-run continuation, and an
 * aborted run never does — the agent loop returns at its `stopReason === "aborted"` branch,
 * before the follow-up poll, and the aborted run suppresses the post-run `agent.continue()`
 * that would otherwise pick the queue up. A message parked there stays unread until some
 * later run finishes on its own, and is lost if the session exits first.
 *
 * This queue moves such a delivery across the boundary instead: handed over now when no run
 * is live, otherwise armed and released at `agent_settled`, where the session is idle and
 * `triggerTurn` opens a fresh run rather than parking the message in a queue nothing reads.
 *
 * A STEERING delivery (`deliverAs: "steer"`) does not belong here. Its contract is to land
 * at the live run's next reasoning boundary without killing in-flight work, so pi parks it in
 * the steering queue on purpose and the loop polls that queue at the start of every turn.
 */

/**
 * RECIPROCAL NOTE (kaliv3 v4 inbound seam, 2026-10-07). The fleet has its OWN copy of this decision —
 * kaliv3 packages/runner/src/inbound-delivery.ts — because the runner cannot import pi-extensions: the fleet pins
 * extensions as loaded FILES, not as a package dependency, and exporting this module would have dragged a
 * PI_EXTENSIONS_PIN bump into the wake fix (ruled by Jackie, 2026-10-07T18:07Z). So the rule lives twice on purpose:
 * here for the operator's session, there for a fleet session. Consolidation is a later lane riding a future pin bump,
 * and when it happens the runner's copy is the thing to delete.
 *
 * WHY THE RULE EXISTS AT ALL, in one line, because it is the same in both places: a message handed to a RUNNING session
 * is parked in that run's queue, and an ABORTED run never reaches the continuation that drains it.
 */
export interface RunBoundaryDelivery {
	/**
	 * Hand `deliver` to the session as soon as no run is live: immediately when the session
	 * is idle, otherwise at the settled boundary of the run that is live now.
	 */
	send(deliver: () => void): void;
	/** Release every armed delivery, in arrival order. Call from `agent_settled`. */
	drain(): void;
}

export function createRunBoundaryDelivery(isRunLive: () => boolean): RunBoundaryDelivery {
	const armed: Array<() => void> = [];
	return {
		send(deliver) {
			if (!isRunLive()) {
				deliver();
				return;
			}
			armed.push(deliver);
		},
		drain() {
			// Take the batch before running it: a delivery that arms while the drain runs
			// targets the run it is about to start, so it waits for that run's boundary.
			const batch = armed.splice(0, armed.length);
			for (const deliver of batch) deliver();
		},
	};
}
