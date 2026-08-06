import type { MeshIdentity } from "@pi-extensions/shared/session-nickname";

export interface ZmxSessionEnvironment {
	ZMX_SESSION?: string;
}

export interface ZmxSessionReconciliation {
	identity: MeshIdentity;
	changed: boolean;
}

/** Read the explicit zmx coordinate inherited by the current Pi process. */
export function readZmxSession(environment: ZmxSessionEnvironment): string | undefined {
	const value = environment.ZMX_SESSION?.trim();
	return value ? value : undefined;
}

/**
 * Make a durable mesh identity reflect the current process's zmx coordinate.
 *
 * The environment is authoritative. In particular, resuming the same Pi
 * session outside zmx removes a previously persisted coordinate instead of
 * advertising a stale terminal location.
 */
export function reconcileZmxSession(
	identity: MeshIdentity,
	zmxSession: string | undefined,
): ZmxSessionReconciliation {
	const hasStoredCoordinate = Object.prototype.hasOwnProperty.call(identity, "zmxSession");
	if (
		identity.zmxSession === zmxSession &&
		(zmxSession !== undefined || !hasStoredCoordinate)
	) {
		return { identity, changed: false };
	}

	const { zmxSession: _storedCoordinate, ...identityWithoutZmxSession } = identity;
	const reconciled: MeshIdentity =
		zmxSession === undefined
			? identityWithoutZmxSession
			: { ...identityWithoutZmxSession, zmxSession };
	return { identity: reconciled, changed: true };
}
