/**
 * FFF subprocess server
 *
 * Runs as a standalone Bun process that loads libfff_c.dylib via FFI.
 * Communicates with the parent pi session over stdin/stdout using JSON lines.
 *
 * This isolates the 10+ native Rust threads from the pi process.  When the
 * parent is idle it can kill this process and the threads go away.
 *
 * Protocol (JSON lines, one per line):
 *   → { id, method, params }
 *   ← { id, ok, value?, error? }
 */

// ── Load the native library ──────────────────────────────────────────────

let FileFinder: any;
try {
	const mod = await import("@ff-labs/fff-bun");
	FileFinder = mod.FileFinder;
	if (!FileFinder?.isAvailable?.()) {
		process.stderr.write("[fff-server] native library not available\n");
		process.exit(1);
	}
} catch (e) {
	process.stderr.write(`[fff-server] failed to load: ${e}\n`);
	process.exit(1);
}

// ── Idle auto-shutdown ───────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 5 * 60_000; // 5 minutes
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function resetIdleTimer() {
	if (idleTimer) clearTimeout(idleTimer);
	idleTimer = setTimeout(() => {
		try { FileFinder.destroy(); } catch {}
		process.exit(0);
	}, IDLE_TIMEOUT_MS);
}

resetIdleTimer();

// ── Request handlers ─────────────────────────────────────────────────────

type Handler = (params: any) => { ok: boolean; value?: any; error?: string };

const handlers: Record<string, Handler> = {
	init(params) {
		const result = FileFinder.init(params);
		if (!result.ok) return { ok: false, error: result.error };
		FileFinder.waitForScan(5000);
		return { ok: true };
	},

	destroy() {
		try { FileFinder.destroy(); } catch {}
		return { ok: true };
	},

	search(params) {
		const result = FileFinder.search(params.query, params.options);
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, value: result.value };
	},

	liveGrep(params) {
		const result = FileFinder.liveGrep(params.query, params.options);
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, value: result.value };
	},

	waitForScan(params) {
		const result = FileFinder.waitForScan(params.timeoutMs ?? 5000);
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, value: result.value };
	},

	reindex(params) {
		const result = FileFinder.reindex(params.newPath);
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true };
	},

	refreshGitStatus() {
		const result = FileFinder.refreshGitStatus();
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, value: result.value };
	},

	healthCheck(params) {
		const result = FileFinder.healthCheck(params?.testPath);
		if (!result.ok) return { ok: false, error: result.error };
		return { ok: true, value: result.value };
	},

	isInitialized() {
		return { ok: true, value: FileFinder.isInitialized() };
	},

	ping() {
		return { ok: true, value: "pong" };
	},
};

// ── stdin line reader ────────────────────────────────────────────────────

function respond(id: number | string, result: { ok: boolean; value?: any; error?: string }) {
	const line = JSON.stringify({ id, ...result });
	process.stdout.write(line + "\n");
}

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
	buffer += chunk;
	let newlineIdx: number;
	while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
		const line = buffer.slice(0, newlineIdx).trim();
		buffer = buffer.slice(newlineIdx + 1);
		if (!line) continue;

		resetIdleTimer();

		let msg: any;
		try {
			msg = JSON.parse(line);
		} catch {
			respond(0, { ok: false, error: "invalid JSON" });
			continue;
		}

		const { id, method, params } = msg;
		const handler = handlers[method];
		if (!handler) {
			respond(id, { ok: false, error: `unknown method: ${method}` });
			continue;
		}

		try {
			const result = handler(params ?? {});
			respond(id, result);
		} catch (e) {
			respond(id, { ok: false, error: e instanceof Error ? e.message : String(e) });
		}
	}
});

process.stdin.on("end", () => {
	try { FileFinder.destroy(); } catch {}
	process.exit(0);
});

// Signal that we're ready
process.stderr.write("[fff-server] ready\n");
