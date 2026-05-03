import Link from "next/link";
import { PHONE, EMAIL, ADDRESS, SOCIALS } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">

        {/* Top bar: logo+address | socials | phone+cta */}
        <div className="footer-topbar">
          <div className="footer-brand">
            <span className="footer-logo">
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--gold)", letterSpacing: "0.14em", fontWeight: 700 }}>ВОСТОК</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--cream)", letterSpacing: "0.2em", fontWeight: 400, marginTop: 2, opacity: 0.85 }}>АВТО ИМПОРТ</span>
            </span>
            <span className="footer-address">г. Омск, {ADDRESS.replace("г. Омск, ", "")}</span>
          </div>

          <div className="footer-socials">
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer" className="footer-social-icon" title="Telegram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
            </a>
            <a href={SOCIALS.vk} target="_blank" rel="noopener noreferrer" className="footer-social-icon" title="ВКонтакте">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.712-1.033-1.01-1.49-.858-1.49.414v1.298c0 .372-.12.595-1.112.595-1.636 0-3.45-.992-4.727-2.833-1.918-2.696-2.44-4.718-2.44-5.13 0-.224.08-.43.294-.43h1.744c.414 0 .573.19.732.637.805 2.327 2.152 4.367 2.707 4.367.207 0 .302-.095.302-.617V11.13c-.064-1.112-.65-1.206-.65-1.6 0-.19.155-.382.4-.382h2.746c.35 0 .476.19.476.604v3.245c0 .35.157.476.254.476.207 0 .38-.126.762-.508 1.18-1.322 2.022-3.36 2.022-3.36.112-.224.3-.43.715-.43h1.744c.524 0 .637.27.524.604-.22.985-2.36 4.04-2.36 4.04-.19.303-.254.44 0 .78.19.254.81.78 1.226 1.253.762.874 1.344 1.608 1.502 2.114.14.508-.16.762-.635.762z"/></svg>
            </a>
            <a href={SOCIALS.max} target="_blank" rel="noopener noreferrer" className="footer-social-icon" title="MAX">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/><text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0d0f14" fontFamily="sans-serif">MAX</text></svg>
            </a>
          </div>

          <div className="footer-contact-right">
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="footer-phone">{PHONE}</a>
            <Link href="/#callback" className="btn btn-primary btn-sm">Оставить заявку</Link>
          </div>
        </div>

        {/* Legal */}
        <div className="footer-legal">
          <span>© 2026 Восток Авто Импорт. Все права защищены.</span>
          <span className="footer-links">
            <Link href="/privacy" style={{ color: "rgba(245,243,238,0.5)" }}>Политика конфиденциальности</Link>
            <Link href="/terms" style={{ color: "rgba(245,243,238,0.5)" }}>Пользовательское соглашение</Link>
          </span>
        </div>
        <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 8, fontSize: 11, color: "rgba(200,164,92,0.5)", letterSpacing: "0.04em" }}>
          Website created by Oridium digital
        </div>

      </div>
    </footer>
  );
}
