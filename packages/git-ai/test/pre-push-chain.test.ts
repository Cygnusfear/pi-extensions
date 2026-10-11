/**
 * git-ai pre-push dispatcher (mah-6hf840df).
 *
 * While core.hooksPath points at this package, Git never runs the repository's
 * own .git/hooks/pre-push. The bundled pre-push must act as a dispatcher: run
 * that hook with Git's args AND the ref list on stdin, refuse the push when the
 * local hook refuses, and still hand git-lfs the same ref list — both consumers
 * read stdin, so chaining must not starve LFS of the refs it uploads from.
 *
 * The real hook and its real lib are spawned as a subprocess. The repo-local
 * hook and git-lfs are fakes that log what they actually received, so the
 * assertions are about what crossed the seam, not about the hook's belief.
 */
import { afterEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(import.meta.dir, "..", "hooks", "pre-push");
const REMOTE = ["origin", "git@example.com:repo.git"];
const REFS =
	[
		"refs/heads/main 7b1d0a1 refs/heads/main 0000000000000000000000000000000000000000",
		"refs/tags/v1.2.3 a1b2c3d refs/tags/v1.2.3 0000000000000000000000000000000000000000",
	].join("\n") + "\n";

const ACCEPTING_LOCAL_HOOK = `#!/bin/sh
printf '%s' "$*" > "$GIT_AI_TEST_LOG/local.args"
cat > "$GIT_AI_TEST_LOG/local.stdin"
exit 0
`;

const REFUSING_LOCAL_HOOK = `#!/bin/sh
printf '%s' "$*" > "$GIT_AI_TEST_LOG/local.args"
cat > "$GIT_AI_TEST_LOG/local.stdin"
exit 3
`;

const FAKE_GIT_LFS = `#!/bin/sh
printf '%s' "$*" > "$GIT_AI_TEST_LOG/lfs.args"
cat > "$GIT_AI_TEST_LOG/lfs.stdin"
exit 0
`;

let root: string | undefined;

afterEach(() => {
	if (root) rmSync(root, { recursive: true, force: true });
	root = undefined;
});

function runPrePush(localHook?: string) {
	root = mkdtempSync(join(tmpdir(), "git-ai-pre-push-"));
	const hooksDir = join(root, "hooks");
	const binDir = join(root, "bin");
	mkdirSync(hooksDir);
	mkdirSync(binDir);

	if (localHook !== undefined) {
		writeFileSync(join(hooksDir, "pre-push"), localHook);
		chmodSync(join(hooksDir, "pre-push"), 0o755);
	}
	writeFileSync(join(binDir, "git-lfs"), FAKE_GIT_LFS);
	chmodSync(join(binDir, "git-lfs"), 0o755);

	const res = spawnSync("bash", [HOOK, ...REMOTE], {
		input: REFS,
		encoding: "utf8",
		env: {
			...process.env,
			PI_REAL_HOOKS_DIR: hooksDir,
			GIT_AI_TEST_LOG: root,
			PATH: `${binDir}:${process.env.PATH ?? ""}`,
		},
	});

	const log = (name: string): string | null =>
		existsSync(join(root!, name)) ? readFileSync(join(root!, name), "utf8") : null;

	return {
		status: res.status,
		stderr: res.stderr,
		localArgs: log("local.args"),
		localStdin: log("local.stdin"),
		lfsArgs: log("lfs.args"),
		lfsStdin: log("lfs.stdin"),
	};
}

test("chains the repo-local pre-push with Git's args and ref list, and still feeds git-lfs", () => {
	const run = runPrePush(ACCEPTING_LOCAL_HOOK);

	expect(run.status).toBe(0);
	expect(run.localArgs).toBe(REMOTE.join(" "));
	expect(run.localStdin).toBe(REFS);
	expect(run.lfsArgs).toBe(["pre-push", ...REMOTE].join(" "));
	expect(run.lfsStdin).toBe(REFS);
});

test("a repo-local refusal stops the push with its exit code and never reaches git-lfs", () => {
	const run = runPrePush(REFUSING_LOCAL_HOOK);

	expect(run.status).toBe(3);
	expect(run.localStdin).toBe(REFS);
	expect(run.lfsArgs).toBeNull();
	expect(run.lfsStdin).toBeNull();
});

test("with no repo-local pre-push the git-lfs path still receives the ref list", () => {
	const run = runPrePush();

	expect(run.status).toBe(0);
	expect(run.lfsArgs).toBe(["pre-push", ...REMOTE].join(" "));
	expect(run.lfsStdin).toBe(REFS);
});
