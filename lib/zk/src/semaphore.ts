/**
 * Attestry v2 — Semaphore v4 selective-disclosure membership proofs.
 *
 * A subject creates a Semaphore identity; its commitment is written on-chain via
 * `attest(... idCommitment)`. Later the subject proves membership in the
 * (issuer, schemaId) group — revealing only a nullifier (anti-replay) and a
 * signal, NOT which member — i.e. "I hold a valid attestation from Issuer X
 * under schema S, and I'm not telling you who I am."
 *
 * This is the PRIMARY path. A dependency-light Merkle fallback with the same
 * surface lives in ./fallback.ts (see ./index.ts for which one is active).
 */
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, verifyProof } from "@semaphore-protocol/proof";
import { toBigInt as ethersToBigInt, encodeBytes32String } from "ethers";
import { ensureArtifacts, type SnarkArtifactPaths } from "./artifacts.js";

/**
 * Encode a signal/scope to its field element EXACTLY as Semaphore does:
 * numeric values (incl. hex/decimal strings) pass through; any other short
 * string is bytes32-encoded. This is what lets `verify` compare a
 * human-readable `expectedScope`/`expectedMessage` against the proof's stored
 * (already-encoded) value.
 */
function encodeSignal(value: Signal): bigint {
  try {
    return ethersToBigInt(value as any);
  } catch {
    return ethersToBigInt(encodeBytes32String(String(value)));
  }
}

export { Identity, Group };
export { ensureArtifacts } from "./artifacts.js";

/**
 * A Semaphore v4 proof. Declared structurally here because the published
 * `@semaphore-protocol/proof` types are not re-exported through its package
 * root (`export * from "./types"` resolves to an empty stub). Shape mirrors the
 * package's internal `SemaphoreProof`. Safe to serialize and share — it reveals
 * only the group root, message, scope and nullifier, never which member.
 */
export interface SemaphoreProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  message: string;
  nullifier: string;
  scope: string;
  points: string[];
}

/** A Semaphore identity commitment, accepted as a decimal string, bigint, or number. */
export type Commitment = string | bigint | number;

/** A signal/message to bind into a proof. Strings are hashed into the field. */
export type Signal = string | bigint | number;

/**
 * An Attestry identity: wraps a Semaphore `Identity` with the fields the dApp
 * needs. `commitment` (decimal string) is what goes into `attest(...)`.
 * `export()` returns the secret-bearing serialization the subject stores
 * client-side — never send it on-chain or to a server.
 */
export interface AttestryIdentity {
  readonly identity: Identity;
  /** Decimal-string identity commitment for `attest(..., idCommitment)`. */
  readonly commitment: string;
  /** Serialized private identity for client-side storage (localStorage). */
  export(): string;
}

function wrap(identity: Identity): AttestryIdentity {
  return {
    identity,
    commitment: identity.commitment.toString(),
    export: () => identity.export(),
  };
}

/**
 * Create a fresh Semaphore identity. Pass a deterministic `secret` (e.g. a
 * wallet signature) to derive the same identity reproducibly; omit it for a
 * random one.
 */
export function createIdentity(secret?: string): AttestryIdentity {
  return wrap(secret === undefined ? new Identity() : new Identity(secret));
}

/** Re-hydrate an identity previously produced by `AttestryIdentity.export()`. */
export function importIdentity(exported: string): AttestryIdentity {
  return wrap(Identity.import(exported));
}

function toBigInt(c: Commitment): bigint {
  return typeof c === "bigint" ? c : BigInt(c);
}

/**
 * Build the anonymity group from a set of identity commitments — typically all
 * `idCommitment`s for one (issuer, schemaId), reconstructed from on-chain
 * `Attested` events (see ./events.ts).
 */
export function buildGroup(commitments: Commitment[]): Group {
  return new Group(commitments.map(toBigInt));
}

/**
 * The verifier-chosen context the nullifier is bound to. When omitted, the
 * group's Merkle root is used, so a member can prove at most once per group
 * state without revealing which member they are.
 */
export interface ProveOptions {
  scope?: Signal;
  /**
   * Explicit Groth16 artifacts (wasm/zkey). Pass these to bypass artifact
   * resolution entirely — e.g. browser CDN URLs, or pre-fetched local paths.
   * When omitted in Node, the correct-depth artifacts are fetched/cached via
   * `ensureArtifacts` (our reliable loader); the broken auto-downloader is
   * never used.
   */
  artifacts?: SnarkArtifactPaths;
}

/** The Groth16 circuit depth Semaphore will use for this group. */
export function depthFor(group: Group): number {
  return Math.max(1, group.depth);
}

/**
 * Prove membership in `group` using `identity`, binding `signal` as the public
 * message. Returns a `SemaphoreProof` carrying the Merkle root, nullifier,
 * message, scope and the zk-SNARK points — safe to share; it does not reveal
 * which member produced it.
 *
 * NOTE: the first call in a process downloads the Groth16 artifacts (wasm/zkey)
 * for the tree depth; they are then cached. Pre-warm once at app start.
 */
export async function prove(
  identity: AttestryIdentity,
  group: Group,
  signal: Signal,
  options: ProveOptions = {},
): Promise<SemaphoreProof> {
  const scope = options.scope ?? group.root;
  const depth = depthFor(group);
  const artifacts = options.artifacts ?? (await ensureArtifacts(depth));
  return generateProof(identity.identity, group, signal, scope, depth, artifacts);
}

/** Assertions a verifier can require beyond cryptographic validity. */
export interface VerifyOptions {
  /** Require the proof's Merkle root to equal this group root. */
  expectedRoot?: Signal;
  /** Require the proof's scope to equal this value. */
  expectedScope?: Signal;
  /** Require the proof's message to equal this value. */
  expectedMessage?: Signal;
}

/**
 * Verify a membership proof. With no options this checks only cryptographic
 * validity; pass `expectedRoot`/`expectedScope`/`expectedMessage` to also bind
 * the proof to a known group and context (recommended on the verifier side).
 */
export async function verify(proof: SemaphoreProof, options: VerifyOptions = {}): Promise<boolean> {
  const eq = (a: unknown, b: Signal) => BigInt(a as any) === encodeSignal(b);
  if (options.expectedRoot !== undefined && !eq(proof.merkleTreeRoot, options.expectedRoot)) return false;
  if (options.expectedScope !== undefined && !eq(proof.scope, options.expectedScope)) return false;
  if (options.expectedMessage !== undefined && !eq(proof.message, options.expectedMessage)) return false;
  // Cast: our structural SemaphoreProof matches the package's runtime shape; the
  // package's `points` is a fixed tuple while ours is string[] (see type note above).
  return verifyProof(proof as Parameters<typeof verifyProof>[0]);
}
