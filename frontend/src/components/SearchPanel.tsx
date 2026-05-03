"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BRANDS = ["Toyota", "Lexus", "BYD", "Genesis", "Hyundai", "Honda", "Nissan"];
const BODIES = ["Седан", "Внедорожник", "Кроссовер", "Минивэн", "Хэтчбэк"];
const PRICES: { label: string; value: string }[] = [
  { label: "До 2 млн",  value: "2000000"  },
  { label: "До 3 млн",  value: "3000000"  },
  { label: "До 5 млн",  value: "5000000"  },
  { label: "До 10 млн", value: "10000000" },
];

export default function SearchPanel() {
  const router = useRouter();
  const [brand,    setBrand]    = useState("");
  const [body,     setBody]     = useState("");
  const [priceMax, setPriceMax] = useState("");

  function handleFind() {
    const p = new URLSearchParams();
    if (brand)    p.set("brand",     brand);
    if (body)     p.set("body",      body);
    if (priceMax) p.set("price_max", priceMax);
    router.push(`/catalog${p.toString() ? "?" + p.toString() : ""}`);
  }

  return (
    <div className="search-panel">
      <div className="search-row">
        <select className="select search-select" value={brand} onChange={e => setBrand(e.target.value)}>
          <option value="">Любая марка</option>
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="select search-select" value={body} onChange={e => setBody(e.target.value)}>
          <option value="">Любой кузов</option>
          {BODIES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="select search-select" value={priceMax} onChange={e => setPriceMax(e.target.value)}>
          <option value="">Любая цена</option>
          {PRICES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button className="btn btn-primary btn-lg" onClick={handleFind}>Найти</button>
      </div>
    </div>
  );
}
