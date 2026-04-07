# @pi-extensions/mid-mortem

Automatic session checkpointing before context compaction — decisions, progress, and gotchas are captured as mai tickets so nothing is lost.

## Why

Pi compacts long conversations to stay within context limits. When it does, old messages are summarized or discarded. Important decisions, in-progress work, and hard-won debug insights can vanish. The mid-mortem extension fires off an ephemeral pi session right before compaction to capture everything that's about to be lost.

## Features

- **Automatic triggering** — hooks into pi's `session_before_compact` event
- **Ephemeral agent** — spawns a detached pi process that reads the transcript and writes a mai ticket
- **Non-blocking** — the compaction continues immediately; the mid-mortem writes in the background
- **Structured capture** — decisions, progress, open threads, and gotchas are all recorded
- **Minimum threshold** — only fires when there are 4+ messages and 200+ characters of content

## What Gets Captured

The mid-mortem ticket contains:

- **What was being worked on** — the goal and current task
- **Decisions made** — architectural, design, or implementation choices with rationale
- **Progress** — what's done, what's partially done
- **Open threads** — unresolved questions, next steps
- **Gotchas & learnings** — bugs hit, surprising findings, tips for future agents

## How It Works

1. Pi signals `session_before_compact` with the messages about to be summarized
2. The extension serializes the conversation to a temp file (user, assistant, and tool result messages)
3. A detached `pi` process is spawned with a prompt instructing it to:
   - Read the transcript from the temp file
   - Create a mai ticket tagged `mid-mortem,compaction`
   - Write the full mid-mortem content to the ticket
   - Close the ticket immediately
4. The temp file is written to `$TMPDIR/pi-mid-mortem/`
5. The compaction proceeds without waiting for the mid-mortem to complete

## Failure Handling

- If the transcript is too short (< 200 chars), no mid-mortem is created
- If the detached pi process fails, compaction is not affected (fire-and-forget)
- The extension never throws or blocks the main session

## Setup

```json
{
  "extensions": ["@pi-extensions/mid-mortem"]
}
```

Requires `mai` CLI to be available in `PATH` for ticket creation.
