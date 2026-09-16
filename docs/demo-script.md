---
mai-id: pe-vwzc2sfz
---
# pi-extensions Demo Script
## "One Code Block to Rule Them All"

> A live demonstration of what pi-extensions can do — designed to be recorded, 
> narrated, or used as the script for an AI-generated video.

---

## Act 1: The Problem (30s)

**Scene:** Split screen — left side shows a "traditional" AI coding assistant making 11 
separate tool calls to read 5 files, decide what to do, and make edits. Right side is empty.

**Narration:**
"Every AI coding assistant works the same way. Read a file. Think. Read another file. Think again.
Eleven round-trips to do what a developer does in one glance. What if the AI could just... code?"

---

## Act 2: Code Mode — The Core Innovation (60s)

**Scene:** Terminal with pi running. A user types a question. The agent responds with a 
single `execute_code` block.

### Demo 2.1: Multi-file analysis in one shot

```javascript
// "Find all TODO comments across the entire TypeScript codebase"
const files = await Glob({ pattern: '**/*.ts' });
const results = [];
for (const file of files) {
  const content = await Read({ path: file });
  const todos = content.split('\n')
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter(({ text }) => text.includes('TODO'));
  if (todos.length > 0) results.push({ file, todos });
}
console.log(`Found ${results.reduce((s, r) => s + r.todos.length, 0)} TODOs in ${results.length} files`);
results.forEach(r => {
  console.log(`\n## ${r.file}`);
  r.todos.forEach(t => console.log(`  L${t.line}: ${t.text}`));
});
```

**Narration:** "One block. 32 packages scanned. Every TODO found, with file paths and 
line numbers. No back-and-forth. No waiting. The agent thinks in code."

### Demo 2.2: Persistent state across blocks

```javascript
// Block 1: Store results
$.criticalTodos = results.filter(r => 
  r.todos.some(t => t.text.includes('FIXME') || t.text.includes('HACK'))
);
console.log(`${$.criticalTodos.length} files with critical items — saved to $`);

// Block 2 (later): Still there, even after errors
console.log(`Resuming: ${$.criticalTodos.length} critical files still in memory`);
```

**Narration:** "State persists between blocks. Crash halfway through? Pick up where you left off. 
No re-reading files. No lost work. The `$` store survives everything except a session restart."

---

## Act 3: The Extension Ecosystem (90s)

### Demo 3.1: Session History Memory (Ouija 🔮)

```javascript
// Search every conversation you've ever had
const hits = await ouija({ action: "search", query: "Bun VM async closures execute_code" });
// → Finds the exact session where you debugged it

// Drill into the raw trail, not a summary
const context = await ouija({ action: "view", session: hits[0].session, start: -10, end: 0 });
```

**Narration:** "Ouija gives the agent practical memory by searching the raw session trail. Discoveries, decisions, dead ends — 
they stay recoverable across sessions without turning them into curated summaries."

### Demo 3.2: Dead Session Search (Ouija 🔮)

```javascript
// Search every conversation you've ever had
const hits = await ouija({ action: "search", query: "teams worker lifecycle bug" });
// → Finds the exact session from 3 days ago where you debugged this

// Drill in
const context = await ouija({ 
  action: "view", session: hits[0].session, start: -10, end: 0 
});
```

**Narration:** "Ouija searches across ALL your sessions — even dead ones. BM25 ranked. 
Find that conversation from last week where you figured out the fix."

### Demo 3.3: Multi-Agent Teams

```javascript
// Spawn 3 workers in parallel — each gets its own git worktree
await teams({
  action: "delegate",
  tasks: [
    { text: "Fix the type errors in auth.ts", 
      assignee: "fix-worker", template: "fix" },
    { text: "Write comprehensive tests for the auth module",
      assignee: "test-worker", template: "implementer" },
    { text: "Review the auth module architecture",
      assignee: "reviewer", template: "review" }
  ]
});
// Workers communicate via mesh, report back when done
```

**Narration:** "Spawn a team. Each worker gets its own git worktree — no conflicts. 
They communicate over a peer-to-peer mesh network. The coordinator watches progress 
and gets notified when they finish."

### Demo 3.4: Peer-to-Peer Mesh (pi-mesh)

```javascript
// See who's online
const peers = await meshPeers();
// → Lists all active pi sessions with their names and status

