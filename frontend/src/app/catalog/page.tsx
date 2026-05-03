"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CarCard from "@/components/CarCard";
import { Car, COUNTRY_LABEL } from "@/lib/types";
import { getCars } from "@/lib/api";

const COUNTRIES = ["all", "japan", "china", "korea"] as const;
const BODIES = ["Седан", "Кроссовер", "Внедорожник", "Минивэн", "Хэтчбэк", "Лифтбек", "Универсал", "Фургон"];
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель"];

const PAGE_SIZE = 60;

interface BrandItem { brand: string; count: number; }
interface Counts { total: number; by_country: Record<string, number>; }

export default function CatalogPage() {
  const [cars, setCars]         = useState<Car[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [counts, setCounts]     = useState<Counts | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [brands, setBrands]     = useState<BrandItem[]>([]);
  const [brandSearch, setBrandSearch] = useState("");

  const [country, setCountry] = useState<string>("all");
  const [body, setBody]       = useState<string>("");
  const [fuel, setFuel]       = useState<string>("");
  const [brand, setBrand]     = useState<string>("");
  const [sort, setSort]       = useState("popular");

  const totalPages = counts ? Math.max(1, Math.ceil(counts.total / PAGE_SIZE)) : 1;
  const activeFilters = (body ? 1 : 0) + (fuel ? 1 : 0) + (brand ? 1 : 0);

  const filteredBrands = brandSearch
    ? brands.filter(b => b.brand.toLowerCase().includes(brandSearch.toLowerCase()))
    : brands;

  function buildParams(p: number): Record<string, string> {
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String((p - 1) * PAGE_SIZE),
    };
    if (country !== "all") params.country = country;
    if (body) params.body = body;
    if (fuel) params.fuel = fuel;
    if (brand) params.brand = brand;
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
  }, [country, body, fuel, brand, sort]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [country, body, fuel, brand, sort]);

  useEffect(() => { load(page); }, [page]);

  // Fetch counts
  useEffect(() => {
    const p = new URLSearchParams();
    if (country !== "all") p.set("country", country);
    if (body) p.set("body", body);
    if (fuel) p.set("fuel", fuel);
    if (brand) p.set("brand", brand);
    fetch(`/api/cars-count?${p}`).then(r => r.json()).then(setCounts).catch(() => {});
  }, [country, body, fuel, brand]);

  // Fetch brands list when country changes
  useEffect(() => {
    const p = country !== "all" ? `?country=${country}` : "";
    fetch(`/api/cars-brands${p}`).then(r => r.json()).then(setBrands).catch(() => {});
    setBrand("");
    setBrandSearch("");
  }, [country]);

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
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 48, flexWrap: "wrap" }}>
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

  return (
    <main>
      <section style={{ padding: "48px 0 24px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Каталог</span>
          <h1>{counts ? counts.total.toLocaleString("ru") : "—"} автомобилей</h1>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">

          <div className="country-tabs">
            {COUNTRIES.map(k => (
              <button key={k} className={`country-tab${country === k ? " active" : ""}`} onClick={() => setCountry(k)}>
                {k !== "all" && <img src={`/flags/${k}.svg`} alt={k} width={24} height={16}/>}
                <span>{k === "all" ? "Все" : COUNTRY_LABEL[k]}</span>
                {counts && (
                  <span className="tab-count">
                    {k === "all" ? counts.total : (counts.by_country[k] ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setFilterOpen(o => !o)} className="filter-toggle">
            <span>Фильтры{activeFilters > 0 ? ` · ${activeFilters}` : ""}</span>
            <span>{filterOpen ? "↑" : "↓"}</span>
          </button>

          <div className="catalog-layout">
            <aside className={`filter-panel${filterOpen ? " filter-panel-open" : ""}`}>

              {/* Brand filter */}
              <div className="filter-section">
                <h5>Марка</h5>
                {brand && (
                  <div style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => setBrand("")}
                      style={{ fontSize: 13, color: "var(--accent)", background: "rgba(200,164,92,0.1)", border: "1px solid rgba(200,164,92,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                    >
                      {brand} ✕
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Поиск марки..."
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-soft)", background: "rgba(255,255,255,0.05)", color: "var(--ink-10)", fontSize: 13, outline: "none", fontFamily: "var(--font-sans)", marginBottom: 8 }}
                />
                <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                  {filteredBrands.slice(0, 50).map(b => (
                    <label key={b.brand} className="filter-check">
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="radio" name="brand" checked={brand === b.brand} onChange={() => setBrand(brand === b.brand ? "" : b.brand)}/>
                        {b.brand}
                      </span>
                      <span className="filter-count">{b.count}</span>
                    </label>
                  ))}
                  {filteredBrands.length === 0 && (
                    <span style={{ fontSize: 13, color: "var(--fg-muted)", padding: "4px 0" }}>Не найдено</span>
                  )}
                </div>
              </div>

              <div className="filter-section">
                <h5>Тип кузова</h5>
                {BODIES.map(b => (
                  <label key={b} className="filter-check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={body === b} onChange={() => setBody(body === b ? "" : b)}/>
                      {b}
                    </span>
                  </label>
                ))}
              </div>

              <div className="filter-section">
                <h5>Тип двигателя</h5>
                {FUELS.map(f => (
                  <label key={f} className="filter-check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={fuel === f} onChange={() => setFuel(fuel === f ? "" : f)}/>{f}
                    </span>
                  </label>
                ))}
              </div>

              <div className="filter-section">
                <h5>Сортировка</h5>
                <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="popular">Сначала популярные</option>
                  <option value="price-asc">Сначала дешевле</option>
                  <option value="price-desc">Сначала дороже</option>
                  <option value="year">Сначала новее</option>
                </select>
              </div>

              {activeFilters > 0 && (
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
                  onClick={() => { setBody(""); setFuel(""); setBrand(""); setBrandSearch(""); }}
                >
                  Сбросить фильтры
                </button>
              )}
            </aside>

            <div>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>
                  Страница <strong style={{ color: "var(--ink-10)" }}>{page}</strong> из <strong style={{ color: "var(--ink-10)" }}>{totalPages}</strong>
                  {counts && <span> · {counts.total.toLocaleString("ru")} авто</span>}
                </span>
              </div>

              {loading
                ? <p style={{ color: "var(--fg-muted)", padding: "32px 0" }}>Загрузка...</p>
                : <div className="car-grid">{cars.map(c => <CarCard key={c.id} car={c}/>)}</div>
              }

              {renderPagination()}
            </div>
          </div>
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
