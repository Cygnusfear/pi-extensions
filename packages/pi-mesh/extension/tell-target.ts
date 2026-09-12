/**
 * How to attempt delivery of a tell to a target.
 *
 * This decision used to live in TWO copies - the mesh_tell tool and the code-mode
 * sandbox binding - and fixing one while the other stayed wrong is exactly what
 * cost an hour: the tool was patched, the suite was green, and tells still failed
 * because the sandbox copy answered first. One function now, so the next fix
 * cannot land in only half the system.
 *
 * Pure on purpose: the effects (durable mailbox, receipt wait, ack) stay at the
 * call sites, which makes the ordering rule below unit-testable.
 */

/** An explicit mesh address - a durable id or a client id (both UUID shaped).
 *  Unlike a nickname it needs no peer-map entry to be reachable: the topic is
 *  deterministic and the receiver subscribes to it. */
export function isExplicitMeshAddress(rawTarget: unknown): boolean {
	return (
		typeof rawTarget === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTarget.trim())
	);
}

export type TellAttempt = { kind: "route"; route: string } | { kind: "mailbox" };

/**
 * Ordered delivery attempts for a target, best first.
 *
 *  - resolvable through the peer map (id or nickname) -> route to it
 *  - an explicit address the map does not know        -> mailbox first (a hibernated
 *    pi session keeps store-and-forward), then its deterministic topic - a live
 *    listener such as the Telegram bridge is reached there instead of being
 *    declared undeliverable
 *  - anything else (unknown nickname, missing target) -> mailbox only, and the
 *    caller's honest 'undeliverable' receipt is the outcome
 */
export function tellAttempts(
	rawTarget: unknown,
	resolve: (target: string) => string,
): TellAttempt[] {
	if (typeof rawTarget !== "string" || !rawTarget.trim()) return [{ kind: "mailbox" }];
	try {
		return [{ kind: "route", route: resolve(rawTarget) }];
	} catch {
		const attempts: TellAttempt[] = [{ kind: "mailbox" }];
		if (isExplicitMeshAddress(rawTarget)) attempts.push({ kind: "route", route: rawTarget.trim() });
		return attempts;
	}
}
