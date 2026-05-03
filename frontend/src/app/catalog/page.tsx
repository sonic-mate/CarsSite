"use client";

import { useState, useEffect, useCallback } from "react";
import CarListCard from "@/components/CarListCard";
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

export default function CatalogPage() {
  const [cars, setCars]       = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [counts, setCounts]   = useState<Counts | null>(null);
  const [brands, setBrands]   = useState<BrandItem[]>([]);

  const [country,    setCountry]    = useState<string>("all");
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{counts ? counts.total.toLocaleString("ru") : "—"} автомобилей</h1>
            <div style={{ display: "flex", gap: 8 }}>
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
        </div>
      </section>
    </main>
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
