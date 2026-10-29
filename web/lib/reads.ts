// On-chain reads for the verify + prove flows. Everything here is keyless and
// derived from the FROZEN v2 interface: the Attested / Revoked / SchemaRegistered
// events plus status()/getSchema(). Using events (not just getAttestation) gives
// us the originating txHash for the Evidence Pack and survives any struct-field
// ordering in getAttestation.

import type { Address } from "viem";
import { getAbiItem, parseAbiItem } from "viem";
import { publicClient, DEPLOY_BLOCK } from "./client";
import {
  CONTRACT_ADDRESS,
  IS_PLACEHOLDER_ADDRESS,
  REGISTRY_ABI,
  AttestationStatus,
} from "./contract";

export class NotConfiguredError extends Error {
  constructor() {
    super("Contract address is a placeholder — no deployment wired yet.");
    this.name = "NotConfiguredError";
  }
}

export type ResolvedAttestation = {
  id: bigint;
  issuer: Address;
  subject: Address;
  schemaId: `0x${string}`;
  dataHash: `0x${string}`;
  issuedAt: bigint;
  expiry: bigint;
  idCommitment: bigint;
  status: AttestationStatus;
  revokedAt?: bigint;
  revokedReason?: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

const ATTESTED = getAbiItem({ abi: REGISTRY_ABI, name: "Attested" });
const REVOKED = getAbiItem({ abi: REGISTRY_ABI, name: "Revoked" });
const SCHEMA_REGISTERED = getAbiItem({ abi: REGISTRY_ABI, name: "SchemaRegistered" });

function assertConfigured() {
  if (IS_PLACEHOLDER_ADDRESS) throw new NotConfiguredError();
}

export async function readStatus(id: bigint): Promise<AttestationStatus> {
  const s = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "status",
    args: [id],
  });
  return Number(s) as AttestationStatus;
}

async function revocationFor(id: bigint) {
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: REVOKED,
    args: { id },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  const last = logs[logs.length - 1];
  if (!last) return undefined;
  return {
    revokedAt: last.args.revokedAt as bigint,
    revokedReason: last.args.reasonCode as `0x${string}`,
  };
}

function fromAttestedLog(log: {
  args: Record<string, unknown>;
  transactionHash: `0x${string}` | null;
  blockNumber: bigint | null;
}): Omit<ResolvedAttestation, "status" | "revokedAt" | "revokedReason"> {
  const a = log.args;
  return {
    id: a.id as bigint,
    issuer: a.issuer as Address,
    subject: a.subject as Address,
    schemaId: a.schemaId as `0x${string}`,
    dataHash: a.dataHash as `0x${string}`,
    issuedAt: a.issuedAt as bigint,
    expiry: a.expiry as bigint,
    idCommitment: a.idCommitment as bigint,
    txHash: (log.transactionHash ?? "0x") as `0x${string}`,
    blockNumber: log.blockNumber ?? 0n,
  };
}

export async function getById(id: bigint): Promise<ResolvedAttestation | null> {
  assertConfigured();
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: ATTESTED,
    args: { id },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  const log = logs[0];
  if (!log) return null;
  const base = fromAttestedLog(log);
  const [status, rev] = await Promise.all([readStatus(id), revocationFor(id)]);
  return { ...base, status, ...rev };
}

export async function getBySubject(subject: Address): Promise<ResolvedAttestation[]> {
  assertConfigured();
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: ATTESTED,
    args: { subject },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  const out = await Promise.all(
    logs.map(async (log) => {
      const base = fromAttestedLog(log);
      const [status, rev] = await Promise.all([readStatus(base.id), revocationFor(base.id)]);
      return { ...base, status, ...rev } as ResolvedAttestation;
    }),
  );
  return out.sort((a, b) => Number(b.id - a.id));
}

export type SchemaInfo = {
  schemaId: `0x${string}`;
  name: string;
  uri: string;
  registrar: Address;
};

/** Discover all registered schemas via SchemaRegistered events (for dropdowns). */
export async function listSchemas(): Promise<SchemaInfo[]> {
  assertConfigured();
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: SCHEMA_REGISTERED,
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  const map = new Map<string, SchemaInfo>();
  for (const log of logs) {
    const a = log.args;
    map.set(a.schemaId as string, {
      schemaId: a.schemaId as `0x${string}`,
      name: a.name as string,
      uri: a.uri as string,
      registrar: a.registrar as Address,
    });
  }
  return [...map.values()];
}

export async function getSchema(schemaId: `0x${string}`): Promise<SchemaInfo | null> {
  assertConfigured();
  const [name, uri, registrar] = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getSchema",
    args: [schemaId],
  })) as [string, string, Address];
  if (!name) return null;
  return { schemaId, name, uri, registrar };
}

/** Collect all idCommitments for a given (issuer, schema) — the ZK group members. */
export async function groupCommitments(
  issuer: Address,
  schemaId: `0x${string}`,
): Promise<string[]> {
  assertConfigured();
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: ATTESTED,
    args: { issuer },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  return logs
    .filter((l) => (l.args.schemaId as string) === schemaId)
    .map((l) => (l.args.idCommitment as bigint).toString())
    .filter((c) => c !== "0");
}

// re-export for callers that want the raw event signature
export const ATTESTED_EVENT = parseAbiItem(
  "event Attested(uint256 indexed id, address indexed issuer, address indexed subject, bytes32 schemaId, bytes32 dataHash, uint64 issuedAt, uint64 expiry, uint256 idCommitment)",
);
