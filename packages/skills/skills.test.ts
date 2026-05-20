import { describe, expect, it } from "bun:test";
import skillsExtension from "./extensions/skills";

type SessionStartHandler = (event: { reason: string }, ctx: unknown) => void;

function createPi(
  execImpl: () => Promise<{ code: number; stdout: string; stderr: string }>,
) {
  let sessionStartHandler: SessionStartHandler | undefined;
  return {
    pi: {
      on(event: string, handler: SessionStartHandler) {
        if (event === "session_start") sessionStartHandler = handler;
      },
      registerCommand() {},
      exec: execImpl,
    },
    getSessionStartHandler() {
      if (!sessionStartHandler) {
        throw new Error("session_start handler not registered");
      }
      return sessionStartHandler;
    },
  };
}

const staleCtxError = new Error(
  "This extension ctx is stale after session replacement or reload.",
);

describe("skills extension stale context handling", () => {
  it("does not throw when session_start ctx is already stale before background checks", () => {
    let execCalls = 0;
    const { pi, getSessionStartHandler } = createPi(async () => {
      execCalls += 1;
      return { code: 0, stdout: "", stderr: "" };
    });
    skillsExtension(pi as never);

    const ctx = {
      get cwd(): string {
        throw staleCtxError;
      },
    };

    expect(() =>
      getSessionStartHandler()({ reason: "startup" }, ctx),
    ).not.toThrow();
    expect(execCalls).toBe(0);
  });

  it("does not leak stale ctx when status update races session replacement", async () => {
    const { pi, getSessionStartHandler } = createPi(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { code: 0, stdout: "updates available", stderr: "" };
    });
    skillsExtension(pi as never);

    let setStatusCalls = 0;
    const ctx = {
      cwd: "/tmp",
      ui: {
        setStatus() {
          setStatusCalls += 1;
          throw staleCtxError;
        },
      },
    };

    getSessionStartHandler()({ reason: "startup" }, ctx);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(setStatusCalls).toBe(1);
  });
});
