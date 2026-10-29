# Attestry — on-chain compliance attestation registry

Attestry puts compliance attestations on-chain so anyone can verify them in
seconds, without trusting the issuer's word or a central database. It automates
one concrete legal/regtech workflow: the **compliance attestation and audit
trail** that today lives in email threads and PDFs.

Built for the BLI Legal Tech Hackathon 2.

## The problem

Proving that a compliance check happened — a KYC/AML review, a regulatory
filing, a signed policy acknowledgement — means trusting a PDF or an email.
Regulators, auditors, and counterparties cannot independently verify it, and
records can be edited after the fact.

## How it works

An allow-listed **issuer** (e.g. a KYC provider or compliance team) records an
attestation about a **subject**. The attestation stores only a **schema id**
(what kind of check) and a **data hash** (the fingerprint of the off-chain
document / result) — never personal data. Anyone can then verify the
attestation's issuer, timestamp, and status directly against chain state.
Issuers can revoke; the original record is preserved, producing a tamper-evident
audit trail.

### Contract API (`src/ComplianceRegistry.sol`)

| Function | Who | Purpose |
|---|---|---|
| `addIssuer(address)` / `removeIssuer(address)` | owner | manage the issuer allowlist |
| `attest(subject, schemaId, dataHash)` | issuer | record an attestation, returns its id |
| `revoke(id)` | issuing address | revoke an attestation (record preserved) |
| `getAttestation(id)` | anyone | read the full record |
| `isValid(id)` | anyone | true if it exists and is not revoked |

Events (`IssuerAdded`, `IssuerRemoved`, `Attested`, `Revoked`) let off-chain
indexers and UIs follow the registry.

## Run it

Foundry is required (`forge`). This repo vendors `forge-std` under `lib/`, so a
fresh checkout builds with no extra install step.

```bash
forge build                 # compile
forge test -vv              # full test suite (18 tests incl. fuzz)
forge fmt --check           # formatting
forge script script/Demo.s.sol -vvv   # keyless end-to-end demo (deploy->attest->verify->revoke)
```

The demo script runs entirely in a local EVM simulation — no RPC, no keys.

### Front-end mock

`web/index.html` is a static mock of the verifier experience (open it directly
in a browser — no build step). It uses **mock data** to show the empty, loading,
valid, and revoked states a real verifier would render; it does not connect to a
chain. Wiring it to live chain reads is future work (see Status).

## Deploying to a testnet (operator step)

Deployment is intentionally not automated. Testnet + burner wallet only — never
mainnet, never a key holding real funds. The operator supplies env vars (names in
`.env.example`; values never committed) and runs:

```bash
forge script script/Demo.s.sol \
  --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

## Project layout

```
src/ComplianceRegistry.sol    core contract
test/ComplianceRegistry.t.sol full test suite / eval harness
script/Demo.s.sol             keyless end-to-end demo
web/index.html                static verifier UI mock (mock data)
lib/forge-std                 vendored test/scripting library
```

## Status

Core contract + tests complete; demo script and verifier mock in place. A live
front-end wired to a deployed testnet contract is the next step. See `STATUS.md`
and `PLAN.md`.

## Safety

Testnet only. No secrets are committed; env var names live in `.env.example` and
values in a local, gitignored `.env`. The contract stores only hashes and
references, never personal data.
