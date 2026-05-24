import { describe, test, expect, mock } from "bun:test";
import { tuiSafe, tuiSafeCallback, tuiSafeAwait, routeToTui } from "./tui-safe.ts";

describe("tui-safe", () => {
  describe("tuiSafe (async fn wrapper)", () => {
    test("returns value on success", async () => {
      const notify = mock(() => {});
      const wrapped = tuiSafe(async () => 42, notify);
      expect(await wrapped()).toBe(42);
      expect(notify).not.toHaveBeenCalled();
    });

    test("routes rejection to notify, returns undefined", async () => {
      const notify = mock(() => {});
      const wrapped = tuiSafe(async () => { throw new Error("boom"); }, notify);
      expect(await wrapped()).toBeUndefined();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify.mock.calls[0][0]).toBe("boom");
      expect(notify.mock.calls[0][1]).toBe("warning");
    });

    test("uses custom level + prefix", async () => {
      const notify = mock(() => {});
      const wrapped = tuiSafe(async () => { throw new Error("oops"); }, notify, "error", "myext");
      await wrapped();
      expect(notify.mock.calls[0][0]).toBe("myext: oops");
      expect(notify.mock.calls[0][1]).toBe("error");
    });

    test("absorbs silently when notify is undefined", async () => {
      const wrapped = tuiSafe(async () => { throw new Error("x"); });
      expect(await wrapped()).toBeUndefined();
    });
  });

  describe("tuiSafeCallback (sync/promise callback wrapper)", () => {
    test("returns value on sync success", () => {
      const notify = mock(() => {});
      const wrapped = tuiSafeCallback(() => "ok", notify);
      expect(wrapped()).toBe("ok");
      expect(notify).not.toHaveBeenCalled();
    });

    test("catches sync throws and routes to notify", () => {
      const notify = mock(() => {});
      const wrapped = tuiSafeCallback(() => { throw new Error("sync-err"); }, notify);
      expect(wrapped()).toBeUndefined();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify.mock.calls[0][0]).toBe("sync-err");
    });

    test("catches async (Promise-returning) callback rejections", async () => {
      const notify = mock(() => {});
      const wrapped = tuiSafeCallback(() => Promise.reject(new Error("async-err")), notify);
      const result = wrapped();
      expect(result).toBeDefined();
      await result; // wait for the catch
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify.mock.calls[0][0]).toBe("async-err");
    });
  });

  describe("tuiSafeAwait (promise wrapper)", () => {
    test("returns value on success", async () => {
      const notify = mock(() => {});
      expect(await tuiSafeAwait(Promise.resolve("v"), notify)).toBe("v");
      expect(notify).not.toHaveBeenCalled();
    });

    test("routes rejection to notify, returns undefined", async () => {
      const notify = mock(() => {});
      expect(await tuiSafeAwait(Promise.reject(new Error("p-err")), notify)).toBeUndefined();
      expect(notify.mock.calls[0][0]).toBe("p-err");
    });
  });

  describe("routeToTui (direct error router)", () => {
    test("formats Error.message", () => {
      const notify = mock(() => {});
      routeToTui(new Error("hello"), notify);
      expect(notify.mock.calls[0][0]).toBe("hello");
    });

    test("formats non-Error to string", () => {
      const notify = mock(() => {});
      routeToTui("string error", notify);
      expect(notify.mock.calls[0][0]).toBe("string error");
    });

    test("absorbs silently with no notify", () => {
      // Should not throw.
      routeToTui(new Error("x"));
    });

    test("absorbs notify-throws without crashing caller", () => {
      const badNotify = () => { throw new Error("notify itself failed"); };
      // Should not throw.
      routeToTui(new Error("x"), badNotify);
    });
  });

  describe("real-world: fire-and-forget background promise no longer crashes host", () => {
    test("rejection routes silently when notify available", async () => {
      const notify = mock(() => {});
      // Pattern: fire a promise into space, don't await
      const promise = tuiSafeAwait((async () => { throw new Error("bg-fail"); })(), notify);
      await promise;
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });
});
