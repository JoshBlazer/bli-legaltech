---
description: Build, verify, commit and tick the next milestone in STATUS.md
---
1. Read `STATUS.md`. Take the first `[ ]` milestone that isn't tagged `ship`. If none remain, say "All build milestones done — run `/ship`." and stop.
2. Re-read the parts of `PLAN.md`, `STRATEGY.md` and `PRESENTATION.md` that touch this milestone. State in 2–3 lines what "done" means for it.
3. Build it. Check `docs/` and Context7 for any API you're not certain of.
4. Verify:
   - Run the project's test/lint/build commands (see CLAUDE.md → Commands). Fix failures.
   - If it touches UI: Playwright MCP → open the app, walk the milestone's flow, check the console, check a 390px width. Save a screenshot to `submission/progress/<milestone>.png`.
   - If it touches contracts: `forge test` must pass; deploy to local `anvil` and exercise the flow from the frontend if one exists.
5. Commit: `git add -A && git commit -m "<type>: <milestone summary>"` — no AI attribution, no trailers. Push.
6. Tick the milestone `[x]` in `STATUS.md` and add a log line (date · milestone · short hash · note). Commit that too (`chore: status`).
7. If you get stuck after two genuine attempts, mark it `[!]` with a one-line reason, commit, and stop — don't burn time. Report what's blocking and what you need.

Scope guard: build only what this milestone needs. Extra ideas go in a "Later" note at the end of your reply, not in the code.

Extra instruction for this run: $ARGUMENTS
