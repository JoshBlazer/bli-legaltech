"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Address } from "viem";
import {
  createIdentity,
  identityFromSecret,
  buildGroup,
  prove,
  verify,
  ZK_IS_STUB,
  type MembershipProof,
} from "@/lib/zk";
import { groupCommitments, NotConfiguredError } from "@/lib/reads";
import { parseCredential, type SubjectCredential } from "@/lib/credential";
import { IS_PLACEHOLDER_ADDRESS } from "@/lib/contract";
import { short } from "@/lib/format";
import {
  Page,
  PageHeader,
  Notice,
  ErrorNote,
  Spinner,
} from "../components/ui";

type Mode = "prove" | "verify";

export default function ProvePage() {
  const [mode, setMode] = useState<Mode>("prove");

  // ---- prove ----
  const [credText, setCredText] = useState("");
  const [signal, setSignal] = useState("I hold a valid attestation under this schema.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<MembershipProof | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  // ---- verify ----
  const [verifyText, setVerifyText] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  // Hydrate a pasted/linked proof from the URL (?p=base64).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (p) {
      try {
        setVerifyText(JSON.stringify(JSON.parse(decodeURIComponent(atob(p))), null, 2));
        setMode("verify");
      } catch {
        /* ignore malformed link */
      }
    }
  }, []);

  async function makeShare(pf: MembershipProof) {
    const encoded = btoa(encodeURIComponent(JSON.stringify(pf)));
    const url = `${window.location.origin}/prove?p=${encoded}`;
    setShareUrl(url);
    try {
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 220 }));
    } catch {
      setQr(null);
    }
  }

  async function generate() {
    setError(null);
    setProof(null);
    setShareUrl(null);
    setQr(null);
    setBusy(true);
    try {
      let cred: SubjectCredential;
      try {
        cred = parseCredential(credText);
      } catch (e) {
        throw new Error(`Credential JSON is invalid: ${(e as Error).message}`);
      }
      if (!cred.zk?.secret || !cred.zk?.commitment) {
        throw new Error(
          "This credential has no private-proof material — it was issued without the 'enable private proof' option.",
        );
      }
      const identity = identityFromSecret(cred.zk.secret);

      // Build the (issuer, schema) group from on-chain commitments.
      let members: string[];
      try {
        members = await groupCommitments(cred.issuer as Address, cred.schemaId as `0x${string}`);
      } catch (e) {
        if (e instanceof NotConfiguredError) {
          // No deployment wired — fall back to a group of just this member so the
          // flow still demos. Marked clearly in the UI notice above.
          members = [];
        } else {
          throw e;
        }
      }
      if (!members.includes(identity.commitment)) members.push(identity.commitment);

      const group = buildGroup(members);
      const pf = await prove(identity, group, signal);
      const ok = await verify(pf);
      if (!ok) throw new Error("Proof failed self-verification.");
      setProof(pf);
      await makeShare(pf);
    } catch (e) {
      setError((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }

  async function runVerify() {
    setVerifyErr(null);
    setVerifyResult(null);
    try {
      const pf = JSON.parse(verifyText) as MembershipProof;
      setVerifyResult(await verify(pf));
    } catch (e) {
      setVerifyErr(`Could not parse proof JSON: ${(e as Error).message}`);
    }
  }

  // demo helper so the page is explorable without a real credential
  function loadDemo() {
    const id = createIdentity();
    const demo: SubjectCredential = {
      v: 2,
      attestationId: "1",
      contractAddress: "0x0000000000000000000000000000000000000000",
      chainId: 11155111,
      issuer: "0x1804000000000000000000000000000000001f38",
      subject: "0x000000000000000000000000000000000000bEEF",
      schemaId: "0x" + "ab".repeat(32),
      schemaName: "kyc-aml-v1",
      dataHash: "0x" + "9c".repeat(32),
      hashAlgo: "keccak256",
      issuedAt: Math.floor(Date.now() / 1000),
      expiry: 0,
      zk: { commitment: id.commitment, secret: id.secret },
    };
    setCredText(JSON.stringify(demo, null, 2));
  }

  return (
    <Page>
      <PageHeader
        title="Prove membership — privately"
        lede="Prove you hold a valid attestation from an issuer under a schema, revealing only a nullifier — never which record is yours."
      />

      {ZK_IS_STUB ? (
        <Notice>
          ZK module is a <strong>typed stub</strong> standing in for workstream C&apos;s
          <span className="mono"> lib/zk</span> (Semaphore v4). Proofs demonstrate the flow
          end-to-end but are not yet cryptographically sound.
        </Notice>
      ) : (
        IS_PLACEHOLDER_ADDRESS && (
          <Notice>
            Proofs are <strong>real Semaphore v4 zk-SNARKs</strong>, generated in your browser.
            No deployment is wired yet, so the anonymity group falls back to just your own
            commitment — set <span className="mono">NEXT_PUBLIC_CONTRACT_ADDRESS</span> post-deploy
            to prove membership against the full on-chain (issuer, schema) set.
          </Notice>
        )
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          className={mode === "prove" ? "btn" : "btn btn-ghost"}
          onClick={() => setMode("prove")}
        >
          Generate a proof
        </button>
        <button
          className={mode === "verify" ? "btn" : "btn btn-ghost"}
          onClick={() => setMode("verify")}
        >
          Verify a proof
        </button>
      </div>

      {mode === "prove" ? (
        <div className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="label" htmlFor="cred">Subject credential (JSON)</label>
              <button
                onClick={loadDemo}
                style={{ background: "none", border: 0, color: "var(--brand)", cursor: "pointer", fontSize: 13 }}
              >
                Load demo credential
              </button>
            </div>
            <textarea
              id="cred"
              className="ipt mono"
              style={{ fontSize: 11, minHeight: 160 }}
              placeholder="Paste the credential JSON you received from the issuer…"
              value={credText}
              onChange={(e) => setCredText(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="signal">Public signal</label>
            <input id="signal" className="ipt" value={signal} onChange={(e) => setSignal(e.target.value)} />
          </div>
          <button className="btn" onClick={generate} disabled={busy || !credText.trim()}>
            {busy ? "Generating proof…" : "Generate ZK proof"}
          </button>
          {error && <ErrorNote>{error}</ErrorNote>}

          {busy && <Spinner label="Building membership proof…" />}

          {proof && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div style={{ color: "var(--ok)", fontWeight: 700, marginBottom: 12 }}>
                ✓ Proof generated and self-verified.
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                Nullifier (anti-replay, reveals no identity):
              </div>
              <div className="mono" style={{ fontSize: 12, marginBottom: 14 }}>{short(proof.nullifier, 14, 10)}</div>

              {shareUrl && (
                <>
                  <div className="label">Shareable verification link</div>
                  <textarea className="ipt mono" style={{ fontSize: 11, minHeight: 70 }} readOnly value={shareUrl} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(shareUrl)}>
                      Copy link
                    </button>
                  </div>
                  {qr && (
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qr} alt="QR code for the verification link" width={220} height={220} style={{ background: "#fff", borderRadius: 8, padding: 8 }} />
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                        A verifier scans this to check the proof — no identity disclosed.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <div>
            <label className="label" htmlFor="pf">Proof (JSON)</label>
            <textarea
              id="pf"
              className="ipt mono"
              style={{ fontSize: 11, minHeight: 160 }}
              placeholder="Paste a proof JSON, or open a shareable link…"
              value={verifyText}
              onChange={(e) => setVerifyText(e.target.value)}
            />
          </div>
          <button className="btn" onClick={runVerify} disabled={!verifyText.trim()}>
            Verify proof
          </button>
          {verifyErr && <ErrorNote>{verifyErr}</ErrorNote>}
          {verifyResult !== null && (
            <div style={{ fontWeight: 700, color: verifyResult ? "var(--ok)" : "var(--bad)" }}>
              {verifyResult
                ? "✓ Valid membership proof — the holder belongs to the attested group."
                : "✗ Invalid proof."}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
