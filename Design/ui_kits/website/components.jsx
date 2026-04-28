// Vostok AutoImport — shared atoms

const Icon = ({ name, size = 20, ...rest }) => {
  const s = { width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0, ...rest.style };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></>,
    phone: <path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h2.08a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L7.6 9.6a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.1-.45c.91.36 1.85.6 2.8.72a2 2 0 0 1 1.72 2z"/>,
    car: <><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-1L17 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    star: <polygon points="12 2 15 8.5 22 9.3 17 14.3 18.2 21.5 12 18 5.8 21.5 7 14.3 2 9.3 9 8.5"/>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    layers: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name] || null}</svg>;
};

const CarSilhouette = ({ kind = "sedan", w = 320, color = "#2a2d34" }) => {
  // Stylized car silhouette (placeholder for real photography)
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
};

const CarPhotoStage = ({ tint = "#1a1d24", silhouette = "sedan", children }) => (
  <div className="stage" style={{ background: `radial-gradient(ellipse at 50% 70%, ${tint} 0%, #08090C 100%)` }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.04) 0%, transparent 50%)" }}/>
    <div className="silhouette" style={{ width: "82%" }}>
      <CarSilhouette kind={silhouette} w={300} />
    </div>
    {children}
  </div>
);

const Button = ({ variant = "primary", size, children, icon, iconAfter, block, ...rest }) => {
  const cls = ["btn", `btn-${variant}`, size === "lg" && "btn-lg", size === "sm" && "btn-sm", block && "btn-block"].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{icon}<span>{children}</span>{iconAfter}</button>;
};

const Badge = ({ kind, children }) => {
  const cls = "badge " + ({ "Хит": "badge-hit", "Новинка": "badge-new", "Premium": "badge-prem" }[kind] || "badge-hit");
  return <span className={cls}>{children || kind}</span>;
};

const CarCard = ({ car, onOpen }) => (
  <article className="car-card" onClick={() => onOpen && onOpen(car)}>
    <div className="car-photo">
      <CarPhotoStage tint={car.photoTint} silhouette={car.silhouette}/>
      <div className="badges">{car.badge && <Badge kind={car.badge}/>}</div>
      <div className="country-pin">
        <img src={window.COUNTRY_FLAG[car.country]} alt=""/>
        <span>{window.COUNTRY_LABEL[car.country]}</span>
      </div>
    </div>
    <div className="car-body">
      <div className="car-name">{car.brand} {car.model}</div>
      <div className="car-meta">{car.year} · {window.formatKm(car.mileage)} · {car.engine}</div>
      <div className="car-bottom">
        <span className="car-price">{window.formatPrice(car.price)}</span>
        <span className="car-cta">Подробнее →</span>
      </div>
    </div>
  </article>
);

Object.assign(window, { Icon, CarSilhouette, CarPhotoStage, Button, Badge, CarCard });
