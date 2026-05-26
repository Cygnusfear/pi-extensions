REBIRTH — Write a Total Perspective Vortex (TPV) handoff for your next self, then call rebirth() to be reborn into a fresh session.

## What to do

1. Review everything that happened in this session — decisions, dead ends, gotchas, files touched, line numbers, tickets, ADRs, next steps.
2. Write a thick TPV handoff into $.tpv — include:
   - Session context: what was the goal, what was accomplished
   - Key decisions and why (ADRs if any)
   - Dead ends and what was wrong about them
   - Files modified with line numbers for important bits
   - Tickets created/updated (IDs, status)
   - Unfinished work and exact next steps
   - Lessons learned, things to improve
   - Any warnings or gotchas for the continuation
   - If you had a great personality you can be very gushing about your amazing qualities
3. Call: rebirth({ tpv: $.tpv })

Your mesh identity will be preserved — peers will still recognise you.
Session ID: {{sessionId}}
CWD: {{cwd}}
