export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { getCar } from "@/lib/api";
import { COUNTRY_LABEL, PHONE, formatPrice, formatKm } from "@/lib/types";

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const car = await getCar(params.id).catch(() => null);
  if (!car) return { title: "Автомобиль не найден" };

  const c = car as any;
  const country = COUNTRY_LABEL[c.country as keyof typeof COUNTRY_LABEL] ?? c.country;
  const price = c.price ? formatPrice(c.price) : null;
  const mileage = c.mileage ? formatKm(c.mileage) : null;
  const title = `${c.brand} ${c.model} ${c.year} — купить из ${country}${price ? `, ${price}` : ""}`;
  const desc = [
    `${c.brand} ${c.model} ${c.year} года`,
    c.engine ? `двигатель ${c.engine}` : null,
    mileage ? `пробег ${mileage}` : null,
    price ? `цена под ключ ${price}` : null,
    `доставка из ${country} в Омск`,
  ].filter(Boolean).join(", ") + ".";

  const photoUrls: string[] = c.photo_urls?.length
    ? c.photo_urls : c.photo_url ? [c.photo_url] : [];
  const ogImage = photoUrls[0] ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${siteUrl}/cars/${params.id}`,
      images: ogImage ? [{ url: `${siteUrl}${ogImage}` }] : [],
    },
    alternates: { canonical: `${siteUrl}/cars/${params.id}` },
  };
}

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
import Icon from "@/components/Icon";
import CallbackModal from "@/components/CallbackModal";
import SimilarStrip from "@/components/SimilarStrip";
import PhotosAndAuction from "@/components/PhotosAndAuction";
import BackToCatalogButton from "@/components/BackToCatalogButton";
import Link from "next/link";
import { notFound } from "next/navigation";

const BADGE_CLASS: Record<string, string> = {
  "Хит": "badge-hit",
  "Новинка": "badge-new",
  "Premium": "badge-prem",
};

const DAMAGE_LEGEND = [
  { code: "A1", label: "Маленькая царапина" },
  { code: "A2", label: "Царапина" },
  { code: "A3", label: "Большая царапина" },
  { code: "E1", label: "Небольшая вмятина" },
  { code: "E2", label: "Несколько небольших вмятин" },
  { code: "E3", label: "Много небольших вмятин" },
  { code: "U1", label: "Маленькая вмятина" },
  { code: "U2", label: "Вмятина" },
  { code: "U3", label: "Большая вмятина" },
  { code: "W1", label: "Ремонт/покраска (едва обнаружимые)" },
  { code: "W2", label: "Ремонт/покраска (заметные)" },
  { code: "W3", label: "Ремонт/покраска (очень заметные, должно быть перекрашено)" },
  { code: "S1", label: "Малозаметная ржавчина" },
  { code: "S2", label: "Ржавчина" },
  { code: "C1", label: "Коррозия" },
  { code: "C2", label: "Заметная коррозия" },
];

function AuctionSheetSection({ sheetUrl }: { sheetUrl: string | null }) {
  const hasImage = !!sheetUrl;
  return (
    <div style={{ marginTop: 48 }}>
      <h3 style={{ marginBottom: 24 }}>Аукционный лист</h3>
      <div className="auction-sheet-grid" style={{ display: "grid", gridTemplateColumns: hasImage ? "1fr 1fr" : "1fr", gap: 16, alignItems: "stretch" }}>
        {hasImage && (
          <div style={{ background: "#13151c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "var(--r)", overflow: "hidden", display: "flex" }}>
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", width: "100%" }}>
              <img src={sheetUrl} alt="Аукционный лист" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}/>
            </a>
          </div>
        )}
        <div style={{ background: "#13151c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "var(--r)", padding: 24 }}>
          {!hasImage && (
            <div style={{ fontSize: 12, color: "rgba(245,243,238,0.35)", marginBottom: 16, fontStyle: "italic" }}>
              Изображение аукционного листа для этого лота недоступно
            </div>
          )}
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#c8a45c", fontWeight: 700, textTransform: "uppercase", marginBottom: 20 }}>
            Обозначения повреждений
          </div>
          {DAMAGE_LEGEND.map(({ code, label }) => (
            <div key={code} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
              <span style={{ minWidth: 28, fontWeight: 700, color: "#f5f3ee", fontFamily: "var(--font-mono)" }}>{code}</span>
              <span style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.15)", margin: "0 4px 2px" }}/>
              <span style={{ color: "rgba(245,243,238,0.65)", textAlign: "right" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  const isStock = car.country === "korea" || car.country === "china";
  const isSold = (car as any).auction_sold === true;
  const auctionStatus = isStock ? "В наличии" : isSold ? "Продан" : "На торгах";
  const lotDisplay = (car as any).chassis_number || ((car as any).lot_number ? String((car as any).lot_number) : car.id);

  const photoUrls: string[] = (car as any).photo_urls?.length
    ? (car as any).photo_urls
    : (car as any).photo_url ? [(car as any).photo_url] : [];

  return (
    <main>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
        <BackToCatalogButton />
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
              <PhotosAndAuction
                photoUrls={photoUrls}
                photoUrlsAjes={(car as any).photo_urls_ajes}
                auctionSheetUrl={(car as any).auction_sheet_url ?? null}
                alt={`${car.brand} ${car.model}`}
                car={{
                  id: car.id,
                  brand: car.brand,
                  model: car.model,
                  year: car.year,
                  country: car.country,
                  engine: car.engine,
                  mileage: car.mileage,
                  body: car.body,
                  silhouette: car.silhouette,
                  photo_tint: car.photo_tint,
                  badge: car.badge,
                  grade: (car as any).grade,
                  kuzov: (car as any).kuzov,
                  equip: (car as any).equip,
                  color: (car as any).color,
                  steering: (car as any).steering,
                  drive: (car as any).drive,
                  town: (car as any).town,
                  engine_cc: (car as any).engine_cc,
                  power: (car as any).power,
                  auction_name: (car as any).auction_name,
                  auction_date: (car as any).auction_date,
                  auction_price: (car as any).auction_price,
                  auction_price_local: (car as any).auction_price_local,
                  lot_number: (car as any).lot_number,
                  chassis_number: (car as any).chassis_number,
                  auction_sold: (car as any).auction_sold,
                }}
              />

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
                {(car as any).kuzov && (
                  <div className="spec-row"><span className="k">Код кузова</span><span className="v">{(car as any).kuzov}</span></div>
                )}
                {(car as any).town && (
                  <div className="spec-row"><span className="k">Город</span><span className="v">{(car as any).town}</span></div>
                )}
                {(car as any).equip && (
                  <div className="spec-row"><span className="k">Доп. оборудование</span><span className="v" style={{ textAlign: "right", maxWidth: "60%" }}>{(car as any).equip}</span></div>
                )}
                {(car as any).badge && (
                  <div className="spec-row"><span className="k">Оценка аукциона</span><span className="v">★ {(car as any).badge}</span></div>
                )}
                {(car as any).auction_name && (
                  <div className="spec-row"><span className="k">Аукцион</span><span className="v">{(car as any).auction_name}</span></div>
                )}
                <div className="spec-row">
                  <span className="k">Лот</span>
                  <span className="v" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{lotDisplay}</span>
                </div>
                <div className="spec-row" style={{ borderBottom: 0 }}><span className="k">Статус</span><span className="v">{auctionStatus}</span></div>
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
                        <span>{!isSold && item.label === "Цена аукциона" ? "Начальная цена" : item.label}</span>
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

          {car.country === "japan" && (
            <AuctionSheetSection sheetUrl={(car as any).auction_sheet_url ?? null} />
          )}
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
