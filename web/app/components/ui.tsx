"use client";

import { ReactNode } from "react";
import { AttestationStatus } from "@/lib/contract";
import { statusLabel, statusTone } from "@/lib/format";

export function Page({ children }: { children: ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 64px" }}>
      {children}
    </main>
  );
}

export function PageHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{title}</h1>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{lede}</p>
    </div>
  );
}

const TONE_STYLE: Record<string, { color: string; bg: string }> = {
  ok: { color: "var(--ok)", bg: "var(--okbg)" },
  bad: { color: "var(--bad)", bg: "var(--badbg)" },
  warn: { color: "var(--warn)", bg: "var(--warnbg)" },
  muted: { color: "var(--muted)", bg: "var(--chip)" },
};

export function StatusBadge({ status }: { status: AttestationStatus }) {
  const tone = TONE_STYLE[statusTone(status)];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 14,
        color: tone.color,
        background: tone.bg,
      }}
    >
      <span style={{ fontSize: 10 }}>●</span>
      {statusLabel(status)}
    </span>
  );
}

export function Row({ k, v, mono = true }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderTop: "1px solid var(--line)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--muted)", flexShrink: 0 }}>{k}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{ textAlign: "right", maxWidth: "70%" }}
      >
        {v}
      </span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
      <div className="spinner" style={{ margin: "0 auto 10px" }} />
      {label ?? "Working…"}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ textAlign: "center", color: "var(--muted)", padding: "28px 8px", fontSize: 14 }}>
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: "var(--bad)",
        background: "var(--badbg)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        color: "var(--muted)",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
