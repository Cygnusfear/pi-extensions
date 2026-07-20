export interface MaiCallResult {
  stdout: string;
  exitCode: number;
}

export type MaiCallInput =
  | {
      /** Exact process arguments. Values are passed byte-for-byte without shell parsing. */
      argv?: readonly string[];
      /** @deprecated Use argv for exact argument transport. */
      args?: never;
      cwd?: string;
    }
  | {
      /** @deprecated Shell-style command text cannot safely carry dynamic values. Use argv. */
      args: string;
      argv?: never;
      cwd?: string;
    };

export interface MaiProcessResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

export type MaiRunner = (
  argv: string[],
  cwd: string,
) => Promise<MaiProcessResult>;

export type MaiDirectoryResolver = (cwd?: string) => string;

/**
 * Build the callable mai CLI transport.
 *
 * `argv` is the canonical path: every element is copied into the child-process
 * argument vector unchanged. The legacy `args` string remains readable for
 * existing simple calls, but necessarily uses shell-style tokenization and must
 * never carry dynamic content.
 */
export function createMaiCall(
  run: MaiRunner,
  resolveDirectory: MaiDirectoryResolver,
  splitLegacyArgs: (input: string) => string[],
): (input?: MaiCallInput) => Promise<MaiCallResult> {
  return async (input: MaiCallInput = {}) => {
    const runtimeInput = input as {
      argv?: unknown;
      args?: unknown;
      cwd?: string;
    };

    if (runtimeInput.argv !== undefined && runtimeInput.args !== undefined) {
      throw new TypeError("maiCall accepts either argv or legacy args, not both");
    }

    let argv: string[];
    if (runtimeInput.argv !== undefined) {
      if (
        !Array.isArray(runtimeInput.argv) ||
        !runtimeInput.argv.every((value): value is string => typeof value === "string")
      ) {
        throw new TypeError("maiCall argv must be an array of strings");
      }
      argv = [...runtimeInput.argv];
    } else if (runtimeInput.args !== undefined) {
      if (typeof runtimeInput.args !== "string") {
        throw new TypeError("maiCall legacy args must be a string; use argv for exact values");
      }
      argv = splitLegacyArgs(runtimeInput.args);
    } else {
      argv = ["ls"];
    }

    const result = await run(argv, resolveDirectory(runtimeInput.cwd));
    const stdout = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
    return { stdout: stdout.trim(), exitCode: result.status ?? 1 };
  };
}
