"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BackToCatalogButton() {
  const [href, setHref] = useState("/catalog");

  useEffect(() => {
    const saved = sessionStorage.getItem("catalog_back_url");
    if (saved) setHref(saved);
  }, []);

  return (
    <Link href={href} className="btn btn-ghost" style={{ padding: 0, display: "inline-flex", gap: 6, alignItems: "center" }}>
      ← Назад в каталог
    </Link>
  );
}
