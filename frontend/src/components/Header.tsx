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
        <Link href="/" className="site-logo">
          <img src="/logo.svg" alt="Восток АвтоИмпорт" height={38}/>
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
