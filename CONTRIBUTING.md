# Contributing to pi-extensions

## Landing on `main`

`main` is the landing branch. Every change is reviewed before it is fast-forwarded —
nothing lands unreviewed, and the landing owner (currently Juan Conjunction Wechsler)
is the one who merges. Five things a contributor is expected to get right:

1. **Work on a branch. Never force-push `main`.**
2. **Run the package suite before asking for a merge** — `cd packages/<pkg> && bun test`.
   `packages/teams` takes roughly three minutes; that is normal.
3. **`packages/teams` has one pre-existing failure: `test/wake-guidance.test.ts`
   ("guidance names console.wake as generic…").** It fails on `main` already. Do not
   fix it inside an unrelated change, and do not read it as your breakage.
4. **Never commit `packages/default-prompt/prompts/default.md` or
   `packages/prompt-templates/prompts/cmd.coordinator.md`.** They are other agents'
   working state and will be committed by them.
5. **Changes are reviewed at a 10/10 bar** — six adversarial passes — before
   fast-forwarding. Expect findings, and answer them with tests that fail before the
   change and pass after it. A review that requests changes is a normal step, not a
   rejection.

## The pin (if you build for the kaliv3 fleet)

The kaliv3 runner pins this repository at a specific revision (currently `17f7caa8`),
while `main` moves ahead of it (currently `72f2d3ad`). Cloning `main` is expected and
fine — just know that the fleet is not running it. **Bumping the pin is the
coordinator's decision, never a builder's**: never align the fleet to your own branch,
and never assume a commit is deployed because it is on `main`.

## If your shell is jailed (Kali builders)

Builder shells are jailed and fail closed, and they **cannot push**: the runner pushes
your branch as `builder/<id>/<topic>` with its own key. Observed jail behaviour:
`printenv` is allowlist-only, and `mkdtemp` fails with `EACCES` until `TMPDIR` exists.
A permission error there is the jail doing its job, not a broken repository — do not
work around it, and do not read it as a reason to widen your own access.

## Evidence standard

A test that shares the implementation's assumption is not evidence. Exercise the real
seam — a genuinely failing input, a real subprocess, the actual file — rather than a
mock that encodes the same assumption the implementation already makes. A test built
from the implementation's own belief will stay green through exactly the bug it was
meant to catch.
