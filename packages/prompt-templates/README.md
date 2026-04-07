# prompt-templates

Slash commands that inject focused prompt templates — guard protocols, workflow triggers, and communication patterns on demand.

## Features

- **14 built-in templates** covering workflow, communication, and review patterns
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

### Communication

| Command | Description |
|---------|-------------|
| `/breakdown` | Tighten a verbose response into steps with "next" checkpoints — or break down into digestible pieces. |
| `/attitude` | Reset agent attitude — a behavioral correction when the agent gets uppity. |
| `/mierenneuk` | Stop and assess the big picture — are you micromanaging details instead of making progress? (Dutch: "ant-fucking") |
| `/wtf` | Quality enforcement — demands the best solution, not the simplest. Rejects shortcuts that drop fidelity or effort. |

### Code Quality

| Command | Description |
|---------|-------------|
| `/dedup` | Find and eliminate duplicated code paths — enforce SRP and a single happy path. |
| `/codehealth` | Code health assessment template. |

### System

| Command | Description |
|---------|-------------|
| `/codex` | Generic pi system prompt template. |

## Setup

No setup required. All templates are available as slash commands immediately.
