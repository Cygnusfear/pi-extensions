import { describe, test, expect } from "bun:test";
import { isGitUnsafeBash, isGitPath } from "./git-guards";

describe("Red Team Round 2: Git Safety Guards", () => {
	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 1: git -C /path reset --hard
	// Does the -C flag bypass detection?
	// ─────────────────────────────────────────────────────────────
	test("caught: git -C /path reset --hard (flag ordering — stripGitGlobalFlags)", () => {
		expect(isGitUnsafeBash("git -C /path reset --hard")).not.toBeNull();
	});

	test("catches: git reset --hard (standard form)", () => {
		expect(isGitUnsafeBash("git reset --hard")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 2: git filter-branch --force -- --all
	// Now caught — filter-branch is in DESTRUCTIVE_GIT_COMMANDS
	// ─────────────────────────────────────────────────────────────
	test("caught: git filter-branch --force -- --all (history rewrite)", () => {
		expect(isGitUnsafeBash("git filter-branch --force -- --all")).not.toBeNull();
	});

	test("caught: git filter-branch (without args)", () => {
		expect(isGitUnsafeBash("git filter-branch")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 3: git reflog expire --expire=now --all
	// Now caught — reflog expire is in DESTRUCTIVE_GIT_COMMANDS
	// ─────────────────────────────────────────────────────────────
	test("caught: git reflog expire --expire=now --all (destroys history)", () => {
		expect(isGitUnsafeBash("git reflog expire --expire=now --all")).not.toBeNull();
	});

	test("caught: git reflog expire", () => {
		expect(isGitUnsafeBash("git reflog expire")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 4: git update-ref -d HEAD
	// Not in DESTRUCTIVE_GIT_COMMANDS list
	// ─────────────────────────────────────────────────────────────
	test("BYPASS: git update-ref -d HEAD (deletes reference)", () => {
		expect(isGitUnsafeBash("git update-ref -d HEAD")).toBeNull();
	});

	test("BYPASS: git update-ref", () => {
		expect(isGitUnsafeBash("git update-ref")).toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 5: git symbolic-ref HEAD refs/heads/nonexistent
	// Not in DESTRUCTIVE_GIT_COMMANDS list
	// ─────────────────────────────────────────────────────────────
	test("BYPASS: git symbolic-ref HEAD refs/heads/nonexistent", () => {
		expect(isGitUnsafeBash("git symbolic-ref HEAD refs/heads/nonexistent")).toBeNull();
	});

	test("BYPASS: git symbolic-ref", () => {
		expect(isGitUnsafeBash("git symbolic-ref")).toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 6: nohup rm -rf .git/ &
	// Should be caught (rm + .git)
	// ─────────────────────────────────────────────────────────────
	test("catches: nohup rm -rf .git/ & (background rm)", () => {
		expect(isGitUnsafeBash("nohup rm -rf .git/ &")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 7: trap 'rm -rf .git' EXIT
	// Should be caught (rm + .git in trap)
	// ─────────────────────────────────────────────────────────────
	test("catches: trap 'rm -rf .git' EXIT (trap handler)", () => {
		expect(isGitUnsafeBash("trap 'rm -rf .git' EXIT")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 8: Heredoc cat > .git/config << EOF
	// Should be caught (redirect to .git/)
	// ─────────────────────────────────────────────────────────────
	test("catches: cat > .git/config << EOF (heredoc redirect)", () => {
		expect(isGitUnsafeBash("cat > .git/config << EOF")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 9: >| .git/config (force clobber)
	// BYPASS: Bare redirect without a command prefix is not caught
	// ─────────────────────────────────────────────────────────────
	test("caught: >| .git/config (clobber redirect — all redirect operators matched)", () => {
		expect(isGitUnsafeBash(">| .git/config")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 10: /bin/rm -rf .git/ and /usr/bin/rm -rf .git/
	// Should be caught (absolute path to rm + .git)
	// ─────────────────────────────────────────────────────────────
	test("catches: /bin/rm -rf .git/ (absolute path rm)", () => {
		expect(isGitUnsafeBash("/bin/rm -rf .git/")).not.toBeNull();
	});

	test("catches: /usr/bin/rm -rf .git/ (absolute path to usr bin rm)", () => {
		expect(isGitUnsafeBash("/usr/bin/rm -rf .git/")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 11: busybox rm -rf .git/
	// Should be caught (busybox rm + .git)
	// ─────────────────────────────────────────────────────────────
	test("catches: busybox rm -rf .git/ (busybox wrapper)", () => {
		expect(isGitUnsafeBash("busybox rm -rf .git/")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 12: grm -rf .git/ (GNU rm on macOS)
	// Now caught — grm is in WRITE_COMMANDS_RE
	// ─────────────────────────────────────────────────────────────
	test("caught: grm -rf .git/ (GNU rm alias)", () => {
		expect(isGitUnsafeBash("grm -rf .git/")).not.toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 13: git checkout --orphan empty && git rm -rf .
	// BYPASS: "git rm -rf ." only removes tracked files, not .git
	// ─────────────────────────────────────────────────────────────
	test("BYPASS: git checkout --orphan empty && git rm -rf . (tracked files only)", () => {
		expect(isGitUnsafeBash("git checkout --orphan empty && git rm -rf .")).toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 14: git branch -D main
	// BYPASS: "git branch -D" not in DESTRUCTIVE_GIT_COMMANDS
	// ─────────────────────────────────────────────────────────────
	test("BYPASS: git branch -D main (force delete branch)", () => {
		expect(isGitUnsafeBash("git branch -D main")).toBeNull();
	});

	test("BYPASS: git branch -D (without args)", () => {
		expect(isGitUnsafeBash("git branch -D")).toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// ATTACK VECTOR 15: False positives
	// These should all PASS (return null)
	// ─────────────────────────────────────────────────────────────
	test("catches: false positive: sed -i 's/foo/bar/' src/file.ts (normal sed)", () => {
		const result = isGitUnsafeBash("sed -i 's/foo/bar/' src/file.ts");
		expect(result).toBeNull();
	});

	test("catches: false positive: curl https://api.com (normal curl)", () => {
		const result = isGitUnsafeBash("curl https://api.com");
		expect(result).toBeNull();
	});

	test("catches: false positive: rsync src/ dest/ (normal rsync)", () => {
		const result = isGitUnsafeBash("rsync src/ dest/");
		expect(result).toBeNull();
	});

	test("catches: false positive: tar czf backup.tar.gz src/ (normal tar)", () => {
		const result = isGitUnsafeBash("tar czf backup.tar.gz src/");
		expect(result).toBeNull();
	});

	test("catches: false positive: patch src/file.ts < fix.patch (normal patch)", () => {
		const result = isGitUnsafeBash("patch src/file.ts < fix.patch");
		expect(result).toBeNull();
	});

	test("catches: false positive: wget https://example.com/file (normal wget)", () => {
		const result = isGitUnsafeBash("wget https://example.com/file");
		expect(result).toBeNull();
	});

	// ─────────────────────────────────────────────────────────────
	// Additional edge cases and variants
	// ─────────────────────────────────────────────────────────────

	test("catches: git checkout . (checkout current dir)", () => {
		expect(isGitUnsafeBash("git checkout .")).not.toBeNull();
	});

	test("catches: git checkout -- file.txt (checkout file)", () => {
		expect(isGitUnsafeBash("git checkout -- file.txt")).not.toBeNull();
	});

	test("catches: git clean -f (delete untracked)", () => {
		expect(isGitUnsafeBash("git clean -f")).not.toBeNull();
	});

	test("catches: git push --force (rewrite history)", () => {
		expect(isGitUnsafeBash("git push --force")).not.toBeNull();
	});

	test("catches: git push -f (short flag)", () => {
		expect(isGitUnsafeBash("git push -f")).not.toBeNull();
	});

	test("catches: git push --force-with-lease (allowed form)", () => {
		// This should be allowed per the spec (force-with-lease is safe)
		const result = isGitUnsafeBash("git push --force-with-lease");
		expect(result).toBeNull();
	});

	test("catches: git init in subdirectory", () => {
		expect(isGitUnsafeBash("cd subdir && git init")).not.toBeNull();
	});

	test("catches: git init alone", () => {
		expect(isGitUnsafeBash("git init")).not.toBeNull();
	});

	test("catches: mv .git .git.bak (rename .git)", () => {
		expect(isGitUnsafeBash("mv .git .git.bak")).not.toBeNull();
	});

	test("catches: cp -r .git /tmp/backup (copy .git)", () => {
		expect(isGitUnsafeBash("cp -r .git /tmp/backup")).not.toBeNull();
	});

	test("catches: chmod -R 000 .git (permission lock)", () => {
		expect(isGitUnsafeBash("chmod -R 000 .git")).not.toBeNull();
	});

	test("catches: redirect to .git without slash", () => {
		expect(isGitUnsafeBash("echo data > .git")).not.toBeNull();
	});

	// Additional bypass attempts
	test("BYPASS: git merge --force (not in destructive list)", () => {
		expect(isGitUnsafeBash("git merge --force")).toBeNull();
	});

	test("BYPASS: git rebase --force (not in destructive list)", () => {
		expect(isGitUnsafeBash("git rebase --force")).toBeNull();
	});

	test("BYPASS: git tag -d v1.0 (delete tag)", () => {
		expect(isGitUnsafeBash("git tag -d v1.0")).toBeNull();
	});

	test("BYPASS: git stash drop (drop stash)", () => {
		expect(isGitUnsafeBash("git stash drop")).toBeNull();
	});

	test("catches: rm command with .git subpath", () => {
		expect(isGitUnsafeBash("rm .git/config")).not.toBeNull();
	});

	test("catches: find with .git and delete", () => {
		expect(isGitUnsafeBash("find . -name .git -delete")).not.toBeNull();
	});

	test("catches: xargs rm with .git", () => {
		expect(isGitUnsafeBash("echo .git | xargs rm -rf")).not.toBeNull();
	});

	// isGitPath tests
	test("isGitPath: returns true for .git", () => {
		expect(isGitPath(".git")).toBe(true);
	});

	test("isGitPath: returns true for .git/", () => {
		expect(isGitPath(".git/")).toBe(true);
	});

	test("isGitPath: returns true for path with .git", () => {
		expect(isGitPath("repo/.git")).toBe(true);
	});

	test("isGitPath: returns true for .git/config", () => {
		expect(isGitPath(".git/config")).toBe(true);
	});

	test("isGitPath: returns false for .gitignore", () => {
		expect(isGitPath(".gitignore")).toBe(false);
	});

	test("isGitPath: returns false for .github", () => {
		expect(isGitPath(".github")).toBe(false);
	});

	test("isGitPath: returns false for .gitmodules", () => {
		expect(isGitPath(".gitmodules")).toBe(false);
	});

	test("isGitPath: case insensitive", () => {
		expect(isGitPath(".GIT/config")).toBe(true);
	});
});
