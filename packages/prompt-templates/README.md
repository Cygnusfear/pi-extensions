# prompt-templates

Bundled slash-command prompt templates for pi.

Each file in `prompts/` becomes a `/cmd.<name>` command. Templates are plain markdown — the file content is injected as a user message when the command is invoked.

## Included commands

| Command | Purpose |
|---------|---------|
| `/cmd.attitude` | Reset tone |
| `/cmd.breakdown` | Step-by-step explanation |
| `/cmd.burndown` | Burn-down flow with review cycles |
| `/cmd.dedup` | Deduplicate code, enforce SRP |
| `/cmd.handoff` | Detailed handoff / TPV |
| `/cmd.lodown` | Full summary |
| `/cmd.mierenneuk` | "Are you bikeshedding?" check |
| `/cmd.restate` | Restate current context |
| `/cmd.singleticket` | Create ticket from conversation |
| `/cmd.unit-of-work` | Autonomous single unit of work |
| `/cmd.wtf` | Escalation — best solution, not simplest |
| `codex` | Generic system prompt |
| `codehealth` | Code review quality guard |

## Adding a template

Add a `cmd.<name>.md` file in `prompts/`. Optionally add frontmatter with `description`.
