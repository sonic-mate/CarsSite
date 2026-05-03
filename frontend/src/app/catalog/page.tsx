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
  const [brand,      setBrand]      = useState<string>("");
  const [body,       setBody]       = useState<string>("");
  const [fuel,       setFuel]       = useState<string>("");
  const [yearMin,    setYearMin]    = useState<string>("");
  const [yearMax,    setYearMax]    = useState<string>("");
  const [priceMin,   setPriceMin]   = useState<string>("");
  const [priceMax,   setPriceMax]   = useState<string>("");
  const [mileageMax, setMileageMax] = useState<string>("");
  const [sort,       setSort]       = useState("popular");

  // pending values — applied only on "Показать предложения"
  const [pBrand,      setPBrand]      = useState<string>("");
  const [pBody,       setPBody]       = useState<string>("");
  const [pFuel,       setPFuel]       = useState<string>("");
  const [pYearMin,    setPYearMin]    = useState<string>("");
  const [pYearMax,    setPYearMax]    = useState<string>("");
  const [pPriceMin,   setPPriceMin]   = useState<string>("");
  const [pPriceMax,   setPPriceMax]   = useState<string>("");
  const [pMileageMax, setPMileageMax] = useState<string>("");
  const [pSort,       setPSort]       = useState("popular");

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
                <svg width="340" height="220" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Track surface glow */}
                  <ellipse cx="170" cy="110" rx="155" ry="95" fill="rgba(200,164,92,0.04)"/>

                  {/* Outer track boundary */}
                  <path d="M 50 60 Q 50 20 100 20 L 240 20 Q 290 20 290 60 L 290 120 Q 290 160 255 170 L 220 180 Q 200 190 170 190 Q 140 190 120 180 L 85 170 Q 50 160 50 120 Z"
                    fill="none" stroke="rgba(200,164,92,0.25)" strokeWidth="2"/>

                  {/* Inner track boundary — creates the track corridor */}
                  <path d="M 90 70 Q 90 50 115 50 L 225 50 Q 250 50 250 70 L 250 115 Q 250 140 228 148 L 205 155 Q 185 162 170 162 Q 155 162 135 155 L 112 148 Q 90 140 90 115 Z"
                    fill="rgba(13,15,20,0.6)" stroke="rgba(200,164,92,0.2)" strokeWidth="1.5"/>

                  {/* Track surface between outer and inner */}
                  <path d="M 50 60 Q 50 20 100 20 L 240 20 Q 290 20 290 60 L 290 120 Q 290 160 255 170 L 220 180 Q 200 190 170 190 Q 140 190 120 180 L 85 170 Q 50 160 50 120 Z"
                    fill="rgba(30,35,45,0.7)"/>
                  <path d="M 90 70 Q 90 50 115 50 L 225 50 Q 250 50 250 70 L 250 115 Q 250 140 228 148 L 205 155 Q 185 162 170 162 Q 155 162 135 155 L 112 148 Q 90 140 90 115 Z"
                    fill="rgba(13,15,20,0.9)"/>

                  {/* Track centerline dashes */}
                  <path d="M 70 40 Q 70 35 80 35 L 100 35" stroke="rgba(200,164,92,0.35)" strokeWidth="1" strokeDasharray="8 6" fill="none"/>
                  <path d="M 170 35 L 220 35" stroke="rgba(200,164,92,0.35)" strokeWidth="1" strokeDasharray="8 6" fill="none"/>
                  <path d="M 270 60 L 270 110" stroke="rgba(200,164,92,0.35)" strokeWidth="1" strokeDasharray="8 6" fill="none"/>
                  <path d="M 230 175 Q 200 182 170 182" stroke="rgba(200,164,92,0.35)" strokeWidth="1" strokeDasharray="8 6" fill="none"/>
                  <path d="M 70 120 L 70 80" stroke="rgba(200,164,92,0.35)" strokeWidth="1" strokeDasharray="8 6" fill="none"/>

                  {/* Start/finish line */}
                  <rect x="155" y="20" width="30" height="8" fill="rgba(200,164,92,0.5)" rx="1"/>
                  <rect x="155" y="20" width="5" height="4" fill="rgba(200,164,92,0.9)"/>
                  <rect x="165" y="24" width="5" height="4" fill="rgba(200,164,92,0.9)"/>
                  <rect x="175" y="20" width="5" height="4" fill="rgba(200,164,92,0.9)"/>

                  {/* Car body (top-down view) on track, near start */}
                  <g transform="translate(158, 30) rotate(0)">
                    {/* Car shadow */}
                    <ellipse cx="12" cy="12" rx="13" ry="7" fill="rgba(0,0,0,0.5)" transform="translate(1,3)"/>
                    {/* Car body */}
                    <rect x="2" y="3" width="20" height="36" rx="5" fill="#c8a45c"/>
                    {/* Roof */}
                    <rect x="5" y="10" width="14" height="18" rx="3" fill="#a8884a"/>
                    {/* Windshield front */}
                    <rect x="5" y="9" width="14" height="7" rx="2" fill="rgba(150,200,255,0.7)"/>
                    {/* Windshield rear */}
                    <rect x="5" y="25" width="14" height="5" rx="2" fill="rgba(150,200,255,0.5)"/>
                    {/* Headlights */}
                    <rect x="3" y="3" width="5" height="3" rx="1" fill="rgba(255,240,180,0.9)"/>
                    <rect x="16" y="3" width="5" height="3" rx="1" fill="rgba(255,240,180,0.9)"/>
                    {/* Taillights */}
                    <rect x="3" y="36" width="5" height="3" rx="1" fill="rgba(255,80,80,0.9)"/>
                    <rect x="16" y="36" width="5" height="3" rx="1" fill="rgba(255,80,80,0.9)"/>
                    {/* Wheels */}
                    <rect x="0" y="7" width="4" height="8" rx="2" fill="#1a1e26" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <rect x="20" y="7" width="4" height="8" rx="2" fill="#1a1e26" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <rect x="0" y="27" width="4" height="8" rx="2" fill="#1a1e26" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    <rect x="20" y="27" width="4" height="8" rx="2" fill="#1a1e26" stroke="rgba(200,164,92,0.6)" strokeWidth="1"/>
                    {/* Speed lines */}
                    <line x1="-8" y1="14" x2="-2" y2="14" stroke="rgba(200,164,92,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="-12" y1="18" x2="-2" y2="18" stroke="rgba(200,164,92,0.4)" strokeWidth="1" strokeLinecap="round"/>
                    <line x1="-8" y1="22" x2="-2" y2="22" stroke="rgba(200,164,92,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                  </g>

                  {/* Track kerbs — corner markers */}
                  <rect x="50" y="55" width="8" height="5" rx="1" fill="rgba(200,164,92,0.5)"/>
                  <rect x="282" y="55" width="8" height="5" rx="1" fill="rgba(200,164,92,0.5)"/>
                  <rect x="282" y="118" width="8" height="5" rx="1" fill="rgba(200,164,92,0.5)"/>
                  <rect x="50" y="118" width="8" height="5" rx="1" fill="rgba(200,164,92,0.5)"/>

                  {/* Ambient glow dots */}
                  <circle cx="80" cy="40" r="2" fill="rgba(200,164,92,0.4)"/>
                  <circle cx="260" cy="40" r="2" fill="rgba(200,164,92,0.4)"/>
                  <circle cx="260" cy="155" r="2" fill="rgba(200,164,92,0.4)"/>
                  <circle cx="80" cy="155" r="2" fill="rgba(200,164,92,0.4)"/>
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
