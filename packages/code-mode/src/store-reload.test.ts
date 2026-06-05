/**
 * Reload-survival of the $ store (the real "$ flakiness" bug).
 *
 * Bug: the $ store lived in a module-level singleton with no disk backing, so a
 * reload_runtime / pi restart-with-resume rebuilt it EMPTY mid-session and
 * silently wiped every $ var. Fix: session-scoped disk snapshot + hydrate.
 *
 * These tests recreate the store from the SAME path (= what happens on reload)
 * and assert vars survive — including the exact Arthur scenario where a worktree
 * path is set once, then only ever re-pinned (`const X = $.X`).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPersistentStore } from "./persistent-store";
import { createCodeModeSession, executeInSession, type ExecutionDeps } from "./session-factory";

let dir: string;
let storePath: string;
// Track every store/session so afterEach can cancel pending debounced flushes —
// otherwise a 500ms timer fires during a later test file and pollutes global fs spies.
const created: Array<{ dispose?: () => void }> = [];
function track<T extends { dispose?: () => void }>(s: T): T {
	created.push(s);
	return s;
}

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-reload-"));
	storePath = path.join(dir, "sess-abc.code-mode-store.json");
});
afterEach(() => {
	for (const s of created.splice(0)) {
		try {
			s.dispose?.();
		} catch {}
	}
	fs.rmSync(dir, { recursive: true, force: true });
});

function makeDeps(overrides?: Partial<ExecutionDeps>): ExecutionDeps {
	return {
		signal: new AbortController().signal,
		cwd: dir,
		model: { provider: "test", id: "t" },
		modelRegistry: {} as any,
		injectSessionApi: false,
		injectConsoleWake: false,
		injectRunbookRun: false,
		skipToolInjection: true,
		bindings: {},
		...overrides,
	};
}

describe("$ store survives reload (disk snapshot)", () => {
	test("vars set in process A are restored in process B (same path)", async () => {
		const a = track(createPersistentStore({ storePath }));
		(a.proxy as any).wt = "/Users/alex/.worktrees/feature-x";
		(a.proxy as any).config = { tier: "pro", n: 3 };
		a.flush();

		const b = track(createPersistentStore({ storePath }));
		expect((b.proxy as any).wt).toBe("/Users/alex/.worktrees/feature-x");
		expect((b.proxy as any).config).toEqual({ tier: "pro", n: 3 });
	});

	test("ARTHUR SCENARIO: set-once worktree path survives reload + re-pin, does NOT go undefined", async () => {
		const a = track(createPersistentStore({ storePath }));
		(a.proxy as any).SSW = "/Users/alex/gso/.worktrees/scope-setter";
		a.flush();

		// RELOAD (the resume that wiped Arthur's store)
		const b = track(createPersistentStore({ storePath }));
		const repinned = (b.proxy as any).SSW; // const SSW = $.SSW
		expect(repinned).toBe("/Users/alex/gso/.worktrees/scope-setter"); // was: undefined
	});

	test("deletes survive reload (cleared var stays cleared)", async () => {
		const a = track(createPersistentStore({ storePath }));
		(a.proxy as any).x = 1;
		delete (a.proxy as any).x;
		a.flush();
		const b = track(createPersistentStore({ storePath }));
		expect((b.proxy as any).x).toBeUndefined();
	});

	test("__reset survives reload", async () => {
		const a = track(createPersistentStore({ storePath }));
		(a.proxy as any).x = 1;
		(a.proxy as any).y = 2;
		a.flush();
		(a.proxy as any).__reset();
		const b = track(createPersistentStore({ storePath }));
		expect((b.proxy as any).x).toBeUndefined();
		expect((b.proxy as any).y).toBeUndefined();
	});

	test("non-serializable vars (promise/function) don't break the snapshot; serializable neighbours survive", async () => {
		const a = track(createPersistentStore({ storePath }));
		(a.proxy as any).good = "/path";
		(a.proxy as any).p = Promise.resolve(42); // can't round-trip
		(a.proxy as any).fn = () => 1;
		a.flush();
		const b = track(createPersistentStore({ storePath }));
		expect((b.proxy as any).good).toBe("/path");
		expect((b.proxy as any).p).toBeUndefined(); // promise recreated, not restored as {}
		expect((b.proxy as any).fn).toBeUndefined();
	});

	test("late bindPersistence hydrates prior snapshot; in-memory value wins over disk", async () => {
		const seed = track(createPersistentStore({ storePath }));
		(seed.proxy as any).a = "disk";
		(seed.proxy as any).b = "disk-b";
		seed.flush();

		const live = track(createPersistentStore({}));
		(live.proxy as any).a = "memory";
		live.bindPersistence(storePath);
		expect((live.proxy as any).a).toBe("memory"); // in-memory wins
		expect((live.proxy as any).b).toBe("disk-b"); // hydrated from disk
	});

	test("end-to-end via executeInSession: a run sets $.wt, a fresh session reloads it", async () => {
		const sessA = createCodeModeSession({ storePath });
		track(sessA.store);
		await executeInSession(sessA, `$.wt = "/work/tree";`, makeDeps());
		const sessB = createCodeModeSession({ storePath });
		track(sessB.store);
		const r = await executeInSession(sessB, `console.log($.wt);`, makeDeps());
		expect(r.output.trim()).toBe("/work/tree");
	});
});
