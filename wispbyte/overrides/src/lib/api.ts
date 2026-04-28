import { Car, CalculatorResult } from "./types";
import { PLACEHOLDER_CARS } from "./placeholders";

export async function getCars(_params: Record<string, string> = {}): Promise<Car[]> {
  return PLACEHOLDER_CARS;
}

export async function getCar(id: string): Promise<Car> {
  const car = PLACEHOLDER_CARS.find(c => c.id === id);
  if (!car) throw new Error("Car not found");
  return car;
}

export async function getLiveCars(_params: Record<string, string> = {}): Promise<{ cars: any[]; active_sources: string[] }> {
  return { cars: [], active_sources: [] };
}

export async function calculate(data: {
  country: string;
  auction_price: number;
  engine_cc: number;
  year: number;
  fuel_type?: string;
}): Promise<CalculatorResult> {
  const age_k = data.year >= 2024 ? 1.0 : data.year >= 2021 ? 1.1 : 1.25;
  const customs = Math.round(data.auction_price * 0.18 * age_k);
  const delivery_map: Record<string, number> = { japan: 180000, korea: 160000, china: 200000 };
  const delivery = delivery_map[data.country] ?? 180000;
  const services = 80000;
  const total = data.auction_price + customs + delivery + services;
  return { auction_price: data.auction_price, delivery, customs, services, total };
}
