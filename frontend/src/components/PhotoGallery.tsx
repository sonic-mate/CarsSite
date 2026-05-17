"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

function toBigUrl(url: string): string {
  if (url.includes("%26w%3D320")) return url.replace("%26w%3D320", "");
  if (url.includes("&w=320")) return url.replace("&w=320", "");
  return url;
}

interface Props {
  urls: string[];
  alt: string;
  bg?: string;
  fallback?: React.ReactNode;
  urlsBig?: string[];
}

export default function PhotoGallery({ urls, alt, bg, fallback, urlsBig }: Props) {
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const validUrls = useMemo(() => urls.filter((_, i) => !failed.has(i)), [urls, failed]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [bigSrc, setBigSrc] = useState<string | null>(null);

  useEffect(() => { setActive(0); setFailed(new Set()); }, [urls]);

  const onError = useCallback((i: number) => {
    setFailed(prev => {
      const next = new Set(prev).add(i);
      return next;
    });
    setActive(a => {
      const newValid = urls.filter((_, j) => j !== i && !failed.has(j));
      return Math.min(a, Math.max(0, newValid.length - 1));
    });
  }, [urls, failed]);

  const prev = useCallback(() => setActive(i => (i - 1 + validUrls.length) % validUrls.length), [validUrls.length]);
  const next = useCallback(() => setActive(i => (i + 1) % validUrls.length), [validUrls.length]);

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

  const clampedActive = Math.min(active, validUrls.length - 1);

  useEffect(() => {
    if (validUrls.length === 0) return;
    const medium = validUrls[clampedActive];
    const ajesUrl = urlsBig?.[clampedActive] ?? medium;
    const big = toBigUrl(ajesUrl);
    if (big === medium) { setBigSrc(medium); return; }
    setBigSrc(null);
    const img = new Image();
    img.onload = () => setBigSrc(big);
    img.src = big;
    return () => { img.onload = null; };
  }, [clampedActive, validUrls, urlsBig]);

  if (validUrls.length === 0) return <>{fallback ?? null}</>;

  const bgStyle = bg
    ? { background: `radial-gradient(ellipse at 50% 70%, ${bg} 0%, #08090C 100%)` }
    : {};

  return (
    <>
      <div className="gallery-main" style={{ ...bgStyle, position: "relative" }}>
        <img
          src={bigSrc ?? validUrls[clampedActive]}
          alt={alt}
          onClick={() => setLightbox(true)}
          onError={() => onError(urls.indexOf(validUrls[clampedActive]))}
          style={{ display: "block", width: "100%", height: "auto", cursor: "zoom-in" }}
        />
      </div>

      {validUrls.length > 1 && (
        <div className="gallery-thumbs">
          {validUrls.map((url, i) => (
            <div
              key={url}
              className={`gallery-thumb${i === clampedActive ? " active" : ""}`}
              onClick={() => setActive(i)}
            >
              <img
                src={url}
                alt={`фото ${i + 1}`}
                onError={() => onError(urls.indexOf(url))}
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
            src={bigSrc ?? validUrls[clampedActive]}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              width: "94vw", height: "92vh",
              objectFit: "contain",
              borderRadius: 4,
              boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
              cursor: "default",
            }}
          />

          {validUrls.length > 1 && (
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

          {validUrls.length > 1 && (
            <div style={{
              position: "absolute", bottom: 16,
              fontSize: 13, color: "rgba(255,255,255,0.5)",
              pointerEvents: "none",
            }}>
              {clampedActive + 1} / {validUrls.length}
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
