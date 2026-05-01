"use client";

import { useState } from "react";
import { PHONE } from "@/lib/types";
import Icon from "./Icon";

export default function CallbackModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-lg btn-block"
        style={{ borderColor: "rgba(245,243,238,0.3)", color: "#fff", background: "transparent", border: "1px solid rgba(245,243,238,0.3)" }}
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
            background: "var(--surface)", borderRadius: "var(--r-lg)",
            padding: 36, width: "100%", maxWidth: 420,
            border: "1px solid rgba(245,243,238,0.1)",
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
                <h3 style={{ marginBottom: 6 }}>Заказать звонок</h3>
                <p style={{ color: "var(--fg-muted)", fontSize: 13, marginBottom: 24 }}>
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
                  {status === "error" && (
                    <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>Ошибка отправки. Позвоните напрямую: {PHONE}</p>
                  )}
                  <button className="btn btn-primary btn-lg" type="submit" disabled={status === "loading"} style={{ marginTop: 4 }}>
                    {status === "loading" ? "Отправка…" : "Перезвоните мне"}
                  </button>
                </form>
                <p style={{ fontSize: 11, color: "rgba(245,243,238,0.3)", marginTop: 16, textAlign: "center" }}>
                  Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
