"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Icon from "./Icon";
import { PHONE } from "@/lib/types";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/calculator", label: "Калькулятор" },
  { href: "/process", label: "Как мы работаем" },
  { href: "/#reviews", label: "Отзывы" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="site-header">
        <div className="site-header-row">
          <Link href="/" className="site-logo" style={{ textDecoration: "none" }}>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--gold)", letterSpacing: "0.14em", fontWeight: 700 }}>ВОСТОК</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--cream)", letterSpacing: "0.2em", fontWeight: 400, marginTop: 4, opacity: 0.85 }}>АВТО ИМПОРТ</span>
            </span>
          </Link>
          <nav className="site-nav">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className={pathname === href ? "nav-link active" : "nav-link"}>{label}</Link>
            ))}
          </nav>
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="site-phone">
            <Icon name="phone" size={18}/>
            {PHONE}
          </a>
          <button className="burger" onClick={() => setOpen(o => !o)} aria-label="Меню">
            <span className={`burger-icon${open ? " open" : ""}`}/>
          </button>
        </div>
      </header>

      {open && (
        <div className="mobile-nav-overlay" onClick={() => setOpen(false)}>
          <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
            <div className="mobile-nav-logo">
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--gold)", letterSpacing: "0.14em", fontWeight: 700 }}>ВОСТОК</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "rgba(245,243,238,0.6)", letterSpacing: "0.2em", fontWeight: 400, marginTop: 4 }}>АВТО ИМПОРТ</span>
            </div>
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className={`mobile-nav-link${pathname === href ? " active" : ""}`}>{label}</Link>
            ))}
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon name="phone" size={18}/>
              {PHONE}
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
