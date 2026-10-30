# STATUS — BLI Legal Tech Hackathon 2

Legend: `[ ]` todo · `[x]` done · `[!]` blocked · `[-]` cut
Tags: `must` · `should` · `cut-first` · `ship`

## Milestones
- [x] M0 (must) **/check the rules page** (https://dorahacks.io/hackathon/legal-hack-2026) — verified: deadline 2026-11-01T01:01:00Z (re-verified 2026-10-16), AI policy allowed, prize unverified/discretionary/partly non-cash (payment confidence LOW — not a hard reject). Go, with proportionate effort.
- [x] M1 (must) Concept locked + sponsor stack wired (empty eval/harness, no features)
- [x] M2 (must) Core build — **upgraded to Attestry v2** (schema registry, EIP-712 delegated attestation, expiry, revoke-with-reason, Status enum, Merkle checkpoint). 42 Foundry tests (incl. fuzz + EIP-712).
- [x] M3 (should) Demo surface + docs — **real product**: Next.js dApp (issuer console, one-click verifier + document re-hash, Evidence Pack export, ZK `/prove`), **real Semaphore v4 in-browser proving** (14 ZK tests), pitch/demo/copy docs + sample evidence pack.
- [x] SHIP (ship) **LIVE.** Contract deployed + seeded on Sepolia (`0x2276030180fE1e179096c7ec586E676Ab561c2e6`, block 12025215, verified on-chain). dApp live + public on Vercel: **https://attestry-joshs-projects-6ec64e26.vercel.app** — verified reading live chain (`/verify` id 1 → Revoked, id 2 → Valid). 42+14 tests green, real-browser ZK. See `docs/DEPLOYMENT.md`. **Operator-only remaining:** make GitHub repo public + submit on DoraHacks (fields drafted in SUBMISSION.md).

## Open questions — OPERATOR
- [x] Prize: live DoraHacks page says "$20,000" nominal but the detail reads "$10k+ in bounties/support/promotion" — **discretionary, mostly non-cash, withdrawable** (confirmed 2026-10-29). Deadline 2026-11-01 02:01 WAT.
- [ ] Eligibility (Nigeria) / IP terms — not formally stated on the thin DoraHacks Details page; DoraHacks is global + BUIDL submissions are light (repo + writeup; video usually optional). Low risk; confirm on the Submit flow.

## Log
_(accepted 2026-10-06 from @_HEISEMMA Oct roundup)_
- 2026-10-29 · M0 · verified from RULES.md (web-checked 2026-10-16) — ticked go/no-go: go, proportionate effort
- 2026-10-29 · M1 · concept locked (Attestry — on-chain compliance attestation registry); Foundry scaffold at repo root; skeleton `ComplianceRegistry` + empty harness; `forge build` + `forge test` green (1 passed)
- 2026-10-29 · M2 · core build: `ComplianceRegistry` with issuer allowlist, attest/revoke/getAttestation/isValid, events, custom errors; full test suite — `forge test` green (18 passed incl. fuzz), `forge fmt --check` clean
- 2026-10-29 · M3 · demo surface + docs: `script/Demo.s.sol` keyless end-to-end run (green), `web/index.html` static verifier mock (empty/loading/valid/revoked, 390px), README; evidence transcripts in submission/progress/. NOTE: live Next.js frontend wired to chain deferred (keyless + time) — mock stands in; flagged to operator.
- 2026-10-29 · **ATTESTRY v2** (operator: "go for the absolute best") — 4 parallel workstreams + integration against docs/ATTESTRY_V2_SPEC.md:
  · Contracts v2: schema registry, EIP-712 delegated attest, expiry, revoke-with-reason, Status enum, Merkle checkpoint — 42 forge tests (incl. fuzz).
  · dApp: Next.js 14 + wagmi/viem — issuer console (client-side doc hashing), one-click verifier (+ re-hash match), Evidence Pack export (JSON+printable), ZK /prove with shareable proof/QR. `next build` green.
  · ZK: REAL Semaphore v4 selective disclosure (prove membership without revealing which member) — 14 tests; in-browser proving confirmed working (artifacts bundled in web/public/semaphore + CDN override).
  · Presentation: PRESENTATION.md / DEMO.md / COPY.md / sample evidence pack.
  · Integration verified: real-browser smoke test (proof generated + self-verified, 0 console errors); forge 42/42, zk 14/14, web build green. Static mock (web/index.html) replaced by the live app.
