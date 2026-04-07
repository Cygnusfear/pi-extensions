# background-bash

Run long-lived bash commands in the background without blocking the agent.

Starts commands as detached child processes with log capture. The agent can check status, tail logs, and stop jobs without waiting for them to finish.

## Tools

| Tool | Description |
|------|-------------|
| `bash_bg_start` | Start a command in the background, returns job ID |
| `bash_bg_status` | Check if a background job is running or exited |
| `bash_bg_logs` | Read output from a background job (with offset/limit) |
| `bash_bg_stop` | Stop a running background job |
| `bash_bg_list` | List all background jobs in this session |

## Details

- Logs are written to temp files, not held in memory
- Default log limit: 200 lines, max 2000
- Jobs survive across `execute_code` calls via the `$` store
