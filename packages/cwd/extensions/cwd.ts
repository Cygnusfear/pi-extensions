/**
 * /cwd — change the session's base directory.
 *
 * Changes this session's working directory to a new path. Future agent spawns
 * (teams, workers) inherit the new base automatically. Other Pi sessions are
 * unaffected. Conversation history is preserved: the current session is forked
 * into the new cwd's session bucket and switched into.
 *
 * Usage:
 *   /cwd                   — print current base + git repo info
 *   /cwd ~/other/project   — change base to absolute/home path
 *   /cwd .worktrees/foo    — change base to path relative to current base
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/** Expand a leading ~ to the user's home directory. */
function expandHome(input: string): string {
	if (input === "~") return homedir();
	if (input.startsWith("~/")) return join(homedir(), input.slice(2));
	return input;
}

/** Resolve a user-supplied path against the current session base. */
function resolveAgainst(input: string, base: string): string {
	const expanded = expandHome(input.trim());
	return isAbsolute(expanded) ? resolve(expanded) : resolve(base, expanded);
}

/** Return an error message if the path is not an existing directory. */
function validateDirectory(path: string): string | undefined {
	if (!existsSync(path)) return `Path does not exist: ${path}`;
	let stat;
	try {
		stat = statSync(path);
	} catch (err) {
		return `Cannot read path: ${path} (${(err as Error).message})`;
	}
	if (!stat.isDirectory()) return `Path is not a directory: ${path}`;
	return undefined;
}

/** Walk up from a path to find the enclosing git repo root, if any. */
function findGitRoot(start: string): string | undefined {
	let dir = start;
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, ".git"))) return dir;
		dir = dirname(dir);
	}
	return undefined;
}

/** Suggest directory completions for /cwd argument. */
function suggestDirectories(argumentPrefix: string, base: string): AutocompleteItem[] {
	const raw = argumentPrefix;
	const usedHome = raw.startsWith("~");
	const endsWithSep = raw.endsWith("/");

	// Decide which directory to list + which segment to match.
	let parentDir: string;
	let segment: string;
	if (raw.length === 0) {
		parentDir = base;
		segment = "";
	} else {
		const resolved = resolveAgainst(raw, base);
		if (endsWithSep) {
			parentDir = resolved;
			segment = "";
		} else {
			parentDir = dirname(resolved);
			segment = basename(resolved);
		}
	}

	if (!existsSync(parentDir)) return [];
	let entries: string[];
	try {
		entries = readdirSync(parentDir);
	} catch {
		return [];
	}

	const segmentLc = segment.toLowerCase();
	const matches = entries
		.filter((name) => !name.startsWith(".") || segment.startsWith("."))
		.filter((name) => name.toLowerCase().startsWith(segmentLc))
		.filter((name) => {
			try {
				return statSync(join(parentDir, name)).isDirectory();
			} catch {
				return false;
			}
		})
		.sort();

	const home = homedir();
	return matches.slice(0, 40).map((name) => {
		const full = join(parentDir, name);
		let display = full;
		if (usedHome) {
			if (full === home) display = "~";
			else if (full.startsWith(`${home}/`)) display = `~${full.slice(home.length)}`;
		}
		const value = `${display}/`;
		return { value, label: value, description: "directory" };
	});
}

/** Build the status readout printed by `/cwd` with no arguments. */
function describeBase(cwd: string): string {
	const lines = [`Base: ${cwd}`];
	const repoRoot = findGitRoot(cwd);
	if (repoRoot && repoRoot !== cwd) lines.push(`Repo: ${repoRoot}`);
	else if (repoRoot) lines.push(`Repo: ${repoRoot} (root)`);
	return lines.join(" · ");
}

export default function cwdExtension(pi: ExtensionAPI) {
	pi.registerCommand("cwd", {
		description: "Show or change the session base directory",
		getArgumentCompletions(argumentPrefix) {
			// No access to ctx here; process.cwd() tracks the active session cwd
			// because pi calls process.chdir() on every session apply.
			return suggestDirectories(argumentPrefix, process.cwd());
		},
		handler: async (args, ctx) => {
			const trimmed = args.trim();

			if (trimmed.length === 0) {
				ctx.ui.notify(describeBase(ctx.cwd), "info");
				return;
			}

			const target = resolveAgainst(trimmed, ctx.cwd);

			const invalid = validateDirectory(target);
			if (invalid) {
				ctx.ui.notify(invalid, "error");
				return;
			}

			if (resolve(ctx.cwd) === target) {
				ctx.ui.notify(`Already at ${target}`, "info");
				return;
			}

			const currentSessionFile = ctx.sessionManager.getSessionFile();
			if (!currentSessionFile) {
				ctx.ui.notify("Cannot change cwd: current session is not persisted", "error");
				return;
			}

			let newSessionFile: string | undefined;
			try {
				const forked = SessionManager.forkFrom(currentSessionFile, target);
				newSessionFile = forked.getSessionFile();
			} catch (err) {
				ctx.ui.notify(`Failed to fork session: ${(err as Error).message}`, "error");
				return;
			}

			if (!newSessionFile) {
				ctx.ui.notify("Fork did not produce a session file", "error");
				return;
			}

			try {
				const result = await ctx.switchSession(newSessionFile);
				if (result.cancelled) return;
				ctx.ui.notify(describeBase(target), "info");
			} catch (err) {
				ctx.ui.notify(`Failed to switch session: ${(err as Error).message}`, "error");
			}
		},
	});
}
