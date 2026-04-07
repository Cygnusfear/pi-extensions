# shared

Shared utilities used by all pi-extensions packages — model resolution, JSON parsing, git guards, TUI rendering, session management, and Foresight memory integration.

## Exports

### Model Resolution — `model-utils.ts`

Utilities for finding the latest model by provider and family.

| Export | Description |
|--------|-------------|
| `findLatest(models, provider, family)` | Find the single latest model matching provider + family regex |
| `findLatestPerFamily(models)` | Get the latest model per family as a `Map<provider/family, LatestModel>` |
| `getFamily(modelId)` | Get the family label for a model ID (`claude-opus-4-6` → `claude-opus`) |
| `extractVersion(modelId)` | Extract a comparable version number, or `null` for pinned/non-versioned models |
| `FAMILY_PATTERNS` | Regex-to-label map for all recognized model families |

### JSON Parsing — `safe-json.ts`

Robust JSON parsing with automatic repair.

| Export | Description |
|--------|-------------|
| `safeJsonParse(text)` | Parse JSON with fallback repair (handles trailing commas, single quotes, Python constants, truncated input) |
| `safeResponseJson(response)` | Parse a fetch Response body with safe JSON repair |

### Git Guards — `git-guards.ts`

Detection functions for dangerous git operations.

| Export | Description |
|--------|-------------|
| `isGitUnsafeBash(command)` | Detect destructive git commands (`push --force`, `reset --hard`, `clean -fd`, etc.) — hard-blocked |
| `isGitPath(filePath)` | Detect writes to `.git/` directory — requires human confirmation |

### Process Guards — `process-guards.ts`

| Export | Description |
|--------|-------------|
| `isProcessKillBroadcast(command)` | Detect `kill` commands that signal all processes (`kill -1`, `kill 0`) |

### Sandbox Registry — `sandbox-registry.ts`

Shared registry for sandbox-callable functions. Extensions register tool implementations here; code-mode reads and injects them.

| Export | Description |
|--------|-------------|
| `registerSandboxFn(name, fn, schema)` | Register a function for sandbox access |
| `unregisterSandboxFn(name)` | Remove a registered function |
| `getSandboxFns()` | Get all registered sandbox functions |
| `getSandboxFnNames()` | Get all registered function names |

### Session Nickname — `session-nickname.ts`

Generates memorable astronomer-derived names for pi sessions (mesh identities).

| Export | Description |
|--------|-------------|
| `deriveTripleName()` | Generate a random 3-part astronomer name |
| `claimNickname()` | Claim a nickname for the current session |
| `getSessionNickname()` | Get the current session's nickname object |
| `getSessionNicknameText()` | Get the display name string |
| `getAllSessionNicknames()` | Get all known session nicknames |

### Session View — `session-view.ts`

Utilities for reading and formatting session history entries.

| Export | Description |
|--------|-------------|
| `projectMeaningfulSessionEntries(entries)` | Filter session entries to meaningful ones |
| `readMeaningfulSessionEntriesFromFile(path)` | Read and parse a session log file |
| `sliceSessionViewEntries(entries, start, end)` | Slice entries with relative window support |
| `formatSessionViewEntries(entries)` | Format entries for display |

### Session Activity Summary — `session-activity-summary.ts`

| Export | Description |
|--------|-------------|
| `getSavedActivitySummary()` | Read the persisted activity summary |
| `startActivitySummaryLoop(pi)` | Start periodic activity summarization |
| `refreshActivitySummary()` | Force-refresh the activity summary |

### TUI Utilities — `tool-ui-utils.ts` & `tui-diff-renderer.ts`

Shared rendering helpers for tool results and diffs.

| Export | Description |
|--------|-------------|
| `renderToolResult(content, theme)` | Render a tool result with consistent styling |
| `attachTiming(timing)` | Attach timing info to a tool result |
| `renderDiffResult(diff, theme, options)` | Render a syntax-highlighted diff |
| `ensureHighlighter()` | Initialize the Shiki syntax highlighter |
| `highlightCode(code, lang, theme)` | Highlight code with Shiki |
| `renderBeautifulDiff(diff, options)` | Render a diff with syntax-colored +/− lines |

### Foresight Memory — `foresight-env.ts`, `foresight-read.ts`, `foresight-write.ts`

Shared Foresight CLI wrappers for semantic memory.

| Export | Description |
|--------|-------------|
| `FS_ENV` / `FORESIGHT_BIN` | Foresight CLI configuration and binary path |
| `foresightRecall(query, options)` | Search memory by semantic query |
| `foresightUnfold(nodeId, options)` | Expand a memory node for detail |
| `foresightContext(task, options)` | Get memories relevant to a task |
| `foresightRetain(params)` | Create a new memory and return its UUID |
| `foresightRetainFireAndForget(params)` | Create memory without waiting for UUID |
