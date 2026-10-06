---
description: Re-plan remaining scope against the real time left
---
1. Time left = `RULES.md` deadline − now. **Usable build time** = time left − ship buffer, where ship buffer = the greater of 6 hours or 15% of time left. Also subtract the operator's sleep: assume ~8h/day unless they've said otherwise in this session.
2. For each remaining `[ ]` milestone, estimate hours (be honest; hackathon estimates run ~1.5× optimistic — apply that).
3. If it fits: say so in two lines and stop.
4. If it doesn't: propose cuts in this order — `cut-first` → `should` → simplify a `must` (fake/mock the non-demo path, hardcode config, drop auth if judges don't need it). Never cut what the judging criteria in `RULES.md` weight most; never cut the demo's first 30 seconds.
5. Show the proposed new `STATUS.md` as a diff. Apply it only after the operator agrees — **except** in autopilot/headless mode, where you may cut `cut-first` items automatically, mark them `[-]` with "cut by /recut <date>", and leave `should`/`must` changes for the operator.
6. Record the change in `PLAN.md` under a "Recut log" heading.

Context from operator: $ARGUMENTS
