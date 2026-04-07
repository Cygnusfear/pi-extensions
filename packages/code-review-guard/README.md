# @pi-extensions/code-review-guard

Injects code health awareness into every code-reading tool result — so agents see quality guidance right alongside the code they're reading.

## Why

Agents read code constantly but have no built-in sense of code quality. They'll happily propagate bad patterns they see in files. This extension appends a code health prompt to every code-reading tool result, reminding the agent to watch for issues rather than blindly copy what it reads.

## How It Works

After any code-reading tool completes successfully, the extension appends the contents of `prompts/codehealth.md` to the tool result text. The prompt sits right after the code the LLM just saw — the most effective placement for influencing its next action.

## Affected Tools

| Tool | Hook |
|------|------|
| `read` | Appends health prompt to file content |
| `hash_read` | Appends health prompt to file content |
| `grep` | Appends health prompt to search results |
| `find` | Appends health prompt to file listing |
| `ls` | Appends health prompt to directory listing |
| `execute_code` | Appends health prompt to code output |

Error results are left untouched — only successful reads get the prompt.

## Customization

Edit `prompts/codehealth.md` in this package to change what gets appended. The file is loaded once at extension init, so reload the runtime after editing.

## Setup

```json
{
  "extensions": ["@pi-extensions/code-review-guard"]
}
```
