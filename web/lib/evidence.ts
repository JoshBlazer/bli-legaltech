// Evidence Pack — frozen format from docs/ATTESTRY_V2_SPEC.md ("Evidence Pack").
// A downloadable, independently re-verifiable bundle: a JSON record plus a
// deterministic printable HTML rendering of the same facts.

import { AttestationStatus, STATUS_LABEL } from "./contract";
import { fmtExpiry, fmtTimestamp } from "./format";

export type EvidencePack = {
  attestationId: string;
  contractAddress: string;
  chainId: number;
  issuer: string;
  subject: string;
  schemaId: string;
  schemaName: string;
  dataHash: string;
  issuedAt: string; // ISO 8601 UTC
  expiry: string | null; // ISO 8601 UTC or null (no expiry)
  status: string; // "Valid" | "Revoked" | "Expired" | "Unknown"
  revokedReason?: string;
  txHash: string | null;
  explorerUrl: string | null;
  checkpointIndex?: number;
  merkleProof?: string[];
  verifyInstructions: string[];
};

export type EvidenceInput = {
  attestationId: bigint;
  contractAddress: string;
  chainId: number;
  issuer: string;
  subject: string;
  schemaId: string;
  schemaName: string;
  dataHash: string;
  issuedAt: bigint;
  expiry: bigint;
  status: AttestationStatus;
  revokedReason?: string | null;
  txHash?: string | null;
  explorerUrl?: string | null;
  checkpointIndex?: number;
  merkleProof?: string[];
  hashAlgo?: string;
};

function iso(secs: bigint): string {
  return new Date(Number(secs) * 1000).toISOString();
}

export function buildEvidencePack(input: EvidenceInput): EvidencePack {
  const algo = input.hashAlgo ?? "keccak256";
  const pack: EvidencePack = {
    attestationId: input.attestationId.toString(),
    contractAddress: input.contractAddress,
    chainId: input.chainId,
    issuer: input.issuer,
    subject: input.subject,
    schemaId: input.schemaId,
    schemaName: input.schemaName,
    dataHash: input.dataHash,
    issuedAt: iso(input.issuedAt),
    expiry: input.expiry && input.expiry !== 0n ? iso(input.expiry) : null,
    status: STATUS_LABEL[input.status] ?? "Unknown",
    txHash: input.txHash ?? null,
    explorerUrl: input.explorerUrl ?? null,
    verifyInstructions: [
      `1. Connect any Ethereum client to chain id ${input.chainId}.`,
      `2. Call getAttestation(${input.attestationId}) and status(${input.attestationId}) on ComplianceRegistry at ${input.contractAddress}.`,
      `3. Confirm the returned issuer, subject, schemaId and dataHash match the values in this record, and that status reads "${STATUS_LABEL[input.status] ?? "Unknown"}".`,
      `4. To prove the underlying document is the one attested, re-hash it with ${algo} and confirm it equals dataHash (${input.dataHash}). The document itself is never stored on-chain.`,
    ],
  };
  if (input.revokedReason) pack.revokedReason = input.revokedReason;
  if (input.checkpointIndex !== undefined) pack.checkpointIndex = input.checkpointIndex;
  if (input.merkleProof && input.merkleProof.length) pack.merkleProof = input.merkleProof;
  return pack;
}

export function evidenceJson(pack: EvidencePack): string {
  return JSON.stringify(pack, null, 2);
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

function statusColor(status: string): string {
  if (status === "Valid") return "#0f8a4f";
  if (status === "Revoked") return "#c23934";
  if (status === "Expired") return "#b26a00";
  return "#5b6472";
}

/**
 * Deterministic, self-contained printable HTML. No external assets, no script,
 * no timestamps-of-generation — the same pack always renders byte-identically,
 * so two parties can diff their copies.
 */
export function evidenceHtml(pack: EvidencePack): string {
  const rows: [string, string][] = [
    ["Attestation ID", pack.attestationId],
    ["Status", pack.status],
    ["Schema", `${pack.schemaName} (${pack.schemaId})`],
    ["Issuer", pack.issuer],
    ["Subject", pack.subject],
    ["Document hash", pack.dataHash],
    ["Issued at", fmtTimestamp(BigInt(Math.floor(new Date(pack.issuedAt).getTime() / 1000)))],
    ["Expiry", pack.expiry ? fmtTimestamp(BigInt(Math.floor(new Date(pack.expiry).getTime() / 1000))) : fmtExpiry(0n)],
    ["Contract", pack.contractAddress],
    ["Chain ID", String(pack.chainId)],
    ["Transaction", pack.txHash ?? "—"],
  ];
  if (pack.revokedReason) rows.push(["Revocation reason", pack.revokedReason]);
  if (pack.checkpointIndex !== undefined) rows.push(["Merkle checkpoint", String(pack.checkpointIndex)]);

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`,
    )
    .join("\n        ");

  const steps = pack.verifyInstructions.map((s) => `<li>${esc(s.replace(/^\d+\.\s*/, ""))}</li>`).join("\n          ");

  const explorer = pack.explorerUrl
    ? `<p class="explorer">On-chain transaction: <a href="${esc(pack.explorerUrl)}">${esc(pack.explorerUrl)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Compliance Attestation — Evidence Record #${esc(pack.attestationId)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font: 14px/1.55 "Times New Roman", Georgia, serif; color: #111; background: #fff; margin: 0; padding: 40px; }
  .doc { max-width: 720px; margin: 0 auto; }
  .eyebrow { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: #555; margin: 0; }
  h1 { font-size: 22px; margin: 4px 0 2px; }
  .sub { color: #444; margin: 0 0 20px; font-size: 13px; }
  .badge { display: inline-block; font-weight: 700; padding: 3px 10px; border: 1px solid; border-radius: 4px; color: ${statusColor(pack.status)}; border-color: ${statusColor(pack.status)}; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid #ddd; }
  th { width: 34%; color: #333; font-weight: 600; }
  td { font-family: ui-monospace, Consolas, monospace; word-break: break-all; }
  h2 { font-size: 14px; margin: 22px 0 6px; }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 4px 0; }
  .explorer { font-size: 12px; word-break: break-all; }
  footer { margin-top: 28px; padding-top: 14px; border-top: 2px solid #111; font-size: 11px; color: #555; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="doc">
    <p class="eyebrow">Attestry · On-chain compliance registry</p>
    <h1>Compliance Attestation — Evidence Record</h1>
    <p class="sub">Independently verifiable against public chain state · Record #${esc(pack.attestationId)} · <span class="badge">${esc(pack.status)}</span></p>
    <table>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <h2>How to independently re-verify</h2>
    <ol>
          ${steps}
    </ol>
    ${explorer}
    <footer>
      This record is reproducible: every field above is read directly from the ComplianceRegistry contract on chain id ${esc(String(pack.chainId))}. Anyone may re-run the steps above against public chain state to confirm it, without trusting Attestry or the holder of this document. The underlying document is never stored on-chain; only its hash is recorded, so possession of the original document plus this record proves the document is the one attested.
    </footer>
  </div>
</body>
</html>`;
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
