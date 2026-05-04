export const dynamic = "force-dynamic";
import { getCar } from "@/lib/api";
import { COUNTRY_LABEL, PHONE, formatPrice, formatKm } from "@/lib/types";

interface BreakdownItem { label: string; value: number; }
interface PriceBreakdown {
  auction_price: number;
  customs: number;
  customs_fee: number;
  delivery: number;
  services: number;
  total: number;
  items?: BreakdownItem[];
}
import CarSilhouette from "@/components/CarSilhouette";
import Icon from "@/components/Icon";
import CallbackModal from "@/components/CallbackModal";
import SimilarStrip from "@/components/SimilarStrip";
import Link from "next/link";
import { notFound } from "next/navigation";

const BADGE_CLASS: Record<string, string> = {
  "Хит": "badge-hit",
  "Новинка": "badge-new",
  "Premium": "badge-prem",
};

export default async function CarDetailPage({ params }: { params: { id: string } }) {
  const car = await getCar(params.id).catch(() => null);
  if (!car) notFound();

  const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8000";

  const breakdown: PriceBreakdown | null = await fetch(
    `${apiBase}/api/cars/${params.id}/breakdown`,
    { cache: "no-store" }
  ).then(r => r.ok ? r.json() : null).catch(() => null);

  const similar: any[] = await fetch(
    `${apiBase}/api/cars/${params.id}/similar`,
    { cache: "no-store" }
  ).then(r => r.ok ? r.json() : []).catch(() => []);

  const photoUrls: string[] = (car as any).photo_urls ?? ((car as any).photo_url ? [(car as any).photo_url] : []);
  const hasPhotos = photoUrls.length > 0;

  return (
    <main>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
        <Link href="/catalog" className="btn btn-ghost" style={{ padding: 0, display: "inline-flex", gap: 6, alignItems: "center" }}>
          ← Назад в каталог
        </Link>
      </div>

      <section style={{ paddingBottom: 48 }}>
        <div className="container">
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {car.badge && (
                <span className={`badge ${BADGE_CLASS[car.badge] || "badge-hit"}`}>{car.badge}</span>
              )}
              <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img src={`/flags/${car.country}.svg`} alt={car.country} width={20} height={14}/>
                {COUNTRY_LABEL[car.country]}
              </span>
            </div>
            <h1 style={{ lineHeight: 0.95, marginBottom: 8 }}>{car.brand} {car.model}</h1>
            <p style={{ fontSize: 16, color: "var(--fg-muted)", fontFeatureSettings: "'tnum' 1" }}>
              {car.year} · {formatKm(car.mileage)} · {car.engine} · {car.body}
            </p>
          </div>

          <div className="detail-grid">
            <div>
              <div className="gallery-main" style={{ background: `radial-gradient(ellipse at 50% 70%, ${car.photo_tint} 0%, #08090C 100%)` }}>
                {hasPhotos ? (
                  <img src={photoUrls[0]} alt={`${car.brand} ${car.model}`}
                    style={{ display: "block", width: "100%", height: "auto" }}/>
                ) : (
                  <div style={{ aspectRatio: "16/10", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 10% 8%" }}>
                    <CarSilhouette kind={car.silhouette} w={480}/>
                  </div>
                )}
              </div>
              {photoUrls.length > 1 && (
                <div className="gallery-thumbs">
                  {photoUrls.map((url, i) => (
                    <div key={i} className={`gallery-thumb${i === 0 ? " active" : ""}`}>
                      <img src={url} alt={`фото ${i + 1}`}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}/>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: 48, marginBottom: 24 }}>Характеристики</h3>
              <div className="spec-table">
                <div className="spec-row"><span className="k">Год выпуска</span><span className="v">{car.year}</span></div>
                <div className="spec-row"><span className="k">Пробег</span><span className="v">{formatKm(car.mileage)}</span></div>
                <div className="spec-row"><span className="k">Двигатель</span><span className="v">{car.engine}</span></div>
                <div className="spec-row"><span className="k">Кузов</span><span className="v">{car.body}</span></div>
                {(car as any).drive && (
                  <div className="spec-row"><span className="k">Привод</span><span className="v">{(car as any).drive}</span></div>
                )}
                {(car as any).color && (
                  <div className="spec-row"><span className="k">Цвет</span><span className="v">{(car as any).color}</span></div>
                )}
                {(car as any).grade && (
                  <div className="spec-row"><span className="k">Комплектация</span><span className="v">{(car as any).grade}</span></div>
                )}
                {(car as any).power && (
                  <div className="spec-row"><span className="k">Мощность</span><span className="v">{(car as any).power}</span></div>
                )}
                {(car as any).steering && (
                  <div className="spec-row"><span className="k">Руль</span><span className="v">{(car as any).steering}</span></div>
                )}
                {(car as any).town && (
                  <div className="spec-row"><span className="k">Город</span><span className="v">{(car as any).town}</span></div>
                )}
                {(car as any).equip && (
                  <div className="spec-row"><span className="k">Доп. оборудование</span><span className="v" style={{ textAlign: "right", maxWidth: "60%" }}>{(car as any).equip}</span></div>
                )}
                {(car as any).badge && (
                  <div className="spec-row" style={{ borderBottom: 0 }}><span className="k">Оценка аукциона</span><span className="v">★ {(car as any).badge}</span></div>
                )}
              </div>
            </div>

            <div>
              <div className="detail-cta" style={{ position: "sticky", top: 96 }}>
                <span className="eyebrow-gold">Цена под ключ</span>
                {breakdown && (
                  <div className="price-breakdown">
                    {(breakdown.items && breakdown.items.length > 0
                      ? breakdown.items
                      : [
                          { label: "Цена аукциона", value: breakdown.auction_price },
                          { label: "Таможенная пошлина", value: breakdown.customs },
                          { label: "Таможенный сбор", value: breakdown.customs_fee },
                          { label: "Доставка", value: breakdown.delivery },
                          { label: "Услуги компании", value: breakdown.services },
                        ]
                    ).map(item => (
                      <div key={item.label} className="price-breakdown-row">
                        <span>{item.label}</span>
                        <span>{formatPrice(item.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="price">{formatPrice(car.price)}</div>
                <div className="price-note">Итого под ключ в г. Омск</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                  <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-primary btn-lg btn-block" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="phone" size={18}/>
                    Позвонить: {PHONE}
                  </a>
                  <CallbackModal />
                </div>
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid rgba(245,243,238,0.1)", display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: "shield" as const, text: "Гарантия на документы" },
                    { icon: "clock" as const, text: "Доставка 35–55 дней" },
                    { icon: "layers" as const, text: "Прозрачная стоимость" },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                      <Icon name={icon} size={16} style={{ color: "var(--gold)" }}/>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section style={{ paddingBottom: 64 }}>
          <div className="container">
            <h3 style={{ marginBottom: 24 }}>Похожие автомобили</h3>
            <SimilarStrip cars={similar}/>
          </div>
        </section>
      )}
    </main>
  );
}
