import { describe, test, expect } from "bun:test";
import { isGitUnsafeBash, stripMessageBodies } from "./git-guards.ts";

const HARD = "git" + " reset" + " --hard"; // construct so the test file itself can be loaded

describe("stripMessageBodies — pure function", () => {
  test("strips double-quoted -m body", () => {
    expect(stripMessageBodies(`git tag -a x -m "Backup. recover: ${HARD}"`))
      .toBe(`git tag -a x -m "<MSG>"`);
  });

  test("strips single-quoted -m body", () => {
    expect(stripMessageBodies(`git tag -a x -m 'recover with ${HARD}'`))
      .toBe(`git tag -a x -m '<MSG>'`);
  });

  test("strips --message= form", () => {
    expect(stripMessageBodies(`git commit --message="undo ${HARD}"`))
      .toBe(`git commit --message="<MSG>"`);
  });

  test("strips --message <space> form", () => {
    expect(stripMessageBodies(`git commit --message "undo ${HARD}"`))
      .toBe(`git commit --message "<MSG>"`);
  });

  test("strips multi-line message body", () => {
    const input = `git tag -a x -m "line1\nline2 with ${HARD}\nline3"`;
    expect(stripMessageBodies(input)).toBe(`git tag -a x -m "<MSG>"`);
  });

  test("preserves escaped quotes inside double-quoted body", () => {
    const input = `git commit -m "say \\"hi\\" then ${HARD}"`;
    expect(stripMessageBodies(input)).toBe(`git commit -m "<MSG>"`);
  });

  test("leaves non-message args alone", () => {
    const input = `git push origin main`;
    expect(stripMessageBodies(input)).toBe(input);
  });

  test("strips multiple -m flags in same command (git commit allows several)", () => {
    const input = `git commit -m "title ${HARD}" -m "body ${HARD}"`;
    expect(stripMessageBodies(input)).toBe(`git commit -m "<MSG>" -m "<MSG>"`);
  });

  test("does NOT strip -F (file path, not message body)", () => {
    const input = `git commit -F /tmp/msg.txt`;
    expect(stripMessageBodies(input)).toBe(input);
  });
});

describe("isGitUnsafeBash — message-body false positive fix", () => {
  test("backup tag with dangerous-looking message body is allowed", () => {
    const cmd = `cd /repo && git tag -a paris-backup -m "Backup before rebase. To recover: ${HARD} <backup-tag>"`;
    expect(isGitUnsafeBash(cmd)).toBeNull();
  });

  test("backup tag with single-quoted message containing HARD is allowed", () => {
    const cmd = `git tag -a x -m 'recover via ${HARD}'`;
    expect(isGitUnsafeBash(cmd)).toBeNull();
  });

  test("commit message mentioning HARD is allowed", () => {
    const cmd = `git commit -m "fix: removed dependency on ${HARD} hack"`;
    expect(isGitUnsafeBash(cmd)).toBeNull();
  });

  test("commit --message= form mentioning HARD is allowed", () => {
    const cmd = `git commit --message="docs: warn against ${HARD}"`;
    expect(isGitUnsafeBash(cmd)).toBeNull();
  });

  test("multi-line tag message with HARD is allowed", () => {
    const cmd = [
      `git tag -a backup -m "Backup before rebase`,
      `6 commits ahead. Recover with:`,
      `  ${HARD} <backup-tag>`,
      `Then re-run the rebase."`,
    ].join("\n");
    expect(isGitUnsafeBash(cmd)).toBeNull();
  });
});

describe("isGitUnsafeBash — destructive commands still caught (regression lock)", () => {
  test("bare HARD HEAD~3 is still blocked", () => {
    const r = isGitUnsafeBash(`${HARD} HEAD~3`);
    expect(r?.type).toBe("destructive");
    expect(r?.reason).toContain(HARD);
  });

  test("git push --force is still blocked", () => {
    const r = isGitUnsafeBash("git push --force origin main");
    expect(r?.type).toBe("destructive");
  });

  test("compound: safe tag THEN real HARD is still caught (segment-level)", () => {
    // Bypass attempt: agent uses a tag command with HARD in message AND a real
    // HARD in the next segment. Verify the real one in a later segment is caught.
    const cmd = `git tag -a x -m "recover with ${HARD}" && ${HARD} HEAD~5`;
    const r = isGitUnsafeBash(cmd);
    expect(r?.type).toBe("destructive");
    expect(r?.reason).toContain(HARD);
  });

  test("compound: real HARD then safe tag is still caught", () => {
    const cmd = `${HARD} HEAD~5 && git tag -a x -m "after ${HARD}"`;
    const r = isGitUnsafeBash(cmd);
    expect(r?.type).toBe("destructive");
  });

  test("git tag with -m PLUS a real HARD outside the quoted body is caught", () => {
    // Adversarial: stuffs HARD in the message body to satisfy stripMessageBodies,
    // then runs HARD unquoted after the closing quote on the same line.
    const cmd = `git tag -m "harmless message"; ${HARD} HEAD~1`;
    const r = isGitUnsafeBash(cmd);
    expect(r?.type).toBe("destructive");
  });

  test("git checkout -- . is still blocked even if a prior -m has HARD inside", () => {
    const cmd = `git commit -m "noted ${HARD}"; git checkout -- .`;
    const r = isGitUnsafeBash(cmd);
    expect(r?.type).toBe("destructive");
  });
});
