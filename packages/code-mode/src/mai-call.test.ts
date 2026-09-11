import { describe, expect, test } from "bun:test";
import {
  createMaiCall,
  type MaiProcessResult,
  type MaiRunner,
} from "./mai-call";
import { splitShellArgs } from "./shell-utils";
import { createToolBindings } from "./sandbox-tools";

interface CapturedInvocation {
  argv: string[];
  cwd: string;
}

function createHarness(result?: Partial<MaiProcessResult>) {
  const invocations: CapturedInvocation[] = [];
  const run: MaiRunner = async (argv, cwd) => {
    invocations.push({ argv, cwd });
    return {
      stdout: result?.stdout ?? "ok\n",
      stderr: result?.stderr ?? "",
      status: result && "status" in result ? result.status ?? null : 0,
    };
  };
  const call = createMaiCall(
    run,
    (cwd) => cwd ?? "/default",
    splitShellArgs,
  );
  return { call, invocations };
}

describe("maiCall exact argv transport", () => {
  test("preserves arbitrary dynamic values as exact process arguments", async () => {
    const body = [
      "# Epic",
      "",
      "Windows path: C:\\Users\\Hooman",
      'Quotes: "double" and \'single\'',
      "Shell-shaped text: $(cat /tmp/epic-body.md) $HOME `whoami`",
      "Trailing newline follows",
      "",
    ].join("\n");
    const input = ["-C", "../gso-prod", "edit", "gp-umo8jj80", "-d", body, ""] as const;
    const { call, invocations } = createHarness();

    await call({ argv: input, cwd: "/workspace" });

    expect(invocations).toEqual([{ argv: [...input], cwd: "/workspace" }]);
    expect(invocations[0].argv[5]).toBe(body);
    expect(invocations[0].argv[6]).toBe("");
    expect(input[5]).toBe(body);
  });

  test("uses ls only when neither argv nor legacy args is supplied", async () => {
    const { call, invocations } = createHarness();

    await call();
    await call({ argv: [] });

    expect(invocations).toEqual([
      { argv: ["ls"], cwd: "/default" },
      { argv: [], cwd: "/default" },
    ]);
  });

  test("keeps legacy shell-style string calls working", async () => {
    const { call, invocations } = createHarness();

    await call({ args: "show 'gp-umo8jj80'" });

    expect(invocations).toEqual([
      { argv: ["show", "gp-umo8jj80"], cwd: "/default" },
    ]);
  });

  test("rejects ambiguous or malformed runtime inputs before spawning", async () => {
    const { call, invocations } = createHarness();

    await expect(call({ argv: ["ls"], args: "ls" } as never)).rejects.toThrow(
      "either argv or legacy args",
    );
    await expect(call({ argv: ["ls", 42] } as never)).rejects.toThrow(
      "argv must be an array of strings",
    );
    await expect(call({ args: ["ls"] } as never)).rejects.toThrow(
      "legacy args must be a string",
    );
    expect(invocations).toEqual([]);
  });

  test("is wired into the public sandbox maiCall binding", async () => {
    const tools = createToolBindings({ cwd: "/tmp", images: [] }) as {
      maiCall: (input: unknown) => Promise<unknown>;
    };

    await expect(
      tools.maiCall({ argv: ["ls"], args: "ls" }),
    ).rejects.toThrow("either argv or legacy args");
  });

  test("rejects a non-string title instead of sending [object Object] to mai", async () => {
    const tools = createToolBindings({ cwd: "/tmp", images: [] }) as {
      mai: {
        artifact: (title: unknown, opts?: unknown) => Promise<unknown>;
        constraint: (title: unknown, opts?: unknown) => Promise<unknown>;
      };
    };

    // The object form is the mistake that used to reach the CLI as the string
    // "[object Object]", silently creating a note with a garbage title and no body.
    await expect(tools.mai.artifact({ title: "Handoff", body: "x", tags: "a" })).rejects.toThrow(
      "title must be a non-empty string",
    );
    await expect(tools.mai.constraint({ title: "Rule", body: "y" })).rejects.toThrow(
      "title must be a non-empty string",
    );
    await expect(tools.mai.artifact("")).rejects.toThrow("title must be a non-empty string");
    await expect(tools.mai.artifact(null)).rejects.toThrow("title must be a non-empty string");
    // The error must name the shape the caller probably meant, so the next attempt succeeds.
    await expect(tools.mai.artifact({ title: "Handoff" })).rejects.toThrow("positional string");
  });

  test("retains the existing combined stdout and exit-code contract", async () => {
    const { call } = createHarness({ stdout: "out\n", stderr: "warn\n", status: null });

    await expect(call({ argv: ["ls"] })).resolves.toEqual({
      stdout: "out\n\nwarn",
      exitCode: 1,
    });
  });
});
