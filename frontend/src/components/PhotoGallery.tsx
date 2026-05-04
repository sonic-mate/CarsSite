"use client";
import { useState } from "react";

interface Props {
  urls: string[];
  alt: string;
  bg?: string;
}

export default function PhotoGallery({ urls, alt, bg }: Props) {
  const [active, setActive] = useState(0);

  if (urls.length === 0) return null;

  const bgStyle = bg
    ? { background: `radial-gradient(ellipse at 50% 70%, ${bg} 0%, #08090C 100%)` }
    : {};

  return (
    <>
      <div className="gallery-main" style={bgStyle}>
        <img
          src={urls[active]}
          alt={alt}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>
      {urls.length > 1 && (
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
      )}
    </>
  );
}
