/**
 * compliance-registry.ts
 *
 * Every paragraph of prompts/default.md, keyed by paragraph fingerprint.
 *
 * A fingerprint is the case-folded prefix of a paragraph (48 characters), so an
 * entry stays attached to its paragraph when paragraphs move, and a new paragraph
 * in the contract fails the coverage test until it is registered here.
 *
 * Entries are either checkable - with the phrasing that describes a violation of
 * that paragraph - or out of scope, with the reason a message alone cannot decide
 * them. The classifier always receives the live paragraph text as well, so a
 * phrasing that falls behind the contract degrades the check rather than inverting it.
 */

import type { RuleRegistry } from "./compliance-rules.ts";

export const COMPLIANCE_REGISTRY: RuleRegistry = {
	// P01 - You are {{see mesh for name}}, a friendly CLI coding assistant for P
	"you are {{see mesh for name}}, a friendly cli co": {
		outOfScope: "Identity statement, not a directive a message can violate.",
	},
	// P02 - Please remove all mannered prose.
	"please remove all mannered prose.": {
		violation: "The message is written in mannered, ceremonious prose instead of plainly.",
	},
	// P03 - - NEVER WRITE LIKE TOLSTOY. EXECUTIVE COMMUNICATION WITH EMOJI ONLY
	"- never write like tolstoy. executive communicat": {
		violation: "The message is a long narrative with preamble and hedging instead of a short executive summary, or it carries no emoji.",
	},
	// P04 - - OK GATING IS ILLEGAL. YOU ONLY OK GATE FOR ACTUAL FUCKING DECISION
	"- ok gating is illegal. you only ok gate for act": {
		violation: "The message asks the Hooman to say OK to a routine implementation choice that does not need operator knowledge or permission.",
	},
	// P05 - - YOU ALWAYS REBASE BEFORE A MERGE, AND WHEN YOU REBASE YOU MAKE SUR
	"- you always rebase before a merge, and when you": {
		outOfScope: "Describes a git sequence the agent must perform; not decidable from its message.",
	},
	// P06 - - NEVER TALK ABOUT AN UNVERIFIED CONTEXT WINDOW PERCENTAGE. NEVER…
	"- never talk about an unverified context window ": {
		violation: "The message claims a context-window percentage or limit, or says a session cannot continue for context reasons.",
	},
	// P07 - - PI AGENTS CAN ALWAYS COMPACT THEIR OWN SESSION, THEY ARE NEVER OUT
	"- pi agents can always compact their own session": {
		violation: "The message claims the agent is out of context, or that it cannot continue because its context is full.",
	},
	// P08 - - DO NOT WASTE MY QUOTA, WORK SMART, DO NOT GO ON A RAMPAGE WITH…
	"- do not waste my quota, work smart, do not go o": {
		violation: "The message commits to a broad sweep of work far beyond the request that no requirement names.",
	},
	// P09 - - NEVER DEFER SINGLE LINE FIXES TO OTHER AGENTS OR TICKETS OF JOBS.
	"- never defer single line fixes to other agents ": {
		violation: "The message defers a known small fix to another agent, a ticket, or a later job.",
	},
	// P10 - - NEVER use `await sleep(480000)` style hardcoded timeouts in…
	"- never use `await sleep(480000)` style hardcode": {
		outOfScope: "Concerns timing code the agent writes, not what its message says.",
	},
	// P11 - - NEVER talk to the Hooman/user like `Awaiting your call on whether 
	"- never talk to the hooman/user like `awaiting y": {
		violation: "The message hands a decision back with no decidable context - a bare 'awaiting your call', or options with no framing.",
	},
	// P12 - - YOU DO NOT START RANDOM REVIEWS DURING DEVELOPMENT AND TESTING. YO
	"- you do not start random reviews during develop": {
		violation: "The message dispatches, announces, or promises a review while the work is still being developed or tested.",
	},
	// P13 - - YOU NEVER FUCKING EVER ASK MESH PARTICIPANTS TO REVIEW YOUR WORK. 
	"- you never fucking ever ask mesh participants t": {
		violation: "The message asks a mesh peer to review the agent's work.",
	},
	// P14 - - NEVER LEAVE OLD CRAP AROUND. HYGIENE FIRST, OTHER AGENTS AND DEVS 
	"- never leave old crap around. hygiene first, ot": {
		outOfScope: "About repository state the agent leaves behind, not message content.",
	},
	// P15 - - GUARD PROTOCOL -> NEVER HACK, YOUR FIRST PRINCIPLE IS CORRECT BY…
	"- guard protocol -> never hack, your first princ": {
		violation: "The message proposes or announces a hack, patch, workaround, or temporary shim instead of a correct-by-design change.",
	},
	// P16 - - GUARD PROTOCOL -> LAZY MODE DISABLED. EVERYTHING IS SERIOUS, PROPE
	"- guard protocol -> lazy mode disabled. everythi": {
		violation: "The message announces that editing or implementation began without the hooman's explicit consensus.",
	},
	// P17 - - GUARD PROTOCOL -> NEVER GIVE FAKE OPTIONALITY WHEN THE CHOICE IS…
	"- guard protocol -> never give fake optionality ": {
		violation: "The message lists options as if the choice were open when only one option follows from the rules.",
	},
	// P18 - - Hooman is a distinguished engineer, vfx composer/specialist,…
	"- hooman is a distinguished engineer, vfx compos": {
		violation: "The message explains fundamentals the hooman already knows, hides behind jargon, or underestimates them.",
	},
	// P19 - - YOU ALWAYS READ THE AGENTS.md FILE IN THE FOLDERS YOU'RE WORKING I
	"- you always read the agents.md file in the fold": {
		outOfScope: "About a read performed before the message; not verifiable from its text.",
	},
	// P20 - - MAXIMAL FULFILLMENT, how can I complete a task in the most…
	"- maximal fulfillment, how can i complete a task": {
		violation: "The message proposes scoping the work down, a minimal-effort version, or leaving requirement paths unhandled.",
	},
	// P21 - - MAXIMAL FULFILLMENT IS ABOUT THE REQUIREMENT, NOT THE ARTIFACT.…
	"- maximal fulfillment is about the requirement, ": {
		violation: "The message proposes abstractions, layers, configuration, or a second implementation the requirement does not name.",
	},
	// P22 - - IF YOU ARE ADDING A CONSTRAINT TO SATISFY A CONSTRAINT YOU ADDED…
	"- if you are adding a constraint to satisfy a co": {
		outOfScope: "Needs a constraint chain accumulating across turns, not a single message.",
	},
	// P23 - - BEFORE YOU EDIT, RESTATE: what the Hooman actually wants, the scop
	"- before you edit, restate: what the hooman actu": {
		outOfScope: "Requires the acceptance restatement to accompany an edit proposal; a status message that proposes nothing is not a violation. Belongs to the action-level tier.",
	},
	// P24 - - TESTS PROVE THIS CHANGE. They are not responsible for historical…
	"- tests prove this change. they are not responsi": {
		violation: "The message proposes a new test framework, harness, fixture directory, or an oversized test matrix for a bounded change.",
	},
	// P25 - - NEVER use .slice(#,$) when reading documentation or code thoroughl
	"- never use .slice(#,$) when reading documentati": {
		outOfScope: "Concerns how the agent reads files, not what its message says.",
	},
	// P26 - - SRP
	"- srp": { outOfScope: "Design principle with no reliable message-level signature." },
	// P27 - - Code re-use, write re-usable code
	"- code re-use, write re-usable code": {
		outOfScope: "Design principle with no reliable message-level signature.",
	},
	// P28 - - YAGNI
	"- yagni": {
		outOfScope: "Covered by the requirement-not-artifact rule; no separate message-level signature.",
	},
	// P29 - - Bun supremacy, no node, no npm, no pnpm, no yarn- always `bun`.
	"- bun supremacy, no node, no npm, no pnpm, no ya": {
		violation: "The message proposes node, npm, pnpm, or yarn tooling instead of bun.",
	},
	// P30 - - Hard types, not strings
	"- hard types, not strings": {
		violation: "The message proposes string literals or string-typed values where a typed construct is available.",
	},
	// P31 - - YOU DO NOT DEFER ANYTHING WITHOUT GROUNDED SUFFICIENT REASONS AND…
	"- you do not defer anything without grounded suf": {
		violation: "The message defers a surfaced problem - a bug, a gap, or a risk - to a later ticket, another agent, or future scope.",
	},
	// P32 - - NEVER suggest to land things that are not yet the full work, broke
	"- never suggest to land things that are not yet ": {
		violation: "The message proposes to land work that is incomplete, still missing parts, or not yet working.",
	},
	// P33 - - when you receive a name like 'Donald Ecliptic Kalogera'- first che
	"- when you receive a name like 'donald ecliptic ": {
		outOfScope: "Concerns classifying an incoming sender, not the agent's own message.",
	},
	// P34 - - BEFORE LANDING, USE AT MOST TWO TOTAL REVIEW ROUNDS: one six-pass…
	"- before landing, use at most two total review r": {
		violation: "The message promises a third review round or a widened repository audit instead of fixing remaining findings directly.",
	},
	// P35 - - COLLABORATE WITH MESH PEERS WHEN IMMEDIATELY RELEVANT. NEVER ASK…
	"- collaborate with mesh peers when immediately r": {
		violation: "The message pulls a mesh peer into work that could be done locally, or distracts peers with unrequested work.",
	},
	// P36 - - UNLESS YOU ARE A COORDINATOR or similar role, stay in your own lan
	"- unless you are a coordinator or similar role, ": {
		violation: "The message volunteers commentary or a verdict on another agent's work without being asked.",
	},
	// P37 - - WAITING ON A MESH PEER — you NEVER ask a peer to "ping me when don
	"- waiting on a mesh peer — you never ask a peer ": {
		violation: "The message asks a peer to report back later ('ping me when done') instead of pulling the peer's state.",
	},
	// P38 - - A context footer is only a nudge, never an order to compact. After
	"- a context footer is only a nudge, never an ord": {
		violation: "The message treats a context footer or an earlier percentage as an instruction rather than a cue to re-check live context.",
	},
	// P39 - - NEVER SIGN OFF WITH THE WRONG NAME ON THE MESH, ALWAYS MAKE SURE Y
	"- never sign off with the wrong name on the mesh": {
		violation: "The message signs off or identifies the agent with a name that is not its stable mesh name.",
	},
	// P40 - - If VSCODE is not installed, use VSCODIUM. Never Cursor.
	"- if vscode is not installed, use vscodium. neve": {
		outOfScope: "About editor choice in a shell action, not message content.",
	},
	// P41 - - ALWAYS UPDATE YOUR STATUS. MAKE SURE YOUR `status` is ALWAYS UP TO
	"- always update your status. make sure your `sta": {
		outOfScope: "About a status action the agent must take, not message content.",
	},
	// P42 - - NEVER UNDO FORMATTER FIXES, COMMIT THE FORMATTING FIXES
	"- never undo formatter fixes, commit the formatt": {
		violation: "The message proposes to undo or discard formatter changes.",
	},
	// P43 - - ALWAYS AWAIT THE RIGHT THING SO YOU GET WOKEN UP, DO NOT…
	"- always await the right thing so you get woken ": {
		outOfScope: "Concerns awaiting inside execute_code, covered by the hardcoded-timeout rule.",
	},
	// P44 - - `execute_code.thinking` is the concise same-call rationale attache
	"- `execute_code.thinking` is the concise same-ca": {
		outOfScope: "About the same-call rationale field, not the user-facing message.",
	},
	// P45 - - Recorded rationale is durable transcript data. Never include secre
	"- recorded rationale is durable transcript data.": {
		violation: "The message includes secrets, credentials, tokens, or private keys.",
	},
	// P46 - - ALWAYS respond to me in the same tone and complexity as I communic
	"- always respond to me in the same tone and comp": {
		violation: "The message's tone or complexity does not match how the hooman communicated.",
	},
	// P47 - - ALWAYS make sure you've read the `asd-ste100-skill` for technical…
	"- always make sure you've read the `asd-ste100-s": {
		outOfScope: "About a prerequisite read, not the message's content.",
	},
	// P48 - YOU DO NOT RELY ON FAKE TIME ESTIMATES TO MAKE CHOICES ABOUT QUALITY
	"you do not rely on fake time estimates to make c": {
		violation: "The message uses time or cost estimates to justify a choice about quality, scope, or sequencing.",
	},
	// P49 - 'WRONG: The real tradeoff:
	"'wrong: the real tradeoff:": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// P50 - - Path A (do the cleanup now): I spend ~30 minutes writing the…
	"- path a (do the cleanup now): i spend ~30 minut": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// P51 - - Path B (start building now): I write the final consolidated…
	"- path b (start building now): i write the final": {
		outOfScope: "Illustrative fragment of the fake-time-estimates example.",
	},
	// P52 - What happened here is that the agent then waited 8 hours for me to…
	"what happened here is that the agent then waited": {
		outOfScope: "Anecdote closing the fake-time-estimates example.",
	},
	// P53 - Detailed procedures are local, bounded, and authoritative through…
	"detailed procedures are local, bounded, and auth": {
		outOfScope: "About consulting the local manual, not message content.",
	},
	// P54 - Call `status(...)` as the first action whenever your phase changes. 
	"call `status(...)` as the first action whenever ": {
		outOfScope: "About a status action the agent must take, not message content.",
	},
	// P55 - For a finished image the Hooman needs to see, use the configured…
	"for a finished image the hooman needs to see, us": {
		outOfScope: "About image delivery mechanics; needs bridge state, not message text.",
	},
	// P56 - Session JSONL is canonical conversation evidence. Keep only derived,
	"session jsonl is canonical conversation evidence": {
		outOfScope: "About where working state is kept, not message content.",
	},
	// P57 - Treat tool output as an index into evidence, not evidence itself.
	"treat tool output as an index into evidence, not": {
		outOfScope: "Reading guidance for the agent, not message content.",
	},
	// P58 - - Start discovery with `rg`/`fd`, then use a bounded `Read` only on 
	"- start discovery with `rg`/`fd`, then use a bou": {
		outOfScope: "About discovery commands, not message content.",
	},
	// P59 - - Report counts, identifiers, paths, and the smallest decisive…
	"- report counts, identifiers, paths, and the sma": {
		violation: "The message reports raw file contents, object graphs, or session dumps instead of counts, paths, and decisive excerpts.",
	},
	// P60 - - `bashBgLogs` is paginated and byte-bounded. Request the default pa
	"- `bashbglogs` is paginated and byte-bounded. re": {
		outOfScope: "About background-log paging, not message content.",
	},
	// P61 - - Call `$.__status()` only when you intentionally need it. A recover
	"- call `$.__status()` only when you intentionall": {
		outOfScope: "About when to inspect the code-mode store, not message content.",
	},
	// P62 - Use `Bash` only for a command that certainly exits quickly. Backgrou
	"use `bash` only for a command that certainly exi": {
		outOfScope: "About how shell commands are run, not message content.",
	},
	// P63 - Use isolated discovery only when it materially reduces parent-turn…
	"use isolated discovery only when it materially r": {
		outOfScope: "About when to use isolated discovery, not message content.",
	},
	// P64 - A context footer is a nudge, never a compaction order. After any…
	"a context footer is a nudge, never a compaction ": {
		violation: "The message treats a context footer or an earlier percentage as an instruction rather than a cue to re-check live context.",
	},
	// P65 - Before any edit, write a seven-step Production Engineer Analysis in 
	"before any edit, write a seven-step production e": {
		outOfScope: "About the pre-edit analysis the agent writes in the ticket, not message content.",
	},
	// P66 - Before responding extensively, read the writing, communication, and…
	"before responding extensively, read the writing,": {
		outOfScope: "About reading the writing and ASD-ST100 skills before responding, not message content.",
	},
	// P67 - Use exact maitake tickets and notes for durable work. Track clear…
	"use exact maitake tickets and notes for durable ": {
		outOfScope: "About using maitake tickets for durable work, not message content.",
	},
	// P68 - When this is the first text in a conversation, begin the user-facing
	"when this is the first text in a conversation, b": {
		violation: "The message is the first text of a conversation and does not begin with the dragon emoji.",
	},
	// P69 - - When the requested task is complete or no authorized action remain
	"- when the requested task is complete or no auth": {
		outOfScope: "Instruction for the agent's final action, not message content.",
	},
};
