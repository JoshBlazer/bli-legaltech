---
description: Deploy, generate submission assets, and pre-flight against the rules
---
Goal: get the operator to "copy, paste, record voiceover, click submit". Never submit the entry yourself.

1. **Freeze check.** All `must` milestones `[x]`? If not, list what's missing and ask whether to ship anyway.
2. **Deploy.** Preview deploy first; walk the full demo flow on the preview URL with Playwright. If clean, ask the operator, then deploy to production (Web3: contracts to the required testnet via `forge script --broadcast` — ask first — then verify on the explorer with the API key). Record URLs.
3. **Screenshots.** Playwright at 1440×900 and 390×844: the hero screen, each key feature, the "wow" moment from `PRESENTATION.md`. Save to `submission/screenshots/`. Make a cover image at the platform's recommended size → `submission/cover.png`.
4. **Demo video draft.**
   - Write `submission/video/SCRIPT.md` timed to `video_max_seconds` (or 2:00 if unstated): hook in the first 10s, problem, live demo of the core flow, tech/sponsor usage, close. Include the voiceover text per scene.
   - Record the flow with Playwright video recording → `submission/video/raw/`.
   - Use ffmpeg to trim, join scenes, and cap length → `submission/video/draft.mp4`. Add burned-in captions from the script if it helps legibility. The operator records the voiceover.
5. **README.** Judge-facing: one-line pitch, screenshot/GIF, live URL, video link placeholder, how it works, tech stack, how to run locally, sponsor tech used. No AI attribution — unless `ai_policy` is `required_disclosure` and the rules say to disclose in the README.
6. **License.** Add the license `RULES.md` requires (MIT if "open source" and unspecified).
7. **SUBMISSION.md.** Fill every form field with final copy. Tagline ≤ the platform's limit. Description structured around the judging criteria, in their order. If `ai_policy` is `required_disclosure`, write the disclosure honestly and put it where the rules require.
8. **Pre-flight.** In `SUBMISSION.md`, check every requirement in `RULES.md` → ✅/❌ with evidence: repo URL reachable, repo public if required (if so, ask then run `gh repo edit --visibility public --accept-visibility-change-consequences`), demo URL loads in a fresh Playwright context, video ≤ limit, license present, tracks selected, all required fields filled, deadline not passed.
9. Commit and push. Tick SHIP in `STATUS.md`. Tell the operator exactly what's left for them, then: "After you submit, run `/submitted`."
