import fs from "node:fs";

// =============================================================================
// Patch types
// =============================================================================

export type PatchUpdateChunk = {
  old_lines: string[];
  new_lines: string[];
  change_context?: string;
  is_end_of_file?: boolean;
};

export type PatchHunk =
  | { type: "add"; path: string; contents: string }
  | { type: "delete"; path: string }
  | { type: "update"; path: string; move_path?: string; chunks: PatchUpdateChunk[] };

// =============================================================================
// Patch Engine (shared logic from file-tools.ts)
// =============================================================================

function parsePatchHeader(
  lines: string[],
  startIdx: number,
): { filePath: string; movePath?: string; nextIdx: number } | null {
  const line = lines[startIdx];
  if (line.startsWith("*** Add File:")) {
    const filePath = line.split(":", 2)[1]?.trim();
    return filePath ? { filePath, nextIdx: startIdx + 1 } : null;
  }
  if (line.startsWith("*** Delete File:")) {
    const filePath = line.split(":", 2)[1]?.trim();
    return filePath ? { filePath, nextIdx: startIdx + 1 } : null;
  }
  if (line.startsWith("*** Update File:")) {
    const filePath = line.split(":", 2)[1]?.trim();
    let movePath: string | undefined;
    let nextIdx = startIdx + 1;
    if (nextIdx < lines.length && lines[nextIdx].startsWith("*** Move to:")) {
      movePath = lines[nextIdx].split(":", 2)[1]?.trim();
      nextIdx += 1;
    }
    return filePath ? { filePath, movePath, nextIdx } : null;
  }
  return null;
}

function parseUpdateChunks(
  lines: string[],
  startIdx: number,
): { chunks: PatchUpdateChunk[]; nextIdx: number } {
  const chunks: PatchUpdateChunk[] = [];
  let i = startIdx;
  while (i < lines.length && !lines[i].startsWith("***")) {
    if (lines[i].startsWith("@@")) {
      const contextLine = lines[i].substring(2).trim();
      i += 1;
      const oldLines: string[] = [];
      const newLines: string[] = [];
      let isEndOfFile = false;
      while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("***")) {
        const cl = lines[i];
        if (cl === "*** End of File") {
          isEndOfFile = true;
          i += 1;
          break;
        }
        if (cl.startsWith(" ")) {
          const c = cl.substring(1);
          oldLines.push(c);
          newLines.push(c);
        } else if (cl.startsWith("-")) {
          oldLines.push(cl.substring(1));
        } else if (cl.startsWith("+")) {
          newLines.push(cl.substring(1));
        }
        i += 1;
      }
      chunks.push({
        old_lines: oldLines,
        new_lines: newLines,
        change_context: contextLine || undefined,
        is_end_of_file: isEndOfFile || undefined,
      });
    } else {
      i += 1;
    }
  }
  return { chunks, nextIdx: i };
}

function parseAddContent(lines: string[], startIdx: number): { content: string; nextIdx: number } {
  let content = "";
  let i = startIdx;
  while (i < lines.length && !lines[i].startsWith("***")) {
    if (lines[i].startsWith("+")) content += lines[i].substring(1) + "\n";
    i += 1;
  }
  if (content.endsWith("\n")) content = content.slice(0, -1);
  return { content, nextIdx: i };
}

export function parsePatchText(patchText: string): PatchHunk[] {
  const cleaned = patchText.trim();
  // Strip heredoc wrapper if present
  const heredocMatch = cleaned.match(/^(?:cat\s+)?<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*$/);
  const text = heredocMatch ? heredocMatch[2] : cleaned;
  const lines = text.split("\n");

  const beginIdx = lines.findIndex((l) => l.trim() === "*** Begin Patch");
  const endIdx = lines.findIndex((l) => l.trim() === "*** End Patch");
  if (beginIdx === -1 || endIdx === -1 || beginIdx >= endIdx) {
    throw new Error("Invalid patch format: missing Begin/End markers");
  }

  const hunks: PatchHunk[] = [];
  let i = beginIdx + 1;
  while (i < endIdx) {
    const header = parsePatchHeader(lines, i);
    if (!header) {
      i += 1;
      continue;
    }
    if (lines[i].startsWith("*** Add File:")) {
      const { content, nextIdx } = parseAddContent(lines, header.nextIdx);
      hunks.push({ type: "add", path: header.filePath, contents: content });
      i = nextIdx;
    } else if (lines[i].startsWith("*** Delete File:")) {
      hunks.push({ type: "delete", path: header.filePath });
      i = header.nextIdx;
    } else if (lines[i].startsWith("*** Update File:")) {
      const { chunks, nextIdx } = parseUpdateChunks(lines, header.nextIdx);
      hunks.push({ type: "update", path: header.filePath, move_path: header.movePath, chunks });
      i = nextIdx;
    } else {
      i += 1;
    }
  }
  return hunks;
}