// Direct message another agent
await meshTell({ sessionId: "fix-worker", message: "Prioritize the auth middleware bug" });

// Broadcast to everyone
await meshBroadcast({ topic: "status", message: "Auth refactor starting — hold merges" });
```

**Narration:** "pi-mesh is a Zenoh-powered peer-to-peer network connecting all your sessions. 
Direct messages, broadcasts, channels — agents coordinate in real-time without a server."

---

## Act 4: Developer Experience (60s)

### Demo 4.1: Context Management

```javascript
// Check context health
const usage = session.tokens();
console.log(`Context: ${usage.tokens} / ${usage.contextWindow} tokens`);

// Bookmark before risky changes
session.tag("before-big-refactor");

// When context gets heavy, write the automatic squash handoff
$.ctx = `AUTH REFACTOR — sessions table migrated. 
Gotcha: token_hash column NOT token — see migrate.ts:47.
Dead end: batching inserts hit FK constraint.
Next: fix column name, run tests.`;
session.squash({ continue: "Fix token_hash at migrate.ts:47" }); // $.ctx is delivered first
```

**Narration:** "Context management built in. Tag your position. When things get heavy, 
squash with a narrative that preserves your gotchas and line numbers; `$.ctx` is automatically delivered to the resumed turn.
The agent picks up exactly where it left off."

### Demo 4.2: The Tool Belt

Quick montage of extensions in action:

| Extension | What it does |
|-----------|-------------|
| **code-mode** | JavaScript as the universal tool interface |
| **ouija** | BM25 search across all session history |
| **teams** | Multi-agent orchestration with git worktrees |
| **pi-mesh** | P2P networking between sessions (Rust/Zenoh) |
| **fff** | Frecency-ranked file search |
| **tldr-code** | Structural code analysis (call graphs, dead code) |
| **git-ai** | AI attribution — who (which model) wrote each line |
| **context** | Visual context management |
| **hashline-tools** | Cryptographic verification for file edits |
| **brave-search** | Web search from inside code blocks |
| **context7** | Live library documentation injection |
| **explain** | Clear communication via a dedicated writing model |
| **background-bash** | Non-blocking long-running commands |
| **lock-mode** | Read-only mode for safe exploration |
| **git-safety** | Blocks destructive git commands |
| **skills** | Install and manage agent skills from git |

---

## Act 5: The Wow Moment (30s)

### Demo 5.1: Background Self-Wake

```javascript
// Fire a background monitor — agent wakes itself up when done
$.monitor = (async () => {
  for (let i = 0; i < 20; i++) {
    await sleep(240000); // Check every 4 minutes
    const view = await meshView({ sessionId: 'deploy-worker', start: -2, end: 0 });
    if (view.includes('deployed')) {
      console.wake("Deploy finished! " + view);
      return;
    }
  }
  console.wake("Deploy monitor timed out.");
})();
console.log("Monitor running — I'll wake up when deploy finishes.");
// Agent goes idle. 20 minutes later... wakes itself up with the result.
```

**Narration:** "The agent fires a background promise and goes to sleep. 
Twenty minutes later, the deploy finishes, and the agent wakes itself up. 
No polling. No human intervention. It just... handles it."

### Demo 5.1b: Event-driven worker wait

For team workers the same pattern becomes zero-polling via `teams.on`:

```javascript
// Spawn three workers in parallel
await teams.delegate([
  { text: "Implement the feature", assignee: "impl" },
  { text: "Write tests", assignee: "tests" },
  { text: "Review the implementation change surface", assignee: "review" },
]);

