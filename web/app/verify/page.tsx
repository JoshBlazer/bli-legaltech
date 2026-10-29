"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import {
  getById,
  getBySubject,
  getSchema,
  NotConfiguredError,
  type ResolvedAttestation,
} from "@/lib/reads";
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  IS_PLACEHOLDER_ADDRESS,
  txUrl,
  AttestationStatus,
} from "@/lib/contract";
import { hashFile, HASH_ALGOS } from "@/lib/hash";
import { fmtExpiry, fmtTimestamp, short, decodeReason } from "@/lib/format";
import {
  buildEvidencePack,
  evidenceHtml,
  evidenceJson,
  downloadText,
} from "@/lib/evidence";
import {
  Page,
  PageHeader,
  Notice,
  Row,
  Spinner,
  Empty,
  ErrorNote,
  StatusBadge,
} from "../components/ui";

type Loaded = {
  record: ResolvedAttestation;
  schemaName: string;
};

export default function VerifyPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Loaded[] | null>(null);
  const [selected, setSelected] = useState<Loaded | null>(null);

  // document re-hash state
  const [matchFile, setMatchFile] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ ok: boolean; algo: string } | null>(null);
  const [hashing, setHashing] = useState(false);

  async function resolveSchemaName(id: `0x${string}`): Promise<string> {
    try {
      const s = await getSchema(id);
      return s?.name ?? short(id, 10, 6);
    } catch {
      return short(id, 10, 6);
    }
  }

  async function lookup() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setSelected(null);
    setMatchFile(null);
    setMatchResult(null);
    try {
      if (isAddress(q)) {
        const recs = await getBySubject(q as Address);
        const loaded = await Promise.all(
          recs.map(async (r) => ({ record: r, schemaName: await resolveSchemaName(r.schemaId) })),
        );
        setResults(loaded);
        if (loaded.length === 1) setSelected(loaded[0]);
      } else if (/^\d+$/.test(q)) {
        const r = await getById(BigInt(q));
        if (!r) {
          setResults([]);
        } else {
          const loaded = { record: r, schemaName: await resolveSchemaName(r.schemaId) };
          setResults([loaded]);
          setSelected(loaded);
        }
      } else {
        setError("Enter a numeric attestation id or a 0x subject address.");
      }
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        setError("No deployment wired yet — set NEXT_PUBLIC_CONTRACT_ADDRESS once the contract is deployed.");
      } else {
        setError((e as Error).message.split("\n")[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onMatchFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !selected) return;
    setMatchFile(f.name);
    setHashing(true);
    setMatchResult(null);
    try {
      // Try every supported algorithm; a match on any proves the document.
      let matched: { ok: boolean; algo: string } = { ok: false, algo: "keccak256" };
      for (const a of HASH_ALGOS) {
        const h = await hashFile(f, a.value);
        if (h.toLowerCase() === selected.record.dataHash.toLowerCase()) {
          matched = { ok: true, algo: a.value };
          break;
        }
      }
      setMatchResult(matched);
    } finally {
      setHashing(false);
    }
  }

  function exportPack() {
    if (!selected) return;
    const r = selected.record;
    const reason = decodeReason(r.revokedReason) ?? undefined;
    const pack = buildEvidencePack({
      attestationId: r.id,
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      issuer: r.issuer,
      subject: r.subject,
      schemaId: r.schemaId,
      schemaName: selected.schemaName,
      dataHash: r.dataHash,
      issuedAt: r.issuedAt,
      expiry: r.expiry,
      status: r.status,
      revokedReason: reason,
      txHash: r.txHash,
      explorerUrl: txUrl(r.txHash),
    });
    downloadText(`attestry-evidence-${r.id}.json`, evidenceJson(pack), "application/json");
    downloadText(`attestry-evidence-${r.id}.html`, evidenceHtml(pack), "text/html");
  }

  return (
    <Page>
      <PageHeader
        title="Verify an attestation"
        lede="Look up any attestation by id or subject and read its status straight from chain state — no account, no trust in us."
      />

      {IS_PLACEHOLDER_ADDRESS && (
        <Notice>
          No deployment is wired yet — reads will not resolve until
          <span className="mono"> NEXT_PUBLIC_CONTRACT_ADDRESS</span> is set post-deploy.
        </Notice>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="ipt"
          placeholder="Attestation id (e.g. 1) or subject 0x…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button className="btn" onClick={lookup} disabled={loading || !query.trim()}>
          {loading ? "…" : "Verify"}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <Spinner label="Reading registry…" />
        </div>
      )}

      {error && <div style={{ marginTop: 18 }}><ErrorNote>{error}</ErrorNote></div>}

      {results && results.length === 0 && !loading && (
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <Empty>No attestation found for that id or subject.</Empty>
        </div>
      )}

      {/* subject list picker */}
      {results && results.length > 1 && (
        <div className="card" style={{ marginTop: 18, padding: 16 }}>
          <div className="label">{results.length} attestations for this subject</div>
          <div style={{ display: "grid", gap: 8 }}>
            {results.map((l) => (
              <button
                key={l.record.id.toString()}
                className="btn btn-ghost"
                style={{ justifyContent: "space-between", width: "100%" }}
                onClick={() => {
                  setSelected(l);
                  setMatchFile(null);
                  setMatchResult(null);
                }}
              >
                <span>#{l.record.id.toString()} · {l.schemaName}</span>
                <StatusBadge status={l.record.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* detail */}
      {selected && (
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <StatusBadge status={selected.record.status} />
            <strong>Attestation #{selected.record.id.toString()}</strong>
          </div>
          <Row k="Issuer" v={short(selected.record.issuer)} />
          <Row k="Subject" v={short(selected.record.subject)} />
          <Row k="Schema" v={selected.schemaName} mono={false} />
          <Row k="Document hash" v={short(selected.record.dataHash, 12, 8)} />
          <Row k="Issued" v={fmtTimestamp(selected.record.issuedAt)} />
          <Row k="Expiry" v={fmtExpiry(selected.record.expiry)} />
          {selected.record.status === AttestationStatus.Revoked && (
            <Row
              k="Revoked"
              v={`${fmtTimestamp(selected.record.revokedAt)}${
                decodeReason(selected.record.revokedReason) ? ` · ${decodeReason(selected.record.revokedReason)}` : ""
              }`}
            />
          )}
          <Row
            k="Transaction"
            v={
              txUrl(selected.record.txHash) ? (
                <a href={txUrl(selected.record.txHash)!}>{short(selected.record.txHash, 10, 8)}</a>
              ) : (
                short(selected.record.txHash, 10, 8)
              )
            }
          />

          {/* document match */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="label">Verify a document against this attestation</div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
              Re-upload the original document. It is hashed in your browser and compared to the
              recorded hash — the file never leaves this page.
            </p>
            <input type="file" onChange={onMatchFile} style={{ fontSize: 13 }} />
            {hashing && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Hashing…</div>}
            {matchResult && (
              <div style={{ marginTop: 12 }}>
                {matchResult.ok ? (
                  <span style={{ color: "var(--ok)", fontWeight: 700 }}>
                    ✓ Match — {matchFile} hashes ({matchResult.algo}) to the recorded document hash.
                  </span>
                ) : (
                  <span style={{ color: "var(--bad)", fontWeight: 700 }}>
                    ✗ No match — {matchFile} does not hash to the recorded document hash.
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn" onClick={exportPack}>Export Evidence Pack</button>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
              Downloads a JSON record and a printable HTML record anyone can re-verify against the chain.
            </p>
          </div>
        </div>
      )}
    </Page>
  );
}
