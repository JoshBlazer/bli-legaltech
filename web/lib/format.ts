import { AttestationStatus, STATUS_LABEL } from "./contract";

export function short(addr?: string | null, lead = 6, tail = 4): string {
  if (!addr) return "—";
  if (addr.length <= lead + tail + 2) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function fmtTimestamp(secs?: bigint | number | null): string {
  if (secs === undefined || secs === null) return "—";
  const n = typeof secs === "bigint" ? Number(secs) : secs;
  if (!n) return "—";
  return new Date(n * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function fmtExpiry(expiry?: bigint | null): string {
  if (!expiry || expiry === 0n) return "No expiry";
  return fmtTimestamp(expiry);
}

export function statusLabel(s: AttestationStatus): string {
  return STATUS_LABEL[s] ?? "Unknown";
}

export function statusTone(s: AttestationStatus): "ok" | "bad" | "warn" | "muted" {
  switch (s) {
    case AttestationStatus.Valid:
      return "ok";
    case AttestationStatus.Revoked:
      return "bad";
    case AttestationStatus.Expired:
      return "warn";
    default:
      return "muted";
  }
}

/** Decode a bytes32 reason code into text when it is ASCII-packed, else hex. */
export function decodeReason(reason?: string | null): string | null {
  if (!reason || /^0x0+$/.test(reason)) return null;
  try {
    const hex = reason.slice(2);
    let out = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.slice(i, i + 2), 16);
      if (code === 0) break;
      if (code < 32 || code > 126) return reason; // not printable -> show hex
      out += String.fromCharCode(code);
    }
    return out || reason;
  } catch {
    return reason;
  }
}
