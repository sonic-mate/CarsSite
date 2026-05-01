"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_ok")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie_ok", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: 16, right: 16, zIndex: 999,
      background: "var(--ink-05)", border: "1px solid rgba(200,164,92,0.25)",
      borderRadius: "var(--r-lg)", padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      maxWidth: 680, margin: "0 auto",
    }}>
      <p style={{ flex: 1, fontSize: 13, color: "rgba(245,243,238,0.75)", margin: 0, lineHeight: 1.5 }}>
        Мы используем файлы cookie для корректной работы сайта и улучшения пользовательского опыта.
        Продолжая использование сайта, вы соглашаетесь с{" "}
        <a href="/privacy" style={{ color: "var(--gold)", textDecoration: "underline" }}>политикой конфиденциальности</a>.
      </p>
      <button
        onClick={accept}
        className="btn btn-primary"
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Принять
      </button>
    </div>
  );
}
