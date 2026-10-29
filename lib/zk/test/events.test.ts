import { test } from "node:test";
import assert from "node:assert/strict";
import { createIdentity } from "../src/index.js";
import { commitmentsFromEvents, groupFromEvents } from "../src/events.js";
import type { AttestedEventLike } from "../src/events.js";

const ISSUER = "0x1111111111111111111111111111111111111111";
const ISSUER2 = "0x2222222222222222222222222222222222222222";
const SCHEMA = "0x" + "ab".repeat(32);
const SCHEMA2 = "0x" + "cd".repeat(32);

const a = createIdentity().commitment;
const b = createIdentity().commitment;
const c = createIdentity().commitment;

function ev(issuer: string, schemaId: string, idCommitment: string): AttestedEventLike {
  return { args: { issuer, schemaId, idCommitment } };
}

test("filters commitments by (issuer, schemaId)", () => {
  const events = [
    ev(ISSUER, SCHEMA, a),
    ev(ISSUER, SCHEMA, b),
    ev(ISSUER2, SCHEMA, c), // wrong issuer
    ev(ISSUER, SCHEMA2, c), // wrong schema
  ];
  const got = commitmentsFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.deepEqual(got, [a, b]);
});

test("drops zero-commitment (no private proof) and de-duplicates", () => {
  const events = [
    ev(ISSUER, SCHEMA, a),
    ev(ISSUER, SCHEMA, "0"),
    ev(ISSUER, SCHEMA, a), // duplicate
    ev(ISSUER, SCHEMA, b),
  ];
  const got = commitmentsFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.deepEqual(got, [a, b]);
});

test("address and schemaId comparison is case-insensitive", () => {
  const events = [ev(ISSUER.toUpperCase(), SCHEMA.toUpperCase(), a)];
  const got = commitmentsFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.deepEqual(got, [a]);
});

test("exclude removes specified commitments (e.g. revoked)", () => {
  const events = [ev(ISSUER, SCHEMA, a), ev(ISSUER, SCHEMA, b), ev(ISSUER, SCHEMA, c)];
  const got = commitmentsFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA, exclude: [b] });
  assert.deepEqual(got, [a, c]);
});

test("accepts flat events (not wrapped in args)", () => {
  const events = [{ issuer: ISSUER, schemaId: SCHEMA, idCommitment: a }];
  const got = commitmentsFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.deepEqual(got, [a]);
});

test("groupFromEvents builds a group whose members match", () => {
  const events = [ev(ISSUER, SCHEMA, a), ev(ISSUER, SCHEMA, b)];
  const group = groupFromEvents(events, { issuer: ISSUER, schemaId: SCHEMA });
  assert.equal(group.size, 2);
  assert.ok(group.indexOf(BigInt(a)) >= 0);
  assert.ok(group.indexOf(BigInt(b)) >= 0);
});
