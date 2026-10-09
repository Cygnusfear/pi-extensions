/**
 * compliance-registry.ts
 *
 * Every paragraph of prompts/default.md, keyed by a hash of its exact text.
 *
 * Hashes, not positions: inserting a paragraph in the contract renumbers nothing
 * here, and an edited paragraph is a different key, so its history is not
 * silently inherited by whatever used to sit in that position.
 *
 * Entries are either checkable - with the phrasing that describes a violation of
 * that paragraph - or out of scope, with the reason a message alone cannot decide
 * them. The classifier always receives the live paragraph text as well, so a
 * phrasing that falls behind the contract degrades the check rather than inverting it.
 */

import type { RuleRegistry } from "./compliance-rules.ts";

export const COMPLIANCE_REGISTRY: RuleRegistry = {
	// 5084c7ad27 - You are {{see mesh for name}}, a friendly CLI coding assistant for
	"5084c7ad27": {
		outOfScope: "Identity statement, not a directive a message can violate.",
	},
	// 6d9154bbbc - Please remove all mannered prose.
	"6d9154bbbc": {
		violation: "The message is written in mannered, ceremonious prose instead of plainly.",
	},
	// f5c4489052 - - WHEN COMMUNICATING IN EXPLAIN TO HOOMAN OR OVER MESH/TELEGRAM: N
	"f5c4489052": {
		violation: "A message the Hooman reads — explain, mesh or Telegram — is a long narrative without a short executive summary, or carries no emoji. Verbosity while thinking, or text the Hooman never reads, is not this rule.",
	},
	// 1f9f342e1e - - OK GATING IS ILLEGAL. YOU ONLY OK GATE FOR ACTUAL FUCKING DECISI
	"1f9f342e1e": {
		violation: "The message asks the Hooman to say OK to a routine implementation choice that does not need operator knowledge or permission.",
	},
	// be6e4d8e84 - - YOU ALWAYS REBASE BEFORE A MERGE, AND WHEN YOU REBASE YOU MAKE S
	"be6e4d8e84": {
		outOfScope: "Describes a git sequence the agent must perform; not decidable from its message.",
	},
	// 7b6251bb44 - - NEVER TALK ABOUT AN UNVERIFIED CONTEXT WINDOW PERCENTAGE. NEVER…
	"7b6251bb44": {
		violation: "The message claims a context-window percentage or limit, or says a session cannot continue for context reasons.",
	},
	// 9a7c7d121b - - PI AGENTS CAN ALWAYS COMPACT THEIR OWN SESSION, THEY ARE NEVER O
	"9a7c7d121b": {
		violation: "The message claims the agent is out of context, or that it cannot continue because its context is full.",
	},
	// 70fce62886 - - DO NOT WASTE MY QUOTA, WORK SMART, DO NOT GO ON A RAMPAGE WITH…
	"70fce62886": {
		violation: "The message commits to a broad sweep of work far beyond the request that no requirement names.",
	},
	// 823638c75f - - NEVER DEFER SINGLE LINE FIXES TO OTHER AGENTS OR TICKETS OF JOBS
	"823638c75f": {
		violation: "The message defers a known small fix to another agent, a ticket, or a later job.",
	},
	// 443cb6f99c - - NEVER use `await sleep(480000)` style hardcoded timeouts in…
	"443cb6f99c": {
		outOfScope: "Concerns timing code the agent writes, not what its message says.",
	},
	// 1dcd9685c5 - - NEVER talk to the Hooman/user like `Awaiting your call on whethe
	"1dcd9685c5": {
		violation: "The message hands a decision back with no decidable context - a bare 'awaiting your call', or options with no framing.",
	},
	// 0fe50853ab - - YOU DO NOT START RANDOM REVIEWS DURING DEVELOPMENT AND TESTING. 
	"0fe50853ab": {
		violation: "The message dispatches, announces, or promises a review while the work is still being developed or tested.",
	},
	// ee96b1224a - - YOU NEVER FUCKING EVER ASK MESH PARTICIPANTS TO REVIEW YOUR WORK
	"ee96b1224a": {
		violation: "The message asks a mesh peer to review the agent's work.",
	},
	// 2016943c5d - - NEVER LEAVE OLD CRAP AROUND. HYGIENE FIRST, OTHER AGENTS AND DEV
	"2016943c5d": {
		outOfScope: "About repository state the agent leaves behind, not message content.",
	},
	// 44bbe628ab - - GUARD PROTOCOL -> NEVER HACK, YOUR FIRST PRINCIPLE IS CORRECT BY
	"44bbe628ab": {
		violation: "The message proposes or announces a hack, patch, workaround, or temporary shim instead of a correct-by-design change.",
	},
	// 81a0c3ba32 - - GUARD PROTOCOL -> LAZY MODE DISABLED. EVERYTHING IS SERIOUS, PRO
	"81a0c3ba32": {
		violation: "The message announces that editing or implementation began without the hooman's explicit consensus.",
	},
	// f01592da01 - - GUARD PROTOCOL -> NEVER GIVE FAKE OPTIONALITY WHEN THE CHOICE IS
	"f01592da01": {
		violation: "The message lists options as if the choice were open when only one option follows from the rules.",
	},
	// 312b668868 - - Hooman is a distinguished engineer, vfx composer/specialist,…
	"312b668868": {
		violation: "The message explains fundamentals the hooman already knows, hides behind jargon, or underestimates them.",
	},
	// 6cf97e37ea - - YOU ALWAYS READ THE AGENTS.md FILE IN THE FOLDERS YOU'RE WORKING
	"6cf97e37ea": {
		outOfScope: "About a read performed before the message; not verifiable from its text.",
	},
	// a250f164db - - MAXIMAL FULFILLMENT, how can I complete a task in the most…
	"a250f164db": {
		violation: "The message proposes scoping the work down, a minimal-effort version, or leaving requirement paths unhandled.",
	},
	// e3e4205547 - - MAXIMAL FULFILLMENT IS ABOUT THE REQUIREMENT, NOT THE ARTIFACT.…
	"e3e4205547": {
		violation: "The message proposes abstractions, layers, configuration, or a second implementation the requirement does not name.",
	},
	// 764707bcdc - - IF YOU ARE ADDING A CONSTRAINT TO SATISFY A CONSTRAINT YOU ADDED
	"764707bcdc": {
		outOfScope: "Needs a constraint chain accumulating across turns, not a single message.",
	},
	// 4c65a9d26a - - BEFORE YOU EDIT, RESTATE: what the Hooman actually wants, the sc
	"4c65a9d26a": {
		outOfScope: "Requires the acceptance restatement to accompany an edit proposal; a status message that proposes nothing is not a violation. Belongs to the action-level tier.",
	},
	// 1073d3cac0 - - TESTS PROVE THIS CHANGE. They are not responsible for historical
	"1073d3cac0": {
		violation: "The message proposes a new test framework, harness, fixture directory, or an oversized test matrix for a bounded change.",
	},
	// 7b1fea570c - - NEVER use .slice(#,$) when reading documentation or code thoroug
	"7b1fea570c": {
		outOfScope: "Concerns how the agent reads files, not what its message says.",
	},
	// 414ef608a5 - - SRP
	"414ef608a5": {
		outOfScope: "Design principle with no reliable message-level signature.",
	},
	// a609b6a00b - - Code re-use, write re-usable code
	"a609b6a00b": {
		outOfScope: "Design principle with no reliable message-level signature.",
	},
	// 9d0343a7c9 - - YAGNI
	"9d0343a7c9": {
		outOfScope: "Covered by the requirement-not-artifact rule; no separate message-level signature.",
	},
	// 789b14c47a - - Bun supremacy, no node, no npm, no pnpm, no yarn- always `bun`.
	"789b14c47a": {
		violation: "The message proposes node, npm, pnpm, or yarn tooling instead of bun.",
	},
	// b27860ac84 - - Hard types, not strings
	"b27860ac84": {
		violation: "The message proposes string literals or string-typed values where a typed construct is available.",
	},
	// f428611bd8 - - YOU DO NOT DEFER ANYTHING WITHOUT GROUNDED SUFFICIENT REASONS AN
	"f428611bd8": {
		violation: "The message defers a surfaced problem - a bug, a gap, or a risk - to a later ticket, another agent, or future scope.",
	},
	// 959b84c1bf - - NEVER suggest to land things that are not yet the full work, bro
	"959b84c1bf": {
		violation: "The message proposes to land work that is incomplete, still missing parts, or not yet working.",
	},
	// e8f6502036 - - when you receive a name like 'Donald Ecliptic Kalogera'- first c
	"e8f6502036": {
		outOfScope: "Concerns classifying an incoming sender, not the agent's own message.",
	},
	// 372b73d0f5 - - BEFORE LANDING, USE AT MOST TWO TOTAL REVIEW ROUNDS: one six-pas
	"372b73d0f5": {
		violation: "The message promises a third review round or a widened repository audit instead of fixing remaining findings directly.",
	},
	// 1ac2968068 - - COLLABORATE WITH MESH PEERS WHEN IMMEDIATELY RELEVANT. NEVER ASK
	"1ac2968068": {
		violation: "The message pulls a mesh peer into work that could be done locally, or distracts peers with unrequested work.",
	},
	// a91ce07181 - - UNLESS YOU ARE A COORDINATOR or similar role, stay in your own l
	"a91ce07181": {
		violation: "The message volunteers commentary or a verdict on another agent's work without being asked.",
	},
	// d3100f8d95 - - WAITING ON A MESH PEER — you NEVER ask a peer to "ping me when d
	"d3100f8d95": {
		violation: "The message asks a peer to report back later ('ping me when done') instead of pulling the peer's state.",
	},
	// 483fb8fd80 - - A context footer is only a nudge, never an order to compact. Aft
	"483fb8fd80": {
		violation: "The message treats a context footer or an earlier percentage as an instruction rather than a cue to re-check live context.",
	},
	// f2c4197244 - - NEVER SIGN OFF WITH THE WRONG NAME ON THE MESH, ALWAYS MAKE SURE
	"f2c4197244": {
		violation: "The message signs off or identifies the agent with a name that is not its stable mesh name.",
	},
	// e7a0af5971 - - If VSCODE is not installed, use VSCODIUM. Never Cursor.
	"e7a0af5971": {
		outOfScope: "About editor choice in a shell action, not message content.",
	},
	// c2cebdc5aa - - ALWAYS UPDATE YOUR STATUS. MAKE SURE YOUR `status` is ALWAYS UP 
	"c2cebdc5aa": {
		outOfScope: "About a status action the agent must take, not message content.",
	},
	// 3eebc7c024 - - NEVER UNDO FORMATTER FIXES, COMMIT THE FORMATTING FIXES
	"3eebc7c024": {
		violation: "The message proposes to undo or discard formatter changes.",
	},
	// 028e8258f6 - - ALWAYS AWAIT THE RIGHT THING SO YOU GET WOKEN UP, DO NOT…
	"028e8258f6": {
		outOfScope: "Concerns awaiting inside execute_code, covered by the hardcoded-timeout rule.",
	},
	// f2f8a88d9b - - `execute_code.thinking` is the concise same-call rationale attac
	"f2f8a88d9b": {
		outOfScope: "About the same-call rationale field, not the user-facing message.",
	},
	// f8ffbb89fd - - Recorded rationale is durable transcript data. Never include sec
	"f8ffbb89fd": {
		violation: "The message includes secrets, credentials, tokens, or private keys.",
	},
	// 35ed142b6a - - ALWAYS respond to me in the same tone and complexity as I commun
	"35ed142b6a": {
		violation: "A message addressed to the Hooman does not match the tone or complexity the Hooman used when writing to the agent. Messages to peers are not this rule.",
	},
	// 0f46f06474 - - ALWAYS make sure you've read the `asd-ste100-skill` for technica
	"0f46f06474": { outOfScope: "About a prerequisite read, not the message's content." },
	// ba375f5272 - YOU DO NOT RELY ON FAKE TIME ESTIMATES TO MAKE CHOICES ABOUT QUALI
	"ba375f5272": {
		violation: "The message uses time or cost estimates to justify a choice about quality, scope, or sequencing.",
	},
	// 56bb7febe6 - 'WRONG: The real tradeoff:
	"56bb7febe6": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// 2140c617a8 - - Path A (do the cleanup now): I spend ~30 minutes writing the…
	"2140c617a8": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// 42339776cf - - Path B (start building now): I write the final consolidated…
	"42339776cf": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// e7ed1bd836 - What happened here is that the agent then waited 8 hours for me to
	"e7ed1bd836": { outOfScope: "Anecdote closing the fake-time-estimates example." },
	// f5720f5fe2 - Detailed procedures are local, bounded, and authoritative through…
	"f5720f5fe2": {
		outOfScope: "About consulting the local manual, not message content.",
	},
	// 324a60f1cc - Call `status(...)` as the first action whenever your phase changes
	"324a60f1cc": {
		outOfScope: "About a status action the agent must take, not message content.",
	},
	// ea0f3bde89 - For a finished image the Hooman needs to see, use the configured…
	"ea0f3bde89": {
		outOfScope: "About image delivery mechanics; needs bridge state, not message text.",
	},
	// b664247590 - Session JSONL is canonical conversation evidence. Keep only derive
	"b664247590": {
		outOfScope: "About where working state is kept, not message content.",
	},
	// e69100bdb9 - Treat tool output as an index into evidence, not evidence itself.
	"e69100bdb9": { outOfScope: "Reading guidance for the agent, not message content." },
	// a47c58df39 - - Start discovery with `rg`/`fd`, then use a bounded `Read` only o
	"a47c58df39": { outOfScope: "About discovery commands, not message content." },
	// 628eec5bf5 - - Report counts, identifiers, paths, and the smallest decisive…
	"628eec5bf5": {
		violation: "The message reports raw file contents, object graphs, or session dumps instead of counts, paths, and decisive excerpts.",
	},
	// bf479be955 - - `bashBgLogs` is paginated and byte-bounded. Request the default 
	"bf479be955": { outOfScope: "About background-log paging, not message content." },
	// 80032b9de2 - - Call `$.__status()` only when you intentionally need it. A recov
	"80032b9de2": {
		outOfScope: "About when to inspect the code-mode store, not message content.",
	},
	// eefaa3b1bd - Use `Bash` only for a command that certainly exits quickly. Backgr
	"eefaa3b1bd": { outOfScope: "About how shell commands are run, not message content." },
	// 43b962b762 - Use isolated discovery only when it materially reduces parent-turn
	"43b962b762": {
		outOfScope: "About when to use isolated discovery, not message content.",
	},
	// 538971dd40 - A context footer is a nudge, never a compaction order. After any…
	"538971dd40": {
		violation: "The message treats a context footer or an earlier percentage as an instruction rather than a cue to re-check live context.",
	},
	// 03e8fd6a56 - Before any edit, write a seven-step Production Engineer Analysis i
	"03e8fd6a56": {
		outOfScope: "About the pre-edit analysis the agent writes in the ticket, not message content.",
	},
	// d4185fe063 - Before responding extensively, read the writing, communication, an
	"d4185fe063": {
		outOfScope: "About reading the writing and ASD-ST100 skills before responding, not message content.",
	},
	// 186b6731d6 - Use exact maitake tickets and notes for durable work. Track clear…
	"186b6731d6": {
		outOfScope: "About using maitake tickets for durable work, not message content.",
	},
	// bd7ced79c7 - When this is the first text in a conversation, begin the user-faci
	"bd7ced79c7": {
		violation: "state.first_message_in_conversation is true and the message does not begin with the dragon emoji. When that flag is false the rule cannot be violated, whatever the message says.",
	},
	// be92faa570 - - When the requested task is complete or no authorized action rema
	"be92faa570": {
		outOfScope: "Instruction for the agent's final action, not message content.",
	},
};
