# Attestry v2 — live deployment (Sepolia testnet)

> Testnet only. The deploying wallet is a throwaway burner that has only ever
> held Sepolia faucet ETH — never mainnet, never real funds.

## ComplianceRegistry v2

| Field | Value |
|---|---|
| Network | Ethereum **Sepolia** (chainId `11155111`) |
| Contract address | `0x2276030180fE1e179096c7ec586E676Ab561c2e6` |
| Version | `2.0.0` |
| Deploy block | `12025215` |
| Owner / deployer | `0xEe2965BDFE916Ece561Aec419F6B9EBf2beD6b2d` (burner) |
| Explorer | https://sepolia.etherscan.io/address/0x2276030180fE1e179096c7ec586E676Ab561c2e6 |

## Seeded demo state

Reproducible via `script/Seed.s.sol` (mirrors the post-deploy half of
`script/Demo.s.sol`). Read any of it straight from chain state:

| Item | Value |
|---|---|
| Schema | `KYC/AML v1` → `ipfs://attestry/schemas/kyc-aml-v1.json` (id `0x23aa5a57…dd10d`) |
| Allow-listed issuers | burner `0xEe29…6b2d` (direct) · `0xe05f…cfF7` (EIP-712 demo issuer) |
| Attestation #1 | subject `0x…bEEF`, direct, 1-yr expiry → **Revoked** (reason `superseded`) |
| Attestation #2 | subject `0x…cAFE`, **EIP-712 delegated**, no expiry → **Valid** |
| Merkle checkpoint | index `0`, root `0x5501…8e72` |

So `/verify` shows both a **Revoked** and a **Valid** record live, and the
EIP-712 delegated-attestation path is exercised on-chain.

## How to reproduce

```sh
# 1. Deploy (burner key + any funded Sepolia RPC). forge create estimates gas
#    against the live node; forge script under-estimated on public endpoints.
forge create src/ComplianceRegistry.sol:ComplianceRegistry \
  --rpc-url <SEPOLIA_RPC> --private-key <BURNER_KEY> --broadcast

# 2. Seed the demo data into the deployed address.
REGISTRY=<deployed_address> forge script script/Seed.s.sol \
  --rpc-url <SEPOLIA_RPC> --private-key <BURNER_KEY> --broadcast
```

Reliable public Sepolia RPC for the write path: `https://sepolia.gateway.tenderly.co`.
Read path (used by the dApp): `https://ethereum-sepolia-rpc.publicnode.com`.

## Frontend

The dApp (`web/`) reads this contract via the public RPC (keyless) and writes
through the connected wallet. Config lives in `web/lib/contract.ts`, overridden
by `NEXT_PUBLIC_*` env vars (see `web/.env.example`). Live URL recorded on the
submission once the Vercel deploy is green.
