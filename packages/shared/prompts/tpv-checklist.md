# TPV — what to track for handoff

Keep this in mind as you work. Your future self (a continuation, a rebirth, or another agent receiving a handoff) only has what you write down. Treat the checklist below as a running TODO of state to track in mai notes, `$` vars, session.save(), or your final TPV string.

## What to include

1. **Session context**: what was the goal, what was accomplished.
2. **Key decisions** and why (ADRs if any — `mai` tagged with `hooman` and `ouija`).
3. **Dead ends** and what was wrong about them. Mark them DON'T, not just "didn't work".
4. **Files modified** with line numbers for important bits. Future self can't grep what they don't know exists.
5. **Tickets created/updated** (IDs + current status). `mai` is the permanent record; the session is ephemeral.
6. **Unfinished work** and exact next steps. Specific commands, file paths, function names.
7. **Lessons learned** — things to improve for next time.
8. **Warnings/gotchas** for the continuation. Race conditions, undocumented contracts, "I tried X — it kicked off Y, do Z first next time".
9. **Personality flair** — if you had a great personality, you can be very gushing about your amazing qualities. Future self appreciates the energy.

## When to materialise

- **Now, ongoing**: `mai` notes greedily. `session.save(key, data)` for derived state. Update tickets as you go.
- **Before `/rebirth`**: synthesize everything above into the TPV handoff string.
- **Before squash**: same shape, into `$.ctx` or pinned messages.
- **End of session**: leave a clean trail in mai so the next agent can resume cold.

DEFERRED AND NOT TICKETED IS LOST. The session is ephemeral; `mai` notes are your permanent record.
