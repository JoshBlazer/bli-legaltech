/**
 * Groth16 artifact management for the Semaphore path.
 *
 * WHY THIS EXISTS: Semaphore's bundled auto-downloader (`@zk-kit/artifacts`)
 * hangs indefinitely on this Windows/Node setup — a single proof never
 * returned after 7+ minutes. The artifacts themselves download fine over plain
 * HTTP (~3.4 MB in ~4 s) and proving, once they are on disk, takes <1 s. So we
 * sidestep the resolver entirely: fetch the exact-depth `.wasm`/`.zkey` to a
 * local cache with global `fetch`, then hand their paths straight to
 * `generateProof`. This is what makes the Semaphore path reliable here.
 *
 * Node-only (uses `fs`). In the browser, pass `SnarkArtifacts` URLs explicitly
 * or let Semaphore's default fetch-based loader run (it is the Node resolver,
 * not the browser one, that misbehaves).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const { fileURLToPath } = require("node:url") as typeof import("node:url");

/** Paths Semaphore's `generateProof` accepts as its `snarkArtifacts` argument. */
export interface SnarkArtifactPaths {
  wasm: string;
  zkey: string;
}

/** Public PSE mirror of the Semaphore trusted-setup artifacts. */
export const ARTIFACT_BASE_URL = "https://snark-artifacts.pse.dev/semaphore/latest";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".artifacts");

function cachePath(depth: number, ext: "wasm" | "zkey"): string {
  return path.join(CACHE_DIR, `semaphore-${depth}.${ext}`);
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`artifact download failed (${res.status}) for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

/**
 * Ensure the depth-`depth` Semaphore artifacts are cached locally and return
 * their paths. Downloads only what is missing. Call once before proving (e.g.
 * at app start) to pre-warm; subsequent calls are instant.
 */
export async function ensureArtifacts(depth: number): Promise<SnarkArtifactPaths> {
  const wasm = cachePath(depth, "wasm");
  const zkey = cachePath(depth, "zkey");
  const jobs: Promise<void>[] = [];
  if (!fs.existsSync(wasm)) jobs.push(download(`${ARTIFACT_BASE_URL}/semaphore-${depth}.wasm`, wasm));
  if (!fs.existsSync(zkey)) jobs.push(download(`${ARTIFACT_BASE_URL}/semaphore-${depth}.zkey`, zkey));
  if (jobs.length) await Promise.all(jobs);
  return { wasm, zkey };
}
