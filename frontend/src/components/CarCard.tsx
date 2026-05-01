import Link from "next/link";
import CarSilhouette from "./CarSilhouette";
import { Car, COUNTRY_LABEL, formatPrice, formatKm } from "@/lib/types";

const BADGE_CLASS: Record<string, string> = {
  "Хит":     "badge-hit",
  "Новинка": "badge-new",
  "Premium": "badge-prem",
};

interface CarCardProps {
  car: Car & { photo_url?: string };
}

export default function CarCard({ car }: CarCardProps) {
  const isLabelBadge = car.badge && BADGE_CLASS[car.badge];
  const rating = car.badge && !isLabelBadge ? parseFloat(car.badge) : null;

  return (
    <Link href={`/cars/${car.id}`} className="car-card">
      <div className="car-photo">
        <div
          className="car-stage"
          style={{ background: `radial-gradient(ellipse at 50% 70%, ${car.photo_tint} 0%, #08090C 100%)` }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.04) 0%, transparent 50%)" }}/>
          {(car as any).photo_url ? (
            <img
              src={(car as any).photo_url}
              alt={`${car.brand} ${car.model}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            />
          ) : (
            <div className="car-silhouette" style={{ width: "82%" }}>
              <CarSilhouette kind={car.silhouette} w={300}/>
            </div>
          )}
        </div>

        <div className="car-badges">
          {isLabelBadge && (
            <span className={`badge ${BADGE_CLASS[car.badge!]}`}>{car.badge}</span>
          )}
          {rating !== null && !isNaN(rating) && (
            <span className="car-rating">★ {rating.toFixed(1)}</span>
          )}
        </div>

        <div className="car-country-pin">
          <img src={`/flags/${car.country}.svg`} alt={car.country} width={16} height={11}/>
          <span>{COUNTRY_LABEL[car.country]}</span>
        </div>
      </div>

      <div className="car-body">
        <div>
          <div className="car-name">{car.brand} {car.model}</div>
          <div className="car-meta">{car.year} · {formatKm(car.mileage)} · {car.engine}</div>
        </div>
        <div className="car-bottom">
          <span className="car-price">{formatPrice(car.price)}</span>
          <span className="car-cta">Подробнее →</span>
        </div>
      </div>
    </Link>
  );
}
