"use client";

import React, { useState, useEffect } from "react";

const API = "";

interface Tariffs {
  jpy_to_rub: number; krw_to_rub: number; cny_to_rub: number; eur_to_rub: number;
  customs_rate: number; customs_coef_new: number; customs_coef_mid: number; customs_coef_old: number;
  delivery_japan: number; delivery_korea: number; delivery_china: number; services: number;
  freight_japan_jpy: number;
  recycling_fee_new: number; recycling_fee_old: number;
  broker_fee: number; bank_commission: number; lab_docs: number;
  storage_fee: number; local_delivery: number; registration_fee: number;
  delivery_omsk: number; company_commission: number;
}
interface Stats { total_cars: number; delivered: number; cheaper_percent: number; avg_days: number; }
interface User { id: number; username: string; created_at: string; }
interface CityItem { id: number; city_name: string; cost_rub: number; }
interface CustomsPreview {
  jpy_to_rub?: number | null;
  eur_to_rub?: number | null;
  customs_coef_mid?: number | null;
  customs_coef_old?: number | null;
  rates_mid: number[][];
  rates_old: number[][];
}

const RATE_FIELDS: { key: keyof Tariffs; label: string; step: number; note: string }[] = [
  { key: "jpy_to_rub", label: "JPY → ₽", step: 0.001,  note: "1 японская иена" },
  { key: "krw_to_rub", label: "KRW → ₽", step: 0.0001, note: "1 корейская вона" },
  { key: "cny_to_rub", label: "CNY → ₽", step: 0.01,   note: "1 китайский юань" },
  { key: "eur_to_rub", label: "EUR → ₽", step: 0.1,    note: "Для расчёта таможни ФТС" },
];

const FREIGHT_FIELDS: { key: keyof Tariffs; label: string; step: number; note?: string }[] = [
  { key: "freight_japan_jpy", label: "Фрахт из Японии, ¥",              step: 1000, note: "В иенах, конвертируется по курсу" },
  { key: "delivery_korea",    label: "Доставка Корея → Владивосток, ₽", step: 1000 },
  { key: "delivery_china",    label: "Доставка Китай → Владивосток, ₽", step: 1000 },
  { key: "delivery_omsk",     label: "Доставка до Омска (умолч.), ₽",   step: 1000, note: "Используется в карточках каталога" },
];

const SERVICE_FIELDS: { key: keyof Tariffs; label: string; step: number; note?: string }[] = [
  { key: "recycling_fee_new",  label: "Утилизационный сбор (до 3 лет), ₽", step: 100 },
  { key: "recycling_fee_old",  label: "Утилизационный сбор (>3 лет), ₽",   step: 100 },
  { key: "broker_fee",         label: "Услуги брокера, ₽",                  step: 1000 },
  { key: "bank_commission",    label: "Комиссия за банковские переводы, ₽", step: 100 },
  { key: "lab_docs",           label: "Лаборатория, ЕПТС, СБКТС, ₽",       step: 1000 },
  { key: "storage_fee",        label: "Склад Временного Хранения (СВХ), ₽", step: 1000 },
  { key: "local_delivery",     label: "Перегон по Владивостоку, ₽",         step: 500 },
  { key: "registration_fee",   label: "Прописка, ИНН, ₽",                   step: 500 },
  { key: "company_commission", label: "Комиссия компании и подготовка, ₽",  step: 1000 },
];

const CUSTOMS_FIELDS: { key: keyof Tariffs; label: string; step: number; note?: string }[] = [
  { key: "customs_rate",     label: "Запасная ставка таможни", step: 0.001, note: "Если объём двигателя не указан" },
  { key: "customs_coef_new", label: "Коэф. таможни: < 3 лет", step: 0.01 },
  { key: "customs_coef_mid", label: "Коэф. таможни: 3–5 лет", step: 0.01 },
  { key: "customs_coef_old", label: "Коэф. таможни: > 5 лет", step: 0.01 },
];

