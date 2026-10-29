// Landing copy. Workstream D owns docs/COPY.md; when it lands, wire these
// strings to it. Until then this is a sensible stub drawn from the spec vision.

export const COPY = {
  hero: {
    eyebrow: "Regtech · on-chain compliance",
    title: "Compliance you can prove — without trusting anyone.",
    sub: "Attestry turns a compliance check into privacy-preserving, independently-verifiable, court-fileable on-chain evidence. Allow-listed issuers attest; anyone verifies in one click; subjects can prove they passed a check without revealing who they are.",
    ctaPrimary: { href: "/verify", label: "Verify an attestation" },
    ctaSecondary: { href: "/issuer", label: "Issue one" },
  },
  legs: [
    {
      title: "Independently verifiable",
      body: "Every attestation is read straight from chain state — issuer, schema, timestamp, revocation. No account, no middleman, no trust in us.",
    },
    {
      title: "Privacy-preserving",
      body: "A subject can prove membership in an issuer's attested set — ‘I passed KYC by Issuer X’ — revealing only a nullifier, never which record is theirs.",
    },
    {
      title: "Court-fileable evidence",
      body: "Export any record as a lawyer-ready Evidence Pack: a JSON bundle plus a printable record anyone can re-verify against the chain.",
    },
  ],
  how: [
    { step: "1", title: "Issue", body: "An allow-listed issuer hashes a document in-browser and records the attestation on-chain. The document bytes never leave the browser." },
    { step: "2", title: "Verify", body: "Anyone looks up an attestation by id or subject, sees a live status badge, and re-hashes the document to confirm it matches." },
    { step: "3", title: "Prove", body: "The subject generates a zero-knowledge membership proof from their saved credential and shares it — no identity disclosed." },
  ],
};
