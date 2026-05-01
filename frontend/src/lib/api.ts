import { Car, CalculatorResult } from "./types";
import { PLACEHOLDER_CARS } from "./placeholders";

const API =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL || "http://localhost:8000")
    : "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function getCars(params: Record<string, string> = {}): Promise<Car[]> {
  try {
    const qs = new URLSearchParams(params).toString();
    const data = await apiFetch<Car[]>(`/api/cars${qs ? "?" + qs : ""}`);
    return data.length ? data : PLACEHOLDER_CARS;
  } catch {
    return PLACEHOLDER_CARS;
  }
}

export async function getCar(id: string): Promise<Car> {
  try {
    return await apiFetch<Car>(`/api/cars/${id}`);
  } catch {
    // live car — search in cached live results
    try {
      const { cars } = await apiFetch<{ cars: Car[] }>(`/api/live/cars?limit=100`);
      const found = cars.find((c: any) => c.id === id);
      if (found) return found;
    } catch {}
    const car = PLACEHOLDER_CARS.find(c => c.id === id);
    if (!car) throw new Error("Car not found");
    return car;
  }
}

export async function getLiveCars(params: Record<string, string> = {}): Promise<{ cars: any[]; active_sources: string[] }> {
  try {
    const qs = new URLSearchParams(params).toString();
    return await apiFetch(`/api/live/cars${qs ? "?" + qs : ""}`);
  } catch {
    return { cars: [], active_sources: [] };
  }
}

export async function calculate(data: {
  country: string;
  auction_price: number;
  engine_cc: number;
  year: number;
  fuel_type?: string;
}): Promise<CalculatorResult> {
  try {
    return await apiFetch<CalculatorResult>("/api/calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    const age_k = data.year >= 2024 ? 1.0 : data.year >= 2021 ? 1.1 : 1.25;
    const customs = Math.round(data.auction_price * 0.18 * age_k);
    const delivery_map: Record<string, number> = { japan: 180000, korea: 160000, china: 200000 };
    const delivery = delivery_map[data.country] ?? 180000;
    const services = 80000;
    const total = data.auction_price + customs + delivery + services;
    return { auction_price: data.auction_price, delivery, customs, services, total };
  }
}