function patchNormalizeUnicode(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

function patchSeekSequence(
  lines: string[],
  pattern: string[],
  startIndex: number,
  eof = false,
): number {
  if (pattern.length === 0) return -1;
  const comparators: Array<(a: string, b: string) => boolean> = [
    (a, b) => a === b,
    (a, b) => a.trimEnd() === b.trimEnd(),
    (a, b) => a.trim() === b.trim(),
    (a, b) => patchNormalizeUnicode(a.trim()) === patchNormalizeUnicode(b.trim()),
  ];
  for (const compare of comparators) {
    if (eof) {
      const fromEnd = lines.length - pattern.length;
      if (fromEnd >= startIndex) {
        let ok = true;
        for (let j = 0; j < pattern.length; j++) {
          if (!compare(lines[fromEnd + j], pattern[j])) {
            ok = false;
            break;
          }
        }
        if (ok) return fromEnd;
      }
    }
    for (let i = startIndex; i <= lines.length - pattern.length; i++) {
      let ok = true;
      for (let j = 0; j < pattern.length; j++) {
        if (!compare(lines[i + j], pattern[j])) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
  }
  return -1;
}

function patchComputeReplacements(
  originalLines: string[],
  filePath: string,
  chunks: PatchUpdateChunk[],
): Array<[number, number, string[]]> {
  const replacements: Array<[number, number, string[]]> = [];
  let lineIndex = 0;
  for (const chunk of chunks) {
    if (chunk.change_context) {
      const idx = patchSeekSequence(originalLines, [chunk.change_context], lineIndex);
      if (idx === -1)
        throw new Error(`Failed to find context '${chunk.change_context}' in ${filePath}`);
      lineIndex = idx + 1;
    }
    if (chunk.old_lines.length === 0) {
      const ins =
        originalLines.length > 0 && originalLines[originalLines.length - 1] === ""
          ? originalLines.length - 1
          : originalLines.length;
      replacements.push([ins, 0, chunk.new_lines]);
      continue;
    }
    let pattern = chunk.old_lines;
    let newSlice = chunk.new_lines;
    let found = patchSeekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);
    if (found === -1 && pattern.length > 0 && pattern[pattern.length - 1] === "") {
      pattern = pattern.slice(0, -1);
      if (newSlice.length > 0 && newSlice[newSlice.length - 1] === "")
        newSlice = newSlice.slice(0, -1);
      found = patchSeekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);
    }
    if (found !== -1) {
      replacements.push([found, pattern.length, newSlice]);
      lineIndex = found + pattern.length;
      continue;
    }
    throw new Error(`Failed to find expected lines in ${filePath}:\n${chunk.old_lines.join("\n")}`);
  }
  replacements.sort((a, b) => a[0] - b[0]);
  return replacements;
}

export function patchApplyReplacements(
  lines: string[],
  replacements: Array<[number, number, string[]]>,
): string[] {
  const result = [...lines];
  for (let i = replacements.length - 1; i >= 0; i--) {
    const [startIdx, oldLen, newSegment] = replacements[i];
    result.splice(startIdx, oldLen);
    for (let j = 0; j < newSegment.length; j++) result.splice(startIdx + j, 0, newSegment[j]);
  }
  return result;
}

export function patchDeriveNewContent(filePath: string, chunks: PatchUpdateChunk[]): string {
  let originalContent: string;
  try {
    originalContent = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
  let originalLines = originalContent.split("\n");
  if (originalLines.length > 0 && originalLines[originalLines.length - 1] === "")
    originalLines.pop();
  const replacements = patchComputeReplacements(originalLines, filePath, chunks);
  let newLines = patchApplyReplacements(originalLines, replacements);
  if (newLines.length === 0 || newLines[newLines.length - 1] !== "") newLines.push("");
  return newLines.join("\n");
}

