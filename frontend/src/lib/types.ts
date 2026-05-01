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
}

export interface CalculatorResult {
  auction_price: number;
  delivery: number;
  customs: number;
  services: number;
  total: number;
  eur_rate?: number;
  price_eur?: number;
  customs_method?: string;
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
