// ---------------------------------------------------------------------------
// ZK membership-proof client — REAL adapter over workstream C's `@attestry/zk`
// (Semaphore v4 zk-SNARK, lib/zk/src/index.ts).
//
// This file is the seam between B's pages and C's module. B's pages import the
// surface frozen in docs/ATTESTRY_V2_SPEC.md:
//   createIdentity()               -> Identity
//   identityFromSecret(secret)     -> Identity
//   buildGroup(commitments)        -> Group
//   prove(identity, group, signal) -> MembershipProof
//   verify(proof)                  -> boolean
//
// C exposes a slightly different surface (AttestryIdentity with .export(),
// importIdentity, SemaphoreProof). We reconcile here so B's pages are unchanged:
//   * Identity.secret  === AttestryIdentity.export()  (serialized private id)
//   * identityFromSecret === importIdentity
//   * MembershipProof    === C's SemaphoreProof (JSON-serializable, shareable)
//
// Proving runs IN THE BROWSER. Semaphore's node artifact resolver is bypassed:
// we compute the circuit depth for the group and hand `generateProof` explicit
// wasm/zkey URLs (served from web/public/semaphore, overridable via env). `verify`
// needs no artifacts — the Groth16 verification key is embedded in the package.
// ---------------------------------------------------------------------------

import { keccak256, stringToHex } from "viem";
import {
  createIdentity as cCreateIdentity,
  importIdentity as cImportIdentity,
  buildGroup as cBuildGroup,
  prove as cProve,
  verify as cVerify,
  depthFor,
  type Group as SemaphoreGroup,
  type SemaphoreProof,
} from "@attestry/zk";

export const ZK_IS_STUB = false as const;

/**
 * What B's pages carry around. `commitment` is the decimal-string Semaphore
 * identity commitment that goes on-chain via `attest(..., idCommitment)`.
 * `secret` is C's `AttestryIdentity.export()` serialization — the private
 * identity, kept client-side only (saved into the subject credential).
 */
export type Identity = {
  commitment: string;
  secret: string;
};

/** The (issuer, schema) anonymity group — Semaphore's Group (LeanIMT). */
export type Group = SemaphoreGroup;

/** A shareable, JSON-serializable Semaphore v4 membership proof. */
export type MembershipProof = SemaphoreProof;

// --- browser artifact resolution -------------------------------------------
// Served statically from web/public/semaphore/semaphore-<depth>.{wasm,zkey}.
// Point NEXT_PUBLIC_SEMAPHORE_ARTIFACTS_BASE at the PSE CDN
// (https://snark-artifacts.pse.dev/semaphore/latest) to use every depth without
// bundling the files.
const ARTIFACTS_BASE =
  process.env.NEXT_PUBLIC_SEMAPHORE_ARTIFACTS_BASE ?? "/semaphore";

// BN254 scalar field order — Semaphore messages/scopes must be field elements.
const BN254_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Normalize an arbitrary public signal into a Semaphore-safe field element.
 * Semaphore encodes non-numeric messages as bytes32, which caps them at 31
 * bytes; a human-readable sentence overflows that. Decimal/hex values pass
 * through unchanged; any other text is keccak256-hashed and reduced into the
 * field, so a signal of any length works and verifies deterministically.
 */
function toFieldSignal(signal: string): string {
  const s = signal.trim();
  if (/^\d+$/.test(s)) return s;
  if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s).toString();
  return (BigInt(keccak256(stringToHex(s))) % BN254_FIELD).toString();
}

function artifactUrls(depth: number): { wasm: string; zkey: string } {
  const base = ARTIFACTS_BASE.replace(/\/$/, "");
  return {
    wasm: `${base}/semaphore-${depth}.wasm`,
    zkey: `${base}/semaphore-${depth}.zkey`,
  };
}

/** Create a fresh identity. The secret (export) never leaves the browser. */
export function createIdentity(): Identity {
  const id = cCreateIdentity();
  return { commitment: id.commitment, secret: id.export() };
}

/** Rebuild an identity from a previously saved secret (C's export string). */
export function identityFromSecret(secret: string): Identity {
  const id = cImportIdentity(secret);
  return { commitment: id.commitment, secret };
}

/** Build the (issuer, schema) group from its member commitments. */
export function buildGroup(commitments: string[]): Group {
  const members = [...new Set(commitments.map((c) => c.trim()).filter(Boolean))];
  return cBuildGroup(members);
}

/**
 * Prove membership in `group` without revealing which member. Throws if
 * `identity` is not a member of `group` (the non-member ✗ demo path). Runs the
 * Groth16 prover in the browser against the depth-matched artifacts.
 */
export async function prove(
  identity: Identity,
  group: Group,
  signal: string,
): Promise<MembershipProof> {
  const member = cImportIdentity(identity.secret);
  // Fail fast with a clear message rather than a deep snarkjs error.
  const inGroup = group.members.some((m) => m.toString() === member.commitment);
  if (!inGroup) {
    throw new Error("Not a member of this group — cannot produce a membership proof.");
  }
  const depth = depthFor(group);
  return cProve(member, group, toFieldSignal(signal), { artifacts: artifactUrls(depth) });
}

/** Verify a membership proof (off-chain; no artifacts required). */
export async function verify(proof: MembershipProof): Promise<boolean> {
  try {
    return await cVerify(proof);
  } catch {
    return false;
  }
}
