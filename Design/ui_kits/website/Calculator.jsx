// Calculator + Process screens
const Calculator = () => {
  const [country, setCountry] = React.useState("japan");
  const [auctionPrice, setAuctionPrice] = React.useState(1850000);
  const [engineCC, setEngineCC] = React.useState(2500);
  const [year, setYear] = React.useState(2021);

  const ageK = year >= 2024 ? 1.0 : year >= 2021 ? 1.1 : 1.25;
  const customs = Math.round(auctionPrice * 0.18 * ageK);
  const delivery = country === "japan" ? 180000 : country === "korea" ? 160000 : 200000;
  const services = 80000;
  const total = auctionPrice + customs + delivery + services;

  return (
    <main data-screen-label="04 Calculator">
      <section style={{ padding: "64px 0 48px" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", display: "block", marginBottom: 12 }}>Калькулятор</span>
          <h1 style={{ fontSize: 64, marginBottom: 16 }}>СТОИМОСТЬ ПОД КЛЮЧ</h1>
          <p style={{ fontSize: 18, color: "var(--fg-soft)", maxWidth: "60ch", marginBottom: 48 }}>
            Введите параметры автомобиля&nbsp;— получите полный расчёт. Все пошлины, доставка и&nbsp;услуги уже включены.
          </p>

          <div className="calc-grid">
            <div className="calc-card">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label className="field-label">Страна</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["japan", "china", "korea"].map(k => (
                      <button key={k} className={"chip" + (country === k ? " active" : "")} onClick={() => setCountry(k)} style={{ flex: 1, justifyContent: "center" }}>
                        <img src={window.COUNTRY_FLAG[k]} alt="" style={{ width: 18, height: 12 }}/>
                        {window.COUNTRY_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Аукционная цена, ₽</label>
                  <input className="input" type="number" value={auctionPrice} onChange={e => setAuctionPrice(+e.target.value || 0)}/>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="field">
                    <label className="field-label">Объём двигателя, см³</label>
                    <input className="input" type="number" value={engineCC} onChange={e => setEngineCC(+e.target.value || 0)}/>
                  </div>
                  <div className="field">
                    <label className="field-label">Год выпуска</label>
                    <select className="select" value={year} onChange={e => setYear(+e.target.value)}>
                      <option value={2024}>2024</option>
                      <option value={2023}>2023</option>
                      <option value={2022}>2022</option>
                      <option value={2021}>2021</option>
                      <option value={2020}>2020</option>
                      <option value={2019}>2019</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Тип топлива</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Бензин", "Гибрид", "Электро", "Дизель"].map(t => (
                      <button key={t} className={"chip" + (t === "Бензин" ? " active" : "")} style={{ flex: 1, justifyContent: "center" }}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="calc-result">
              <span className="eyebrow-gold">Итого под ключ</span>
              <div className="total">{window.formatPrice(total)}</div>
              <div style={{ fontSize: 12, color: "rgba(245,243,238,0.6)", marginBottom: 24 }}>~ {Math.round(total / 1000)} тыс ₽ · срок 35–55 дней</div>
              <div className="calc-line"><span className="k">Аукционная цена</span><span className="v">{window.formatPrice(auctionPrice)}</span></div>
              <div className="calc-line"><span className="k">Доставка и страхование</span><span className="v">{window.formatPrice(delivery)}</span></div>
              <div className="calc-line"><span className="k">Растаможка и сборы</span><span className="v">{window.formatPrice(customs)}</span></div>
              <div className="calc-line" style={{ borderBottom: 0 }}><span className="k">Услуги «Восток»</span><span className="v">{window.formatPrice(services)}</span></div>
              <Button variant="primary" size="lg" block icon={<Icon name="phone" size={18}/>} style={{ marginTop: 20 }}>Уточнить расчёт по&nbsp;телефону</Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

const Process = () => (
  <main data-screen-label="05 Process">
    <section className="section section-dark" style={{ background: "var(--ink-10)" }}>
      <div className="container">
        <div className="section-head" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 64px" }}>
          <span className="eyebrow-gold">5 шагов · 45 дней в среднем</span>
          <h1 style={{ marginTop: 16, fontSize: 96, lineHeight: 0.95 }}>КАК МЫ РАБОТАЕМ</h1>
          <p style={{ marginTop: 24, fontSize: 18, color: "rgba(245,243,238,0.75)" }}>Прозрачный процесс от&nbsp;первого звонка до&nbsp;ключей в&nbsp;руке. Без скрытых платежей и&nbsp;неприятных сюрпризов.</p>
        </div>
        <div className="steps">
          {[
            { t: "Подбор", d: "Обсуждаем бюджет, страну, кузов. Подбираем 3–5 вариантов под Вас, присылаем отчёты с фотографиями и историей.", days: "1–3 дня" },
            { t: "Аукцион", d: "Участвуем в торгах через прямые контракты с японскими и корейскими аукционами. Выкупаем выбранный лот.", days: "3–7 дней" },
            { t: "Логистика", d: "Морская доставка, страхование, отслеживание контейнера в реальном времени. Без посредников.", days: "20–30 дней" },
            { t: "Растаможка", d: "Все пошлины и сборы рассчитаны заранее. Никаких скрытых платежей. Подготовка документов.", days: "5–10 дней" },
            { t: "Передача", d: "Постановка на учёт в РФ, выдача документов, тест-драйв на нашей площадке. Гарантия на документы.", days: "1–2 дня" },
          ].map((s, i) => (
            <div className="step" key={i}>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>{s.days}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </main>
);

Object.assign(window, { Calculator, Process });
