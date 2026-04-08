/**
 * Ouija — search and read past session JSONL logs. 🔮
 *
 * Actions:
 *   search  — BM25 across all session indexes
 *   grep    — find entries within a session (by ID or "self" for current session)
 *   view    — read entries from a session (by ID or "self")
 *   list    — browse past sessions
 *   self    — search the CURRENT live session's entries
 *
 * Also accepts an entries[] array for ad-hoc BM25 over arbitrary text.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createOuijaExecutor } from "../../shared/src/ouija-core.js";

const executeOuija = createOuijaExecutor();

export default function register(pi: ExtensionAPI) {
	pi.tool({
		name: "ouija",
		description:
			"Search and read past session JSONL logs — channel the dead. 🔮\n" +
			"search = BM25 across sessions, grep = find entries in one session, view = read entries,\n" +
			"list = browse sessions, self = BM25 search the CURRENT live session.\n" +
			"Also accepts entries[] for ad-hoc BM25 over arbitrary text arrays.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("search"), Type.Literal("view"),
				Type.Literal("grep"), Type.Literal("list"), Type.Literal("self"),
			], { description: "search=Bm25 across sessions, grep=find entries, view=read, list=browse, self=search current session" }),
			query: Type.Optional(Type.String({ description: "Search query (search/grep/self)" })),
			session: Type.Optional(Type.String({ description: "Session ID, partial ID, or 'self' (view/grep). Omit = auto-detect current." })),
			project: Type.Optional(Type.String({ description: "Filter by project path substring" })),
			since: Type.Optional(Type.String({ description: "Only sessions after this date (ISO)" })),
			start: Type.Optional(Type.Number({ description: "Entry window start (default -20). Negative=offset from end." })),
			end: Type.Optional(Type.Number({ description: "Entry window end (default 0=last)." })),
			limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
			entries: Type.Optional(Type.Array(Type.Object({ index: Type.Optional(Type.Number()), label: Type.Optional(Type.String()), text: Type.String() })), {
				description: "Ad-hoc entries for BM25 (action=grep only). Pass any array of {text} objects.",
			}),
		}),
		execute: executeOuija,
	});
}
