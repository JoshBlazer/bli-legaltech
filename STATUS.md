# STATUS — BLI Legal Tech Hackathon 2

Legend: `[ ]` todo · `[x]` done · `[!]` blocked · `[-]` cut
Tags: `must` · `should` · `cut-first` · `ship`

## Milestones
- [x] M0 (must) **/check the rules page** (https://dorahacks.io/hackathon/legal-hack-2026) — verified: deadline 2026-11-01T01:01:00Z (re-verified 2026-10-16), AI policy allowed, prize unverified/discretionary/partly non-cash (payment confidence LOW — not a hard reject). Go, with proportionate effort.
- [x] M1 (must) Concept locked + sponsor stack wired (empty eval/harness, no features)
- [x] M2 (must) Core build
- [x] M3 (should) Demo surface + docs
- [ ] SHIP (ship) Deploy, assets, pre-flight — run `/ship`

## Open questions — OPERATOR
- [ ] Exact deadline time? Eligibility for Nigeria? IP terms? Prize currency ($20,000)?

## Log
_(accepted 2026-10-06 from @_HEISEMMA Oct roundup)_
- 2026-10-29 · M0 · verified from RULES.md (web-checked 2026-10-16) — ticked go/no-go: go, proportionate effort
- 2026-10-29 · M1 · concept locked (Attestry — on-chain compliance attestation registry); Foundry scaffold at repo root; skeleton `ComplianceRegistry` + empty harness; `forge build` + `forge test` green (1 passed)
- 2026-10-29 · M2 · core build: `ComplianceRegistry` with issuer allowlist, attest/revoke/getAttestation/isValid, events, custom errors; full test suite — `forge test` green (18 passed incl. fuzz), `forge fmt --check` clean
- 2026-10-29 · M3 · demo surface + docs: `script/Demo.s.sol` keyless end-to-end run (green), `web/index.html` static verifier mock (empty/loading/valid/revoked, 390px), README; evidence transcripts in submission/progress/. NOTE: live Next.js frontend wired to chain deferred (keyless + time) — mock stands in; flagged to operator.
