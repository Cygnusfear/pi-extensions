# @pi-extensions/context

TUI context view — see exactly what's loaded in your pi session at a glance.

Shows your context window usage, loaded extensions, skills, AGENTS.md files, and cumulative session cost in a single panel.

## Features

- **Context window bar** — visual breakdown of system prompt, tools, conversation, and remaining space
- **Token estimates** — effective usage including tool definition overhead
- **Extension listing** — which extensions are registered and where they come from
- **Skill tracking** — which skills are available and which have been loaded into context
- **AGENTS.md detection** — project context files found in your agent dir and CWD ancestors
- **Session totals** — cumulative token count and cost across the entire session
- **Headless fallback** — plain text output when running without a TUI

## Usage

Open the context view from the TUI:

```
/cmd.context
```

### What You'll See

```
Context  (Esc/q/Enter to close)

Window: ~12,450 / 200,000 (6.2% used, ~187,550 left)
█████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ sys█ tools█ convo█ free█

System:   ~3,200 tok (AGENTS ~1,800)
Tools:    ~2,100 tok (14 active)
AGENTS:   AGENTS.md, src/AGENTS.md

Extensions (3): foresight.ts, pi-mesh.ts, worktree-summaries.ts
Skills (12): how-to-communicate ✅, writing-clearly-and-concisely, ...

Session:  45,230 tokens · $0.0342
```

### How Skill Tracking Works

The extension monitors `read` tool results and matches file paths against the skill index. When you read a skill's `SKILL.md` file, it's marked as loaded (shown in green). This gives you an accurate picture of which instructions the agent has actually consumed.

## How Context Usage Is Calculated

The view combines:

1. **Message tokens** from `ctx.getContextUsage()` (actual API usage)
2. **Tool definition tokens** — estimated from tool name + description × 1.5× fudge factor for schema overhead
3. **System prompt tokens** — estimated from the raw system prompt string
4. **AGENTS.md tokens** — estimated from loaded project context files

The bar visualization shows the proportion of each component.

## Setup

Install the extension — it auto-registers the `/cmd.context` command. No additional configuration required.

Disables itself in headless mode (`PI_HEADLESS=1`).

## Dependencies

- **@mariozechner/pi-coding-agent** ≥ 0.65.0
- **@mariozechner/pi-tui** — TUI component rendering
