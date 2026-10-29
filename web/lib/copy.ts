// Landing copy — ported verbatim from docs/COPY.md (workstream D). Plain language
// for a legal audience; no crypto jargon on the surface.

export const COPY = {
  hero: {
    eyebrow: "Regtech · on-chain compliance",
    title: "Compliance you can prove — without handing over who you are.",
    sub: "Attestry turns a compliance check into on-chain evidence that anyone can verify in one click, that a subject can prove privately, and that exports to a court-ready record.",
    ctaPrimary: { href: "/verify", label: "Verify an attestation" },
    ctaSecondary: { href: "#how", label: "See how it works" },
  },
  legs: [
    {
      title: "Independently verifiable",
      body: "Every attestation lives on-chain. A counterparty, auditor, or regulator confirms it against chain state in one click — no account, no database request, no trusting us. If we disappeared tomorrow, every record would still verify.",
    },
    {
      title: "Private by default",
      body: "To prove you passed KYC, you shouldn't have to re-send your passport. With a zero-knowledge proof, a subject shows ‘I hold a valid attestation from this issuer’ while revealing nothing about which person they are. Proof without disclosure.",
    },
    {
      title: "Court-fileable",
      body: "One click exports an Evidence Pack: a signed, re-verifiable record plus a printable Evidence Record. It re-hashes the original document to prove authenticity and ships with instructions for anyone to check it independently.",
    },
  ],
  how: [
    {
      step: "1",
      title: "Issue",
      body: "An allow-listed issuer attests to a check — the subject, the schema, and a hash of the signed report. The document is hashed in the browser; only its fingerprint goes on-chain.",
    },
    {
      step: "2",
      title: "Verify",
      body: "Anyone enters an ID or subject address and reads the result live: issuer, schema, timestamp, and a Valid / Revoked / Expired status. Re-upload the document to confirm it's the exact one attested.",
    },
    {
      step: "3",
      title: "Prove or file",
      body: "The subject generates a private proof of compliance to share — or exports a lawyer-ready Evidence Pack for a counterparty, auditor, or court.",
    },
  ],
  closing: {
    heading: "Compliance that stands on its own.",
    body: "Verifiable by anyone. Private for the subject. Ready to file.",
    cta: { href: "/verify", label: "Verify an attestation" },
  },
  micro: {
    trustBadge: "Runs against chain state — not our server.",
    issuerReassurance: "Your document never leaves this browser. Only its hash is recorded.",
    proveReassurance: "This proof reveals that you're compliant — never who you are.",
    verifyEmpty: "Paste an attestation ID or a subject address to check a record.",
    footerTagline:
      "Attestry — privacy-preserving, independently-verifiable, court-fileable compliance evidence.",
  },
};
