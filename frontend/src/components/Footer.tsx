import Link from "next/link";
import { PHONE, EMAIL, ADDRESS, SOCIALS } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img src="/logo.svg" alt="Восток АвтоИмпорт" height={36} style={{ marginBottom: 16 }}/>
            <p style={{ fontSize: 14, color: "rgba(245,243,238,0.6)", lineHeight: 1.6, maxWidth: 280, marginBottom: 20 }}>
              Подбор, выкуп и доставка автомобилей из Японии, Китая и Кореи. На 30% дешевле рынка.
            </p>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)", letterSpacing: "0.04em" }}>
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} style={{ color: "inherit" }}>{PHONE}</a>
            </div>
            <div style={{ fontSize: 12, color: "rgba(245,243,238,0.4)", marginTop: 4 }}>
              Ежедневно · Звонок бесплатный
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className="social-btn">WA</a>
              <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer" className="social-btn">TG</a>
              <a href={SOCIALS.vk} target="_blank" rel="noopener noreferrer" className="social-btn">VK</a>
            </div>
          </div>
          <div>
            <h5>Каталог</h5>
            <ul>
              <li><Link href="/catalog?country=japan">Авто из Японии</Link></li>
              <li><Link href="/catalog?country=china">Авто из Китая</Link></li>
              <li><Link href="/catalog?country=korea">Авто из Кореи</Link></li>
              <li><Link href="/catalog">Все автомобили</Link></li>
            </ul>
          </div>
          <div>
            <h5>Компания</h5>
            <ul>
              <li><Link href="/process">Как мы работаем</Link></li>
              <li><Link href="/calculator">Калькулятор</Link></li>
              <li><Link href="/#reviews">Отзывы</Link></li>
            </ul>
          </div>
          <div>
            <h5>Контакты</h5>
            <ul>
              <li><a href={`tel:${PHONE.replace(/\s/g, "")}`}>{PHONE}</a></li>
              <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
              <li><span style={{ color: "rgba(245,243,238,0.5)", fontSize: 13 }}>{ADDRESS}</span></li>
              <li><a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              <li><a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">Telegram</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-legal">
          <span>© 2026 Восток АвтоИмпорт. Все права защищены.</span>
          <span>{ADDRESS}</span>
        </div>
      </div>
    </footer>
  );
}
