/**
 * Process-kill broadcast guards — detect shell commands that broadcast signals.
 *
 * On POSIX systems, `kill` interprets these PID values specially:
 *   -1    → signal EVERY process the current user can signal (nukes the session)
 *    0    → signal every process in the CURRENT process group
 *   -N    → signal every process in process group N
 *
 * Example of the catastrophe this prevents:
 *   kill -KILL -- -1     → SIGKILL to every shell, editor, ssh session, pi agent
 *   kill -9 0            → SIGKILL to everything in the current pgid
 *   pkill -u $USER       → SIGTERM to every process the user owns
 *
 * This guard is ALWAYS ACTIVE. There is no setting to disable it. Broadcast kills
 * have no legitimate agent-driven use case — they only happen via bugs.
 *
 * Design:
 * - Split the command into statements on shell operators (;, &&, ||, |, &) outside quotes.
 * - Tokenize each statement respecting single- and double-quoted strings.
 * - For each statement: skip benign prefixes (sudo, env, nohup), then inspect the head.
 * - Recurse into shell wrappers (sh -c '...', bash -c '...', eval '...') so nested
 *   commands are inspected.
 * - Flag the statement only when kill/pkill/killall is the command word — never when
 *   it appears inside another command's argument.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tokenization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a shell command into statements on top-level operators (;, &&, ||, |, &),
 * respecting quoted strings. Quotes inside a statement are preserved.
 */
function splitStatements(s: string): string[] {
	// A bare-string Bash argument reaches here as undefined via the kill-broadcast
	// guard; a tokenizer must report nothing rather than crash on bad input.
	if (typeof s !== "string") return [];
	const out: string[] = [];
	let buf = "";
	let quote: '"' | "'" | null = null;
	let escaped = false;
	let i = 0;

	while (i < s.length) {
		const ch = s[i];

		if (escaped) {
			buf += ch;
			escaped = false;
			i++;
			continue;
		}
		if (ch === "\\" && quote !== "'") {
			buf += ch;
			escaped = true;
			i++;
			continue;
		}
		if (quote) {
			if (ch === quote) quote = null;
			buf += ch;
			i++;
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			buf += ch;
			i++;
			continue;
		}

		// Top-level operators
		if (ch === ";") {
			out.push(buf);
			buf = "";
			i++;
			continue;
		}
		if (ch === "&" && s[i + 1] === "&") {
			out.push(buf);
			buf = "";
			i += 2;
			continue;
		}
		if (ch === "|" && s[i + 1] === "|") {
			out.push(buf);
			buf = "";
			i += 2;
			continue;
		}
		if (ch === "|") {
			out.push(buf);
			buf = "";
			i++;
			continue;
		}
		if (ch === "&") {
			out.push(buf);
			buf = "";
			i++;
			continue;
		}

		buf += ch;
		i++;
	}
	if (buf.length > 0) out.push(buf);
	return out;
}

/**
 * Tokenize a statement into argv, respecting single and double quotes.
 * Quoted content becomes one token. Quotes themselves are stripped from output.
 */
