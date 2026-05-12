"use client";
import Link from "next/link";
import { useState } from "react";
import { Car, COUNTRY_LABEL, formatPrice, formatKm, formatLocalPrice } from "@/lib/types";
import PriceBreakdownTooltip from "./PriceBreakdownTooltip";

export default function CarListCard({ car }: { car: Car }) {
  const allPhotos = car.photo_urls?.length ? car.photo_urls : car.photo_url ? [car.photo_url] : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const currentPhoto = allPhotos[photoIdx] ?? null;

  return (
    <Link
      href={`/cars/${car.id}`}
      className="car-list-card"
      onClick={() => sessionStorage.setItem("catalog_scroll", String(window.scrollY))}
    >
      <div className="car-list-photo">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={`${car.brand} ${car.model}`}
            onError={() => { if (photoIdx + 1 < allPhotos.length) setPhotoIdx(i => i + 1); }}
          />
        ) : (
          <div className="car-list-photo-placeholder">
            <img src={`/flags/${car.country}.svg`} alt={car.country} width={24} height={16}/>
          </div>
        )}
      </div>

      <div className="car-list-info">
        <div className="car-list-name">{car.brand} {car.model}</div>
        <div className="car-list-sub">
          {car.year}{car.grade ? ` · ${car.grade}` : ""}
        </div>
        <div className="car-list-specs">
          {car.mileage > 0 && (
            <span className="car-list-spec">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              {formatKm(car.mileage)}
            </span>
          )}
          {car.engine && (
            <span className="car-list-spec">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
              {car.engine}
            </span>
          )}
          {car.drive && (
            <span className="car-list-spec">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 14V5l7-3 7 3v9"/></svg>
              {car.drive}
            </span>
          )}
          {car.color && (
            <span className="car-list-spec">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              {car.color}
            </span>
          )}
          {car.power && (
            <span className="car-list-spec">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {car.power}
            </span>
          )}
        </div>
      </div>

      <div className="car-list-price">
        <div className="car-list-price-label">Цена в г. Омск</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="car-list-price-value">{formatPrice(car.price)}</div>
          <PriceBreakdownTooltip carId={car.id}/>
        </div>
        {formatLocalPrice(car.auction_price_local, car.country) && (
          <div className="car-list-local-price">
            {formatLocalPrice(car.auction_price_local, car.country)} на аукционе
          </div>
        )}
        <div className="car-list-country">
          <img src={`/flags/${car.country}.svg`} alt={car.country} width={16} height={11}/>
          {COUNTRY_LABEL[car.country]}
        </div>
        <div className="btn btn-primary car-list-btn">Подробнее</div>
      </div>
    </Link>
  );
}
