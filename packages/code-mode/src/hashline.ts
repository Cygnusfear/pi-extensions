import crypto from "node:crypto";

// =============================================================================
// Hashline types
// =============================================================================

export type HashlineEdit =
  | { set_line: { anchor: string; new_text: string } }
  | { replace_lines: { start_anchor: string; end_anchor: string; new_text: string } }
  | { insert_after: { anchor: string; text: string } };

// =============================================================================
// Hashline Engine (shared logic from hashline-tools.ts)
// =============================================================================

function computeLineHash(line: string): string {
  const normalized = (line.endsWith("\r") ? line.slice(0, -1) : line).replace(/\s+/g, "");
  return crypto.createHash("sha1").update(normalized).digest().subarray(0, 1).toString("hex");
}

export function formatHashLines(content: string, startLine = 1, endLine?: number): string {
  const lines = content.split("\n");
  const startIdx = Math.max(0, startLine - 1);
  const endIdx = endLine === undefined ? lines.length - 1 : Math.min(lines.length - 1, endLine - 1);
  const out: string[] = [];
  for (let i = startIdx; i <= endIdx; i += 1) {
    const line = lines[i] ?? "";
    out.push(`${i + 1}:${computeLineHash(line)}|${line}`);
  }
  return out.join("\n");
}

function parseAnchor(anchor: string): { line: number; hash: string } {
  const m = /^(\d+):([0-9a-fA-F]+)$/.exec(anchor.trim());
  if (!m) throw new Error(`Invalid anchor '${anchor}'. Expected '<line>:<hash>'.`);
  const line = Number(m[1]);
  if (!Number.isInteger(line) || line < 1)
    throw new Error(`Invalid anchor '${anchor}': line must be >= 1.`);
  return { line, hash: m[2].toLowerCase() };
}

function assertAnchorMatches(
  fileLines: string[],
  ref: { line: number; hash: string },
  which: string,
) {
  if (ref.line < 1 || ref.line > fileLines.length) {
    throw new Error(
      `${which} anchor line out of range: ${ref.line}. File has ${fileLines.length} line(s). Re-read the file.`,
    );
  }
  const actual = computeLineHash(fileLines[ref.line - 1] ?? "");
  if (actual !== ref.hash) {
    throw new Error(
      `${which} anchor mismatch at line ${ref.line}: expected ${ref.hash}, got ${actual}. Re-read the file and retry.`,
    );
  }
}

export function applyHashEdits(
  original: string,
  edits: HashlineEdit[],
): { updated: string; appliedEdits: number } {
  const hasTrailingNewline = original.endsWith("\n");
  const lines = original.split("\n");
  let applied = 0;

  for (const edit of edits) {
    if ("set_line" in edit) {
      const { line, hash } = parseAnchor(edit.set_line.anchor);
      assertAnchorMatches(lines, { line, hash }, "set_line");
      lines.splice(line - 1, 1, ...edit.set_line.new_text.split("\n"));
      applied += 1;
    } else if ("replace_lines" in edit) {
      const start = parseAnchor(edit.replace_lines.start_anchor);
      const end = parseAnchor(edit.replace_lines.end_anchor);
      if (end.line < start.line)
        throw new Error(`replace_lines invalid range: end ${end.line} < start ${start.line}.`);
      assertAnchorMatches(lines, start, "replace_lines(start)");
      assertAnchorMatches(lines, end, "replace_lines(end)");
      lines.splice(
        start.line - 1,
        end.line - start.line + 1,
        ...edit.replace_lines.new_text.split("\n"),
      );
      applied += 1;
    } else if ("insert_after" in edit) {
      const { line, hash } = parseAnchor(edit.insert_after.anchor);
      assertAnchorMatches(lines, { line, hash }, "insert_after");
      lines.splice(line, 0, ...edit.insert_after.text.split("\n"));
      applied += 1;
    }
  }

  let updated = lines.join("\n");
  if (hasTrailingNewline && !updated.endsWith("\n")) updated += "\n";
  if (!hasTrailingNewline && updated.endsWith("\n")) updated = updated.slice(0, -1);
  return { updated, appliedEdits: applied };
}

// =============================================================================
// Patch Engine (shared logic from file-tools.ts)
// =============================================================================

type PatchUpdateChunk = {
  old_lines: string[];
  new_lines: string[];
  change_context?: string;
  is_end_of_file?: boolean;
};

type PatchHunk =
  | { type: "add"; path: string; contents: string }
  | { type: "delete"; path: string }
  | { type: "update"; path: string; move_path?: string; chunks: PatchUpdateChunk[] };