function tokenize(s: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let inToken = false;
	let quote: '"' | "'" | null = null;
	let escaped = false;

	for (const ch of s) {
		if (escaped) {
			current += ch;
			inToken = true;
			escaped = false;
			continue;
		}
		if (ch === "\\" && quote !== "'") {
			escaped = true;
			inToken = true;
			continue;
		}
		if (quote) {
			if (ch === quote) {
				quote = null;
			} else {
				current += ch;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			inToken = true;
			continue;
		}
		if (/\s/.test(ch)) {
			if (inToken) {
				tokens.push(current);
				current = "";
				inToken = false;
			}
			continue;
		}
		current += ch;
		inToken = true;
	}
	if (inToken) tokens.push(current);
	return tokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command inspection
// ─────────────────────────────────────────────────────────────────────────────

const BENIGN_PREFIXES = new Set([
	"sudo",
	"doas",
	"nohup",
	"time",
	"nice",
	"ionice",
	"exec",
]);

const SHELL_WRAPPER_NAMES = new Set([
	"sh",
	"bash",
	"zsh",
	"dash",
	"ksh",
	"busybox",
]);

function normalizeToken(tok: string): string {
	return tok.replace(/^\\+/, "");
}

function matchBinary(tok: string, names: Set<string>): string | null {
	const t = normalizeToken(tok);
	if (names.has(t)) return t;
	const m = /^\/\S*\/([^/\s]+)$/.exec(t);
	if (m && names.has(m[1])) return m[1];
	return null;
}

function matchKillKind(tok: string): "kill" | "pkill" | "killall" | null {
	const t = normalizeToken(tok);
	if (t === "kill" || t === "pkill" || t === "killall") return t;
	const m = /^\/\S*\/(kill|pkill|killall)$/.exec(t);
	if (m) return m[1] as "kill" | "pkill" | "killall";
	return null;
}

/**
 * Skip benign command prefixes (sudo, env VAR=V, nohup, VAR=V inline assignments)
 * and return the slice starting at the actual command word.
 */
function stripBenignPrefixes(tokens: string[]): string[] {
	let i = 0;
	while (i < tokens.length) {
		const t = normalizeToken(tokens[i]);

		if (BENIGN_PREFIXES.has(t)) {
			i++;
			continue;
		}
		if (t === "env") {
			i++;
			while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(normalizeToken(tokens[i]))) {
				i++;
			}
			continue;
		}
		// Bare VAR=value assignment (shell inline env)
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
			i++;
			continue;
		}
		break;
	}
	return tokens.slice(i);
}

// ─────────────────────────────────────────────────────────────────────────────
// kill argument parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse kill(1) arguments per POSIX:
 *   kill [-signal_name | -signal_number | -s signal_name | -n signal_number] [--] pid...
 *
 * Returns the list of tokens that end up in PID position.
 */
function parseKillPids(argv: string[]): string[] {
	const pids: string[] = [];
	let i = 0;
	let sawSeparator = false;
	let sawSignal = false;

	while (i < argv.length) {
		const tok = argv[i];

		if (!sawSeparator && tok === "--") {
			sawSeparator = true;
			i++;
			continue;
		}
		if (!sawSeparator && !sawSignal && (tok === "-s" || tok === "-n")) {
			// Signal name/number lives in the next token.
			sawSignal = true;
			i += 2;
			continue;
		}
		if (!sawSeparator && !sawSignal && /^-[A-Za-z0-9_]+$/.test(tok)) {
			// First -X token is the signal flag: -9, -KILL, -HUP, -SIGKILL, -sKILL, -1, ...
			sawSignal = true;
			i++;
			continue;
		}
		// Everything else is a PID argument (positive, zero, or negative).
		pids.push(tok);
		i++;
	}
	return pids;
}

function classifyPid(pid: string): { reason: string } | null {
	if (pid === "-1") {
		return {
			reason:
				"kill target -1 broadcasts the signal to every process the user can reach (would nuke the whole session — shells, editors, ssh, pi itself)",
		};
	}
	if (pid === "0") {
		return {
			reason: "kill target 0 signals every process in the current process group",
		};
	}
	if (/^-\d+$/.test(pid)) {
		return {
			reason: `kill target ${pid} signals process group ${pid.slice(1)} — use a specific positive PID instead`,
		};
	}
	return null;
}

