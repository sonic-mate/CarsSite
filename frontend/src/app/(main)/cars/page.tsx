import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, formatKm, COUNTRY_LABEL } from "@/lib/types";

export const metadata: Metadata = {
  title: "Автомобили с японских аукционов — Восток Авто Импорт",
  description: "Каталог автомобилей с японских аукционов. Актуальные лоты с ценами под ключ в Омске.",
  alternates: { canonical: "https://vostokavtoimport.ru/cars" },
};

const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vostokavtoimport.ru";
const PAGE_SIZE = 60;

async function getCars(page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const r = await fetch(
    `${API_BASE}/api/cars?limit=${PAGE_SIZE}&offset=${offset}&sort=date`,
    { next: { revalidate: 1800 } }
  );
  if (!r.ok) return { cars: [], total: 0 };
  const cars = await r.json();
  const count = await fetch(`${API_BASE}/api/cars-count`, { next: { revalidate: 1800 } })
    .then(r => r.ok ? r.json() : { count: 0 });
  return { cars, total: count.count ?? 0 };
}

export default async function CarsIndexPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);
  const { cars, total } = await getCars(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="container">
        <h1 style={{ marginBottom: 8 }}>Автомобили с аукционов</h1>
        <p style={{ color: "var(--fg-muted)", marginBottom: 32 }}>
          {total > 0 ? `${total} автомобилей` : "Загрузка..."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {cars.map((car: any) => (
            <Link
              key={car.id}
              href={`/cars/${car.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {car.photo_url && (
                <img
                  src={car.photo_url}
                  alt={`${car.brand} ${car.model}`}
                  width={80}
                  height={54}
                  style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{car.brand} {car.model}</div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                  {car.year} · {formatKm(car.mileage)} · {car.engine} · {COUNTRY_LABEL[car.country as "japan" | "china" | "korea"]}
                </div>
              </div>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {formatPrice(car.price)}
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 32, flexWrap: "wrap" }}>
            {page > 1 && (
              <Link href={`/cars?page=${page - 1}`} className="btn btn-ghost">← Назад</Link>
            )}
            <span style={{ padding: "8px 12px", color: "var(--fg-muted)" }}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`/cars?page=${page + 1}`} className="btn btn-ghost">Вперёд →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
