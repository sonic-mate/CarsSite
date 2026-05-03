"use client";
import { useRef } from "react";
import CarCard from "./CarCard";
import { Car } from "@/lib/types";

export default function SimilarStrip({ cars }: { cars: Car[] }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    ref.current?.scrollBy({ left: dir * 270, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => scroll(-1)}
        className="similar-arrow similar-arrow-prev"
        aria-label="Назад"
      >‹</button>

      <div className="similar-strip" ref={ref}>
        {cars.map((c) => <CarCard key={c.id} car={c}/>)}
      </div>

      <button
        onClick={() => scroll(1)}
        className="similar-arrow similar-arrow-next"
        aria-label="Вперёд"
      >›</button>
    </div>
  );
}
