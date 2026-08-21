# prompt-templates

Slash commands that inject focused prompt templates — guard protocols, workflow triggers, and communication patterns on demand.

## Features

- **21 built-in templates** covering workflow, communication, review, code quality, and system operations
- **Slash command activation** — type the command name to inject the template into the current context
- **Guard protocol enforcement** — commands like `/wtf` and `/handoff` enforce critical workflow behaviors

## Commands

### Workflow

| Command | Description |
|---------|-------------|
| `/handoff` | Write an incredibly detailed TPV (Total Perspective Vortex) handoff — everything that happened, next steps, lessons, file paths and line numbers. Saved to mai and clipboard. |
| `/precompact` | Prepare a handoff before context compaction — captures all smart things, rules, notes, and learnings for the post-compact session. |
| `/restate` | Restate what we were doing and what the agent was working on — a quick context refresher. |
| `/lodown` | Get the full situation report — what's going on, what's been done, what's next. |
| `/burndown` | Start a burndown flow — dispatches an async oracle for review, then works through remaining items. |
| `/unit-of-work` | Lock in all remaining phases as one autonomous UOW — no intermediate check-ins, just execute. |
| `/singleticket` | Capture everything the agent just said into a single mai ticket, word for word. |
| `/complete-tickets` | Require every ticket to be an exact implementation contract with concrete wiring, edits, removals, and tests. |
| `/ticket-review` | Review a ticket against the exact implementation-contract standard before work begins. |

### Communication

| Command | Description |
|---------|-------------|
| `/breakdown` | Tighten a verbose response into steps with "next" checkpoints — or break down into digestible pieces. |
| `/attitude` | Reset agent attitude — a behavioral correction when the agent gets uppity. |
| `/mierenneuk` | Stop and assess the big picture — are you micromanaging details instead of making progress? (Dutch: "ant-fucking") |
| `/wtf` | Quality enforcement — demands the best solution, not the simplest. Rejects shortcuts that drop fidelity or effort. |
| `/directive` | Enable concise directive mode — strip filler and deliver only the underlying data or instruction. |
| `/make-a-call` | Reframe a decision with enough context, tradeoffs, and rationale for the hooman to make an informed call. |

### Code Quality

| Command | Description |
|---------|-------------|
| `/dedup` | Find and eliminate duplicated code paths — enforce SRP and a single happy path. |
| `/async-review` | Run the guarded asynchronous DEI review workflow with the required review skills. |
| `/review.rust` | Run the guarded Rust DEI review workflow with the required professional Rust skills. |

### System

| Command | Description |
|---------|-------------|
| `/harness` | Update the mai harness with exact guidance learned from the current work so future agents do not repeat mistakes. |
| `/manage-context` | Reduce the active context below 200k tokens. |
| `/open-worktree` | Open the current worktree in VSCodium. |

## Setup

No setup required. All templates are available as slash commands immediately.
