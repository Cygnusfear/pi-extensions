# Welcome to pi-extensions 👋🍌

---

## A day in the life without this

Your agent reads a file. Thinks. Reads another. Thinks. **Eleven round-trips** to rename a variable across 5 files.

No memory. Same debugging dead end, twice, in two different sessions.

One agent, one task, sequential forever. While your CPU sits at 3%.

Context fills up and the agent forgets what it was doing.

**What if all of that was solvable?**

---

## Step 1: Think in code, not tool calls 🛠️

Take a real task — "find all TODOs with FIXME, sort by file, show the top 5 critical ones."

**Vanilla pi — 11 tool calls, each one a separate round-trip:**

> Read file → think → Read file → think → Read file → think → ...

**With code-mode — one block:**

```javascript
const files = await Glob({ pattern: '**/*.ts' });
const results = [];
for (const file of files) {
  const content = await Read({ path: file });
  const todos = content.split('\n')
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter(({ text }) => text.includes('FIXME'));
  if (todos.length > 0) results.push({ file, todos });
}
results.sort((a, b) => b.todos.length - a.todos.length);
console.log(results.slice(0, 5));
```

You stopped being a translator between the agent and the filesystem. **You started being an engineer again.**

### Your work survives crashes

Crash halfway through a 30-file refactor? The `$` store persists between blocks. Pick up where you left off — no re-reading files, no lost progress.

```javascript
// Block 1 — crash midway through
$.files = await Glob({ pattern: '**/*.ts' });
$.results = [];
for (const f of $.files) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\n').length });
  // 💥 crash at file 30
}

// Block 2 — pick up right where you left off
const remaining = $.files.slice($.results.length);
for (const f of remaining) {
  const content = await Read({ path: f });
  $.results.push({ file: f, lines: content.split('\n').length });
}
```

### The agent can wake itself up

Fire a background promise, go to sleep, and wake up when something happens:

```javascript
$.monitor = (async () => {
  for (let i = 0; i < 20; i++) {
    await sleep(240000); // 4 minutes
    const status = await meshView({ sessionId: 'deploy-worker', start: -2, end: 0 });
    if (status.includes('deployed')) {
      console.wake("Deploy finished!");
      return;
    }
  }
})();
console.log("Monitoring — I'll wake up when it's done.");
```

For **team workers** specifically there's a cleaner, event-driven path — `teams.on(name, type)` rides the leader's typed `PollEvent` stream, so you never poll:

```javascript
teams.on("fixer", "completed")
  .preventDefault()
  .timeout(30 * 60 * 1000)
  .then(
    (e) => console.wake(`fixer done: ${e.result.slice(0, 500)}`),
    (err) => console.wake(`fixer timed out: ${err.message}`),
  );
```

No polling by a human. No keeping the terminal open. **The agent monitors itself.**

### And when the whole block is heavy — fire it async

`console.wake` is for monitoring while you do other work. When the work IS the block — a cold build, a multi-step deploy, a long bounce — there's nothing to monitor. Fire the whole thing async:

```json
{ "tool": "execute_code", "args": {
  "code": "const built = await bashBgStart({ command: 'cargo build --release' }).timeout(900_000);\nawait Bash({ command: 'spacetime publish gso', timeout: 120 });\nawait Bash({ command: './run.sh bounce' });\nconsole.log('bounce complete');",
  "async": true
} }
```

The tool call returns INSTANTLY with a jobId. The work runs in the background, you keep the TUI for typing/scrolling/whatever. When the pipeline finishes, a follow-up turn fires with the result (`[async execute_code <jobId> completed · 12.3s]\n<output>`). Inspect or kill in-flight jobs with the `execute_code_async_list` / `execute_code_async_kill` direct tools.

### Parallel I/O — stop waiting around

```javascript
const [files, readme, config] = await Promise.all([
  Glob({ pattern: 'src/**/*.ts' }),
  Read({ path: 'README.md' }),
  Read({ path: 'tsconfig.json' }),
]);
// All three fire at once. Done when the slowest finishes.
```

