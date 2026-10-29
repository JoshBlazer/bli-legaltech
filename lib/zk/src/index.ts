/**
 * @attestry/zk — selective-disclosure membership proofs for Attestry v2.
 *
 * SHIPPED PATH: Semaphore v4 (real zk-SNARK). A subject proves membership in
 * the (issuer, schemaId) anonymity set — revealing only a nullifier + signal,
 * never which member — i.e. "I hold a valid attestation from Issuer X under
 * schema S, without telling you who I am."
 *
 * Core API (per spec):
 *   createIdentity()            -> AttestryIdentity  (.commitment goes on-chain)
 *   buildGroup(commitments)     -> Group
 *   prove(identity, group, sig) -> Promise<SemaphoreProof>
 *   verify(proof)               -> Promise<boolean>
 *
 * Helpers:
 *   importIdentity(exported)               re-hydrate a stored identity
 *   commitmentsFromEvents / groupFromEvents  rebuild a group from Attested logs
 *   ensureArtifacts(depth)                 pre-warm Groth16 artifacts
 *   depthFor(group)                        circuit depth for a group
 */
export {
  createIdentity,
  importIdentity,
  buildGroup,
  prove,
  verify,
  depthFor,
  ensureArtifacts,
  Identity,
  Group,
} from "./semaphore.js";

export type {
  AttestryIdentity,
  Commitment,
  Signal,
  ProveOptions,
  VerifyOptions,
  SemaphoreProof,
} from "./semaphore.js";

export { commitmentsFromEvents, groupFromEvents } from "./events.js";
export type { AttestedEventLike, AttestedFields, GroupFilter } from "./events.js";

export { ARTIFACT_BASE_URL } from "./artifacts.js";
export type { SnarkArtifactPaths } from "./artifacts.js";