// Race their terminal outcomes — whichever arrives first wakes the coordinator.
teams.on({ type: "terminal" })
  .timeout(30 * 60 * 1000)
  .wake(e => `${e.worker.name} stopped first: ${e.type}`);

console.log("Three workers running, event subscription armed. Going idle.");
```

**Narration:** "No polling loop. No sleep interval. The coordinator subscribes
to the worker event stream and goes idle. The first worker to finish wakes
it up through the host-owned `.wake()` path. This is event-driven multi-agent orchestration."

### Demo 5.2: Full Pipeline in One Block

```javascript
// Real-world example: analyze, fix, test, and commit
const bugs = await tldrDead({ path: "src/" });
console.log(`Found ${bugs.dead_functions.length} dead functions`);

for (const { file, function: fn } of bugs.dead_functions.slice(0, 3)) {
  const content = await Read({ path: file });
  // Remove dead function
  const cleaned = removeFn(content, fn);
  await Write({ path: file, content: cleaned });
  console.log(`Removed dead function ${fn} from ${file}`);
}

const tests = await Bash({ command: 'bun test', timeout: 60 });
console.log(tests.exitCode === 0 ? '✅ All tests pass' : '❌ Tests failed');
```

**Narration:** "Find dead code. Remove it. Run tests. One block. One decision. 
This is what coding assistance should feel like."

### Demo 5.3: Long pipelines without a frozen TUI

```json
{ "tool": "execute_code", "args": {
  "thinking": "Run the build/deploy pipeline and verify its completion output.",
  "code": "const built = await bashBgStart({ command: 'cargo build --release' }).timeout(900_000);\nawait Bash({ command: 'spacetime publish gso', timeout: 120 });\nawait Bash({ command: './run.sh bounce' });\nconsole.log('bounce complete:', built.status);",
  "async": true
} }
```

**Result, instant:**
```
🚀 async execute_code started — jobId=exec-a3f2c1
Result will arrive as a follow-up turn when done.
```

**While the cold build is running, the human keeps typing. Twelve minutes later, a new turn fires:**
```
[async execute_code exec-a3f2c1 completed · 12m 4s]
bounce complete: exited
```

**Narration:** "A real bounce — cold cargo build, spacetime publish, sidecar restart — takes twelve minutes. With `async: true`, the tool call returns instantly. The TUI stays interactive. The human keeps editing files, scrolling history, queueing follow-ups. When the pipeline finishes, the agent wakes up with the result tagged by job ID. The mutex makes sure no other execute_code touches the shared store mid-flight. The kill switch lives in two direct tools that bypass the mutex. **No frozen TUI. Ever.**"

---

## Closing (15s)

**Scene:** Terminal showing the pi prompt with all extensions loaded.

**Narration:** "32 packages. Zero configuration. Every extension works together — 
memory feeds into search, search feeds into teams, teams communicate over mesh. 
This isn't a chatbot with tools. This is an engineering platform."

**Title card:** "pi-extensions — open source at github.com/parcadei/pi-extensions"

---

## Production Notes

### For AI Video Generation
- Use fal.ai + Kling 3.0 for terminal/code scenes
- Screen recordings of actual pi sessions for authenticity
- Mix AI-generated cinematic shots with real terminal footage
- Total estimated runtime: ~4.5 minutes
- Estimated generation cost: ~$80-120 (with iteration)

### For Live Demo
- Pre-load a pi session with interesting project state
- Have ouija-indexed session history with real prior decisions
- Have 2-3 worker sessions ready to spawn
- Keep a mesh peer running for the pi-mesh demo
- Tag context at start so you can recover if demo goes sideways

### Key messages to land
1. **Code mode eliminates tool-call round-trips** — 11 calls → 1 block
2. **Memory persists** — across blocks ($) and across sessions/history (ouija)
3. **Multi-agent is real** — teams + mesh + worktrees = parallel work
4. **Developer experience matters** — context management, git safety, attribution
5. **It's an ecosystem** — 32 packages that compose, not a monolith
