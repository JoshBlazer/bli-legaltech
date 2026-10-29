import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  createIdentity,
  importIdentity,
  buildGroup,
  groupFromEvents,
  prove,
  verify,
  depthFor,
  ensureArtifacts,
} from "../src/index.js";

const ISSUER = "0x1111111111111111111111111111111111111111";
const SCHEMA = "0x" + "ab".repeat(32);

// Pre-warm artifacts once so individual proof assertions stay fast and offline.
before(async () => {
  await ensureArtifacts(1);
  await ensureArtifacts(2);
});

test("createIdentity yields a decimal-string commitment and round-trips via export/import", () => {
  const id = createIdentity();
  assert.match(id.commitment, /^[0-9]+$/);
  const again = importIdentity(id.export());
  assert.equal(again.commitment, id.commitment);
});

test("createIdentity(secret) is deterministic", () => {
  assert.equal(createIdentity("seed-123").commitment, createIdentity("seed-123").commitment);
});

test("member can prove membership and the proof verifies", async () => {
  const [a, b, c] = [createIdentity(), createIdentity(), createIdentity()];
  const group = buildGroup([a.commitment, b.commitment, c.commitment]);
  const proof = await prove(b, group, "hello");
  assert.equal(await verify(proof), true);
  assert.equal(BigInt(proof.merkleTreeRoot), group.root);
});

test("verify binds expectedRoot/scope/message and rejects mismatches", async () => {
  const [a, b] = [createIdentity(), createIdentity()];
  const group = buildGroup([a.commitment, b.commitment]);
  const proof = await prove(a, group, "msg", { scope: "ctx-1" });
  assert.equal(
    await verify(proof, { expectedRoot: group.root, expectedScope: "ctx-1", expectedMessage: "msg" }),
    true,
  );
  assert.equal(await verify(proof, { expectedScope: "ctx-2" }), false);
  assert.equal(await verify(proof, { expectedRoot: 999n }), false);
});

test("non-member cannot produce a membership proof", async () => {
  const group = buildGroup([createIdentity().commitment, createIdentity().commitment]);
  const outsider = createIdentity();
  await assert.rejects(() => prove(outsider, group, "x"));
});

test("proof does not reveal which member produced it", async () => {
  const members = [createIdentity(), createIdentity(), createIdentity()];
  const group = buildGroup(members.map((m) => m.commitment));
  const prover = members[1];
  const proof = await prove(prover, group, "anon");
  const serialized = JSON.stringify(proof);
  for (const m of members) {
    assert.ok(!serialized.includes(m.commitment), "proof leaked a member commitment");
  }
});

test("same identity + same scope => stable nullifier (anti-replay); different scope => different", async () => {
  const me = createIdentity();
  const group = buildGroup([me.commitment, createIdentity().commitment]);
  const p1 = await prove(me, group, "m", { scope: "s" });
  const p2 = await prove(me, group, "other-message", { scope: "s" });
  const p3 = await prove(me, group, "m", { scope: "different" });
  assert.equal(String(p1.nullifier), String(p2.nullifier));
  assert.notEqual(String(p1.nullifier), String(p3.nullifier));
});

test("end-to-end from Attested events: member proves, non-member rejected", async () => {
  const alice = createIdentity();
  const events = [
    { args: { issuer: ISSUER, schemaId: SCHEMA, idCommitment: alice.commitment } },
    { args: { issuer: ISSUER, schemaId: SCHEMA, idCommitment: createIdentity().commitment } },
  ];
  const group = groupFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.equal(depthFor(group), 1);
  assert.equal(await verify(await prove(alice, group, "kyc")), true);
  await assert.rejects(() => prove(createIdentity(), group, "kyc"));
});
