/**
 * Sandbox environment allowlist (kal-fq41qj60).
 *
 * The code-mode sandbox used to receive `globalThis.process.env` - the host's REAL
 * environment object, by reference. On this box that carries provider API keys, so
 * any code inside execute_code could read secrets with no capability being granted
 * to it, and could WRITE to the host environment through the same reference.
 *
 * Two properties, both deliberate:
 *  - non-allowed names are ABSENT, not empty strings. `FOO=` reads as 'set but
 *    blank', which tools treat very differently from 'unset'; an allowlist that
 *    produces empty strings would create new failure modes instead of closing one.
 *  - the result is a fresh object. Returning a filtered VIEW of the host object, or
 *    the object itself, leaves host mutation open.
 *
 * This is secret-scope containment, not filesystem confinement: the built-in Bash
 * tool still executes host commands as the host user. Narrowing env does not make
 * the sandbox a jail, and it must not be described as one.
 */

/** Names always allowed: needed to run ordinary commands without leaking credentials. */
export const DEFAULT_SANDBOX_ENV_NAMES = [
	"PATH",
	"HOME",
	"USER",
	"SHELL",
	"LANG",
	"LC_ALL",
	"TZ",
	"TMPDIR",
	"TEMP",
	"TMP",
] as const;

/** Prefixes allowed wholesale - locale tuning carries no credentials. */
export const DEFAULT_SANDBOX_ENV_PREFIXES = ["LC_"] as const;

export interface SandboxEnvOptions {
	/**
	 * Additional exact names the HOST grants for this session, on top of the default
	 * allowlist - e.g. what a sandbox profile is known to need. Names, never values:
	 * the caller cannot inject an arbitrary object through this path.
	 */
	extraNames?: readonly string[];
}

function isDefaultAllowed(name: string): boolean {
	if ((DEFAULT_SANDBOX_ENV_NAMES as readonly string[]).includes(name)) return true;
	return DEFAULT_SANDBOX_ENV_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Build the sandbox's `process.env` from the host environment.
 *
 * Absent keys are skipped rather than emitted as empty strings, and the returned
 * object is always newly allocated.
 */
export function buildSandboxEnv(
	hostEnv: NodeJS.ProcessEnv | Record<string, string | undefined>,
	options?: SandboxEnvOptions,
): Record<string, string> {
	const extra = new Set(options?.extraNames ?? []);
	const out: Record<string, string> = {};
	for (const [name, value] of Object.entries(hostEnv)) {
		if (value === undefined) continue;
		if (!isDefaultAllowed(name) && !extra.has(name)) continue;
		out[name] = value;
	}
	return out;
}
