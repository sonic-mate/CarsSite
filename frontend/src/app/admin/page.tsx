"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Tariffs {
  jpy_to_rub: number;
  krw_to_rub: number;
  cny_to_rub: number;
  customs_rate: number;
  customs_coef_new: number;
  customs_coef_mid: number;
  customs_coef_old: number;
  delivery_japan: number;
  delivery_korea: number;
  delivery_china: number;
  services: number;
}

const FIELDS: { key: keyof Tariffs; label: string; step: number; note?: string }[] = [
  { key: "jpy_to_rub",       label: "Курс JPY → ₽",                step: 0.001, note: "1 японская иена в рублях" },
  { key: "krw_to_rub",       label: "Курс KRW → ₽",                step: 0.0001, note: "1 корейская вона в рублях" },
  { key: "cny_to_rub",       label: "Курс CNY → ₽",                step: 0.01, note: "1 китайский юань в рублях" },
  { key: "customs_rate",     label: "Ставка таможни (доля)",        step: 0.001, note: "Например: 0.18 = 18%" },
  { key: "customs_coef_new", label: "Коэф. таможни: новые (≥2024)", step: 0.01 },
  { key: "customs_coef_mid", label: "Коэф. таможни: 2021–2023",    step: 0.01 },
  { key: "customs_coef_old", label: "Коэф. таможни: до 2021",      step: 0.01 },
  { key: "delivery_japan",   label: "Доставка из Японии, ₽",       step: 1000 },
  { key: "delivery_korea",   label: "Доставка из Кореи, ₽",        step: 1000 },
  { key: "delivery_china",   label: "Доставка из Китая, ₽",        step: 1000 },
  { key: "services",         label: "Услуги брокера, ₽",           step: 1000 },
];

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tariffs, setTariffs] = useState<Tariffs | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_token");
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch(`${API}/api/tariffs`)
      .then((r) => r.json())
      .then(setTariffs)
      .catch(() => setError("Не удалось загрузить тарифы"));
  }, [authed]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("admin_token", token);
    setAuthed(true);
  }

  function logout() {
    sessionStorage.removeItem("admin_token");
    setAuthed(false);
    setTariffs(null);
    setToken("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tariffs) return;
    setStatus("saving");
    setError("");
    try {
      const r = await fetch(`${API}/api/tariffs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tariffs),
      });
      if (r.status === 401) {
        setError("Неверный пароль");
        setStatus("error");
        return;
      }
      if (!r.ok) throw new Error(await r.text());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
      setStatus("error");
    }
  }

  function change(key: keyof Tariffs, val: string) {
    if (!tariffs) return;
    setTariffs({ ...tariffs, [key]: parseFloat(val) || 0 });
  }

  if (!authed) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-10)" }}>
        <form onSubmit={login} style={{ background: "var(--surface)", padding: 40, borderRadius: 12, minWidth: 320 }}>
          <h2 style={{ marginBottom: 24, fontSize: 20 }}>Панель администратора</h2>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "rgba(245,243,238,0.6)" }}>Пароль</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--cream)", fontSize: 14, marginBottom: 20 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Войти</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink-10)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24 }}>Тарифы калькулятора</h1>
          <button onClick={logout} style={{ fontSize: 13, color: "rgba(245,243,238,0.4)", background: "none", border: "none", cursor: "pointer" }}>Выйти</button>
        </div>

        {!tariffs && !error && <p style={{ color: "rgba(245,243,238,0.4)" }}>Загрузка…</p>}
        {error && <p style={{ color: "#ff6b6b", marginBottom: 16 }}>{error}</p>}

        {tariffs && (
          <form onSubmit={save}>
            <div style={{ display: "grid", gap: 16 }}>
              {FIELDS.map(({ key, label, step, note }) => (
                <div key={key} style={{ background: "var(--surface)", borderRadius: 10, padding: "16px 20px" }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(245,243,238,0.6)", marginBottom: 6 }}>
                    {label}
                    {note && <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(245,243,238,0.35)" }}>{note}</span>}
                  </label>
                  <input
                    type="number"
                    step={step}
                    value={tariffs[key]}
                    onChange={(e) => change(key, e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--cream)", fontSize: 15 }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "center" }}>
              <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
                {status === "saving" ? "Сохранение…" : "Сохранить"}
              </button>
              {status === "saved" && <span style={{ color: "#4caf50", fontSize: 14 }}>Сохранено ✓</span>}
              {status === "error" && <span style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</span>}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
