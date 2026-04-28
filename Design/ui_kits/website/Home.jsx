// Home screen
const Home = ({ onNav, onOpenCar }) => {
  const [country, setCountry] = React.useState("japan");
  const featured = window.CARS.slice(0, 6);
  const filtered = country === "all" ? featured : featured.filter(c => c.country === country);

  return (
    <main>
      {/* HERO */}
      <section className="hero" data-screen-label="01 Hero">
        <div className="hero-bg"/>
        <div className="hero-car-stage">
          <CarSilhouette kind="suv" w={720} color="#1a1d24"/>
        </div>
        <div className="hero-protect"/>
        <div className="hero-inner" style={{ position: "relative", zIndex: 2 }}>
          <span className="eyebrow-gold">Япония — Китай — Корея</span>
          <h1>АВТО ПОД<br/>КЛЮЧ ЗА <span className="accent">45 ДНЕЙ</span></h1>
          <p className="lead">Подбираем, выкупаем и&nbsp;доставляем автомобили с&nbsp;аукционов и&nbsp;дилеров. Всё прозрачно: фиксированная стоимость услуг, отчёты с&nbsp;каждого этапа, гарантия на&nbsp;документы.</p>

          <div className="search-panel">
            <div className="search-tabs">
              {["japan", "china", "korea"].map(k => (
                <button key={k} className={"search-tab" + (country === k ? " active" : "")} onClick={() => setCountry(k)}>
                  <img src={window.COUNTRY_FLAG[k]} alt=""/>
                  {window.COUNTRY_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="search-row">
              <select className="select"><option>Любая марка</option><option>Toyota</option><option>Lexus</option><option>BYD</option></select>
              <select className="select"><option>Любой кузов</option><option>Седан</option><option>Внедорожник</option><option>Кроссовер</option></select>
              <select className="select"><option>Цена до 5 млн</option><option>До 3 млн</option><option>До 10 млн</option></select>
              <Button variant="primary" size="lg" onClick={() => onNav("catalog")}>Найти</Button>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat"><div className="num">1 247</div><div className="lbl">Авто доставлено</div></div>
            <div className="stat"><div className="num">8 <span className="gold">лет</span></div><div className="lbl">На рынке</div></div>
            <div className="stat"><div className="num">3</div><div className="lbl">Страны импорта</div></div>
            <div className="stat"><div className="num">45 <span className="gold">дн.</span></div><div className="lbl">Средний срок</div></div>
          </div>
        </div>
      </section>

      {/* FEATURED CATALOG */}
      <section className="section" data-screen-label="01 Hero · Featured">
        <div className="container">
          <div className="section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12, display: "block" }}>Витрина</span>
              <h2>Хиты этой недели</h2>
            </div>
            <Button variant="ghost" iconAfter={<Icon name="arrow" size={16}/>} onClick={() => onNav("catalog")}>Весь каталог</Button>
          </div>
          <div className="country-tabs">
            {["all", "japan", "china", "korea"].map(k => (
              <div key={k} className={"country-tab" + (country === k ? " active" : "")} onClick={() => setCountry(k)}>
                {k !== "all" && <img src={window.COUNTRY_FLAG[k]} alt=""/>}
                <span>{k === "all" ? "Все" : window.COUNTRY_LABEL[k]}</span>
                <span className="count">{k === "all" ? featured.length : featured.filter(c => c.country === k).length}</span>
              </div>
            ))}
          </div>
          <div className="car-grid">
            {filtered.map(car => <CarCard key={car.id} car={car} onOpen={onOpenCar}/>)}
          </div>
        </div>
      </section>

      {/* PROCESS TEASER */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow-gold">5 шагов · 45 дней</span>
            <h2 style={{ marginTop: 12 }}>Как мы работаем</h2>
          </div>
          <div className="steps">
            {[
              { t: "Подбор", d: "Обсуждаем бюджет, страну, кузов. Подбираем 3–5 вариантов под Вас." },
              { t: "Аукцион", d: "Участвуем в торгах через прямые контракты с японскими и корейскими аукционами." },
              { t: "Логистика", d: "Морская доставка, страхование, отслеживание контейнера в реальном времени." },
              { t: "Растаможка", d: "Все пошлины и сборы рассчитаны заранее. Никаких скрытых платежей." },
              { t: "Передача", d: "Подготовка к учёту в РФ, выдача документов, тест-драйв на нашей площадке." },
            ].map((s, i) => (
              <div className="step" key={i}>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Button variant="dark" size="lg" style={{ background: "var(--accent)" }} icon={<Icon name="phone" size={18}/>}>Позвонить: {window.PHONE}</Button>
          </div>
        </div>
      </section>

      {/* CALCULATOR TEASER */}
      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", display: "block", marginBottom: 12 }}>Калькулятор</span>
              <h2 style={{ marginBottom: 24 }}>Узнайте полную стоимость за&nbsp;1&nbsp;минуту</h2>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 32 }}>
                Аукционная цена, налоги, доставка, услуги&nbsp;— всё в&nbsp;одном расчёте. Никаких звёздочек мелким шрифтом.
              </p>
              <Button variant="primary" size="lg" iconAfter={<Icon name="arrow" size={16}/>} onClick={() => onNav("calculator")}>Рассчитать</Button>
            </div>
            <div style={{ background: "var(--ink-95)", borderRadius: "var(--r-md)", padding: 32, border: "1px solid var(--ink-85)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}><span style={{ color: "var(--fg-muted)" }}>Аукционная цена</span><span style={{ fontFamily: "var(--font-mono)", fontFeatureSettings: "'tnum' 1" }}>1 850 000 ₽</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}><span style={{ color: "var(--fg-muted)" }}>Доставка и страхование</span><span style={{ fontFamily: "var(--font-mono)" }}>180 000 ₽</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}><span style={{ color: "var(--fg-muted)" }}>Растаможка</span><span style={{ fontFamily: "var(--font-mono)" }}>240 000 ₽</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}><span style={{ color: "var(--fg-muted)" }}>Услуги «Восток»</span><span style={{ fontFamily: "var(--font-mono)" }}>80 000 ₽</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Итого под ключ</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent)", letterSpacing: "0.01em" }}>2 350 000 ₽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section-tight section-dark" style={{ background: "var(--ink-05)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow-gold">Звонок бесплатный · ежедневно 9–21</span>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: "0.02em", marginTop: 8, color: "#fff" }}>{window.PHONE}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="primary" size="lg" icon={<Icon name="phone" size={18}/>}>Позвонить</Button>
            <Button variant="secondary" size="lg" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>Заказать звонок</Button>
          </div>
        </div>
      </section>
    </main>
  );
};

window.Home = Home;
