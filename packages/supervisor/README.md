# @pi-extensions/supervisor

Minimal auto-continue supervisor. When enabled, sends "[SUPERVISOR] continue, go" when the agent goes idle.

## Usage

### From code_mode
```javascript
await supervise(true);   // Enable
await supervise(false);  // Disable
```

### From chat
```
/supervise on
/supervise off
/supervise        # Check status
```

## How it works

Hooks `agent_end` event. When enabled and agent goes idle, injects a continuation message after 500ms delay.

No LLM analysis, no steering logic — just auto-continue.