> **Packages:** [code-mode](packages/code-mode/) · [file-tools](packages/file-tools/) · [hashline-tools](packages/hashline-tools/) · [background-bash](packages/background-bash/)

---

## Step 2: Never lose the trail twice 🔮

Yesterday you discovered that `sessions.token_hash` is NOT `sessions.token`. By tomorrow you'll have forgotten the exact thread unless you can search the raw conversation.

### Ouija — search every conversation you've ever had

Ouija searches the real session trail: every raw conversation, every debug step, every rejected alternative, every "why did we do X" moment. Even sessions that ended hours ago.

```javascript
// "What did we decide about auth last Tuesday?"
const hits = await ouija({ action: "search", query: "auth token middleware decision" });

// Drill into the exact conversation
const context = await ouija({ action: "view", session: hits[0].session, start: -10, end: 0 });

// Search your current live session too
const self = await ouija({ action: "self", query: "database migration gotcha" });
```

**Your debugging history is a gold mine. Ouija lets you mine it.**

> **Packages:** [ouija](packages/ouija/) · [context](packages/context/) · [mid-mortem](packages/mid-mortem/) · [worktree-summaries](packages/worktree-summaries/)

---

## Step 3: Your laptop has 8 cores. Use them. 🤝

One agent is a pair of hands. Three agents is a team.

### Teams — parallel workers, zero conflicts

```javascript
await teams({
  action: "delegate",
  tasks: [
    { text: "Fix the type errors in auth.ts",
      assignee: "fix-worker", template: "fix" },
    { text: "Write tests for the auth module",
      assignee: "test-worker", template: "implementer" },
    { text: "Review the auth architecture",
      assignee: "reviewer", template: "review" },
  ]
});
```

Three agents working in parallel. Each gets its own **git worktree** (no merge conflicts), its own **pi session** (independent context window), and its own **model** (mix Claude, GPT, GLM — whatever fits the task). The coordinator watches. Nobody steps on anyone's toes.

Workers can even spawn their own sub-workers when given `hasTools: true`.

### pi-mesh — your agents talk to each other

All those agents communicate over a **zero-server P2P mesh network** powered by Zenoh (Rust, via bun:ffi). No servers. No configuration.

```javascript
// See who's online right now
const peers = await meshPeers();

// Direct message another agent
await meshTell({ sessionId: "fix-worker", message: "Prioritize the auth middleware bug" });

// Broadcast to everyone
await meshBroadcast({ topic: "status", message: "Auth refactor starting — hold merges" });

// Join a channel for group coordination
await meshChat({ channelId: "auth-refactor", message: "Found the root cause — race condition" });
```

Sessions on the same machine discover each other automatically. Cross-machine works over Tailscale. **Peer to peer. Not through a server.**

> **Packages:** [teams](packages/teams/) · [pi-mesh](packages/pi-mesh/)

---

## Step 4: The knife drawer 🔪

Quick cuts. Each one gets one killer example.

### Find files by vibe

```javascript
// Not by path. By what you're looking for. Ranked by how often you use it.
const files = await fffFind({ query: "auth middleware" });
```

Frecency ranking means `src/config.ts` beats `node_modules/.cache/vite/config.ts` every time.

### Search code by what it *does*

```javascript
// "Which function handles JWT validation?"
const results = await tldrSemanticSearch({ query: "JWT token validation", k: 5 });
// → verify_access_token() at src/auth/middleware.ts:47
```

### See who calls what

```javascript
// Cross-file call graph
const calls = await tldrCalls({ path: "src/" });

// Impact analysis: who depends on this function?
const callers = await tldrImpact({ func: "validateToken", path: "src/" });

// Find dead code
const dead = await tldrDead({ path: "src/" });
```

### Track what AI wrote

