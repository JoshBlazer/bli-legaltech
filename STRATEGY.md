# STRATEGY — how to win (and how much to invest)

## Reality check (from RULES.md /check)
Prize is **unverified, discretionary, and partly non-cash** ($10k+ "value" in bounties,
support, promotion — not a confirmed cash pool). Payment confidence **LOW**. So: keep
effort proportionate. A tight, working smart-contract compliance demo is enough to be
competitive without over-investing against an uncertain payout. Reassess before SHIP.

## Edge
- **Concrete legal workflow, not a toy.** Compliance attestation + audit trail is a real
  regtech pain point judges from a legal-tech event will recognize immediately.
- **Trust-minimized by design.** Verification runs against chain state — no middleman —
  which is the one thing a chain adds over a SaaS form. Lead with that.
- **Transferable experience.** Our contract + verification work carries straight over.

## How to win the judging
1. Make the on-chain audit trail legible to a non-crypto legal audience (plain-language UI).
2. Show the end-to-end loop live: issuer attests -> record on-chain -> anyone verifies.
3. Keep the contract small, auditable, well-tested — correctness reads as credibility.

## Risks / mitigations
- Payout uncertainty -> cap effort, prioritize a clean must-have demo over polish.
- Scope creep -> scope is locked in PLAN.md; extras go to a "Later" note, not the code.
- Testnet/key safety -> burner wallet + Sepolia only; keys only ever from `.env`.
