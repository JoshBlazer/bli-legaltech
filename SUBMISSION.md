# SUBMISSION — Attestry

Drafted by ship-prep. Copy each field into the DoraHacks submission form. **The
operator** clicks submit, then runs `/submitted`.

Submission page: https://dorahacks.io/hackathon/legal-hack-2026

> The exact field set below is the standard DoraHacks BUIDL form. Confirm the
> live form's fields before pasting — some events add/rename fields. Items that
> depend on actions only the operator can take are marked **[OPERATOR]**.

## Fields

### Project name
Attestry

### Tagline
On-chain compliance attestations that anyone can verify in seconds — no central database, no trust in the issuer's word.

### Description / Story
**The problem.** Proving a compliance check happened — a KYC/AML review, a
sanctions screen, a regulatory filing — means trusting a PDF or an email.
Regulators, auditors, and counterparties can't independently verify it, and
records can be quietly edited after the fact.

**Attestry.** A smart-contract registry where allow-listed issuers (KYC
providers, compliance teams) record tamper-evident attestations on-chain. Each
attestation stores a schema id (what kind of check) and a hash of the off-chain
document — never personal data. Anyone can then verify the issuer, timestamp,
and status directly against chain state. Issuers can revoke; the original record
is preserved, producing an immutable audit trail.

**What's built.** A complete, tested `ComplianceRegistry` contract (issuer
allowlist, attest, revoke, verify, events), a keyless end-to-end demo script
that walks deploy → attest → verify → revoke, and a verifier UI mock showing the
empty/loading/valid/revoked states. 18 tests pass (including fuzz).

**Why on-chain.** The one thing a chain adds over a SaaS form is trust-minimized
verification: no intermediary can alter or deny the record. That is exactly what
a compliance audit trail needs.

### Built with
Solidity, Foundry (forge/anvil/cast), forge-std. Target chain: Ethereum Sepolia testnet.

### Tracks / category
Smart-contract compliance / regtech / legal automation. **[OPERATOR]** select the
track(s) the live form offers.

### Repository URL
https://github.com/JoshBlazer/bli-legaltech — **[OPERATOR]** the repo is currently
local only; push and (if the rules require a public repo) make it public before submitting.

### Demo / video URL
Best demo is the **live app**: https://attestry-app.vercel.app (try `/verify` id 1 → Revoked,
id 2 → Valid; `/prove` → "Load demo credential" → Generate ZK proof).
A short screen-capture GIF of the verify + ZK-prove flow is at
`submission/video/attestry-demo.gif`; stills in `submission/screenshots/`
(`attestry-verify-revoked.jpg`, `attestry-zk-proof.jpg`). **[OPERATOR]** attach/upload if the form wants a video.

### Live demo / deployed contract
**ComplianceRegistry v2 is live on Sepolia** (burner wallet, testnet only):
- Contract: `0x2276030180fE1e179096c7ec586E676Ab561c2e6` (chainId 11155111)
- Explorer: https://sepolia.etherscan.io/address/0x2276030180fE1e179096c7ec586E676Ab561c2e6
- Seeded with a schema, two allow-listed issuers, and two attestations
  (one Revoked, one Valid via EIP-712 delegation) + a Merkle checkpoint — see
  `docs/DEPLOYMENT.md`. `/verify` reads it all straight from chain state.
- **Live dApp (Vercel): https://attestry-joshs-projects-6ec64e26.vercel.app** — public,
  reads the live contract (verified: `/verify` id 1 → Revoked, id 2 → Valid).

### Team
Joshua Willie (solo).

### AI disclosure
RULES.md `ai_policy` = "allowed" (no required disclosure recorded). **[OPERATOR]**
if the live form asks, disclose per the form.

## Assets
- Progress/evidence: `submission/progress/` (forge test transcript, demo run transcript)
- Screenshots: `submission/screenshots/` — **[OPERATOR]** capture `web/index.html`
  (valid + revoked states, 390px) and the demo run.
- Video draft: `submission/video/`

## Pre-flight checklist (vs RULES.md)

Legend: ✅ done · ⚠️ needs operator / unverified · ❌ not done

- ✅ Concept is a real legal/compliance workflow on-chain (matches theme: smart-contract compliance, regtech).
- ✅ Contract builds (`forge build`) and full test suite passes (`forge test` — 18/18, incl. fuzz).
- ✅ Keyless end-to-end demo runs (`forge script script/Demo.s.sol -vvv`).
- ✅ Code formatted (`forge fmt --check` clean).
- ✅ LICENSE present (MIT) — matches SPDX headers. (RULES `license_required` = unverified; ⚠️ confirm the rules' required license, if any.)
- ✅ No secrets committed; only env var names in `.env.example`; `.env` gitignored.
- ✅ Testnet-only posture; no mainnet, no real funds, no deploy performed.
- ⚠️ Deadline: 2026-11-01T01:01:00Z (re-verified 2026-10-16). Submit well before — note DoraHacks clock.
- ⚠️ Eligibility (Nigeria) — UNVERIFIED in RULES.md. Confirm before submitting.
- ⚠️ IP terms — UNVERIFIED. Confirm no ownership/exclusive grab.
- ⚠️ Prize currency/amount — unverified, discretionary, partly non-cash (payment confidence LOW).
- ⚠️ Repo public requirement — UNKNOWN in RULES.md. Confirm; if required, make public.
- ⚠️ Video / live-demo requirement — UNKNOWN in RULES.md. Confirm and produce if required.
- ❌ Repo pushed to GitHub — **[OPERATOR]**, local only by design.
- ✅ Contract deployed to Sepolia — `0x2276030180fE1e179096c7ec586E676Ab561c2e6`, seeded + verified on-chain (see `docs/DEPLOYMENT.md`).
- ❌ Entry submitted — **[OPERATOR]** only.

## Operator steps to actually ship
1. Run `/check` against the live rules page to resolve the ⚠️ unknowns (eligibility, IP, repo-public, video, license).
2. Deploy to Sepolia with a burner wallet; record the address + explorer link (into "Live demo" above).
3. Push the repo (and make public if required).
4. (If required) record a short demo video; capture screenshots into `submission/screenshots/`.
5. Paste the fields above into the live form, verify against the pre-flight, submit, then run `/submitted`.
