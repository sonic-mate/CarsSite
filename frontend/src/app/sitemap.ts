import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vostokavtoimport.ru";
const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/catalog`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/calculator`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  let carPages: MetadataRoute.Sitemap = [];
  try {
    // Fetch all saved lot IDs in pages
    const lots: { lot_id: string; updated_at: string }[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const r = await fetch(
        `${API_BASE}/api/seo/cars?limit=${pageSize}&offset=${offset}`,
        { next: { revalidate: 3600 } }
      );
      if (!r.ok) break;
      const batch: { lot_id: string; updated_at: string }[] = await r.json();
      if (!batch.length) break;
      lots.push(...batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    carPages = lots.map(({ lot_id, updated_at }) => ({
      url: `${SITE_URL}/cars/${lot_id}`,
      lastModified: new Date(updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // sitemap still works without car pages
  }

  return [...staticPages, ...carPages];
}
