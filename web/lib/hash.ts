// Client-side document hashing. The file's bytes NEVER leave the browser —
// only the resulting 32-byte hash is ever shown or sent on-chain.

import { keccak256, toHex } from "viem";

export type HashAlgo = "keccak256" | "sha256";

export const HASH_ALGOS: { value: HashAlgo; label: string }[] = [
  { value: "keccak256", label: "keccak256 (Solidity-native)" },
  { value: "sha256", label: "SHA-256" },
];

async function sha256Hex(bytes: Uint8Array): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

/** Hash a file entirely in-browser. Returns a 0x-prefixed bytes32 hex string. */
export async function hashFile(file: File, algo: HashAlgo): Promise<`0x${string}`> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return hashBytes(buf, algo);
}

export async function hashBytes(
  bytes: Uint8Array,
  algo: HashAlgo,
): Promise<`0x${string}`> {
  if (algo === "sha256") return sha256Hex(bytes);
  return keccak256(toHex(bytes));
}
