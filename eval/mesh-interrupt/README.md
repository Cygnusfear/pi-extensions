# mesh-interrupt eval

Tiered eval for the mesh enriched-receipt + graduated-interrupt feature
(ADR pe-d8de0d1y, impl pe-h9xmbtzh).

## Why tmux + a long-lived receiver
`pi -p` (one-shot) receivers EXIT the instant they finish their task, and
code-mode's Bash caps at 30s — so a `-p` receiver is gone before a tell lands
(verified: the tell never reaches it, the sender hits a stale peer-map entry and
times out). The eval therefore runs the **receiver as an interactive pi inside a
tmux pane** (long-lived, idles on the mesh until killed). The **sender/controller
must itself be a mesh-connected pi session** — only a live pi session can call
`meshTell` / `meshInterrupt`. That is why the harness is a **runbook** you run
from inside a pi session, not a standalone script.

## Ground truth (no guessing)
- **Receipt** (sender side): `ack.receiverBusy`, `ack.receiverDeafened`, `ack.view` — in the sender's tool result.
- **Abort discriminator** (receiver side): the receiver's session JSONL tool result carries `error: "Aborted"` when `abort` cancels an in-flight tool; a `steer` leaves the tool completing normally. That single flag separates soft from nuclear, observably.

## Run it
From any live pi session (this repo's cwd):
```
# in pi code-mode:
await runbook.run({ name: "mesh-interrupt-t1", args: { root: process.cwd() } })
```
It spawns the tmux receiver `meshval`, runs T1–T5, prints PASS/FAIL, and tears down.
Watch live in another terminal with: `tmux attach -t meshval`.

## Tier-1 checks (mechanism, deterministic)
| ID | Check | Pass condition |
|----|-------|----------------|
| T1-idle | Enriched receipt, idle peer | receiverBusy=false + view present |
| T2-busy | Enriched receipt, busy peer | receiverBusy=true + view shows in-flight work |
| T3-abort | Abort cancels in-flight work | receiver tool ends early with error="Aborted" |
| T4-steer | Steer does NOT kill work | in-flight tool completes normally + banner surfaces |
| T5-deafen | Deafen drops + reports | ack.receiverDeafened=true + message not surfaced |

## First live run (2026-06-05, claude-haiku-4-5 receiver) — 5/5 PASS
- T3-abort evidence: a `sleep 120` terminated at 55s with `error:"Aborted"`; the receiving agent narrated the cancellation.
- T4-steer evidence: an in-flight `sleep 20` completed normally; the steer banner landed at the next reasoning boundary and the agent acted on it.
- The haiku receiver correctly distinguished steer (safe) from abort (nuclear) per the shipped tool docs — i.e. the feature reads correctly TO AGENTS, not just on the wire.

## Next tiers (proposed, see frontpage mesh-interrupt-eval)
- **T2 behavior** (statistical): real LLM agents DECIDE; rubric + DEI judge over K trials; report correct-primitive rate, abort-overuse rate.
- **T3 value A/B**: treatment vs control cohorts; wasted-turns / false-assumption deltas.
