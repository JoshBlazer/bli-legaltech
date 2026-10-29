"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/issuer", label: "Issue" },
  { href: "/verify", label: "Verify" },
  { href: "/prove", label: "Prove" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--card)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: "var(--ink)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          Attestry
        </Link>
        <nav style={{ display: "flex", gap: 4, marginLeft: 4, flex: 1 }}>
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? "var(--brand)" : "var(--muted)",
                  background: active ? "var(--chip)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
