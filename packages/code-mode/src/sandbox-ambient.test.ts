import { describe, expect, test } from "bun:test";
import { runInContext } from "node:vm";
import { createCodeModeSession } from "./session-factory.ts";

/**
 * kal-v3ounic4 / kal-0q4nb1ae: an actor inside the code-mode vm must have no AMBIENT
 * machine access. Every assertion below reaches for a capability by a different route,
 * including the route a name-only check misses: building a function through the
 * Function constructor and asking that realm what it can see.
 *
 * The expected values here were MEASURED against this context, not assumed - an audit
 * that asserts what the author guessed will pass for the wrong reason.
 */
const session = createCodeModeSession({ cwd: "/tmp" });
const probe = (expr: string): unknown =>
  runInContext("(" + expr + ")", session.context, { timeout: 2000 });

// Names a module loader would have to be bound under. Built as a fragment so the
// assertion above stays a single readable line.
const LOADER_NAMES =
  "Object.getOwnPropertyNames(globalThis).filter(function (n) {" +
  "  return n === 'require' || n === 'module' || n === 'exports';" +
  "})";

describe("code-mode vm context exposes no ambient machine access (kal-v3ounic4)", () => {
  test("no module loader is bound in the context", () => {
    expect(probe("typeof require")).toBe("undefined");
    expect(probe("typeof module")).toBe("undefined");
    expect(probe(LOADER_NAMES)).toEqual([]);
  });

  test("the exposed process is a narrowed literal, not the host process object", () => {
    expect(probe("Object.keys(process)")).toEqual(["env", "cwd", "platform", "pid"]);
    expect(probe("typeof process.binding")).toBe("undefined");
    expect(probe("typeof process._linkedBinding")).toBe("undefined");
    expect(probe("typeof process.getBuiltinModule")).toBe("undefined");
    expect(probe("typeof process.dlopen")).toBe("undefined");
    expect(probe("typeof process.mainModule")).toBe("undefined");
  });

  test("the Function-constructor realm sees the same narrowed process and no loader", () => {
    // This is the escape an auditor is most likely to miss: code-mode names nothing
    // dangerous, so a key-inventory check passes while a constructed function could
    // in principle reach the host realm. It cannot here.
    expect(probe("Function('return typeof require')()")).toBe("undefined");
    expect(probe("Function('return typeof process')()")).toBe("object");
    expect(probe("Function('return Object.keys(process)')()")).toEqual(["env", "cwd", "platform", "pid"]);
    expect(probe("Function('return typeof process.binding')()")).toBe("undefined");
  });

  test("no credential-shaped environment name is visible in the sandbox (kal-fq41qj60)", () => {
    // Was an OPEN FINDING: the narrowed process still carried the host's entire
    // env, so secrets were ambient by another route. Now it is an assertion. The
    // host genuinely holds 8 credential-shaped names on this box, so a leak of the
    // whole object would fail this loudly rather than pass quietly.
    const names = probe("Object.keys(process.env)") as string[];
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(n))).toEqual([]);
    expect(probe("typeof process.env.OPENAI_API_KEY")).toBe("undefined");
    expect(probe("'OPENAI_API_KEY' in process.env")).toBe(false);
    // basic operability is preserved, and writes stay inside the sandbox copy
    expect(probe("typeof process.env.PATH")).toBe("string");
    expect(probe("typeof process.env.HOME")).toBe("string");
    expect(probe("(() => { process.env.SCRATCH = 'x'; return 'SCRATCH' in process.env; })()")).toBe(true);
    expect(probe("process.env === undefined")).toBe(false);
  });
});
