import Link from "next/link";
import CarSilhouette from "./CarSilhouette";
import { Car, COUNTRY_LABEL, formatPrice, formatKm } from "@/lib/types";

const BADGE_CLASS: Record<string, string> = {
  "Хит": "badge-hit",
  "Новинка": "badge-new",
  "Premium": "badge-prem",
};

interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  return (
    <Link href={`/cars/${car.id}`} className="car-card">
      <div className="car-photo">
        <div
          className="car-stage"
          style={{ background: `radial-gradient(ellipse at 50% 70%, ${car.photo_tint} 0%, #08090C 100%)` }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.04) 0%, transparent 50%)" }}/>
          <div className="car-silhouette" style={{ width: "82%" }}>
            <CarSilhouette kind={car.silhouette} w={300}/>
          </div>
        </div>
        <div className="car-badges">
          {car.badge && (
            <span className={`badge ${BADGE_CLASS[car.badge] || "badge-hit"}`}>{car.badge}</span>
          )}
        </div>
        <div className="car-country-pin">
          <img src={`/flags/${car.country}.svg`} alt={car.country} width={16} height={11}/>
          <span>{COUNTRY_LABEL[car.country]}</span>
        </div>
      </div>
      <div className="car-body">
        <div className="car-name">{car.brand} {car.model}</div>
        <div className="car-meta">{car.year} · {formatKm(car.mileage)} · {car.engine}</div>
        <div className="car-bottom">
          <span className="car-price">{formatPrice(car.price)}</span>
          <span className="car-cta">Подробнее →</span>
        </div>
      </div>
    </Link>
  );
}
