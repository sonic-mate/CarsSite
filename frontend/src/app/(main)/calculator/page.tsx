"use client";

import { useState, useEffect, useCallback } from "react";
import { calculate } from "@/lib/api";
import { COUNTRY_LABEL, PHONE, formatPrice, BreakdownItem } from "@/lib/types";
import Icon from "@/components/Icon";

const COUNTRIES = ["japan", "korea", "china"] as const;
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель", "Газ"] as const;
const YEARS = Array.from({ length: 22 }, (_, i) => 2026 - i);

const CURRENCIES = [
  { code: "RUB", sym: "₽", label: "RUB" },
  { code: "JPY", sym: "¥", label: "JPY" },
  { code: "KRW", sym: "₩", label: "KRW" },
  { code: "CNY", sym: "¥", label: "CNY" },
] as const;

const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  japan: "JPY",
  korea: "KRW",
  china: "CNY",
};

interface Rates { jpy_to_rub: number; krw_to_rub: number; cny_to_rub: number; }
interface CityItem { id: number; city_name: string; cost_rub: number; }

function toRub(amount: number, currency: string, rates: Rates): number {
  if (currency === "JPY") return Math.round(amount * rates.jpy_to_rub);
  if (currency === "KRW") return Math.round(amount * rates.krw_to_rub);
  if (currency === "CNY") return Math.round(amount * rates.cny_to_rub);
  return amount;
}

function formatLocalAmount(amount: number, currency: string): string {
  if (currency === "RUB") return formatPrice(amount);
  const sym = CURRENCIES.find(c => c.code === currency)?.sym ?? "";
  return sym + " " + amount.toLocaleString("ru-RU");
}

