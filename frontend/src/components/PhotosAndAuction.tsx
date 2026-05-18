"use client";

import { useState } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import CarSilhouette from "@/components/CarSilhouette";
import { formatKm, formatLocalPrice } from "@/lib/types";

export interface AuctionInfo {
  id: string;
  brand: string;
  model: string;
  year: number;
  country: string;
  engine: string;
  mileage: number;
  body: string;
  silhouette: "sedan" | "suv";
  photo_tint: string;
  badge?: string | null;
  grade?: string | null;
  kuzov?: string | null;
  equip?: string | null;
  color?: string | null;
  steering?: string | null;
  drive?: string | null;
  town?: string | null;
  engine_cc?: number | null;
  power?: string | null;
  auction_name?: string | null;
  auction_date?: string | null;
  auction_price?: number | null;
  auction_price_local?: number | null;
  lot_number?: number | null;
  chassis_number?: string | null;
  auction_sold?: boolean | null;
}

interface Props {
  photoUrls: string[];
  photoUrlsAjes?: string[];
  auctionSheetUrl?: string | null;
  alt: string;
  car: AuctionInfo;
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: 13,
};

function AuctionSheet({ car }: { car: AuctionInfo }) {
  const localPrice = formatLocalPrice(car.auction_price_local, car.country);
  const isBadgeGrade = car.badge && /^[0-9]/.test(car.badge);

  const isStock = car.country === "korea" || car.country === "china";
  const isSold = car.auction_sold === true;
  const status = isStock ? "В наличии" : isSold ? "Продан" : "На торгах";
  const priceLabel = isStock ? "Стоимость" : isSold ? "Последняя ставка" : "Начальная цена";

  const specs: { k: string; v: string }[] = [
    car.engine_cc && car.engine_cc > 0 ? { k: "Объём двигателя", v: `${car.engine_cc.toLocaleString("ru-RU")} куб.см` } : null,
    { k: "Двигатель", v: car.engine },
    { k: "Пробег", v: formatKm(car.mileage) },
    car.power ? { k: "Мощность", v: car.power } : null,
    car.drive ? { k: "Привод", v: car.drive } : null,
    car.steering ? { k: "Руль", v: car.steering } : null,
    car.color ? { k: "Цвет", v: car.color } : null,
    car.kuzov ? { k: "Оценка кузова", v: car.kuzov } : null,
    car.town ? { k: "Город", v: car.town } : null,
    car.auction_name ? { k: "Аукцион", v: car.auction_name } : null,
    { k: "Лот", v: car.chassis_number || (car.lot_number ? String(car.lot_number) : car.id) },
    { k: "Статус", v: status },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div style={{
      background: "#13151c",
      color: "#f5f3ee",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "var(--r)",
      padding: 24,
      marginTop: 2,
      minHeight: 320,
    }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(200,164,92,0.2)", paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#c8a45c", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
          Аукционный лист
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f3ee", marginBottom: 6, fontFamily: "var(--font-display)" }}>
          {car.brand} {car.model} {car.year}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "rgba(245,243,238,0.45)" }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>Лот: {car.chassis_number || car.lot_number || car.id}</span>
        </div>
      </div>

      {/* Grade */}
      {isBadgeGrade && car.badge && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(200,164,92,0.07)", borderRadius: "var(--r-sm)", border: "1px solid rgba(200,164,92,0.14)" }}>
          <div style={{ fontSize: 10, color: "#c8a45c", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
            Оценка аукциона
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#f5f3ee", lineHeight: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#c8a45c" }}>★</span>
            {car.badge}
          </div>
        </div>
      )}

      {/* Non-grade badge (trim level in badge field) */}
      {!isBadgeGrade && car.badge && (
        <div style={{ ...row, marginBottom: 0 }}>
          <span style={{ color: "rgba(245,243,238,0.5)" }}>Оценка</span>
          <span style={{ color: "#f5f3ee" }}>{car.badge}</span>
        </div>
      )}

      {/* Specs */}
      {specs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(245,243,238,0.3)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
            Характеристики
          </div>
          {specs.map(({ k, v }) => (
            <div key={k} style={row}>
              <span style={{ color: "rgba(245,243,238,0.5)" }}>{k}</span>
              <span style={{ color: "#f5f3ee", textAlign: "right", maxWidth: "55%" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trim grade (non-numeric) */}
      {car.grade && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(245,243,238,0.3)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
            Комплектация
          </div>
          <div style={{ fontSize: 13, color: "rgba(245,243,238,0.75)" }}>{car.grade}</div>
        </div>
      )}

      {/* Equipment */}
      {car.equip && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(245,243,238,0.3)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
            Опции и оборудование
          </div>
          <div style={{ fontSize: 12, color: "rgba(245,243,238,0.65)", lineHeight: 1.7, wordBreak: "break-word" }}>
            {car.equip}
          </div>
        </div>
      )}

      {/* Auction price */}
      {(localPrice || (car.auction_price && car.auction_price > 0)) && (
        <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--r-sm)", border: "1px solid rgba(255,255,255,0.06)", marginTop: "auto" }}>
          <div style={{ fontSize: 10, color: "rgba(245,243,238,0.3)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
            {priceLabel}
          </div>
          {localPrice && (
            <div style={{ fontSize: 24, fontWeight: 700, color: "#f5f3ee", fontFamily: "var(--font-display)", marginBottom: 2 }}>
              {localPrice}
            </div>
          )}
          {car.auction_price && car.auction_price > 0 && (
            <div style={{ fontSize: 12, color: "rgba(245,243,238,0.4)" }}>
              ≈ {car.auction_price.toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Silhouette = ({ car }: { car: AuctionInfo }) => (
  <div className="gallery-main" style={{ background: `radial-gradient(ellipse at 50% 70%, ${car.photo_tint} 0%, #08090C 100%)` }}>
    <div style={{ aspectRatio: "16/10", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 10% 8%" }}>
      <CarSilhouette kind={car.silhouette} w={480}/>
    </div>
  </div>
);

export default function PhotosAndAuction({ photoUrls, photoUrlsAjes, auctionSheetUrl, alt, car }: Props) {
  const galleryUrls = auctionSheetUrl
    ? [...photoUrls, auctionSheetUrl]
    : photoUrls;
  const galleryUrlsBig = auctionSheetUrl
    ? [...(photoUrlsAjes ?? photoUrls), auctionSheetUrl]
    : photoUrlsAjes;

  return (
    <div>
      <PhotoGallery
        urls={galleryUrls}
        alt={alt}
        bg={car.photo_tint}
        fallback={<Silhouette car={car}/>}
        urlsBig={galleryUrlsBig}
      />
    </div>
  );
}
