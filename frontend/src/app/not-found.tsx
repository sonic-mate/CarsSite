import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "64px 24px" }}>
      <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 16 }}>404</span>
      <h1 style={{ marginBottom: 16 }}>Страница не найдена</h1>
      <p style={{ color: "var(--fg-muted)", marginBottom: 32 }}>Запрашиваемая страница не существует или была удалена.</p>
      <Link href="/" className="btn btn-primary btn-lg">На главную</Link>
    </main>
  );
}
