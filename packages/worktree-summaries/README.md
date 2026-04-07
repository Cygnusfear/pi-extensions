# worktree-summaries

Injects the current git worktree directory into conversation context at the start of every agent turn.

Ensures both auto-compaction and `/compact` summarization see the worktree path in the messages being summarized — so the agent always knows which worktree it's working in.
