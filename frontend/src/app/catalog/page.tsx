"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CarListCard from "@/components/CarListCard";
import CallbackModal from "@/components/CallbackModal";
import { Car, COUNTRY_LABEL } from "@/lib/types";
import { getCars } from "@/lib/api";

const COUNTRIES = ["all", "japan", "china", "korea"] as const;
const BODIES = ["Все", "Седан", "Кроссовер", "Внедорожник", "Минивэн", "Хэтчбэк", "Лифтбек", "Универсал", "Фургон"];
const FUELS = ["Все", "Бензин", "Гибрид", "Электро", "Дизель"];

const PAGE_SIZE = 60;
const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CUR_YEAR - 1999 }, (_, i) => CUR_YEAR - i);

interface BrandItem { brand: string; count: number; }
interface Counts { total: number; by_country: Record<string, number>; }

function CatalogInner() {
  const searchParams = useSearchParams();

  const [cars, setCars]       = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [counts, setCounts]   = useState<Counts | null>(null);
  const [brands, setBrands]   = useState<BrandItem[]>([]);

  const [country,    setCountry]    = useState<string>(searchParams.get("country") ?? "all");
  const [brand,      setBrand]      = useState<string>(searchParams.get("brand") ?? "");
  const [body,       setBody]       = useState<string>(searchParams.get("body") ?? "");
  const [fuel,       setFuel]       = useState<string>(searchParams.get("fuel") ?? "");
  const [yearMin,    setYearMin]    = useState<string>(searchParams.get("year_min") ?? "");
  const [yearMax,    setYearMax]    = useState<string>(searchParams.get("year_max") ?? "");
  const [priceMin,   setPriceMin]   = useState<string>(searchParams.get("price_min") ?? "");
  const [priceMax,   setPriceMax]   = useState<string>(searchParams.get("price_max") ?? "");
  const [mileageMax, setMileageMax] = useState<string>(searchParams.get("mileage_max") ?? "");
  const [sort,       setSort]       = useState(searchParams.get("sort") ?? "popular");

  // pending values — applied only on "Показать предложения"
  const [pBrand,      setPBrand]      = useState<string>(searchParams.get("brand") ?? "");
  const [pBody,       setPBody]       = useState<string>(searchParams.get("body") ?? "");
  const [pFuel,       setPFuel]       = useState<string>(searchParams.get("fuel") ?? "");
  const [pYearMin,    setPYearMin]    = useState<string>(searchParams.get("year_min") ?? "");
  const [pYearMax,    setPYearMax]    = useState<string>(searchParams.get("year_max") ?? "");
  const [pPriceMin,   setPPriceMin]   = useState<string>(searchParams.get("price_min") ?? "");
  const [pPriceMax,   setPPriceMax]   = useState<string>(searchParams.get("price_max") ?? "");
  const [pMileageMax, setPMileageMax] = useState<string>(searchParams.get("mileage_max") ?? "");
  const [pSort,       setPSort]       = useState(searchParams.get("sort") ?? "popular");

  const totalPages = counts ? Math.max(1, Math.ceil(counts.total / PAGE_SIZE)) : 1;
  const activeFilters = (brand ? 1 : 0) + (body ? 1 : 0) + (fuel ? 1 : 0) +
    (yearMin || yearMax ? 1 : 0) + (priceMin || priceMax ? 1 : 0) + (mileageMax ? 1 : 0);

  function buildParams(p: number): Record<string, string> {
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String((p - 1) * PAGE_SIZE),
    };
    if (country !== "all") params.country = country;
    if (body)       params.body = body;
    if (fuel)       params.fuel = fuel;
    if (brand)      params.brand = brand;
    if (yearMin)    params.year_min = yearMin;
    if (yearMax)    params.year_max = yearMax;
    if (priceMin)   params.price_min = priceMin;
    if (priceMax)   params.price_max = priceMax;
    if (mileageMax) params.mileage_max = mileageMax;
    if (sort !== "popular") params.sort = sort;
    return params;
  }

  const load = useCallback(async (p: number) => {
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const data = await getCars(buildParams(p));
      setCars(data);
    } finally {
      setLoading(false);
    }
  }, [country, body, fuel, brand, yearMin, yearMax, priceMin, priceMax, mileageMax, sort]);

  useEffect(() => {
    const c = searchParams.get("country") ?? "all";
    if (c !== country) setCountry(c);
  }, [searchParams]);

  useEffect(() => { setPage(1); load(1); }, [country, body, fuel, brand, yearMin, yearMax, priceMin, priceMax, mileageMax, sort]);
  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (country !== "all") p.set("country", country);
    if (body)       p.set("body", body);
    if (fuel)       p.set("fuel", fuel);
    if (brand)      p.set("brand", brand);
    if (yearMin)    p.set("year_min", yearMin);
    if (yearMax)    p.set("year_max", yearMax);
    if (priceMin)   p.set("price_min", priceMin);
    if (priceMax)   p.set("price_max", priceMax);
    if (mileageMax) p.set("mileage_max", mileageMax);
    fetch(`/api/cars-count?${p}`).then(r => r.json()).then(setCounts).catch(() => {});
  }, [country, body, fuel, brand, yearMin, yearMax, priceMin, priceMax, mileageMax]);

  useEffect(() => {
    const p = country !== "all" ? `?country=${country}` : "";
    fetch(`/api/cars-brands${p}`).then(r => r.json()).then(setBrands).catch(() => {});
    setBrand(""); setPBrand("");
  }, [country]);

  function applyFilters() {
    setBrand(pBrand); setBody(pBody); setFuel(pFuel);
    setYearMin(pYearMin); setYearMax(pYearMax);
    setPriceMin(pPriceMin); setPriceMax(pPriceMax);
    setMileageMax(pMileageMax); setSort(pSort);
  }

  function resetFilters() {
    setPBrand(""); setPBody(""); setPFuel("");
    setPYearMin(""); setPYearMax("");
    setPPriceMin(""); setPPriceMax("");
    setPMileageMax(""); setPSort("popular");
    setBrand(""); setBody(""); setFuel("");
    setYearMin(""); setYearMax("");
    setPriceMin(""); setPriceMax("");
    setMileageMax(""); setSort("popular");
  }

  function goTo(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  }

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 32, flexWrap: "wrap" }}>
        <button onClick={() => goTo(page - 1)} disabled={page === 1} style={btnStyle(false, page === 1)}>←</button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} style={{ color: "var(--fg-muted)", padding: "0 4px" }}>…</span>
          ) : (
            <button key={p} onClick={() => goTo(p as number)} style={btnStyle(p === page, false)}>{p}</button>
          )
        )}
        <button onClick={() => goTo(page + 1)} disabled={page === totalPages} style={btnStyle(false, page === totalPages)}>→</button>
      </div>
    );
  }

  const pendingActive = (pBrand ? 1:0) + (pBody ? 1:0) + (pFuel ? 1:0) +
    (pYearMin||pYearMax ? 1:0) + (pPriceMin||pPriceMax ? 1:0) + (pMileageMax ? 1:0);

  return (
    <main>
      <section style={{ padding: "40px 0 20px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>Каталог</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
            <h1 style={{ margin: 0 }}>{counts ? counts.total.toLocaleString("ru") : "—"} автомобилей</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COUNTRIES.map(k => (
                <button
                  key={k}
                  onClick={() => setCountry(k)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                    border: `1px solid ${country === k ? "var(--accent)" : "var(--border-soft)"}`,
                    background: country === k ? "var(--accent)" : "transparent",
                    color: country === k ? "#0d0f14" : "var(--ink-10)",
                    fontFamily: "var(--font-sans)", fontWeight: country === k ? 600 : 400,
                  }}
                >
                  {k === "all" ? "Все" : COUNTRY_LABEL[k]}
                  {counts && <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    {k === "all" ? counts.total : (counts.by_country[k] ?? 0)}
                  </span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">

          {/* ── Filter panel ── */}
          <div className="catalog-filter-panel">
            <div className="catalog-filter-grid">

              {/* Row 1 */}
              <select className="filter-select" value={pBrand} onChange={e => setPBrand(e.target.value)}>
                <option value="">Марка</option>
                {brands.map(b => <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>)}
              </select>

              <select className="filter-select" value={pBody} onChange={e => setPBody(e.target.value)}>
                {BODIES.map(b => <option key={b} value={b === "Все" ? "" : b}>{b === "Все" ? "Тип кузова" : b}</option>)}
              </select>

              <select className="filter-select" value={pFuel} onChange={e => setPFuel(e.target.value)}>
                {FUELS.map(f => <option key={f} value={f === "Все" ? "" : f}>{f === "Все" ? "Тип топлива" : f}</option>)}
              </select>

              <div className="filter-range">
                <select className="filter-select" value={pYearMin} onChange={e => setPYearMin(e.target.value)}>
                  <option value="">Год от</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="filter-select" value={pYearMax} onChange={e => setPYearMax(e.target.value)}>
                  <option value="">до</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Row 2 */}
              <div className="filter-range">
                <input className="filter-input" type="number" placeholder="Цена от, ₽" value={pPriceMin} onChange={e => setPPriceMin(e.target.value)}/>
                <input className="filter-input" type="number" placeholder="до" value={pPriceMax} onChange={e => setPPriceMax(e.target.value)}/>
              </div>

              <input className="filter-input" type="number" placeholder="Пробег до, км" value={pMileageMax} onChange={e => setPMileageMax(e.target.value)}/>

              <select className="filter-select" value={pSort} onChange={e => setPSort(e.target.value)}>
                <option value="popular">Сортировка: по умолчанию</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
                <option value="year">Сначала новее</option>
              </select>

              <div className="filter-range" style={{ justifyContent: "flex-end" }}>
                {(activeFilters > 0 || pendingActive > 0) && (
                  <button className="filter-reset" onClick={resetFilters}>
                    Сбросить ×
                  </button>
                )}
                <button className="btn btn-primary" onClick={applyFilters}>
                  Показать предложения
                </button>
              </div>

            </div>
          </div>

          {/* ── Results ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 16px", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-10)" }}>
              {counts?.total.toLocaleString("ru") ?? "—"} <span style={{ fontWeight: 400, color: "var(--fg-muted)" }}>предложений</span>
            </span>
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              Страница <strong style={{ color: "var(--ink-10)" }}>{page}</strong> из <strong style={{ color: "var(--ink-10)" }}>{totalPages}</strong>
            </span>
          </div>

          {loading
            ? <p style={{ color: "var(--fg-muted)", padding: "32px 0" }}>Загрузка...</p>
            : <div className="car-list">{cars.map(c => <CarListCard key={c.id} car={c}/>)}</div>
          }

          {renderPagination()}

          <div className="cta-banner">
            <div className="cta-banner-inner">
              <div className="cta-banner-content">
                <h2>Не нашли нужный автомобиль?</h2>
                <p>Подберём авто со всего рынка индивидуально под ваш запрос</p>
                <CallbackModal triggerClassName="btn btn-primary btn-lg" triggerLabel="Оставить заявку"/>
              </div>
              <div className="cta-banner-img" style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="320" height="210" viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Ambient glow */}
                  <ellipse cx="160" cy="105" rx="140" ry="85" fill="rgba(200,164,92,0.05)"/>

                  {/* ── Magnifying glass ── */}
                  <circle cx="130" cy="95" r="58" fill="rgba(200,164,92,0.06)" stroke="rgba(200,164,92,0.35)" strokeWidth="3"/>
                  <circle cx="130" cy="95" r="50" fill="rgba(13,15,20,0.5)" stroke="rgba(200,164,92,0.15)" strokeWidth="1"/>
                  {/* handle */}
                  <line x1="172" y1="137" x2="200" y2="168" stroke="rgba(200,164,92,0.7)" strokeWidth="7" strokeLinecap="round"/>
                  <line x1="172" y1="137" x2="200" y2="168" stroke="rgba(200,164,92,0.25)" strokeWidth="11" strokeLinecap="round"/>

                  {/* ── Car inside magnifier (side view) ── */}
                  <g transform="translate(88, 80)">
                    {/* Body */}
                    <rect x="0" y="18" width="84" height="26" rx="5" fill="#c8a45c" opacity="0.9"/>
                    {/* Cabin */}
                    <path d="M 14 18 Q 18 4 30 4 L 58 4 Q 70 4 74 18 Z" fill="#a8884a" opacity="0.9"/>
                    {/* Windshield */}
                    <path d="M 18 18 Q 22 8 30 8 L 50 8 Q 58 8 62 18 Z" fill="rgba(150,210,255,0.4)"/>
                    {/* Windows */}
                    <rect x="20" y="8" width="16" height="9" rx="2" fill="rgba(150,210,255,0.3)"/>
                    <rect x="40" y="8" width="16" height="9" rx="2" fill="rgba(150,210,255,0.3)"/>
                    {/* Headlight */}
                    <rect x="76" y="22" width="8" height="5" rx="2" fill="rgba(255,240,160,0.9)"/>
                    {/* Taillight */}
                    <rect x="0" y="22" width="6" height="5" rx="2" fill="rgba(255,80,80,0.8)"/>
                    {/* Wheels */}
                    <circle cx="18" cy="44" r="10" fill="#0d0f14" stroke="rgba(200,164,92,0.7)" strokeWidth="2"/>
                    <circle cx="18" cy="44" r="5" fill="rgba(200,164,92,0.3)"/>
                    <circle cx="66" cy="44" r="10" fill="#0d0f14" stroke="rgba(200,164,92,0.7)" strokeWidth="2"/>
                    <circle cx="66" cy="44" r="5" fill="rgba(200,164,92,0.3)"/>
                    {/* Ground shadow */}
                    <ellipse cx="42" cy="56" rx="36" ry="4" fill="rgba(0,0,0,0.3)"/>
                  </g>

                  {/* ── Criteria checklist (right side) ── */}
                  <g transform="translate(220, 30)">
                    {/* Card bg */}
                    <rect x="0" y="0" width="88" height="130" rx="10" fill="rgba(20,24,32,0.85)" stroke="rgba(200,164,92,0.2)" strokeWidth="1"/>
                    {/* Title bar */}
                    <rect x="0" y="0" width="88" height="22" rx="10" fill="rgba(200,164,92,0.15)"/>
                    <rect x="0" y="11" width="88" height="11" fill="rgba(200,164,92,0.15)"/>
                    <text x="44" y="15" textAnchor="middle" fill="rgba(200,164,92,0.9)" fontSize="8" fontFamily="sans-serif" fontWeight="700">ВАШ ЗАПРОС</text>

                    {/* Row 1 — checked */}
                    <rect x="10" y="32" width="10" height="10" rx="3" fill="rgba(200,164,92,0.2)" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <path d="M 12 37 L 15 40 L 19 34" stroke="#c8a45c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <rect x="26" y="35" width="50" height="4" rx="2" fill="rgba(200,164,92,0.4)"/>
                    <rect x="26" y="35" width="32" height="4" rx="2" fill="rgba(200,164,92,0.6)"/>

                    {/* Row 2 — checked */}
                    <rect x="10" y="50" width="10" height="10" rx="3" fill="rgba(200,164,92,0.2)" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <path d="M 12 55 L 15 58 L 19 52" stroke="#c8a45c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <rect x="26" y="53" width="50" height="4" rx="2" fill="rgba(200,164,92,0.4)"/>
                    <rect x="26" y="53" width="44" height="4" rx="2" fill="rgba(200,164,92,0.6)"/>

                    {/* Row 3 — checked */}
                    <rect x="10" y="68" width="10" height="10" rx="3" fill="rgba(200,164,92,0.2)" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <path d="M 12 73 L 15 76 L 19 70" stroke="#c8a45c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <rect x="26" y="71" width="50" height="4" rx="2" fill="rgba(200,164,92,0.4)"/>
                    <rect x="26" y="71" width="38" height="4" rx="2" fill="rgba(200,164,92,0.6)"/>

                    {/* Row 4 — in progress */}
                    <rect x="10" y="86" width="10" height="10" rx="3" fill="rgba(200,164,92,0.08)" stroke="rgba(200,164,92,0.3)" strokeWidth="1" strokeDasharray="3 2"/>
                    <rect x="26" y="89" width="50" height="4" rx="2" fill="rgba(200,164,92,0.2)"/>
                    <rect x="26" y="89" width="20" height="4" rx="2" fill="rgba(200,164,92,0.45)"/>

                    {/* Row 5 — pending */}
                    <rect x="10" y="104" width="10" height="10" rx="3" fill="rgba(200,164,92,0.08)" stroke="rgba(200,164,92,0.2)" strokeWidth="1" strokeDasharray="3 2"/>
                    <rect x="26" y="107" width="50" height="4" rx="2" fill="rgba(200,164,92,0.15)"/>

                    {/* Bottom match badge */}
                    <rect x="8" y="118" width="72" height="8" rx="4" fill="rgba(138,43,43,0.7)"/>
                    <text x="44" y="124" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontFamily="sans-serif" fontWeight="600">ПОДБОР ЗАВЕРШЁН</text>
                  </g>

                  {/* ── Connecting dots from glass to checklist ── */}
                  <line x1="183" y1="80" x2="218" y2="72" stroke="rgba(200,164,92,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
                  <circle cx="183" cy="80" r="2.5" fill="rgba(200,164,92,0.5)"/>
                  <circle cx="218" cy="72" r="2.5" fill="rgba(200,164,92,0.5)"/>

                  {/* ── Star/sparkle accents ── */}
                  <g opacity="0.6">
                    <path d="M 55 35 L 57 40 L 62 40 L 58 43 L 60 48 L 55 45 L 50 48 L 52 43 L 48 40 L 53 40 Z" fill="rgba(200,164,92,0.3)" stroke="rgba(200,164,92,0.5)" strokeWidth="0.5"/>
                  </g>
                  <circle cx="215" cy="165" r="3" fill="rgba(200,164,92,0.3)"/>
                  <circle cx="70" cy="165" r="2" fill="rgba(200,164,92,0.2)"/>
                  <circle cx="210" cy="25" r="2" fill="rgba(200,164,92,0.3)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<main><div className="container" style={{ padding: "64px 0" }}>Загрузка...</div></main>}>
      <CatalogInner/>
    </Suspense>
  );
}

function btnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    minWidth: 40, height: 40, padding: "0 12px", borderRadius: 8,
    border: `1px solid ${active ? "var(--accent)" : "var(--border-soft)"}`,
    background: active ? "var(--accent)" : "rgba(255,255,255,0.04)",
    color: active ? "#0d0f14" : disabled ? "var(--fg-muted)" : "var(--ink-10)",
    fontWeight: active ? 700 : 400,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: "var(--font-sans)", fontSize: 14, transition: "all 150ms",
  };
}
