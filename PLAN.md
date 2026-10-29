# PLAN — BLI Legal Tech Hackathon 2

## Concept (LOCKED at M1)
**Attestry — an on-chain compliance attestation registry (regtech / legal automation).**

Regulated entities (token issuers, DeFi protocols, fintechs) record tamper-evident
compliance attestations on-chain — document hashes, KYC/AML check outcomes, regulatory
filing references — producing an immutable, timestamped audit trail that auditors and
regulators can independently verify. It automates one concrete legal workflow: the
**compliance attestation and audit-trail** that today lives in email threads and PDFs.

- Smart contract: `ComplianceRegistry` holds attestations keyed by subject + schema,
  with issuer access control, revocation, and events for off-chain indexing.
- Verification surface: anyone can verify an attestation's existence, issuer, timestamp,
  and status directly against chain state (no trusted intermediary).

Fits the hackathon theme: smart-contract compliance, legal automation, dispute/audit
ledgers, regtech. Solo-viable. Testnet only.

## Stack
- **Contracts:** Foundry (Solidity 0.8.28), forge-std for tests. Target: Sepolia testnet.
- **Frontend (M3):** Next.js — submit + verify attestation UI, empty/loading states.
- **Off-chain index (M3, optional):** Supabase for event cache / search.
- All keys (Alchemy RPC, Etherscan, deployer burner key) read from `.env` at runtime.
  Never hardcoded. Never mainnet. Never a key with real funds.

## Milestones & scope

### M0 — Rules verification (must) — DONE
Rules page checked (2026-10-06, deadline re-verified 2026-10-16). Deadline
2026-11-01T01:01:00Z. AI policy: allowed. Prize unverified/discretionary/partly non-cash,
payment confidence LOW — not a hard reject; keep investment proportionate.

### M1 — Concept locked + scaffold + runnable keyless skeleton (must) — THIS MILESTONE
**In scope:** Foundry project at repo root that builds; `ComplianceRegistry` contract
*shell* (version constant only, no attestation logic); empty eval/harness (one smoke
test proving deploy + version). Concept + plan docs locked.
**Explicitly CUT from M1:** any attestation logic, access control, events, frontend,
Supabase, deployment, scripts. No features.

### M2 — Core build (must)
Implement `ComplianceRegistry`: `attest()`, `revoke()`, `getAttestation()`,
issuer allowlist, events. Full forge test suite. Local `anvil` deploy + `cast` exercise.

### M3 — Demo surface + docs (should)
Next.js UI (submit + verify flows, empty/loading states, 390px mobile), optional
Supabase event index, README, architecture notes.

### SHIP (ship)
Deploy contract to Sepolia (burner wallet), record address, assets, pre-flight vs RULES.md,
`/ship`. Operator submits.

## Cut-first list (drop these first if time runs short)
Supabase index → Etherscan verification → fancy UI polish → multi-schema support.
