import { createPublicClient, http } from "viem";
import { activeChain } from "./wagmi";
import { RPC_URL } from "./contract";

// Keyless read client — public RPC, no wallet, no keys.
export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(RPC_URL),
});

// Earliest block to scan for events. On a public testnet set
// NEXT_PUBLIC_DEPLOY_BLOCK to the deploy block to keep getLogs ranges small.
export const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK)
  : 0n;