function classifyBulkKill(
	kind: "pkill" | "killall",
	args: string[],
): { reason: string } | null {
	const joined = args.join(" ");

	// -u / --user / -U with $USER, $LOGNAME, whoami
	if (
		/(?:^|\s)(?:-u|--user|-U)\s+(?:\$USER|\$LOGNAME|`whoami`|\$\(whoami\)|\$\{USER\}|\$\{LOGNAME\})(?:\s|$)/.test(
			joined,
		)
	) {
		return {
			reason: `${kind} -u $USER targets every process owned by the current user`,
		};
	}

	// Split flags from pattern args. Anything starting with "-" is a flag
	// until we see a "--" separator, then everything is a pattern.
	const sepIdx = args.indexOf("--");
	const afterFlags =
		sepIdx === -1 ? args.filter((a) => !a.startsWith("-")) : args.slice(sepIdx + 1);

	if (afterFlags.length === 0) {
		return {
			reason: `${kind} with no target pattern is too broad to allow`,
		};
	}

	for (const pat of afterFlags) {
		if (pat === "." || pat === ".*" || pat === ".+" || pat === "*") {
			return {
				reason: `${kind} ${pat} matches every running process`,
			};
		}
	}

	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Statement inspection (entrypoint per shell statement)
// ─────────────────────────────────────────────────────────────────────────────

function inspectStatement(
	statement: string,
	depth: number,
): { reason: string } | null {
	if (depth > 4) return null; // guard against pathological recursion
	const tokens = tokenize(statement);
	const cmd = stripBenignPrefixes(tokens);
	if (cmd.length === 0) return null;

	// ── Shell wrapper: recurse into the -c script argument ──
	const shellName = matchBinary(cmd[0], SHELL_WRAPPER_NAMES);
	if (shellName) {
		const cIdx = cmd.findIndex((t, i) => i > 0 && t === "-c");
		if (cIdx !== -1 && cIdx + 1 < cmd.length) {
			const inner = cmd[cIdx + 1];
			return isProcessKillBroadcast(inner, depth + 1);
		}
		return null;
	}

	// ── eval: join remaining args and recurse ──
	if (normalizeToken(cmd[0]) === "eval") {
		const inner = cmd.slice(1).join(" ");
		return isProcessKillBroadcast(inner, depth + 1);
	}

	// ── timeout / stdbuf: strip their own args, then recurse on what follows ──
	// timeout takes a duration, stdbuf takes flags. These wrap another command.
	const wrapperName = normalizeToken(cmd[0]);
	if (wrapperName === "timeout" || wrapperName === "gtimeout") {
		// timeout [--preserve-status] [--signal=X] DURATION COMMAND [ARG...]
		let i = 1;
		while (i < cmd.length && cmd[i].startsWith("-")) i++;
		if (i < cmd.length) i++; // skip duration
		if (i < cmd.length) {
			const inner = cmd.slice(i).join(" ");
			return inspectStatement(inner, depth + 1);
		}
		return null;
	}
	if (wrapperName === "stdbuf") {
		let i = 1;
		while (i < cmd.length && cmd[i].startsWith("-")) {
			// skip flag and its value if combined form not used
			i += cmd[i].includes("=") ? 1 : 2;
		}
		if (i < cmd.length) {
			const inner = cmd.slice(i).join(" ");
			return inspectStatement(inner, depth + 1);
		}
		return null;
	}

	// ── kill / pkill / killall ──
	const kind = matchKillKind(cmd[0]);
	if (!kind) return null;

	const args = cmd.slice(1);
	if (kind === "kill") {
		for (const pid of parseKillPids(args)) {
			const hit = classifyPid(pid);
			if (hit) return hit;
		}
		return null;
	}
	return classifyBulkKill(kind, args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inspect a shell command string for process-kill broadcast patterns.
 * Returns a reason string if the command should be blocked, or null if safe.
 *
 * Safe:    kill 1234, kill -9 1234, kill -KILL 5678, pkill chrome, killall node
 * Blocked: kill -9 -1, kill -KILL -- -1, kill 0, pkill -u $USER, killall .
 */
export function isProcessKillBroadcast(
	cmd: string,
	depth = 0,
): { reason: string } | null {
	for (const stmt of splitStatements(cmd)) {
		const trimmed = stmt.trim();
		if (trimmed.length === 0) continue;
		const hit = inspectStatement(trimmed, depth);
		if (hit) return hit;
	}
	return null;
}
