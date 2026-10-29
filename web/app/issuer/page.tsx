"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { isAddress, parseEventLogs, type Address } from "viem";
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  IS_PLACEHOLDER_ADDRESS,
  REGISTRY_ABI,
  txUrl,
} from "@/lib/contract";
import { listSchemas, type SchemaInfo } from "@/lib/reads";
import { hashFile, HASH_ALGOS, type HashAlgo } from "@/lib/hash";
import { createIdentity, type Identity } from "@/lib/zk";
import type { SubjectCredential } from "@/lib/credential";
import { WalletButton } from "../components/WalletButton";
import {
  Page,
  PageHeader,
  Notice,
  Row,
  Spinner,
  ErrorNote,
  StatusBadge,
} from "../components/ui";
import { AttestationStatus } from "@/lib/contract";
import { short } from "@/lib/format";
import { downloadText } from "@/lib/evidence";

export default function IssuerPage() {
  const { address, isConnected } = useAccount();

  // ---- issuer allowlist check ----
  const { data: isAllowed, isLoading: checkingIssuer } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "isIssuer",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !IS_PLACEHOLDER_ADDRESS },
  });

  // ---- schemas ----
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [schemaErr, setSchemaErr] = useState<string | null>(null);
  const [loadingSchemas, setLoadingSchemas] = useState(false);

  async function refreshSchemas() {
    if (IS_PLACEHOLDER_ADDRESS) return;
    setLoadingSchemas(true);
    setSchemaErr(null);
    try {
      setSchemas(await listSchemas());
    } catch (e) {
      setSchemaErr((e as Error).message);
    } finally {
      setLoadingSchemas(false);
    }
  }
  useEffect(() => {
    void refreshSchemas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- form state ----
  const [subject, setSubject] = useState("");
  const [schemaId, setSchemaId] = useState("");
  const [manualSchema, setManualSchema] = useState("");
  const [algo, setAlgo] = useState<HashAlgo>("keccak256");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dataHash, setDataHash] = useState<`0x${string}` | null>(null);
  const [hashing, setHashing] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [privateProof, setPrivateProof] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [schemaName, setSchemaName] = useState("");

  const effectiveSchemaId = (manualSchema || schemaId).trim();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setHashing(true);
    setDataHash(null);
    try {
      setDataHash(await hashFile(f, algo));
    } finally {
      setHashing(false);
    }
  }

  // Re-hash is required if algo changes after a file was chosen.
  useEffect(() => {
    setDataHash(null);
    setFileName(null);
  }, [algo]);

  function togglePrivate(on: boolean) {
    setPrivateProof(on);
    if (on && !identity) setIdentity(createIdentity());
  }

  // ---- write ----
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  const [credential, setCredential] = useState<SubjectCredential | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  // Parse the Attested event once the receipt lands.
  useEffect(() => {
    if (!receipt) return;
    try {
      const logs = parseEventLogs({
        abi: REGISTRY_ABI,
        eventName: "Attested",
        logs: receipt.logs,
      });
      const ev = logs[0];
      if (!ev) return;
      const args = ev.args as unknown as {
        id: bigint;
        issuer: Address;
        subject: Address;
        schemaId: `0x${string}`;
        dataHash: `0x${string}`;
        issuedAt: bigint;
        expiry: bigint;
      };
      setNewId(args.id.toString());
      const cred: SubjectCredential = {
        v: 2,
        attestationId: args.id.toString(),
        contractAddress: CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
        issuer: args.issuer,
        subject: args.subject,
        schemaId: args.schemaId,
        schemaName:
          schemas.find((s) => s.schemaId === args.schemaId)?.name || schemaName || "—",
        dataHash: args.dataHash,
        hashAlgo: algo,
        issuedAt: Number(args.issuedAt),
        expiry: Number(args.expiry),
        txHash: receipt.transactionHash,
      };
      if (privateProof && identity) {
        cred.zk = { commitment: identity.commitment, secret: identity.secret };
      }
      setCredential(cred);
    } catch {
      /* leave credential null; tx still shown */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  const canSubmit =
    !IS_PLACEHOLDER_ADDRESS &&
    isConnected &&
    isAddress(subject) &&
    /^0x[0-9a-fA-F]{64}$/.test(effectiveSchemaId) &&
    !!dataHash &&
    !writing &&
    !confirming;

  async function submit() {
    setSubmitErr(null);
    setCredential(null);
    setNewId(null);
    try {
      const expiry = expiryDate
        ? BigInt(Math.floor(new Date(expiryDate).getTime() / 1000))
        : 0n;
      const idCommitment = privateProof && identity ? BigInt(identity.commitment) : 0n;
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "attest",
        args: [subject as Address, effectiveSchemaId as `0x${string}`, dataHash!, expiry, idCommitment],
      });
      setTxHash(hash);
    } catch (e) {
      setSubmitErr((e as Error).message.split("\n")[0]);
    }
  }

  const link = txHash ? txUrl(txHash) : null;

  return (
    <Page>
      <PageHeader
        title="Issue an attestation"
        lede="Allow-listed issuers record a tamper-evident compliance attestation on-chain. The document is hashed in your browser — its bytes never leave this page."
      />

      {IS_PLACEHOLDER_ADDRESS && (
        <Notice>
          No deployment is wired yet — <span className="mono">contract.ts</span> holds a
          placeholder address. The form is shown for review; set
          <span className="mono"> NEXT_PUBLIC_CONTRACT_ADDRESS</span> post-deploy to make it live.
        </Notice>
      )}

      {/* Wallet / issuer gate */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Issuer wallet</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {isConnected ? (
                <span className="mono">{short(address)}</span>
              ) : (
                "Connect an allow-listed issuer wallet to attest."
              )}
            </div>
          </div>
          <WalletButton />
        </div>
        {isConnected && !IS_PLACEHOLDER_ADDRESS && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            {checkingIssuer ? (
              <span style={{ color: "var(--muted)" }}>Checking allowlist…</span>
            ) : isAllowed ? (
              <span style={{ color: "var(--ok)" }}>✓ This wallet is an allow-listed issuer.</span>
            ) : (
              <span style={{ color: "var(--warn)" }}>
                ⚠ This wallet is not on the issuer allowlist — the contract will reject the attest tx.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="card" style={{ padding: 20, display: "grid", gap: 18 }}>
        <div>
          <label className="label" htmlFor="subject">Subject address</label>
          <input
            id="subject"
            className="ipt"
            placeholder="0x…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          {subject && !isAddress(subject) && (
            <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>Not a valid address.</div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="schema">Schema</label>
          {loadingSchemas ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading schemas…</div>
          ) : schemas.length > 0 ? (
            <select
              id="schema"
              className="ipt"
              value={schemaId}
              onChange={(e) => {
                setSchemaId(e.target.value);
                setManualSchema("");
                setSchemaName(schemas.find((s) => s.schemaId === e.target.value)?.name ?? "");
              }}
            >
              <option value="">Select a registered schema…</option>
              {schemas.map((s) => (
                <option key={s.schemaId} value={s.schemaId}>
                  {s.name} — {short(s.schemaId, 10, 6)}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {schemaErr
                ? "Could not load schemas from chain — enter a schema id manually below."
                : "No registered schemas found — enter a schema id (bytes32) manually."}
            </div>
          )}
          <input
            className="ipt"
            style={{ marginTop: 8 }}
            placeholder="…or paste a schema id (0x + 64 hex)"
            value={manualSchema}
            onChange={(e) => {
              setManualSchema(e.target.value);
              if (e.target.value) setSchemaId("");
            }}
          />
        </div>

        <div>
          <label className="label">Document</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" onChange={onFile} style={{ fontSize: 13 }} />
            <select
              className="ipt"
              style={{ width: "auto", padding: "8px 10px" }}
              value={algo}
              onChange={(e) => setAlgo(e.target.value as HashAlgo)}
            >
              {HASH_ALGOS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          {hashing && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Hashing in-browser…</div>}
          {dataHash && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div style={{ color: "var(--muted)" }}>{fileName} → document hash:</div>
              <div className="mono" style={{ fontSize: 12 }}>{dataHash}</div>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="expiry">Expiry (optional)</label>
          <input
            id="expiry"
            type="datetime-local"
            className="ipt"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Leave blank for no expiry.</div>
        </div>

        <div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={privateProof} onChange={(e) => togglePrivate(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              <span style={{ fontWeight: 600 }}>Enable private proof</span>
              <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                Generate a ZK identity for the subject so they can later prove they hold this
                attestation without revealing which record is theirs. The secret is saved into
                the subject credential below — share it only with the subject.
              </span>
            </span>
          </label>
          {privateProof && identity && (
            <div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--muted)" }}>
              commitment: {short(identity.commitment, 10, 8)}
            </div>
          )}
        </div>

        <button className="btn" disabled={!canSubmit} onClick={submit}>
          {writing ? "Confirm in wallet…" : confirming ? "Waiting for confirmation…" : "Attest on-chain"}
        </button>
        {submitErr && <ErrorNote>{submitErr}</ErrorNote>}
      </div>

      {/* Result */}
      {(txHash || confirming) && (
        <div className="card" style={{ padding: 20, marginTop: 18 }}>
          {confirming && !receipt ? (
            <Spinner label="Waiting for the transaction to confirm…" />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <StatusBadge status={AttestationStatus.Valid} />
                <strong>Attestation recorded{newId ? ` · id #${newId}` : ""}</strong>
              </div>
              <Row k="Transaction" v={link ? <a href={link}>{short(txHash!, 10, 8)}</a> : <span className="mono">{short(txHash!, 10, 8)}</span>} />
              {credential && (
                <>
                  <Row k="Subject" v={short(credential.subject)} />
                  <Row k="Schema" v={credential.schemaName} mono={false} />
                  <div style={{ marginTop: 16 }}>
                    <div className="label">Subject credential</div>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
                      Send this to the subject. They use it on the Verify and Prove pages.
                    </p>
                    <textarea
                      className="ipt mono"
                      style={{ fontSize: 11, minHeight: 150 }}
                      readOnly
                      value={JSON.stringify(credential, null, 2)}
                    />
                    <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          downloadText(
                            `attestry-credential-${credential.attestationId}.json`,
                            JSON.stringify(credential, null, 2),
                            "application/json",
                          )
                        }
                      >
                        Download credential
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigator.clipboard?.writeText(JSON.stringify(credential, null, 2))}
                      >
                        Copy JSON
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Page>
  );
}
