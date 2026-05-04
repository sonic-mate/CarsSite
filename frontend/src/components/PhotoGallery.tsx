"use client";
import { useState } from "react";

export default function PhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <img src={urls[0]} alt={alt} style={{ display: "block", width: "100%", height: "auto" }}/>
    );
  }

  return (
    <>
      <img
        src={urls[active]}
        alt={alt}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
      <div className="gallery-thumbs">
        {urls.map((url, i) => (
          <div
            key={i}
            className={`gallery-thumb${i === active ? " active" : ""}`}
            onClick={() => setActive(i)}
          >
            <img
              src={url}
              alt={`фото ${i + 1}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
