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
