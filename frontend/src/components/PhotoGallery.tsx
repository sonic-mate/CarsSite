"use client";
import { useState, useEffect, useCallback } from "react";

interface Props {
  urls: string[];
  alt: string;
  bg?: string;
}

export default function PhotoGallery({ urls, alt, bg }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setActive(i => (i - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setActive(i => (i + 1) % urls.length), [urls.length]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, prev, next]);

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
          onClick={() => setLightbox(true)}
          style={{ display: "block", width: "100%", height: "auto", cursor: "zoom-in" }}
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

      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <img
            src={urls[active]}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "94vw", maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 4,
              boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
              cursor: "default",
            }}
          />

          {urls.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                style={navBtn("left")}
                aria-label="Назад"
              >‹</button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                style={navBtn("right")}
                aria-label="Вперёд"
              >›</button>
            </>
          )}

          <button
            onClick={() => setLightbox(false)}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.1)", border: "none",
              color: "#fff", fontSize: 24, width: 40, height: 40,
              borderRadius: "50%", cursor: "pointer", lineHeight: 1,
            }}
            aria-label="Закрыть"
          >×</button>

          {urls.length > 1 && (
            <div style={{
              position: "absolute", bottom: 16,
              fontSize: 13, color: "rgba(255,255,255,0.5)",
              pointerEvents: "none",
            }}>
              {active + 1} / {urls.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function navBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 12,
    top: "50%", transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.1)", border: "none",
    color: "#fff", fontSize: 36, width: 48, height: 48,
    borderRadius: "50%", cursor: "pointer", lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
