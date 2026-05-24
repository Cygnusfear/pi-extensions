/**
 * tui-safe.ts — guard helpers that route extension errors to the user's
 * notification surface instead of letting them surface as raw host
 * `console.error` / `unhandledRejection` output.
 *
 * Why this matters:
 *   When a pi-extension throws inside a fire-and-forget promise, a setTimeout
 *   callback, a background poller, or an event listener, the rejection
 *   bubbles up to the host process. The host's default behavior is to print
 *   to stderr:
 *
 *     [host] unhandledRejection: <message>
 *     Error: <message>
 *         at <stack>
 *
 *   That output corrupts the TUI display, has no context for the hooman, and
 *   leaks internal stack details. Extensions MUST never let this happen.
 *
 * Contract:
 *   - Wrap any background async work that could reject and isn't user-awaited
 *     in `tuiSafe(fn, notify)` or attach `.catch(routeToTui)`.
 *   - Wrap any setTimeout/setInterval callback in `tuiSafeCallback(cb, notify)`.
 *   - Always pass a `notify` callable from your ExtensionContext
 *     (typically `ctx.ui.notify` bound on session_start).
 *
 * If no `notify` is provided (test contexts, headless), errors are silently
 * absorbed rather than surfaced — the explicit goal is "do not appear in the
 * host's console". Add explicit observation paths (mai notes, ouija entries,
 * logger calls) if you need persistence for debugging.
 */

export type TuiSafeLevel = "info" | "warning" | "error";
export type TuiSafeNotify = (message: string, level?: TuiSafeLevel) => void;

/**
 * Wrap an async function so any rejection routes to the TUI notification
 * surface instead of becoming an unhandledRejection. Returns the wrapped fn.
 *
 * @example
 *   const safeFetch = tuiSafe(async () => { ... }, ctx.ui.notify);
 *   safeFetch(); // no need to await; rejections route to TUI
 */
export function tuiSafe<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  notify?: TuiSafeNotify,
  level: TuiSafeLevel = "warning",
  prefix = "",
): (...args: Args) => Promise<R | undefined> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      routeToTui(err, notify, level, prefix);
      return undefined;
    }
  };
}

/**
 * Wrap a (possibly throwing) sync callback so any thrown error routes to the
 * TUI notification surface instead of crashing the surrounding context.
 * Use for setTimeout/setInterval/event-listener callbacks.
 *
 * @example
 *   setTimeout(tuiSafeCallback(() => doStuff(), ctx.ui.notify), 1000);
 */
export function tuiSafeCallback<Args extends unknown[], R>(
  cb: (...args: Args) => R,
  notify?: TuiSafeNotify,
  level: TuiSafeLevel = "warning",
  prefix = "",
): (...args: Args) => R | undefined {
  return (...args: Args) => {
    try {
      const result = cb(...args);
      // Sync-or-promise: if the callback returns a Promise, attach a catch.
      if (result && typeof (result as unknown as Promise<unknown>).then === "function") {
        return (result as unknown as Promise<unknown>).catch((err: unknown) => {
          routeToTui(err, notify, level, prefix);
          return undefined;
        }) as R;
      }
      return result;
    } catch (err) {
      routeToTui(err, notify, level, prefix);
      return undefined;
    }
  };
}

/**
 * Attach a TUI-safe catch handler to a Promise. Returns a Promise that
 * resolves with the original value on success, or `undefined` on rejection
 * (with the rejection routed to TUI).
 *
 * @example
 *   tuiSafeAwait(somePromise, ctx.ui.notify);
 *   // OR
 *   const value = await tuiSafeAwait(somePromise, ctx.ui.notify);
 */
export function tuiSafeAwait<T>(
  p: Promise<T>,
  notify?: TuiSafeNotify,
  level: TuiSafeLevel = "warning",
  prefix = "",
): Promise<T | undefined> {
  return p.then(
    (v) => v,
    (err) => {
      routeToTui(err, notify, level, prefix);
      return undefined;
    },
  );
}

/**
 * Route an error to the TUI notification surface. If no notify callback is
 * available, silently absorb (the explicit goal is "do not surface in the
 * host's console").
 *
 * Exported so extensions can route errors from custom-shaped callbacks (e.g.
 * stream handlers, DOM-style event handlers) that don't fit the helpers above.
 */
export function routeToTui(
  err: unknown,
  notify?: TuiSafeNotify,
  level: TuiSafeLevel = "warning",
  prefix = "",
): void {
  if (!notify) return;
  const msg = err instanceof Error ? err.message : String(err);
  const formatted = prefix ? `${prefix}: ${msg}` : msg;
  try { notify(formatted, level); } catch {}
}