const s = {
  page:    { minHeight: "100vh", background: "#0d0f14", display: "flex" } as React.CSSProperties,
  sidebar: { width: 220, background: "#0a0c10", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "32px 0", display: "flex", flexDirection: "column", flexShrink: 0 } as React.CSSProperties,
  content: { flex: 1, padding: "40px 48px", overflowY: "auto" } as React.CSSProperties,
  card:    { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "20px 24px" } as React.CSSProperties,
  label:   { fontSize: 12, color: "rgba(245,243,238,0.45)", marginBottom: 6, display: "block", letterSpacing: "0.08em", textTransform: "uppercase" } as React.CSSProperties,
  input:   { width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f5f3ee", fontSize: 15, outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  statVal: { fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "#c8a45c", lineHeight: 1 } as React.CSSProperties,
  statLbl: { fontSize: 12, color: "rgba(245,243,238,0.45)", marginTop: 6, letterSpacing: "0.06em" } as React.CSSProperties,
  sectionTitle: { fontSize: 14, color: "#c8a45c", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, marginTop: 28 } as React.CSSProperties,
};

type Tab = "overview" | "calculator" | "cities" | "customs" | "users";

interface FieldGroupProps {
  fields: { key: keyof Tariffs; label: string; step: number; note?: string }[];
  cols?: number;
  tariffs: Tariffs;
  onChange: (key: keyof Tariffs, val: string) => void;
}

function FieldGroup({ fields, cols = 2, tariffs, onChange }: FieldGroupProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 8 }}>
      {fields.map(({ key, label, step, note }) => (
        <div key={key} style={s.card}>
          <label style={s.label}>{label}{note && <span style={{ opacity: 0.5 }}> — {note}</span>}</label>
          <input type="number" step={step} value={tariffs[key]} onChange={e => onChange(key, e.target.value)} style={s.input}/>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe]             = useState("");
  const [authed, setAuthed]     = useState(false);
  const [tab, setTab]           = useState<Tab>("overview");
  const [loginErr, setLoginErr] = useState("");

  const [tariffs, setTariffs]   = useState<Tariffs | null>(null);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [users, setUsers]       = useState<User[]>([]);
  const [cities, setCities]     = useState<CityItem[]>([]);
  const [cityEdits, setCityEdits] = useState<Record<number, number>>({});
  const [citySaving, setCitySaving] = useState<Record<number, boolean>>({});
  const [citySaved, setCitySaved]   = useState<Record<number, boolean>>({});

  const [customsPreview, setCustomsPreview] = useState<CustomsPreview | null>(null);
  const [customsUrl, setCustomsUrl]         = useState("");
  const [customsImporting, setCustomsImporting] = useState(false);
  const [customsSaveStatus, setCustomsSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [customsImportErr, setCustomsImportErr] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [saveError, setSaveError]   = useState("");

  const [newUser, setNewUser]   = useState({ username: "", password: "" });
  const [userErr, setUserErr]   = useState("");
  const [userOk, setUserOk]     = useState("");

  useEffect(() => {
    const u = sessionStorage.getItem("admin_me");
    if (u) { setMe(u); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch(`${API}/api/tariffs`).then(r => r.json()).then(setTariffs).catch(() => {});
    fetch(`${API}/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/api/admin/users`, { credentials: "include" }).then(r => r.json()).then(setUsers).catch(() => {});
    fetch(`${API}/api/cities`).then(r => r.json()).then((data: CityItem[]) => {
      setCities(data);
      const edits: Record<number, number> = {};
      data.forEach(c => { edits[c.id] = c.cost_rub; });
      setCityEdits(edits);
    }).catch(() => {});
  }, [authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    try {
      const r = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) { const j = await r.json(); setLoginErr(j.detail || "Ошибка"); return; }
      const { username: u } = await r.json();
      sessionStorage.setItem("admin_me", u);
      setMe(u); setAuthed(true);
    } catch { setLoginErr("Сервер недоступен"); }
  }

  async function logout() {
    await fetch(`${API}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    sessionStorage.removeItem("admin_me");
    setAuthed(false); setMe(""); setTariffs(null); setStats(null); setUsers([]); setCities([]); setCustomsPreview(null);
  }

  function change(key: keyof Tariffs, val: string) {
    if (!tariffs) return;
    setTariffs({ ...tariffs, [key]: parseFloat(val) || 0 });
  }

  async function saveTariffs(e: React.FormEvent) {
    e.preventDefault();
    if (!tariffs) return;
    setSaveStatus("saving"); setSaveError("");
    try {
      const r = await fetch(`${API}/api/tariffs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(tariffs),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) { setSaveError(err.message); setSaveStatus("error"); }
  }

  async function saveCity(city: CityItem) {
    const cost = cityEdits[city.id] ?? city.cost_rub;
    setCitySaving(prev => ({ ...prev, [city.id]: true }));
    try {
      const r = await fetch(`${API}/api/cities/${city.id}?cost_rub=${cost}`, {
        method: "PUT",
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      setCities(cs => cs.map(c => c.id === city.id ? { ...c, cost_rub: cost } : c));
      setCitySaved(prev => ({ ...prev, [city.id]: true }));
      setTimeout(() => setCitySaved(prev => ({ ...prev, [city.id]: false })), 2000);
    } catch {}
    setCitySaving(prev => ({ ...prev, [city.id]: false }));
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setUserErr(""); setUserOk("");
    try {
      const r = await fetch(`${API}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newUser),
      });
      const j = await r.json();
      if (!r.ok) { setUserErr(j.detail); return; }
      setUsers(u => [...u, { id: j.id, username: j.username, created_at: new Date().toISOString() }]);
      setNewUser({ username: "", password: "" });
      setUserOk(`Пользователь ${j.username} создан`);
    } catch { setUserErr("Ошибка сети"); }
  }

  async function deleteUser(id: number) {
    if (!confirm("Удалить пользователя?")) return;
    const r = await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) setUsers(u => u.filter(x => x.id !== id));
    else { const j = await r.json(); alert(j.detail); }
  }

  async function importFromGsheet() {
    if (!customsUrl.trim()) return;
    setCustomsImporting(true);
    setCustomsImportErr("");
    setCustomsPreview(null);
    try {
      const r = await fetch(`${API}/api/admin/customs/preview-gsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: customsUrl }),
      });
      const j = await r.json();
      if (!r.ok) { setCustomsImportErr(j.detail || "Ошибка"); return; }
      setCustomsPreview(j);
    } catch { setCustomsImportErr("Ошибка сети"); }
    setCustomsImporting(false);
  }

  async function importFromExcel(file: File) {
    setCustomsImporting(true);
    setCustomsImportErr("");
    setCustomsPreview(null);
    try {
      const buf = await file.arrayBuffer();
      const r = await fetch(`${API}/api/admin/customs/preview-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        credentials: "include",
        body: buf,
      });
      const j = await r.json();
      if (!r.ok) { setCustomsImportErr(j.detail || "Ошибка"); return; }
      setCustomsPreview(j);
    } catch { setCustomsImportErr("Ошибка сети"); }
    setCustomsImporting(false);
  }

  async function applyCustomsPreview() {
    if (!customsPreview) return;
    setCustomsSaveStatus("saving");
    try {
      const r = await fetch(`${API}/api/admin/customs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(customsPreview),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      setCustomsSaveStatus("saved");
      if (customsPreview.jpy_to_rub && tariffs) setTariffs(t => t ? { ...t, jpy_to_rub: customsPreview.jpy_to_rub! } : t);
      if (customsPreview.eur_to_rub && tariffs) setTariffs(t => t ? { ...t, eur_to_rub: customsPreview.eur_to_rub! } : t);
      setTimeout(() => setCustomsSaveStatus("idle"), 3000);
    } catch { setCustomsSaveStatus("error"); }
  }


  if (!authed) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0f14" }}>
        <form onSubmit={login} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 40, borderRadius: 12, minWidth: 340 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#c8a45c", letterSpacing: "0.14em", marginBottom: 24 }}>ВОСТОК · ADMIN</div>
          <h2 style={{ fontSize: 20, color: "#f5f3ee", marginBottom: 28 }}>Вход в панель</h2>
          <label style={s.label}>Логин</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={{ ...s.input, marginBottom: 14 }} required autoFocus autoComplete="username"/>
          <label style={s.label}>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...s.input, marginBottom: 20 }} required autoComplete="current-password"/>
          {loginErr && <p style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12 }}>{loginErr}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Войти</button>
        </form>
      </main>
    );
  }

  const NavItem = ({ id, label }: { id: Tab; label: string }) => (
    <button onClick={() => setTab(id)} style={{
      display: "block", width: "100%", textAlign: "left", padding: "12px 24px",
      background: tab === id ? "rgba(200,164,92,0.1)" : "none",
      borderLeft: `3px solid ${tab === id ? "#c8a45c" : "transparent"}`,
      color: tab === id ? "#c8a45c" : "rgba(245,243,238,0.5)",
      fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none",
      fontFamily: "var(--font-sans)", transition: "all 150ms ease",
    }}>{label}</button>
  );

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <div style={{ padding: "0 24px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#c8a45c", letterSpacing: "0.14em" }}>ВОСТОК</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "rgba(245,243,238,0.4)", letterSpacing: "0.2em", marginTop: 3 }}>ADMIN PANEL</div>
        </div>
        <nav style={{ flex: 1 }}>
          <NavItem id="overview"   label="Общая информация"/>
          <NavItem id="calculator" label="Калькулятор"/>
          <NavItem id="cities"     label="Доставка по городам"/>
          <NavItem id="customs"    label="Таможенные ставки"/>
          <NavItem id="users"      label="Пользователи"/>
        </nav>
        <div style={{ padding: "0 16px 0" }}>
          <div style={{ fontSize: 11, color: "rgba(245,243,238,0.3)", marginBottom: 8, paddingLeft: 8 }}>{me}</div>
          <button onClick={logout} style={{ width: "100%", fontSize: 12, color: "rgba(245,243,238,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Выйти
          </button>
        </div>
      </aside>

      <main style={s.content}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 32 }}>Общая информация</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
              {[
                { val: stats?.total_cars ?? "—",           lbl: "Машин в каталоге" },
                { val: stats?.delivered ?? "—",             lbl: "Доставлено клиентам" },
                { val: `${stats?.cheaper_percent ?? "—"}%`, lbl: "Дешевле рынка" },
                { val: `${stats?.avg_days ?? "—"} дн.`,    lbl: "Средний срок" },
              ].map(({ val, lbl }) => (
                <div key={lbl} style={s.card}>
                  <div style={s.statVal}>{val}</div>
                  <div style={s.statLbl}>{lbl}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Актуальные курсы (ЦБ РФ)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {tariffs && [
                { label: "1 JPY", val: `${tariffs.jpy_to_rub.toFixed(4)} ₽` },
                { label: "1 KRW", val: `${tariffs.krw_to_rub.toFixed(5)} ₽` },
                { label: "1 CNY", val: `${tariffs.cny_to_rub.toFixed(3)} ₽` },
                { label: "1 EUR", val: `${tariffs.eur_to_rub.toFixed(2)} ₽` },
              ].map(({ label, val }) => (
                <div key={label} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "rgba(245,243,238,0.5)" }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#f5f3ee", fontFamily: "var(--font-display)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALCULATOR */}
        {tab === "calculator" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 8 }}>Настройки калькулятора</h2>
            <p style={{ fontSize: 13, color: "rgba(245,243,238,0.4)", marginBottom: 24 }}>Курсы обновляются автоматически каждые 60 сек с ЦБ РФ.</p>
            {tariffs && (
              <form onSubmit={saveTariffs}>
                <h3 style={s.sectionTitle as any}>Курсы валют</h3>
                <FieldGroup fields={RATE_FIELDS} tariffs={tariffs} onChange={change}/>

                <h3 style={s.sectionTitle as any}>Логистика (фрахт и доставка)</h3>
                <FieldGroup fields={FREIGHT_FIELDS} tariffs={tariffs} onChange={change}/>

                <h3 style={s.sectionTitle as any}>Услуги и сборы</h3>
                <FieldGroup fields={SERVICE_FIELDS} tariffs={tariffs} onChange={change}/>

                <h3 style={s.sectionTitle as any}>Таможенные коэффициенты (резервные)</h3>
                <p style={{ fontSize: 12, color: "rgba(245,243,238,0.35)", marginBottom: 12 }}>
                  Применяются только если объём двигателя не указан. При наличии объёма используются таблицы ФТС.
                </p>
                <FieldGroup fields={CUSTOMS_FIELDS} tariffs={tariffs} onChange={change}/>

                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 32 }}>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={saveStatus === "saving"}>
                    {saveStatus === "saving" ? "Сохранение…" : "Сохранить всё"}
                  </button>
                  {saveStatus === "saved" && <span style={{ color: "#4caf50", fontSize: 14 }}>✓ Сохранено</span>}
                  {saveStatus === "error"  && <span style={{ color: "#ff6b6b", fontSize: 14 }}>{saveError}</span>}
                </div>
              </form>
            )}
          </div>
        )}

        {/* CITIES */}
        {tab === "cities" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 8 }}>Доставка по городам</h2>
            <p style={{ fontSize: 13, color: "rgba(245,243,238,0.4)", marginBottom: 32 }}>
              Стоимость доставки от Владивостока до каждого города. 0 = бесплатно (включено в базовый расчёт).
            </p>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Город", "Стоимость доставки, ₽", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "rgba(245,243,238,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cities.map(city => (
                    <tr key={city.id}>
                      <td style={{ padding: "10px 12px", color: "#f5f3ee", fontWeight: 500, fontSize: 14, width: "40%" }}>{city.city_name}</td>
                      <td style={{ padding: "10px 12px", width: "35%" }}>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={cityEdits[city.id] ?? city.cost_rub}
                          onChange={e => setCityEdits(ed => ({ ...ed, [city.id]: parseInt(e.target.value) || 0 }))}
                          style={{ ...s.input, width: 180 }}
                        />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {citySaved[city.id]
                          ? <span style={{ color: "#4caf50", fontSize: 13 }}>✓ Сохранено</span>
                          : (
                            <button
                              onClick={() => saveCity(city)}
                              disabled={citySaving[city.id]}
                              className="btn btn-primary"
                              style={{ fontSize: 13, padding: "6px 16px" }}
                            >
                              {citySaving[city.id] ? "…" : "Сохранить"}
                            </button>
                          )
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMS */}
        {tab === "customs" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 8 }}>Таможенные ставки ФТС</h2>
            <p style={{ fontSize: 13, color: "rgba(245,243,238,0.4)", marginBottom: 32, maxWidth: "64ch" }}>
              Загрузите Google Sheets или Excel-файл с таблицей ставок. Формат ячеек — как в исходной таблице:
              A2=JPY/RUB, B2=EUR/RUB, C2=коэф.&nbsp;3–5&nbsp;лет, E2=коэф.&nbsp;5+&nbsp;лет,
              строки 5+: A=объём&nbsp;cc, B=ставка&nbsp;3–5&nbsp;лет, D=ставка&nbsp;5+&nbsp;лет.
            </p>

            {/* Import controls */}
            <div style={{ ...s.card, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, color: "#c8a45c", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                Источник данных
              </h3>

              <label style={s.label}>Ссылка на Google Sheets</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={customsUrl}
                  onChange={e => setCustomsUrl(e.target.value)}
                  style={{ ...s.input, flex: 1 }}
                />
                <button
                  onClick={importFromGsheet}
                  disabled={customsImporting}
                  className="btn btn-primary"
                  style={{ flexShrink: 0 }}
                >
                  {customsImporting ? "Загрузка…" : "Загрузить"}
                </button>
              </div>

              <label style={s.label}>Или загрузить Excel-файл (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={e => { const f = e.target.files?.[0]; if (f) importFromExcel(f); }}
                style={{ fontSize: 13, color: "rgba(245,243,238,0.6)" }}
              />

              {customsImportErr && (
                <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 12 }}>{customsImportErr}</p>
              )}
            </div>

            {/* Preview */}
            {customsPreview && (
              <div>
                <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Предпросмотр</h3>

                {/* Parsed meta values */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "JPY/RUB", val: customsPreview.jpy_to_rub },
                    { label: "EUR/RUB", val: customsPreview.eur_to_rub },
                    { label: "Коэф. 3–5 лет", val: customsPreview.customs_coef_mid },
                    { label: "Коэф. 5+ лет", val: customsPreview.customs_coef_old },
                  ].filter(x => x.val != null).map(({ label, val }) => (
                    <div key={label} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(245,243,238,0.5)" }}>{label}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#f5f3ee" }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Rate tables */}
                {([
                  { key: "rates_mid", title: "3–5 лет (EUR/куб.см)" },
                  { key: "rates_old", title: "Старше 5 лет (EUR/куб.см)" },
                ] as const).map(({ key, title }) => (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: "#c8a45c", fontWeight: 600, marginBottom: 8 }}>{title}</div>
                    <div style={s.card}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Объём от, куб.см", "Объём до, куб.см", "Ставка EUR/куб.см"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 11, color: "rgba(245,243,238,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {customsPreview[key].map((row, i) => (
                            <tr key={i}>
                              <td style={{ padding: "7px 12px", color: "rgba(245,243,238,0.6)", fontSize: 13 }}>{row[0]}</td>
                              <td style={{ padding: "7px 12px", color: "rgba(245,243,238,0.6)", fontSize: 13 }}>{row[1] >= 99999 ? "∞" : row[1]}</td>
                              <td style={{ padding: "7px 12px", color: "#f5f3ee", fontWeight: 600, fontSize: 13 }}>{row[2]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
                  <button onClick={applyCustomsPreview} disabled={customsSaveStatus === "saving"} className="btn btn-primary btn-lg">
                    {customsSaveStatus === "saving" ? "Сохранение…" : "Применить и сохранить"}
                  </button>
                  {customsSaveStatus === "saved" && <span style={{ color: "#4caf50", fontSize: 14 }}>✓ Сохранено</span>}
                  {customsSaveStatus === "error"  && <span style={{ color: "#ff6b6b", fontSize: 14 }}>Ошибка</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 32 }}>Пользователи</h2>
            <div style={{ ...s.card, marginBottom: 32 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ID", "Логин", "Дата создания", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "rgba(245,243,238,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: "12px 12px", color: "rgba(245,243,238,0.4)", fontSize: 13 }}>{u.id}</td>
                      <td style={{ padding: "12px 12px", color: "#f5f3ee", fontWeight: 600 }}>{u.username} {u.username === me && <span style={{ fontSize: 10, color: "#c8a45c", marginLeft: 6 }}>вы</span>}</td>
                      <td style={{ padding: "12px 12px", color: "rgba(245,243,238,0.4)", fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString("ru")}</td>
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        {u.username !== me && (
                          <button onClick={() => deleteUser(u.id)} style={{ fontSize: 12, color: "#ff6b6b", background: "none", border: "1px solid rgba(255,100,100,0.2)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Добавить пользователя</h3>
            <form onSubmit={addUser} style={{ ...s.card, display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 560 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Логин</label>
                <input value={newUser.username} onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))} style={s.input} required autoComplete="off"/>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Пароль (мин. 8 символов)</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} style={s.input} required minLength={8} autoComplete="new-password"/>
              </div>
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Создать</button>
            </form>
            {userErr && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 10 }}>{userErr}</p>}
            {userOk  && <p style={{ color: "#4caf50", fontSize: 13, marginTop: 10 }}>✓ {userOk}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
