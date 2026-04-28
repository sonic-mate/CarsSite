"use client";

import { useState } from "react";
import { calculate } from "@/lib/api";
import { COUNTRY_LABEL, PHONE, formatPrice } from "@/lib/types";
import Icon from "@/components/Icon";

const COUNTRIES = ["japan", "china", "korea"] as const;
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель"] as const;
const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

export default function CalculatorPage() {
  const [country, setCountry] = useState("japan");
  const [auctionPrice, setAuctionPrice] = useState(1850000);
  const [engineCC, setEngineCC] = useState(2500);
  const [year, setYear] = useState(2021);
  const [fuel, setFuel] = useState("Бензин");
  const [result, setResult] = useState({
    auction_price: 1850000,
    delivery: 180000,
    customs: 369000,
    services: 80000,
    total: 2479000,
  });

  const recalc = async (overrides: Partial<typeof result> = {}) => {
    try {
      const r = await calculate({ country, auction_price: auctionPrice, engine_cc: engineCC, year, fuel_type: fuel, ...overrides as any });
      setResult(r);
    } catch {}
  };

  return (
    <main>
      <section style={{ padding: "64px 0 48px" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Калькулятор</span>
          <h1 style={{ marginBottom: 16 }}>СТОИМОСТЬ ПОД КЛЮЧ</h1>
          <p style={{ fontSize: 18, color: "var(--fg-soft)", maxWidth: "60ch", marginBottom: 48 }}>
            Введите параметры автомобиля&nbsp;— получите полный расчёт. Все пошлины, доставка и&nbsp;услуги уже включены.
          </p>

          <div className="calc-grid">
            <div className="calc-card">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label className="field-label">Страна</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {COUNTRIES.map(k => (
                      <button
                        key={k}
                        className={`chip${country === k ? " active" : ""}`}
                        onClick={() => { setCountry(k); recalc(); }}
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        <img src={`/flags/${k}.svg`} alt={k} width={18} height={12}/>
                        {COUNTRY_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Аукционная цена, ₽</label>
                  <input
                    className="input" type="number" value={auctionPrice}
                    onChange={e => setAuctionPrice(+e.target.value || 0)}
                    onBlur={() => recalc()}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="field">
                    <label className="field-label">Объём двигателя, см³</label>
                    <input
                      className="input" type="number" value={engineCC}
                      onChange={e => setEngineCC(+e.target.value || 0)}
                      onBlur={() => recalc()}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Год выпуска</label>
                    <select className="select" value={year} onChange={e => { setYear(+e.target.value); recalc(); }}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Тип топлива</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {FUELS.map(t => (
                      <button
                        key={t}
                        className={`chip${fuel === t ? " active" : ""}`}
                        onClick={() => { setFuel(t); recalc(); }}
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-dark btn-block btn-lg" onClick={() => recalc()}>
                  Рассчитать
                </button>
              </div>
            </div>

            <div className="calc-result">
              <span className="eyebrow-gold">Итого под ключ</span>
              <div className="total">{formatPrice(result.total)}</div>
              <div style={{ fontSize: 12, color: "rgba(245,243,238,0.6)", marginBottom: 24 }}>
                ~ {Math.round(result.total / 1000)} тыс ₽ · срок 35–55 дней
              </div>
              <div className="calc-line">
                <span className="k">Аукционная цена</span>
                <span className="v">{formatPrice(result.auction_price)}</span>
              </div>
              <div className="calc-line">
                <span className="k">Доставка и страхование</span>
                <span className="v">{formatPrice(result.delivery)}</span>
              </div>
              <div className="calc-line">
                <span className="k">Растаможка и сборы</span>
                <span className="v">{formatPrice(result.customs)}</span>
              </div>
              <div className="calc-line" style={{ borderBottom: 0 }}>
                <span className="k">Услуги «Восток»</span>
                <span className="v">{formatPrice(result.services)}</span>
              </div>
              <a
                href={`tel:${PHONE.replace(/\s/g, "")}`}
                className="btn btn-primary btn-lg btn-block"
                style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="phone" size={18}/>
                Уточнить расчёт по&nbsp;телефону
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
