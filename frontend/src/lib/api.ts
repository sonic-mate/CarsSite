import { Car, CalculatorResult } from "./types";

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
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Car[]>(`/api/cars${qs ? "?" + qs : ""}`);
}

export async function getCar(id: string): Promise<Car> {
  return apiFetch<Car>(`/api/cars/${id}`);
}

export async function getLiveCars(params: Record<string, string> = {}): Promise<{ cars: any[]; active_sources: string[] }> {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/live/cars${qs ? "?" + qs : ""}`);
}

export async function calculate(data: {
  country: string;
  auction_price: number;
  currency?: string;
  engine_cc: number;
  power_hp?: number;
  year: number;
  fuel_type?: string;
  city?: string;
}): Promise<CalculatorResult> {
  return apiFetch<CalculatorResult>("/api/calculator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
