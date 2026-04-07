# lock-mode

`/lock` disables all write tools. `/unlock` restores them.

In lock mode agents can only read, search, and think. No writes, no bash, no code execution, no patches. For when you want to let an agent explore without any risk of it changing anything.

Blocked tools: `bash`, `bash_bg_start`, `bash_bg_stop`, `write`, `edit`, `apply_patch`, `execute_code`, `hash_edit`, `teams`.
