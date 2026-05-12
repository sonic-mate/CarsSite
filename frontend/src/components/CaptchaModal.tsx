"use client";

import { useState } from "react";

interface Props {
  onPass: () => void;
}

export default function CaptchaModal({ onPass }: Props) {
  const [a] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [b] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (parseInt(answer, 10) === a + b) {
      onPass();
    } else {
      setError(true);
      setAnswer("");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "var(--ink-05, #1a1d24)",
        border: "1px solid rgba(200,164,92,0.25)",
        borderRadius: "var(--r-lg, 16px)",
        padding: "40px",
        maxWidth: 360, width: "100%",
        textAlign: "center",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", color: "var(--gold, #c8a45c)", marginBottom: 12, textTransform: "uppercase" }}>
          Проверка
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#f5f3ee" }}>Вы не робот?</h2>
        <p style={{ color: "rgba(245,243,238,0.65)", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          Решите пример и продолжайте пользоваться сайтом
        </p>
        <form onSubmit={submit}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 20, fontFamily: "var(--font-mono, monospace)", color: "#f5f3ee", letterSpacing: "0.1em" }}>
            {a} + {b} = ?
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setError(false); }}
            placeholder="Ответ"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 20,
              textAlign: "center",
              borderRadius: "var(--r-md, 10px)",
              border: error ? "1.5px solid #e55" : "1.5px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.08)",
              color: "#f5f3ee",
              marginBottom: error ? 6 : 16,
              boxSizing: "border-box",
              outline: "none",
            }}
          />
          {error && (
            <p style={{ color: "#e55", fontSize: 13, marginBottom: 12 }}>
              Неверно, попробуйте ещё раз
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            Подтвердить
          </button>
        </form>
      </div>
    </div>
  );
}
