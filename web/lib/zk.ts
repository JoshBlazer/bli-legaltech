// ---------------------------------------------------------------------------
// ZK membership-proof client — typed shim for workstream C's `lib/zk` module.
//
// The spec (docs/ATTESTRY_V2_SPEC.md, "ZK scheme") freezes this surface:
//   createIdentity()                  -> Identity
//   buildGroup(commitments)           -> Group
//   prove(identity, group, signal)    -> MembershipProof   (member ✓ / non-member ✗)
//   verify(proof)                     -> boolean
//
// lib/zk is owned by C and is not on disk yet. Until it ships, this file is a
// SELF-CONTAINED, DETERMINISTIC STUB so the /prove flow (and the whole app)
// builds and demos end-to-end: a real member produces a proof that verifies, a
// non-member's prove() throws. It is NOT cryptographically sound and reveals
// nothing real — it stands in for Semaphore v4 (or the Merkle/commitment
// fallback). Post-integration, replace the bodies below with a re-export from
// C's lib/zk; the types and call signatures are intended to match 1:1.
// ---------------------------------------------------------------------------

import { keccak256, toHex, stringToHex } from "viem";

export const ZK_IS_STUB = true as const;

export type Identity = {
  /** Semaphore identity commitment (decimal string of a bigint). */
  commitment: string;
  /** Secret trapdoor/nullifier material — kept client-side only. */
  secret: string;
};

export type Group = {
  /** All idCommitments for a given (issuer, schemaId), decimal strings. */
  members: string[];
  /** Merkle root over the members. */
  root: string;
  depth: number;
};

export type MembershipProof = {
  merkleTreeRoot: string;
  /** Anti-replay nullifier (does NOT reveal which member). */
  nullifier: string;
  /** Public signal the prover commits to. */
  signal: string;
  /** Opaque proof payload (Groth16 points in the real impl). */
  proof: string;
  scheme: "semaphore-v4-stub";
};

function hx(s: string): string {
  return keccak256(stringToHex(s));
}

function toDec(hex: string): string {
  return BigInt(hex).toString();
}

/** Create a fresh identity. The secret never leaves the browser. */
export function createIdentity(): Identity {
  const rand = crypto.getRandomValues(new Uint8Array(32));
  const secret = toHex(rand);
  const commitment = toDec(hx(secret));
  return { commitment, secret };
}

/** Rebuild an identity from a previously saved secret. */
export function identityFromSecret(secret: string): Identity {
  return { commitment: toDec(hx(secret)), secret };
}

/** Build the (issuer, schema) group from its member commitments. */
export function buildGroup(commitments: string[]): Group {
  const members = [...new Set(commitments.map((c) => c.trim()).filter(Boolean))];
  const sorted = [...members].sort();
  const root = toDec(hx(sorted.join(",")));
  return { members, root, depth: Math.max(1, Math.ceil(Math.log2(members.length || 1))) };
}

/**
 * Prove membership in `group` without revealing which member.
 * Throws if `identity` is not a member (the non-member ✗ demo path).
 */
export async function prove(
  identity: Identity,
  group: Group,
  signal: string,
): Promise<MembershipProof> {
  if (!group.members.includes(identity.commitment)) {
    throw new Error("Not a member of this group — cannot produce a membership proof.");
  }
  // Nullifier binds the secret to the group; same secret+group => same
  // nullifier (anti-replay), but it does not reveal the commitment.
  const nullifier = toDec(hx(`${identity.secret}:${group.root}`));
  const proof = hx(`${nullifier}:${signal}:${group.root}`);
  return {
    merkleTreeRoot: group.root,
    nullifier,
    signal,
    proof,
    scheme: "semaphore-v4-stub",
  };
}

/** Verify a membership proof (off-chain). */
export async function verify(proof: MembershipProof): Promise<boolean> {
  if (!proof || proof.scheme !== "semaphore-v4-stub") return false;
  const expected = hx(`${proof.nullifier}:${proof.signal}:${proof.merkleTreeRoot}`);
  return expected === proof.proof;
}
