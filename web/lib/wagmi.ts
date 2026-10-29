import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { CHAIN_ID, RPC_URL } from "./contract";

// Local anvil, for a keyless local-chain run (chainId 31337).
const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const CHAINS = { 1: mainnet, 11155111: sepolia, 31337: anvil } as const;

export const activeChain = CHAINS[CHAIN_ID as keyof typeof CHAINS] ?? sepolia;

// Keyless: reads go through a public RPC (http transport); writes use the
// connected injected wallet (MetaMask / Rabby / etc.). All supported chains are
// declared so the config type is concrete; the active chain gets the RPC_URL.
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, anvil],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(CHAIN_ID === mainnet.id ? RPC_URL : undefined),
    [sepolia.id]: http(CHAIN_ID === sepolia.id ? RPC_URL : undefined),
    [anvil.id]: http(CHAIN_ID === anvil.id ? RPC_URL : "http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
