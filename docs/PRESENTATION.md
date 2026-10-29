# Attestry — the judge-facing story

> Audience: law-firm partners, regulators, angel investors, legal-tech press.
> Goal: in 3 minutes, make them believe compliance evidence can be verifiable,
> private, and court-fileable at the same time — and that we built it.

## First 10 seconds (the hook)

> **"Every compliance check you rely on today is a PDF you have to trust.
> We made it a fact anyone can verify — without the subject ever revealing who they are."**

Open on the `/verify` screen, an attestation ID already pasted, and click **Verify**.
A green **VALID** badge resolves against live chain state in front of the room. No login.
No call to us. That is the whole thesis on screen before we've finished the sentence.

## The real legal problem

Compliance runs on **attestations**: "this customer passed KYC," "this fund is
accredited," "this shipment cleared sanctions screening." Today each one is a PDF,
an email, or a line in a vendor's database.

That creates three concrete failures lawyers and regulators live with:

1. **Unverifiable.** A counterparty, auditor, or court cannot independently confirm a
   check happened without trusting the issuer's say-so or subpoenaing their database.
2. **Over-disclosing.** To prove "I passed KYC," a person hands over their passport,
   address, and date of birth — again and again — creating liability every time.
3. **Not fileable.** When a dispute reaches discovery, "we have it in our system" is not
   evidence. There is no portable, tamper-evident record a court can accept on its face.

Each failure is a cost center: duplicated diligence, data-breach exposure, and
evidentiary disputes that turn on whose database to believe.

## What Attestry is

An allow-listed **issuer** (a KYC provider, a regulator, a law firm) records an
attestation on-chain: *who* it's about, *which* check, and a **hash of the signed
report** — the document itself never leaves their control. From that one record:

- **Anyone verifies it in one click** against chain state — issuer, schema, timestamp,
  and a live **Valid / Revoked / Expired** status. No account, no trust in us.
- **The subject proves they passed — without revealing identity.** Using a zero-knowledge
  membership proof, a person shows "I hold a valid KYC attestation from Issuer X" while
  disclosing *nothing* about which person they are.
- **Any record exports to a lawyer-ready Evidence Pack** — a JSON bundle plus a printable
  "Evidence Record" that anyone can independently re-verify against the chain, and that
  re-hashes the original document to prove it's the exact one attested.

## Three legs — each load-bearing

| Leg | What it kills | The demo moment |
|-----|---------------|-----------------|
| **Verifiable** | "Trust our database" | One-click green **VALID**, resolved live |
| **Privacy-preserving (ZK)** | Over-disclosure & breach liability | "Pass KYC without revealing identity" |
| **Court-fileable** | "It's in our system" ≠ evidence | Export a re-verifiable Evidence Pack |

Most on-chain compliance demos show the first leg. The pairing of **privacy** with
**fileable evidence** is what turns heads: usually you trade one for the other —
auditability *or* confidentiality. Attestry gives a legal audience both.

## Why this audience should care

- **Law firms:** a portable evidence artifact that walks into discovery already
  authenticated — no "please produce your database" fight over provenance.
- **Regulators:** real-time, tamper-evident supervision. Revocation is reflected the
  instant it's recorded; no stale certificates circulating.
- **Investors:** the wedge is the hardest part of regtech — verifiable *and* private
  compliance — and the contract is small, audited by tests, and chain-agnostic.
- **Press:** a one-sentence story that non-crypto readers get — "prove you're compliant
  without handing over your identity."

## Credibility markers (say these out loud)

- **Trust-minimized by design.** Verification runs against chain state, not our server —
  the one thing a chain adds over a SaaS form. If we vanish, every record still verifies.
- **The document never leaves the browser.** Only its hash goes on-chain; the Evidence
  Pack re-hashes the file to prove a match. Privacy and proof, not a trade-off.
- **Small, well-tested contract.** One core `ComplianceRegistry`, full Foundry tests
  including fuzz. Correctness reads as credibility to a legal audience.
- **Testnet, keyless, honest.** Live on a public testnet; no mainnet theatre, no real
  funds, no secret infrastructure to take our word for.

## Close

> **"Attestry turns a compliance check into evidence — verifiable by anyone,
> private for the subject, and ready to file. Three things that usually can't
> coexist, in one record."**
