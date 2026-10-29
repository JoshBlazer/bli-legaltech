/**
 * Reconstruct a Semaphore group's membership from on-chain `Attested` events.
 *
 * Per the Attestry v2 spec, a group = all `idCommitment`s for a given
 * (issuer, schemaId). The `ComplianceRegistry` emits:
 *
 *   Attested(uint256 indexed id, address indexed issuer, address indexed subject,
 *            bytes32 schemaId, bytes32 dataHash, uint64 issuedAt, uint64 expiry,
 *            uint256 idCommitment)
 *
 * This helper is decoder-agnostic: it accepts either flat decoded events or the
 * `{ args: {...} }` shape produced by viem (`parseEventLogs`/`getContractEvents`)
 * and ethers (`queryFilter`). Entries with `idCommitment === 0` (the "no private
 * proof" sentinel) are dropped, and duplicates are de-duplicated.
 */
import { buildGroup, type Commitment } from "./semaphore.js";
import type { Group } from "@semaphore-protocol/group";

/** The fields this helper reads off an `Attested` event. */
export interface AttestedFields {
  issuer: string;
  schemaId: string;
  idCommitment: bigint | string | number;
  id?: bigint | string | number;
  subject?: string;
}

/** A decoded `Attested` event, flat or wrapped in `{ args }` (viem/ethers). */
export type AttestedEventLike = AttestedFields | { args: AttestedFields };

function fields(e: AttestedEventLike): AttestedFields {
  return "args" in e ? e.args : e;
}

export interface GroupFilter {
  issuer: string;
  schemaId: string;
  /** Commitments to exclude (e.g. revoked/expired attestations). Optional. */
  exclude?: Commitment[];
}

/**
 * Return the de-duplicated list of identity commitments (as decimal strings)
 * for the given (issuer, schemaId), in first-seen order. Address and schemaId
 * comparisons are case-insensitive.
 */
export function commitmentsFromEvents(events: AttestedEventLike[], filter: GroupFilter): string[] {
  const issuer = filter.issuer.toLowerCase();
  const schemaId = filter.schemaId.toLowerCase();
  const excluded = new Set((filter.exclude ?? []).map((c) => BigInt(c as any).toString()));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const f = fields(ev);
    if (f.issuer?.toLowerCase() !== issuer) continue;
    if (f.schemaId?.toLowerCase() !== schemaId) continue;
    const c = BigInt(f.idCommitment as any);
    if (c === 0n) continue;
    const key = c.toString();
    if (seen.has(key) || excluded.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Convenience: build the Semaphore `Group` directly from `Attested` events. */
export function groupFromEvents(events: AttestedEventLike[], filter: GroupFilter): Group {
  return buildGroup(commitmentsFromEvents(events, filter));
}
