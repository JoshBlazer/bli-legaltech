# Attestry — demo script (target: under 3 minutes)

> One presenter, one screen. Testnet only. Rehearse until the clicks are muscle memory;
> the first 10 seconds carry the pitch. Times are cumulative budgets, not reads.
> Have everything pre-loaded in tabs so nothing waits on a cold start.

## Pre-flight checklist (before you present)

- [ ] dApp running; wallet connected as the allow-listed demo **issuer**.
- [ ] A sample compliance document saved on the desktop (e.g. `kyc-report.pdf`).
- [ ] The subject's **saved credential** (from a prior attest) copied for the `/prove` step.
- [ ] One attestation already recorded, so `/verify` resolves instantly if a live tx lags.
- [ ] Block-explorer tab open to the contract address.
- [ ] Dark mode on; window at a clean width (demo also works at 390px mobile).

---

## 0:00–0:15 — Hook

**On screen:** `/verify`, an attestation ID already pasted.

> "Every compliance check you trust today is a PDF. Watch me turn one into something
> anyone can verify — in one click."

**Click Verify.** A green **VALID** badge resolves against live chain state.

> "No login. No call to us. That's chain state, not our word for it."

## 0:15–1:00 — Issuer attests

**Go to** `/issuer`.

> "I'm an allow-listed issuer — say, a KYC provider. I'll attest that a subject passed
> a check."

- Fill **subject address**; pick schema **KYC/AML v1** from the dropdown.
- **Upload the document.** Call it out:
  > "This gets hashed in my browser. The file never leaves my machine — only its
  > fingerprint goes on-chain."
- Tick **Enable private proof** (generates the subject's Semaphore identity).
- Click **Attest.** Show the tx hash and explorer link.

> "That's the record: who, which check, a timestamp, and the document's fingerprint.
> Permanent and tamper-evident."

## 1:00–1:40 — Verify (one-click + document re-hash)

**Go to** `/verify`, enter the new attestation ID (or subject address).

> "Now I'm a counterparty — or a regulator — with no relationship to the issuer."

- Read back **issuer, schema, timestamp, Status: VALID**.
- Open the **Verify document** box, **re-upload the same file.**
  > "It re-hashes and matches the hash on-chain — proof this is the exact document that
  > was attested, not a doctored copy."
- Show the green **✓ match**.

> "If the issuer revokes this, the badge flips to Revoked the instant it's recorded.
> No stale certificates floating around."

## 1:40–2:20 — Prove (ZK: pass KYC without revealing identity)

**Go to** `/prove`.

> "Here's the part that's usually impossible. The subject needs to prove they passed
> KYC — but does *not* want to hand over their passport again."

- Paste the subject's **saved credential**, generate the **ZK membership proof**.
- Produce the shareable link / QR.

> "This proof says: 'I hold a valid KYC attestation from Issuer X.' It reveals nothing
> about *which* person I am — just a one-time nullifier that stops replay. Verifiable,
> and private. You don't normally get both."

## 2:20–2:55 — Export the Evidence Pack

**Back on** `/verify`, click **Export Evidence Pack**.

> "And when this ends up in a dispute: one click produces a lawyer-ready record."

- Show the downloaded **JSON** and the printable **Evidence Record** (HTML/PDF).
- Point at the footer.
  > "It carries the contract address, chain, the hash, the status, and instructions for
  > anyone to re-verify it independently against the chain. 'It's in our system' becomes
  > a portable artifact you can file."

## 2:55–3:00 — Close

> "Verifiable by anyone. Private for the subject. Ready to file. One record. That's Attestry."

---

## If something breaks (graceful fallbacks)

- **Live tx is slow/fails:** switch to the pre-recorded attestation ID — the verify,
  prove, and export steps all work against it. Never wait on a spinner on stage.
- **ZK proving stalls in-browser:** narrate the pre-generated proof link already open in
  a tab; the point (membership without identity) still lands.
- **Wallet won't connect:** read paths (`/verify`, export) are keyless — demo those and
  describe the issuer step.
