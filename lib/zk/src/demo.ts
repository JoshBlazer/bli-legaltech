/**
 * Runnable demo for the Attestry v2 ZK selective-disclosure scheme.
 *
 *   npm run demo            (from lib/zk)
 *
 * Story:
 *   1. Issuer X attests to Alice, Bob and Carol under schema S. Each attest()
 *      call carries that subject's Semaphore identity commitment.
 *   2. We rebuild the (issuer, schemaId) anonymity group from the on-chain
 *      `Attested` events — commitments only, no names.
 *   3. Alice (a MEMBER) proves she holds a valid attestation from Issuer X
 *      under schema S, revealing only a nullifier + signal — NOT which member.
 *   4. Mallory (a NON-MEMBER) tries the same and fails.
 */
import { createIdentity, groupFromEvents, prove, verify, depthFor } from "./index.js";
import type { AttestedEventLike } from "./index.js";

const ISSUER = "0x1111111111111111111111111111111111111111";
const SCHEMA = "0x" + "ab".repeat(32); // bytes32 schemaId
const OTHER_SCHEMA = "0x" + "cd".repeat(32);

function line(s = "") {
  console.log(s);
}

async function main() {
  line("Attestry v2 — ZK selective disclosure (Semaphore v4)");
  line("=====================================================");

  // 1. Subjects create identities; commitments go on-chain via attest(...).
  const alice = createIdentity();
  const bob = createIdentity();
  const carol = createIdentity();
  const mallory = createIdentity(); // never attested -> non-member

  // 2. Simulated on-chain Attested events (what the indexer reads).
  const events: AttestedEventLike[] = [
    { args: { id: 1n, issuer: ISSUER, subject: "0xAa", schemaId: SCHEMA, idCommitment: alice.commitment } },
    { args: { id: 2n, issuer: ISSUER, subject: "0xBb", schemaId: SCHEMA, idCommitment: bob.commitment } },
    { args: { id: 3n, issuer: ISSUER, subject: "0xCc", schemaId: SCHEMA, idCommitment: carol.commitment } },
    // noise that must NOT join this group: different schema, and a zero-commitment attest.
    { args: { id: 4n, issuer: ISSUER, subject: "0xDd", schemaId: OTHER_SCHEMA, idCommitment: createIdentity().commitment } },
    { args: { id: 5n, issuer: ISSUER, subject: "0xEe", schemaId: SCHEMA, idCommitment: "0" } },
  ];

  // 3. Rebuild the anonymity set for (ISSUER, SCHEMA).
  const group = groupFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  line(`\nGroup for (Issuer X, schema S): ${group.size} members, tree depth ${depthFor(group)}`);
  line(`Merkle root: ${group.root}`);

  // 4. Alice (MEMBER) proves membership. signal = a public message the verifier picks.
  const signal = "attestry:prove-kyc:2026";
  line(`\n[MEMBER] Alice proving membership with signal "${signal}" ...`);
  const proof = await prove(alice, group, signal);
  const okMember = await verify(proof, {
    expectedRoot: group.root,
    expectedScope: proof.scope,
    expectedMessage: proof.message,
  });
  line(`  proof.merkleTreeRoot = ${proof.merkleTreeRoot}`);
  line(`  proof.nullifier      = ${proof.nullifier}   <- anti-replay, not linkable to Alice`);
  line(`  verify -> ${okMember ? "VALID  (member proven, identity hidden)" : "INVALID"}`);
  if (!okMember) throw new Error("member proof should have verified");

  // The proof never reveals which member produced it.
  const revealsMember = String(JSON.stringify(proof)).includes(alice.commitment);
  line(`  proof reveals Alice's commitment? ${revealsMember ? "YES (bug!)" : "NO"}`);
  if (revealsMember) throw new Error("proof leaked the member commitment");

  // 5. Mallory (NON-MEMBER) tries and fails.
  line(`\n[NON-MEMBER] Mallory attempting to prove membership ...`);
  try {
    await prove(mallory, group, signal);
    line("  UNEXPECTED: non-member produced a proof");
    throw new Error("non-member must not be able to prove membership");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    line(`  rejected -> ${msg}`);
  }

  line(`\nDemo OK: member proved membership (identity hidden); non-member rejected.`);
}

main()
  .then(() => process.exit(0)) // snarkjs keeps worker handles open; exit explicitly
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
