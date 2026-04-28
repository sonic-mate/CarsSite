// Header & Footer
const PHONE = "8 800 101 29 18";

const Header = ({ onNav, current }) => (
  <header className="site-header">
    <div className="row">
      <img src="../../assets/logo.svg" alt="Восток АвтоИмпорт" className="logo" onClick={() => onNav("home")}/>
      <nav>
        <a onClick={() => onNav("catalog")} style={{ cursor: "pointer", color: current === "catalog" ? "var(--accent)" : undefined }}>Каталог</a>
        <a onClick={() => onNav("calculator")} style={{ cursor: "pointer", color: current === "calculator" ? "var(--accent)" : undefined }}>Калькулятор</a>
        <a onClick={() => onNav("process")} style={{ cursor: "pointer", color: current === "process" ? "var(--accent)" : undefined }}>Как мы работаем</a>
        <a style={{ cursor: "pointer" }}>О компании</a>
        <a style={{ cursor: "pointer" }}>Контакты</a>
      </nav>
      <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="phone"><Icon name="phone" size={16}/>{PHONE}</a>
    </div>
  </header>
);

const Footer = () => (
  <footer className="site-footer">
    <div className="container">
      <div className="grid">
        <div>
          <img src="../../assets/logo.svg" alt="" style={{ height: 44, filter: "invert(1)", marginBottom: 16 }}/>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,243,238,0.6)", maxWidth: "32ch" }}>
            Импорт автомобилей из&nbsp;Японии, Китая и&nbsp;Кореи под&nbsp;ключ. С&nbsp;2018 года.
          </p>
        </div>
        <div>
          <h5>Каталог</h5>
          <ul>
            <li><a>Япония</a></li>
            <li><a>Китай</a></li>
            <li><a>Корея</a></li>
            <li><a>Все автомобили</a></li>
          </ul>
        </div>
        <div>
          <h5>Услуги</h5>
          <ul>
            <li><a>Подбор автомобиля</a></li>
            <li><a>Калькулятор</a></li>
            <li><a>Доставка</a></li>
            <li><a>Растаможка</a></li>
          </ul>
        </div>
        <div>
          <h5>Контакты</h5>
          <ul>
            <li><a style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)", letterSpacing: "0.04em" }}>{PHONE}</a></li>
            <li><a>info@vostok-auto.ru</a></li>
            <li><a>Москва, Проспект Мира, 102</a></li>
            <li><a>Ежедневно 9:00–21:00</a></li>
          </ul>
        </div>
      </div>
      <div className="legal">
        <span>© 2026 Восток АвтоИмпорт. Все права защищены.</span>
        <span>Политика конфиденциальности · Оферта</span>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Header, Footer, PHONE });
