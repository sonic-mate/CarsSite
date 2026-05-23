export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  country: "japan" | "china" | "korea";
  body: string;
  mileage: number;
  engine: string;
  price: number;
  badge: string | null;
  photo_tint: string;
  silhouette: "sedan" | "suv";
  is_active: boolean;
  photo_url?: string | null;
  color?: string | null;
  drive?: string | null;
  power?: string | null;
  grade?: string | null;
  steering?: string | null;
  town?: string | null;
  equip?: string | null;
  kuzov?: string | null;
  auction_price?: number | null;
  auction_price_local?: number | null;
  engine_cc?: number | null;
  photo_urls?: string[] | null;
  auction_date?: string | null;
  auction_name?: string | null;
  auction_sheet_url?: string | null;
}

export interface BreakdownItem {
  label: string;
  value: number;
  value_local?: number;
  local_currency?: string;
}

export interface CalculatorResult {
  auction_price: number;
  delivery: number;
  customs: number;
  customs_fee: number;
  services: number;
  total: number;
  eur_rate?: number;
  price_eur?: number;
  customs_method?: string;
  items?: BreakdownItem[];
  jpy_rate?: number;
  cny_rate?: number;
  krw_rate?: number;
  usd_rate?: number;
}

export const COUNTRY_LABEL: Record<string, string> = {
  japan: "Япония",
  china: "Китай",
  korea: "Корея",
};

export const PHONE = "8 800 101 29 18";
export const PHONE_WA = "+7 904 584 63 33";
export const EMAIL = "vostokavtoimport@bk.ru";
export const ADDRESS = "г. Омск, ул. Лукашевича 8, корп. 3, офис 8";

export const SOCIALS = {
  max: "https://max.ru/id5507301043_biz",
  telegram: "https://t.me/VostokAvtoImport",
  vk: "https://vk.com/vostokavtoimport",
};

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

export function formatKm(n: number): string {
  return n.toLocaleString("ru-RU") + " км";
}

const CURRENCY_SYMBOL: Record<string, string> = {
  japan: "¥",
  china: "¥",
  korea: "₩",
};

export function formatLocalPrice(amount: number | null | undefined, country: string): string | null {
  if (!amount || amount <= 0) return null;
  const sym = CURRENCY_SYMBOL[country] ?? "";
  return sym + " " + amount.toLocaleString("ru-RU");
}
