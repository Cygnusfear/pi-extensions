# nested-skills

Discovers nested `SKILL.md` files that pi's skill scanner misses — because it stops recursing when it finds the first one.

## The Problem

Pi's built-in skill scanner discovers skill directories by finding `SKILL.md` files, but it stops recursing into subdirectories once it finds one. Tree-structured skill collections (like `playbook/` with subdirectories for each skill) only get their root discovered — all nested children are invisible.

## How It Works

This extension:

1. On `resources_discover` and `session_start`, scans all configured skill directories
2. Recursively walks into every subdirectory looking for `SKILL.md` files (skipping the root)
3. Parses YAML frontmatter for name and description
4. Returns discovered skill paths via the `resources_discover` event, making pi load them as real skills
5. Deduplicates by name and notifies how many nested skills were found

## Skill Path Resolution

Searches for skills in all standard pi locations:

- `package.json` → `pi.skills` paths
- `<dir>/.pi/skills/` and `<dir>/.agents/skills/` (walking up to git root)
- `~/.pi/agent/settings.json` → `skills` and `packages` entries
- `<cwd>/.pi/settings.json` → `skills` and `packages` entries
- `~/.pi/agent/skills/` and `~/.agents/skills/`

## Example

Given this structure:

```
playbook/
├── SKILL.md              ← pi finds this, stops recursing
├── writing/
│   ├── writing-clearly/
│   │   └── SKILL.md      ← nested-skills discovers this
│   └── technical-writing/
│       └── SKILL.md      ← nested-skills discovers this
└── communication/
    └── how-to-communicate/
        └── SKILL.md      ← nested-skills discovers this
```

Without this extension, pi loads 1 skill. With it, pi loads all 4.

## Sandbox Function

Exposes skill paths to agents via `getSkillPaths()` in code_mode:

```javascript
const paths = await getSkillPaths();
console.log(paths.roots);   // Root directories where skills are configured
console.log(paths.skills);  // Actual skill directories (where SKILL.md lives)
```

Returns:
- `roots`: Configured skill directories (e.g. `~/.pi/agent/skills/`, `./skills/`)
- `skills`: All discovered skill directories with SKILL.md files

Works across all installations — no hardcoded paths.

## Setup

No setup required. Automatically discovers nested skills in all configured skill directories.
