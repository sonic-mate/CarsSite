"use client";

import { useState, useEffect, useCallback } from "react";
import CarCard from "@/components/CarCard";
import { Car, COUNTRY_LABEL } from "@/lib/types";
import { getCars } from "@/lib/api";

const COUNTRIES = ["all", "japan", "china", "korea"] as const;
const BODIES = ["Седан", "Кроссовер", "Внедорожник", "Минивэн", "Хэтчбэк", "Лифтбек", "Универсал", "Фургон"];
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель"];

const PAGE_SIZE = 60;

export default function CatalogPage() {
  const [cars, setCars]             = useState<Car[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [counts, setCounts]         = useState<{ total: number; by_country: Record<string, number> } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [country, setCountry] = useState<string>("all");
  const [body, setBody]       = useState<string>("");
  const [fuel, setFuel]       = useState<string>("");
  const [sort, setSort]       = useState("popular");

  function buildParams(offset = 0): Record<string, string> {
    const p: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String(offset),
    };
    if (country !== "all") p.country = country;
    if (body) p.body = body;
    if (fuel) p.fuel = fuel;
    if (sort !== "popular") p.sort = sort;
    return p;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCars(buildParams(0));
      setCars(data);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [country, body, fuel, sort]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await getCars(buildParams(cars.length));
      setCars(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  // Fetch counts for tab badges
  useEffect(() => {
    const p = new URLSearchParams();
    if (body) p.set("body", body);
    if (fuel) p.set("fuel", fuel);
    fetch(`/api/cars-count?${p}`)
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {});
  }, [body, fuel]);

  useEffect(() => { load(); }, [load]);

  const activeFilters = (body ? 1 : 0) + (fuel ? 1 : 0);

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
                  onClick={() => { setBody(""); setFuel(""); }}
                >
                  Сбросить фильтры
                </button>
              )}
            </aside>

            <div>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>
                  Показано: <strong style={{ color: "var(--ink-10)" }}>{cars.length}</strong>
                  {hasMore && <span style={{ color: "var(--fg-muted)" }}> из {counts?.total.toLocaleString("ru") ?? "..."}</span>}
                </span>
              </div>
              {loading && <p style={{ color: "var(--fg-muted)", padding: "32px 0" }}>Загрузка...</p>}
              <div className="car-grid">
                {!loading && cars.map(c => <CarCard key={c.id} car={c}/>)}
              </div>
              {!loading && hasMore && (
                <div style={{ textAlign: "center", marginTop: 40 }}>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Загрузка..." : "Показать ещё"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
