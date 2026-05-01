"use client";

import { useState, useEffect } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Наверх"
      style={{
        position: "fixed", bottom: 96, right: 20, zIndex: 998,
        width: 44, height: 44, borderRadius: "50%",
        background: "var(--ink-10)", border: "1px solid rgba(200,164,92,0.3)",
        color: "var(--gold)", fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        transition: "opacity 200ms ease",
      }}
    >
      ↑
    </button>
  );
}
