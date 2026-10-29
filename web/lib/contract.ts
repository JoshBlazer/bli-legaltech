// ---------------------------------------------------------------------------
// Attestry v2 — on-chain config (keyless reads, wallet writes).
//
// The ABI below is the FROZEN v2 interface from docs/ATTESTRY_V2_SPEC.md.
// Workstream A deploys the upgraded ComplianceRegistry; the real address lands
// here post-deploy. Until then CONTRACT_ADDRESS is a clearly-marked PLACEHOLDER
// and the UI degrades gracefully (reads return "Unknown", writes are gated on a
// connected wallet).
// ---------------------------------------------------------------------------

import type { Abi, Address } from "viem";

// =====================  WIRE THIS POST-DEPLOY  =============================
// Replace with the deployed ComplianceRegistry v2 address (from A's
// deployments/ output), or set NEXT_PUBLIC_CONTRACT_ADDRESS in web/.env.local.
export const PLACEHOLDER_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

export const CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address | undefined) ??
  PLACEHOLDER_ADDRESS;

export const IS_PLACEHOLDER_ADDRESS =
  CONTRACT_ADDRESS.toLowerCase() === PLACEHOLDER_ADDRESS.toLowerCase();
// ===========================================================================

// Chain + RPC. Default target is Sepolia (testnet only — never mainnet).
// Overridable for a local anvil run via env.
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

// Public RPC — keyless read path. Override with your own endpoint if desired.
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  31337: "", // local anvil — no public explorer
};

export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_EXPLORER_BASE ?? EXPLORERS[CHAIN_ID] ?? "";

export function txUrl(hash: string): string | null {
  return EXPLORER_BASE ? `${EXPLORER_BASE}/tx/${hash}` : null;
}
export function addressUrl(addr: string): string | null {
  return EXPLORER_BASE ? `${EXPLORER_BASE}/address/${addr}` : null;
}

// Status enum — mirrors `enum Status { Unknown, Valid, Revoked, Expired }`.
export enum AttestationStatus {
  Unknown = 0,
  Valid = 1,
  Revoked = 2,
  Expired = 3,
}

export const STATUS_LABEL: Record<AttestationStatus, string> = {
  [AttestationStatus.Unknown]: "Unknown",
  [AttestationStatus.Valid]: "Valid",
  [AttestationStatus.Revoked]: "Revoked",
  [AttestationStatus.Expired]: "Expired",
};

// ---------------------------------------------------------------------------
// ABI — ComplianceRegistry v2 (frozen interface from the spec).
// ---------------------------------------------------------------------------
export const REGISTRY_ABI = [
  // ---- Schema registry ----
  {
    type: "function",
    name: "registerSchema",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "uri", type: "string" },
    ],
    outputs: [{ name: "schemaId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getSchema",
    stateMutability: "view",
    inputs: [{ name: "schemaId", type: "bytes32" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "uri", type: "string" },
      { name: "registrar", type: "address" },
    ],
  },
  {
    type: "event",
    name: "SchemaRegistered",
    inputs: [
      { name: "schemaId", type: "bytes32", indexed: true },
      { name: "registrar", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "uri", type: "string", indexed: false },
    ],
  },

  // ---- Issuers ----
  {
    type: "function",
    name: "addIssuer",
    stateMutability: "nonpayable",
    inputs: [{ name: "issuer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeIssuer",
    stateMutability: "nonpayable",
    inputs: [{ name: "issuer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isIssuer",
    stateMutability: "view",
    inputs: [{ name: "issuer", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // ---- Attest (direct) ----
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subject", type: "address" },
      { name: "schemaId", type: "bytes32" },
      { name: "dataHash", type: "bytes32" },
      { name: "expiry", type: "uint64" },
      { name: "idCommitment", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },

  // ---- Attest (delegated, EIP-712) ----
  {
    type: "function",
    name: "attestWithSig",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "issuer", type: "address" },
          { name: "subject", type: "address" },
          { name: "schemaId", type: "bytes32" },
          { name: "dataHash", type: "bytes32" },
          { name: "expiry", type: "uint64" },
          { name: "idCommitment", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint64" },
        ],
      },
      { name: "sig", type: "bytes" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },

  {
    type: "event",
    name: "Attested",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "subject", type: "address", indexed: true },
      { name: "schemaId", type: "bytes32", indexed: false },
      { name: "dataHash", type: "bytes32", indexed: false },
      { name: "issuedAt", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "idCommitment", type: "uint256", indexed: false },
    ],
  },

  // ---- Revoke with reason ----
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "reasonCode", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Revoked",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "revokedAt", type: "uint64", indexed: false },
      { name: "reasonCode", type: "bytes32", indexed: false },
    ],
  },

  // ---- Status / reads ----
  {
    type: "function",
    name: "status",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "isValid",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getAttestation",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "issuer", type: "address" },
          { name: "subject", type: "address" },
          { name: "schemaId", type: "bytes32" },
          { name: "dataHash", type: "bytes32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiry", type: "uint64" },
          { name: "revokedAt", type: "uint64" },
          { name: "idCommitment", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "attestationCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ---- Merkle checkpoint ----
  {
    type: "function",
    name: "checkpoint",
    stateMutability: "nonpayable",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [{ name: "index", type: "uint256" }],
  },
  {
    type: "function",
    name: "roots",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "event",
    name: "Checkpoint",
    inputs: [
      { name: "index", type: "uint256", indexed: true },
      { name: "root", type: "bytes32", indexed: false },
      { name: "at", type: "uint64", indexed: false },
    ],
  },
] as const satisfies Abi;

// Shape returned by getAttestation, decoded.
export type AttestationRecord = {
  issuer: Address;
  subject: Address;
  schemaId: `0x${string}`;
  dataHash: `0x${string}`;
  issuedAt: bigint;
  expiry: bigint;
  revokedAt: bigint;
  idCommitment: bigint;
};
