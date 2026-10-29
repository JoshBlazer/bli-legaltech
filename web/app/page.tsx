import Link from "next/link";
import { COPY } from "@/lib/copy";

export default function Landing() {
  const { hero, legs, how } = COPY;
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "16px" }}>
      {/* Hero */}
      <section style={{ padding: "48px 8px 40px", textAlign: "center" }}>
        <span className="chip" style={{ marginBottom: 16 }}>
          {hero.eyebrow}
        </span>
        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.1,
            margin: "12px 0 16px",
            letterSpacing: "-0.03em",
          }}
        >
          {hero.title}
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--muted)",
            maxWidth: 620,
            margin: "0 auto 28px",
            lineHeight: 1.55,
          }}
        >
          {hero.sub}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href={hero.ctaPrimary.href} className="btn">
            {hero.ctaPrimary.label}
          </Link>
          <Link href={hero.ctaSecondary.href} className="btn btn-ghost">
            {hero.ctaSecondary.label}
          </Link>
        </div>
      </section>

      {/* Three legs */}
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          marginBottom: 48,
        }}
      >
        {legs.map((leg) => (
          <div key={leg.title} className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{leg.title}</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              {leg.body}
            </p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, textAlign: "center", margin: "0 0 24px" }}>
          How it works
        </h2>
        <div style={{ display: "grid", gap: 14 }}>
          {how.map((h) => (
            <div
              key={h.step}
              className="card"
              style={{ padding: 18, display: "flex", gap: 16, alignItems: "flex-start" }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "var(--brand)",
                  color: "var(--brand-ink)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                {h.step}
              </span>
              <div>
                <h3 style={{ margin: "4px 0 4px", fontSize: 16 }}>{h.title}</h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
                  {h.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 12,
          paddingBottom: 32,
        }}
      >
        Testnet only · no real funds · the document never leaves your browser.
      </footer>
    </main>
  );
}
