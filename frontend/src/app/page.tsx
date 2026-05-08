import { PHONE } from "@/lib/types";

export default function HomePage() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 32,
      padding: "40px 24px", textAlign: "center",
    }}>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, margin: 0 }}>
        Сайт в работе
      </h1>
      <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: "var(--fg-soft)", margin: 0 }}>
        Для консультации звоните по номеру
      </p>
      <a
        href={`tel:${PHONE.replace(/\s/g, "")}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 12,
          padding: "16px 36px", borderRadius: 8,
          background: "var(--accent)", color: "#0d0f14",
          fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 700,
          textDecoration: "none", letterSpacing: "0.02em",
        }}
      >
        {PHONE}
      </a>
    </main>
  );
}
