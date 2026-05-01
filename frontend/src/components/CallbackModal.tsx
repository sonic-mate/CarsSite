"use client";

import { useState } from "react";
import { PHONE } from "@/lib/types";
import Icon from "./Icon";

export default function CallbackModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const r = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      setStatus(r.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setName("");
    setPhone("");
    setAgreed(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-lg btn-block"
        style={{ borderColor: "rgba(245,243,238,0.3)", color: "#fff", background: "transparent", border: "1px solid rgba(245,243,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        Заказать звонок
      </button>

      {open && (
        <div
          onClick={(e) => e.target === e.currentTarget && close()}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{
            background: "#13151c", borderRadius: "var(--r-lg)",
            padding: 36, width: "100%", maxWidth: 420,
            border: "1px solid rgba(245,243,238,0.15)",
            position: "relative",
          }}>
            <button
              onClick={close}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(245,243,238,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
            >✕</button>

            {status === "ok" ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
                <h3 style={{ marginBottom: 8 }}>Заявка принята</h3>
                <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Перезвоним в течение 15 минут</p>
                <button className="btn btn-primary" style={{ marginTop: 24, width: "100%" }} onClick={close}>Закрыть</button>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: 6, color: "#f5f3ee" }}>Заказать звонок</h3>
                <p style={{ color: "rgba(245,243,238,0.6)", fontSize: 13, marginBottom: 24 }}>
                  Оставьте номер — перезвоним в течение 15 минут
                </p>
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    className="input" placeholder="Ваше имя" required
                    value={name} onChange={e => setName(e.target.value)}
                  />
                  <input
                    className="input" placeholder="+7 (___) ___-__-__" type="tel" required
                    value={phone} onChange={e => setPhone(e.target.value)}
                  />
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      required
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--accent)", width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(245,243,238,0.65)", lineHeight: 1.5 }}>
                      Мне исполнилось 18 лет. Я принимаю{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>Пользовательское соглашение</a>
                      {" "}и{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>Политику конфиденциальности</a>
                      , в том числе даю согласие на обработку персональных данных.
                    </span>
                  </label>
                  {status === "error" && (
                    <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>Ошибка отправки. Позвоните напрямую: {PHONE}</p>
                  )}
                  <button className="btn btn-primary btn-lg" type="submit" disabled={status === "loading" || !agreed} style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    {status === "loading" ? "Отправка…" : "Перезвоните мне"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
