"use client";

import { useState, useEffect, useCallback } from "react";
import CarCard from "@/components/CarCard";
import { Car, COUNTRY_LABEL } from "@/lib/types";
import { getCars } from "@/lib/api";

const COUNTRIES = ["all", "japan", "china", "korea"] as const;
const BODIES = ["Седан", "Кроссовер", "Внедорожник", "Лифтбек"];
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель"];
const PAGE_SIZE = 20;

export default function CatalogPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [country, setCountry] = useState<string>("all");
  const [bodies, setBodies] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState("popular");

  const buildParams = useCallback((p: number) => {
    const params: Record<string, string> = { page: String(p), limit: String(PAGE_SIZE), sort };
    if (country !== "all") params.country = country;
    return params;
  }, [country, sort]);

  // Initial load and filter change → reset to page 1
  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    getCars(buildParams(1))
      .then(data => {
        setCars(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .finally(() => setLoading(false));
  }, [country, sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    getCars(buildParams(nextPage))
      .then(data => {
        setCars(prev => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  };

  const toggleBody = (b: string) => {
    const next = new Set(bodies);
    next.has(b) ? next.delete(b) : next.add(b);
    setBodies(next);
  };

  const filtered = bodies.size ? cars.filter(c => bodies.has(c.body)) : cars;

  return (
    <main>
      <section style={{ padding: "48px 0 24px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Каталог</span>
          <h1>{filtered.length} автомобилей</h1>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">

          <div className="country-tabs">
            {COUNTRIES.map(k => (
              <button key={k} className={`country-tab${country === k ? " active" : ""}`} onClick={() => setCountry(k)}>
                {k !== "all" && <img src={`/flags/${k}.svg`} alt={k} width={24} height={16}/>}
                <span>{k === "all" ? "Все" : COUNTRY_LABEL[k]}</span>
              </button>
            ))}
          </div>

          <div className="catalog-layout">
            <aside className="filter-panel">
              <div className="filter-section">
                <h5>Тип кузова</h5>
                {BODIES.map(b => (
                  <label key={b} className="filter-check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={bodies.has(b)} onChange={() => toggleBody(b)}/>
                      {b}
                    </span>
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <h5>Тип двигателя</h5>
                {FUELS.map(t => (
                  <label key={t} className="filter-check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox"/>{t}
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
            </aside>

            <div>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>
                  Найдено: <strong style={{ color: "var(--ink-10)" }}>{filtered.length}</strong>
                </span>
              </div>
              {loading && <p style={{ color: "var(--fg-muted)", padding: "32px 0" }}>Загрузка...</p>}
              <div className="car-grid">
                {!loading && filtered.map(c => <CarCard key={c.id} car={c}/>)}
              </div>
              {!loading && hasMore && (
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  <button className="btn btn-dark" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Загрузка..." : "Загрузить ещё"}
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