```javascript
// Which lines were written by which model?
await gitAi({ command: "blame", args: ["src/auth.ts"] });

// What percentage of this file is AI-authored?
await gitAi({ command: "stats", args: ["src/auth.ts"] });
```

### Web search and live docs from inside code blocks

```javascript
// Search the web
const results = await braveSearch({ query: "Zenoh Rust P2P messaging", numResults: 3 });

// Pull up-to-date library docs
const libId = await context7Resolve({ libraryName: "next.js", query: "routing" });
const docs = await context7Docs({ libraryId: libId, query: "dynamic routes" });
```

> **Packages:** [tldr-code](packages/tldr-code/) · [fff](packages/fff/) · [git-ai](packages/git-ai/) · [brave-search](packages/brave-search/) · [context7](packages/context7/)

---

## Step 5: Made by people who use it ✨

The stuff that makes you smile because someone actually cared.

| Package | What it does |
|---------|-------------|
| [default-prompt](packages/default-prompt/) | System prompt — always injected |
| [model-shortcuts](packages/model-shortcuts/) | `/opus`, `/zai` — switch models instantly |
| [model-hints](packages/model-hints/) | Shows latest available models in prompt |
| [prompt-templates](packages/prompt-templates/) | Slash commands: `/cmd.handoff`, `/cmd.wtf`, etc. |
| [explain](packages/explain/) | Clear communication via a dedicated writing model |
| [git-safety](packages/git-safety/) | Blocks destructive git commands. Protects `.git/` |
| [powerline-footer](packages/powerline-footer/) | Powerline status bar + welcome overlay |
| [lipgloss-theme](packages/lipgloss-theme/) | Custom TUI theme |
| [core-edit-ui](packages/core-edit-ui/) | Syntax-highlighted diffs |
| [core-read-ui](packages/core-read-ui/) | Collapsible read output with timing |
| [notify](packages/notify/) | Desktop notification when agent finishes |
| [session-tab-title](packages/session-tab-title/) | Terminal tab shows session name |
| [image-links](packages/image-links/) | Clickable `file://` links for images |
| [lock-mode](packages/lock-mode/) | `/lock` — read-only mode for safe exploration |
| [reload](packages/reload/) | Hot-reload extensions without restarting |
| [skills](packages/skills/) | Install and manage agent skills from git |
| [nested-skills](packages/nested-skills/) | Discovers SKILL.md files pi's scanner missed |
| [webfetch](packages/webfetch/) | Fetch URLs as text/markdown/HTML |
| [defaults](packages/defaults/) | Directory-aware reads, AGENTS.md discovery |
| [cwd](packages/cwd/) | Change session base directory |
| [code-review-guard](packages/code-review-guard/) | Code health prompt after reading code |
| [fork-fixes](packages/fork-fixes/) | Extension-level fork patches |
| [provider-filter](packages/provider-filter/) | Filter which model providers are available |
| [zai-key-rotate](packages/zai-key-rotate/) | API key rotation for ZAI provider |

---

## Install

**One package:**

```bash
pi install ./packages/brave-search
pi install ./packages/pi-mesh
```

**Full workspace:**

```bash
pi install git:https://github.com/cygnusfear/pi-extensions
```

Each package is independently installable, testable, and removable via `~/.pi/agent/settings.json` or project `.pi/settings.json`.

---

## The whole thing in 5 lines

| Layer | What you get | Key packages |
|-------|-------------|-------------|
| **Tool** | Write JS, not tool calls. One block = 11 turns. | code-mode, file-tools |
| **Memory** | Remember by searching raw session history and dead conversations. | ouija |
| **Team** | Spawn parallel agents. P2P mesh networking. | teams, pi-mesh |
| **Intelligence** | Semantic search, call graphs, dead code detection. | tldr-code, fff, git-ai |
| **Polish** | Themes, shortcuts, notifications, safety rails. | 20+ utility packages |

**Memory feeds into search. Search feeds into teams. Teams talk over mesh. Everything composes. This isn't a plugin collection — it's an engineering platform.** 🍌
