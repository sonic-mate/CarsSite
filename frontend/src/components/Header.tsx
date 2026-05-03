"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Icon from "./Icon";
import CallbackModal from "./CallbackModal";
import { PHONE, ADDRESS, SOCIALS } from "@/lib/types";

const NAV = [
  { href: "/catalog?country=japan", label: "Авто из Японии" },
  { href: "/catalog?country=korea", label: "Авто из Кореи" },
  { href: "/catalog?country=china", label: "Авто из Китая" },
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

        {/* Top bar: logo + address + socials + phone */}
        <div className="site-header-top">
          <Link href="/" className="header-brand" style={{ textDecoration: "none" }}>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--accent)", letterSpacing: "0.14em", fontWeight: 700 }}>ВОСТОК</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--ink-10)", letterSpacing: "0.2em", fontWeight: 400, marginTop: 2, opacity: 0.7 }}>АВТО ИМПОРТ</span>
            </span>
          </Link>
          <span className="header-address">{ADDRESS}</span>
          <div className="header-socials">
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer" className="header-social-icon" title="Telegram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
            </a>
            <a href={SOCIALS.vk} target="_blank" rel="noopener noreferrer" className="header-social-icon" title="ВКонтакте">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.712-1.033-1.01-1.49-.858-1.49.414v1.298c0 .372-.12.595-1.112.595-1.636 0-3.45-.992-4.727-2.833-1.918-2.696-2.44-4.718-2.44-5.13 0-.224.08-.43.294-.43h1.744c.414 0 .573.19.732.637.805 2.327 2.152 4.367 2.707 4.367.207 0 .302-.095.302-.617V11.13c-.064-1.112-.65-1.206-.65-1.6 0-.19.155-.382.4-.382h2.746c.35 0 .476.19.476.604v3.245c0 .35.157.476.254.476.207 0 .38-.126.762-.508 1.18-1.322 2.022-3.36 2.022-3.36.112-.224.3-.43.715-.43h1.744c.524 0 .637.27.524.604-.22.985-2.36 4.04-2.36 4.04-.19.303-.254.44 0 .78.19.254.81.78 1.226 1.253.762.874 1.344 1.608 1.502 2.114.14.508-.16.762-.635.762z"/></svg>
            </a>
            <a href={SOCIALS.max} target="_blank" rel="noopener noreferrer" className="header-social-icon" title="MAX">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/><text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="sans-serif">MAX</text></svg>
            </a>
          </div>
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="site-phone" style={{ marginLeft: 12 }}>
            <Icon name="phone" size={16}/>
            {PHONE}
          </a>
          <CallbackModal triggerClassName="btn btn-primary btn-sm" triggerLabel="Заказать звонок"/>
        </div>

        {/* Bottom bar: nav */}
        <div className="site-header-row">
          <nav className="site-nav">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className={pathname === href ? "nav-link active" : "nav-link"}>{label}</Link>
            ))}
          </nav>
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
