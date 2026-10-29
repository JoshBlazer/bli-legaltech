# PRESENTATION — what the judges see

## One-liner
Attestry — put your compliance attestations on-chain so anyone can verify them in seconds,
without trusting the issuer's word or a central database.

## Demo flow (first 10 seconds matter most)
1. **Problem (5s):** "Proving a compliance check happened means trusting a PDF or an email.
   Regulators and counterparties can't independently verify it."
2. **Attest:** issuer submits an attestation (subject + document hash + check result) ->
   transaction confirms -> record is on-chain and timestamped.
3. **Verify:** a third party pastes the subject/ID -> app reads chain state and shows
   issuer, timestamp, status (valid / revoked). No login, no trust in us.
4. **Revoke:** issuer revokes -> verification instantly reflects it. Tamper-evident trail.

## What to show on screen
- Clean, non-crypto-jargon UI aimed at a legal audience.
- Empty state (nothing attested yet) and loading state (waiting on confirmation) both
  designed, not blank.
- The actual testnet transaction on a block explorer as proof.
- 390px mobile width works.

## Assets to capture (per milestone -> submission/progress/, final -> submission/)
- Screenshot of attest flow, verify flow, and the on-chain record.
- Short screen-capture of the end-to-end loop for the submission video.

## Judging alignment
Legal-tech judges reward a real workflow automated credibly. Emphasize: concrete
compliance use case, trust-minimized verification, small well-tested contract.
