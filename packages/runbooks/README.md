# Runbooks

Saved, reusable code_mode scripts. Repo-local executable knowledge.

## What

Agents develop useful multi-step flows in `execute_code` — scanning TODOs, reviewing changed files, deploying, setting up monitoring. Runbooks save those flows as `.pi/runbooks/<name>.js` files so they persist across sessions and can be shared via git.

## Usage

Inside `execute_code`:

```javascript
// Save a flow you use often
await runbookSave({
  name: "scan-todos",
  description: "Find all TODOs in TypeScript files",
  code: \`
const hits = await rg({ args: '-n "TODO|FIXME" --glob "*.ts"' });
for (const line of hits.split('\\n').filter(Boolean)) {
  console.log(line);
}
\`
});

// See what's available
const books = await runbookList();

// Run it
await runbookRun({ name: "scan-todos" });

// Load for review or modification
const { code } = await runbookLoad({ name: "scan-todos" });
```

Also available as a direct tool (`runbook`) for save/list/load/delete outside code-mode.

## File format

```javascript
// .pi/runbooks/scan-todos.js
/**
 * @runbook scan-todos
 * @description Find all TODOs in TypeScript files
 */
const hits = await rg({ args: '-n "TODO|FIXME" --glob "*.ts"' });
for (const line of hits.split('\n').filter(Boolean)) {
  console.log(line);
}
```

Plain JavaScript with a JSDoc frontmatter comment. Human-readable, git-committable.

## Functions

| Function | What it does |
|---|---|
| `runbookSave({ name, description, code })` | Save a runbook to `.pi/runbooks/` |
| `runbookList()` | List available runbooks with names and descriptions |
| `runbookRun({ name })` | Execute a runbook in the current VM context |
| `runbookLoad({ name })` | Load code as string for review/modification |
| `runbookDelete({ name })` | Delete a runbook |

## Execution model

`runbookRun()` executes the saved code in the same persistent VM context as `execute_code`. The runbook has access to all sandbox tools (`Read`, `Write`, `Bash`, `rg`, etc.), the `$` store, and the session API.

## Storage

- **Location:** `.pi/runbooks/` in the project root
- **Scope:** Project-local (the runbooks are specific to this repo)
- **Git:** Committable — share runbooks with your team

## Package structure

```
packages/runbooks/
  package.json
  README.md
  src/runbook-engine.ts    # Core logic (save/list/load/delete)
  extensions/runbooks.ts   # Extension registration + sandbox fns
```
