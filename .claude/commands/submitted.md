---
description: Mark this project as submitted in the hunt memory
---
The operator has submitted the entry. Notes: $ARGUMENTS

1. In `../reference/state.json`, set this project's record (match by `folder`) to `status: submitted`, `submitted_at: <now ISO>`, and store any submission URL from the notes.
2. Commit here: `chore: submitted`. Tag it: `git tag submitted && git push --tags`.
3. Tell the operator: "Run `/results` from `hackathons/` once judging is done."
