# `@attestry/zk` — selective-disclosure membership proofs

Workstream C. **Shipped path: Semaphore v4** (real zk-SNARK, Groth16). A subject
proves they hold a valid attestation from a given issuer under a given schema —
revealing only a **nullifier** (anti-replay) and a **signal**, never *which*
member they are.

## Install / run (from `lib/zk`)

```bash
npm install
npm run demo        # member proves ✓, non-member fails ✗
npm test            # node:test suite (events + prove/verify)
npm run typecheck   # tsc --noEmit
```

## API

```ts
import {
  createIdentity, importIdentity,
  buildGroup, groupFromEvents, commitmentsFromEvents,
  prove, verify, ensureArtifacts, depthFor,
} from "@attestry/zk"; // path: ../lib/zk/src/index.ts

createIdentity(secret?: string): AttestryIdentity
  // .commitment : string  -> pass as attest(..., idCommitment)
  // .export()   : string  -> store client-side (secret; localStorage)
importIdentity(exported: string): AttestryIdentity

buildGroup(commitments: (string|bigint|number)[]): Group
commitmentsFromEvents(events, { issuer, schemaId, exclude? }): string[]
groupFromEvents(events, { issuer, schemaId, exclude? }): Group
  // events: decoded Attested logs, flat or viem/ethers { args } shape

prove(identity, group, signal, { scope?, artifacts? }?): Promise<SemaphoreProof>
verify(proof, { expectedRoot?, expectedScope?, expectedMessage? }?): Promise<boolean>

ensureArtifacts(depth: number): Promise<{ wasm, zkey }>  // pre-warm (Node)
depthFor(group): number
```

## How workstream B calls this

### `/issuer` — commitment generation
When the issuer ticks "enable private proof":
```ts
const identity = createIdentity();                 // or createIdentity(walletSignature)
// include identity.commitment in the attest(...) tx as `idCommitment`
const saved = identity.export();                   // hand to subject: download / localStorage
```
Give the subject their `export()` string as the saved credential — it is the
secret; it must never touch the chain or a server.

### `/prove` — proof generation (subject side)
```ts
const identity = importIdentity(savedCredential);
const events   = /* Attested logs for (issuer, schemaId) via viem getContractEvents */;
const group    = groupFromEvents(events, { issuer, schemaId });
const proof    = await prove(identity, group, signal, { scope });
// signal = any public message; scope = a context id (defaults to group.root).
// Share `proof` (JSON) + the group identity (issuer, schemaId) via link/QR.
```

### verifier side (no identity learned)
```ts
const group = groupFromEvents(events, { issuer, schemaId });
const ok = await verify(proof, {
  expectedRoot: group.root,          // proof is for THIS group's current state
  expectedScope: proof.scope,
  expectedMessage: proof.message,
});
```
A repeated `nullifier` under the same `scope` = the same (anonymous) member
proving twice — use it for one-proof-per-context / anti-replay.

## Notes & caveats
- **Artifacts:** Semaphore's bundled auto-downloader hangs on this Node/Windows
  setup. We bypass it: `ensureArtifacts(depth)` fetches the exact-depth
  `.wasm`/`.zkey` (~3.4 MB) from `snark-artifacts.pse.dev` into `lib/zk/.artifacts/`
  (git-ignored) and `prove()` passes them explicitly. Pre-warm at app start so
  the first proof isn't blocked on a download. In the browser, pass CDN URLs via
  `prove(..., { artifacts })` or let Semaphore's browser loader run.
- **Anonymity set size:** Semaphore itself notes groups of 1–2 members are not
  truly anonymous. Real privacy needs a few members in the (issuer, schema) group.
- **Browser bundling:** `prove`/`verify` and the artifact helper are the only
  Node-coupled pieces (`node:fs`). Import `createIdentity`/`buildGroup`/events
  helpers freely in the browser; for proving in-browser, pass `artifacts` URLs.
