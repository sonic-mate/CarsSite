"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
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
            <Link
              key={href}
              href={href}
              className={pathname === href ? "nav-link active" : "nav-link"}
            >
              {label}
            </Link>
          ))}
        </nav>
        <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="site-phone">
          <Icon name="phone" size={18}/>
          {PHONE}
        </a>
      </div>
    </header>
  );
}
