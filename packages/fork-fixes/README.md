# @pi-ext/fork-fixes

Session fork patches — fixes for context branch orphaned tool results that previously required modifying pi core.

## Why

When pi navigates conversation branches (via context checkout or compaction), tool_result messages can become orphaned — their originating tool_use lives on a different branch. Anthropic's API requires tool_results to directly follow the assistant message that emitted the corresponding tool_use blocks. Orphaned results cause API errors or silent corruption.

## Features

- **Orphaned tool result cleanup** — filters out tool_results whose toolCallId has no matching tool_use on the active branch
- **Run-level validation** — validates entire tool_result runs against the preceding assistant message
- **Non-destructive** — only removes invalid messages; never modifies tool inputs or outputs

## How It Works

The extension hooks into pi's `context` event (fires before each LLM call):

1. Scans the message list for consecutive `toolResult` runs
2. Checks the preceding message for matching `toolCall` IDs
3. Keeps only tool_results whose IDs match a tool_call in the preceding assistant message
4. Returns the filtered message list if any orphans were found

## Setup

```json
{
  "extensions": ["@pi-ext/fork-fixes"]
}
```

This is a pure extension replacement for fork patches that were previously applied to pi-mono core. No configuration needed.