export default function CalculatorPage() {
  const [country, setCountry] = useState<"japan" | "korea" | "china">("japan");
  const [priceInput, setPriceInput] = useState("");
  const [currency, setCurrency] = useState(COUNTRY_DEFAULT_CURRENCY["japan"]);
  const [engineCC, setEngineCC] = useState("");
  const [power, setPower] = useState("");
  const [year, setYear] = useState("");
  const [fuel, setFuel] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<CityItem[]>([]);
  const [rates, setRates] = useState<Rates>({ jpy_to_rub: 0.47, krw_to_rub: 0.051, cny_to_rub: 11.0 });
  const [result, setResult] = useState<{
    auction_price: number; delivery: number; customs: number;
    customs_fee: number; services: number; total: number;
    eur_rate?: number; price_eur?: number; customs_method?: string;
    items?: BreakdownItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tariffs").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setRates({ jpy_to_rub: d.jpy_to_rub, krw_to_rub: d.krw_to_rub, cny_to_rub: d.cny_to_rub });
    }).catch(() => {});
    fetch("/api/cities").then(r => r.ok ? r.json() : []).then(setCities).catch(() => {});
  }, []);

  const recalc = useCallback(async (overrides: {
    country?: string; priceInput?: string; currency?: string;
    engineCC?: string; power?: string; year?: string; fuel?: string; city?: string;
  } = {}) => {
    const c = overrides.country ?? country;
    const pi = +(overrides.priceInput ?? priceInput) || 0;
    const cur = overrides.currency ?? currency;
    const cc = +(overrides.engineCC ?? engineCC) || 0;
    const pw = +(overrides.power ?? power) || 0;
    const y = overrides.year ?? year;
    const f = overrides.fuel ?? fuel;
    const ct = overrides.city ?? city;
    if (pi <= 0 || !y || !f) return;
    setLoading(true);
    try {
      const r = await calculate({ country: c, auction_price: pi, currency: cur, engine_cc: cc, power_hp: pw, year: +y, fuel_type: f, city: ct || undefined });
      setResult(r);
    } catch {}
    setLoading(false);
  }, [country, priceInput, currency, engineCC, power, year, fuel, city, rates]);

  function handleCountryChange(k: "japan" | "korea" | "china") {
    const newCur = COUNTRY_DEFAULT_CURRENCY[k];
    setCountry(k);
    setCurrency(newCur);
    recalc({ country: k, currency: newCur });
  }

  const auctionPriceRub = +priceInput > 0 ? toRub(+priceInput, currency, rates) : 0;

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

                {/* Country */}
                <div className="field">
                  <label className="field-label">Страна</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {COUNTRIES.map(k => (
                      <button
                        key={k}
                        className={`chip${country === k ? " active" : ""}`}
                        onClick={() => handleCountryChange(k)}
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        <img src={`/flags/${k}.svg`} alt={k} width={18} height={12}/>
                        {COUNTRY_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price + currency — moved to top */}
                <div className="field">
                  <label className="field-label">Стоимость авто на аукционе</label>
                  <div className="input-currency-wrap">
                    <input
                      className="input input-with-select" type="number" min={0}
                      value={priceInput}
                      placeholder="0"
                      onChange={e => setPriceInput(e.target.value)}
                      onBlur={() => recalc()}
                    />
                    <select
                      className="input-currency-select"
                      value={currency}
                      onChange={e => { setCurrency(e.target.value); recalc({ currency: e.target.value }); }}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  {currency !== "RUB" && auctionPriceRub > 0 && (
                    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>
                      ≈ {formatPrice(auctionPriceRub)} по курсу ЦБ
                    </div>
                  )}
                </div>

                {/* Year */}
                <div className="field">
                  <label className="field-label">Год выпуска</label>
                  <select className="select" value={year} onChange={e => { setYear(e.target.value); recalc({ year: e.target.value }); }}>
                    <option value="">Выберите год</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {/* Fuel */}
                <div className="field">
                  <label className="field-label">Тип двигателя</label>
                  <select className="select" value={fuel} onChange={e => { setFuel(e.target.value); recalc({ fuel: e.target.value }); }}>
                    <option value="">Выберите тип</option>
                    {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Engine CC + Power */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="field">
                    <label className="field-label">Объём двигателя</label>
                    <div className="input-unit-wrap">
                      <input
                        className="input input-unit" type="number" min={0} max={10000}
                        value={engineCC}
                        placeholder="0"
                        onChange={e => setEngineCC(e.target.value)}
                        onBlur={() => recalc()}
                      />
                      <span className="input-unit-label">см³</span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Мощность</label>
                    <div className="input-unit-wrap">
                      <input
                        className="input input-unit" type="number" min={0} max={2000}
                        value={power}
                        placeholder="0"
                        onChange={e => setPower(e.target.value)}
                        onBlur={() => recalc()}
                      />
                      <span className="input-unit-label">л.с.</span>
                    </div>
                  </div>
                </div>

                {/* City */}
                <div className="field">
                  <label className="field-label">Город доставки</label>
                  <select className="select" value={city} onChange={e => { setCity(e.target.value); recalc({ city: e.target.value }); }}>
                    <option value="">Выберите город</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.city_name}>
                        {c.city_name}{c.cost_rub > 0 ? ` (+${formatPrice(c.cost_rub)})` : " (бесплатно)"}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="btn btn-dark btn-block btn-lg" onClick={() => recalc()} disabled={loading}>
                  {loading ? "Считаем…" : "Рассчитать"}
                </button>
              </div>
            </div>

            <div className="calc-result">
              <span className="eyebrow-gold">Итого под ключ</span>
              <div className="total">{result ? formatPrice(result.total) : "—"}</div>
              <div style={{ fontSize: 12, color: "rgba(245,243,238,0.6)", marginBottom: 24 }}>
                срок доставки 35–55 дней
              </div>

              {result && (<>
                {result.items && result.items.length > 0 ? (
                  result.items.map((item, idx) => (
                    <div key={item.label} className="calc-line" style={idx === result.items!.length - 1 ? { borderBottom: 0 } : {}}>
                      <span className="k">{item.label}</span>
                      <span className="v">
                        {item.label === "Цена аукциона" && currency !== "RUB"
                          ? formatLocalAmount(+priceInput, currency) + " / " + formatPrice(item.value)
                          : item.value_local && item.local_currency
                            ? formatLocalAmount(item.value_local, item.local_currency) + " / " + formatPrice(item.value)
                            : formatPrice(item.value)}
                      </span>
                    </div>
                  ))
                ) : (<>
                  <div className="calc-line">
                    <span className="k">Аукционная цена</span>
                    <span className="v">
                      {currency !== "RUB" ? formatLocalAmount(+priceInput, currency) + " / " : ""}
                      {formatPrice(result.auction_price)}
                    </span>
                  </div>
                  <div className="calc-line">
                    <span className="k">Доставка</span>
                    <span className="v">{formatPrice(result.delivery)}</span>
                  </div>
                  <div className="calc-line">
                    <span className="k">Таможенная пошлина</span>
                    <span className="v">{formatPrice(result.customs)}</span>
                  </div>
                  <div className="calc-line" style={{ borderBottom: 0 }}>
                    <span className="k">Услуги</span>
                    <span className="v">{formatPrice(result.services)}</span>
                  </div>
                </>)}

                {(result.eur_rate || result.customs_method) && (
                  <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(245,243,238,0.05)", borderRadius: "var(--r-sm)", border: "1px solid rgba(200,164,92,0.15)" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600, marginBottom: 10 }}>
                      Детали расчёта
                    </div>
                    {result.eur_rate && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(245,243,238,0.08)" }}>
                        <span style={{ color: "rgba(245,243,238,0.55)" }}>Курс EUR/RUB (ЦБ)</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "rgba(245,243,238,0.85)" }}>{result.eur_rate.toFixed(2)} ₽</span>
                      </div>
                    )}
                    {result.price_eur != null && result.price_eur > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
                        <span style={{ color: "rgba(245,243,238,0.55)" }}>Цена в EUR</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "rgba(245,243,238,0.85)" }}>≈ {result.price_eur?.toLocaleString("ru-RU")} €</span>
                      </div>
                    )}
                  </div>
                )}
              </>)}

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
