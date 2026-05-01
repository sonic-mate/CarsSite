"use client";

import { useState, useEffect } from "react";
import CarCard from "@/components/CarCard";
import { Car, COUNTRY_LABEL } from "@/lib/types";
import { getCars } from "@/lib/api";

const COUNTRIES = ["all", "japan", "china", "korea"] as const;
const BODIES = ["Седан", "Кроссовер", "Внедорожник", "Лифтбек", "Минивэн", "Универсал", "Хэтчбэк"];
const FUELS = ["Бензин", "Гибрид", "Электро", "Дизель"];

const BODY_KEYWORDS: Record<string, string[]> = {
  "Седан":       ["седан", "sedan", "3box"],
  "Кроссовер":   ["кроссов", "crossover", "x-over"],
  "Внедорожник": ["внедор", "suv", "4wd", "offroad"],
  "Лифтбек":     ["лифтбек", "liftback", "lift back"],
  "Минивэн":     ["минив", "minivan", "mini van", "mpv", "van"],
  "Универсал":   ["универс", "wagon", "wgn", "estate", "touring"],
  "Хэтчбэк":    ["хэтчб", "hatchback", "hatch", " hb"],
};

function matchBody(carBody: string, filter: string): boolean {
  if (carBody === filter) return true;
  const b = carBody.toLowerCase();
  const keywords = BODY_KEYWORDS[filter] ?? [];
  return keywords.some(k => b.includes(k));
}

export default function CatalogPage() {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string>("all");
  const [bodies, setBodies] = useState<Set<string>>(new Set());
  const [fuels, setFuels] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState("popular");

  useEffect(() => {
    setLoading(true);
    getCars()
      .then(setAllCars)
      .finally(() => setLoading(false));
  }, []);

  let cars = [...allCars];
  if (country !== "all") cars = cars.filter(c => c.country === country);
  if (bodies.size) cars = cars.filter(c => [...bodies].some(b => matchBody(c.body, b)));
  if (fuels.size) cars = cars.filter(c => [...fuels].some(f => c.engine.includes(f)));
  if (sort === "price-asc") cars.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") cars.sort((a, b) => b.price - a.price);
  if (sort === "year") cars.sort((a, b) => b.year - a.year);

  const toggleBody = (b: string) => {
    const next = new Set(bodies);
    next.has(b) ? next.delete(b) : next.add(b);
    setBodies(next);
  };

  const toggleFuel = (f: string) => {
    const next = new Set(fuels);
    next.has(f) ? next.delete(f) : next.add(f);
    setFuels(next);
  };

  return (
    <main>
      <section style={{ padding: "48px 0 24px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Каталог</span>
          <h1>{cars.length} автомобилей</h1>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">

          <div className="country-tabs">
            {COUNTRIES.map(k => (
              <button key={k} className={`country-tab${country === k ? " active" : ""}`} onClick={() => setCountry(k)}>
                {k !== "all" && <img src={`/flags/${k}.svg`} alt={k} width={24} height={16}/>}
                <span>{k === "all" ? "Все" : COUNTRY_LABEL[k]}</span>
                <span className="tab-count">
                  {k === "all" ? allCars.length : allCars.filter(c => c.country === k).length}
                </span>
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
                    <span className="filter-count">{allCars.filter(c => matchBody(c.body, b)).length}</span>
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <h5>Тип двигателя</h5>
                {FUELS.map(f => (
                  <label key={f} className="filter-check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={fuels.has(f)} onChange={() => toggleFuel(f)}/>{f}
                    </span>
                    <span className="filter-count">{allCars.filter(c => c.engine.includes(f)).length}</span>
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
                  Найдено: <strong style={{ color: "var(--ink-10)" }}>{cars.length}</strong>
                </span>
              </div>
              {loading && <p style={{ color: "var(--fg-muted)", padding: "32px 0" }}>Загрузка...</p>}
              <div className="car-grid">
                {!loading && cars.map(c => <CarCard key={c.id} car={c}/>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
