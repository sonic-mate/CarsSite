"use client";

import { useState } from "react";
import CarSilhouette from "./CarSilhouette";
import { COUNTRY_LABEL, formatPrice, formatKm } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  ajes:     "auc · Япония",
  encar:    "encar · Корея",
  dongchedi:"dongchedi · Китай",
  che168:   "che168 · Китай",
  guazi:    "guazi · Китай",
};

export default function LiveCarCard({ car }: { car: any }) {
  const [imgError, setImgError] = useState(false);
  const country = car.country as string;
  const label = SOURCE_LABEL[car.source] ?? car.source ?? "";

  const hasPhoto = car.photo_url && !imgError;

  return (
    <article className="car-card live-card">
      <div className="car-photo">
        {hasPhoto ? (
          <img
            src={car.photo_url}
            alt={`${car.brand} ${car.model}`}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="car-stage"
            style={{
              background: `radial-gradient(ellipse at 50% 70%, ${car.photo_tint ?? "#1a1d24"} 0%, #08090C 100%)`,
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.04) 0%, transparent 50%)" }}/>
            <div className="car-silhouette" style={{ width: "82%" }}>
              <CarSilhouette kind={car.silhouette ?? "sedan"} w={300}/>
            </div>
          </div>
        )}

        {/* Source badge */}
        <div className="car-badges">
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 8px", borderRadius: "var(--r-xs)",
            background: "rgba(15,17,21,0.72)",
            color: "var(--gold)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {label}
          </span>
        </div>

        {/* Country flag */}
        <div className="car-country-pin">
          <img src={`/flags/${country}.svg`} alt={country} width={16} height={11}/>
          <span>{COUNTRY_LABEL[country] ?? country}</span>
        </div>
      </div>

      <div className="car-body">
        <div className="car-name">{car.brand} {car.model}</div>
        <div className="car-meta">
          {car.year > 0 ? car.year : "—"} · {car.mileage > 0 ? formatKm(car.mileage) : "—"} · {car.engine}
        </div>
        <div className="car-bottom">
          <span className="car-price">
            {car.price > 0 ? formatPrice(car.price) : "По запросу"}
          </span>
          {car.source_url ? (
            <a
              href={car.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="car-cta"
              onClick={e => e.stopPropagation()}
            >
              Источник →
            </a>
          ) : (
            <span className="car-cta">Подробнее →</span>
          )}
        </div>
      </div>
    </article>
  );
}
