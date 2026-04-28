interface CarSilhouetteProps {
  kind?: "sedan" | "suv";
  w?: number;
  color?: string;
}

export default function CarSilhouette({ kind = "sedan", w = 320, color = "#2a2d34" }: CarSilhouetteProps) {
  if (kind === "suv") {
    return (
      <svg width={w} height={w * 0.42} viewBox="0 0 320 134" style={{ display: "block" }}>
        <defs>
          <linearGradient id="suvGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.95"/>
            <stop offset="1" stopColor="#000" stopOpacity="1"/>
          </linearGradient>
          <radialGradient id="suvRefl" cx="0.5" cy="0.1" r="0.6">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18"/>
            <stop offset="1" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="124" rx="140" ry="6" fill="rgba(0,0,0,0.5)"/>
        <path d="M 30 105 L 30 80 Q 30 60 50 56 L 100 50 Q 115 30 145 26 L 200 26 Q 225 28 245 50 L 285 56 Q 300 60 300 80 L 300 105 Z" fill="url(#suvGrad)"/>
        <path d="M 110 50 Q 122 32 145 30 L 200 30 Q 222 32 240 50 Z" fill="#0a0c12" opacity="0.85"/>
        <path d="M 30 80 L 300 80" stroke="#fff" strokeOpacity="0.06" strokeWidth="1"/>
        <ellipse cx="160" cy="50" rx="120" ry="20" fill="url(#suvRefl)"/>
        <circle cx="80" cy="108" r="18" fill="#0a0c12"/>
        <circle cx="80" cy="108" r="10" fill="#1a1d24" stroke="#3a3d44" strokeWidth="1"/>
        <circle cx="240" cy="108" r="18" fill="#0a0c12"/>
        <circle cx="240" cy="108" r="10" fill="#1a1d24" stroke="#3a3d44" strokeWidth="1"/>
        <rect x="288" y="76" width="10" height="6" rx="1" fill="#C8A45C" opacity="0.5"/>
        <rect x="22" y="76" width="10" height="6" rx="1" fill="#fff" opacity="0.3"/>
      </svg>
    );
  }
  return (
    <svg width={w} height={w * 0.34} viewBox="0 0 320 108" style={{ display: "block" }}>
      <defs>
        <linearGradient id="sedGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95"/>
          <stop offset="1" stopColor="#000" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id="sedRefl" cx="0.5" cy="0.1" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#fff" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="100" rx="140" ry="5" fill="rgba(0,0,0,0.5)"/>
      <path d="M 20 86 L 22 70 Q 28 58 60 54 L 95 50 Q 110 30 145 26 L 195 26 Q 230 30 245 50 L 280 54 Q 296 58 300 70 L 300 86 Z" fill="url(#sedGrad)"/>
      <path d="M 100 50 Q 113 32 142 30 L 198 30 Q 227 32 240 50 Z" fill="#0a0c12" opacity="0.85"/>
      <path d="M 22 70 L 300 70" stroke="#fff" strokeOpacity="0.06" strokeWidth="1"/>
      <ellipse cx="160" cy="46" rx="115" ry="16" fill="url(#sedRefl)"/>
      <circle cx="80" cy="88" r="14" fill="#0a0c12"/>
      <circle cx="80" cy="88" r="8" fill="#1a1d24" stroke="#3a3d44" strokeWidth="1"/>
      <circle cx="240" cy="88" r="14" fill="#0a0c12"/>
      <circle cx="240" cy="88" r="8" fill="#1a1d24" stroke="#3a3d44" strokeWidth="1"/>
      <rect x="288" y="68" width="10" height="5" rx="1" fill="#C8A45C" opacity="0.5"/>
      <rect x="22" y="68" width="10" height="5" rx="1" fill="#fff" opacity="0.3"/>
    </svg>
  );
}
