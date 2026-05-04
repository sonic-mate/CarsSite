"use client";
import { useState, useRef } from "react";
import { formatPrice } from "@/lib/types";

interface Breakdown {
  auction_price: number;
  customs: number;
  customs_fee: number;
  delivery: number;
  services: number;
  total: number;
}

export default function PriceBreakdownTooltip({ carId }: { carId: string }) {
  const [open, setOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  async function load() {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    try {
      const r = await fetch(`/api/cars/${carId}/breakdown`);
      if (r.ok) setBreakdown(await r.json());
    } catch {}
    setLoading(false);
  }

  function handleEnter() {
    load();
    setOpen(true);
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!open) load();
    setOpen(v => !v);
  }

  const rows = breakdown ? [
    { label: "Цена аукциона", value: breakdown.auction_price },
    { label: "Таможенная пошлина", value: breakdown.customs },
    { label: "Таможенный сбор", value: breakdown.customs_fee },
    { label: "Доставка", value: breakdown.delivery },
    { label: "Услуги компании", value: breakdown.services },
  ] : [];

  return (
    <div
      className="price-info-wrap"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="price-info-btn"
        type="button"
        aria-label="Состав цены"
        onClick={handleClick}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </button>
      {open && (
        <div className="price-info-popup">
          {loading && <div className="price-info-loading">Загрузка…</div>}
          {!loading && breakdown && (
            <>
              <div className="price-info-title">Состав цены</div>
              {rows.map(r => (
                <div key={r.label} className="price-info-row">
                  <span>{r.label}</span>
                  <span>{formatPrice(r.value)}</span>
                </div>
              ))}
              <div className="price-info-total">
                <span>Итого под ключ</span>
                <span>{formatPrice(breakdown.total)}</span>
              </div>
            </>
          )}
          {!loading && !breakdown && (
            <div className="price-info-loading">Нет данных</div>
          )}
        </div>
      )}
    </div>
  );
}
