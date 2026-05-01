"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Tariffs {
  jpy_to_rub: number; krw_to_rub: number; cny_to_rub: number; eur_to_rub: number;
  customs_rate: number; customs_coef_new: number; customs_coef_mid: number; customs_coef_old: number;
  delivery_japan: number; delivery_korea: number; delivery_china: number; services: number;
}
interface Stats { total_cars: number; delivered: number; cheaper_percent: number; avg_days: number; }
interface User { id: number; username: string; created_at: string; }

const RATE_FIELDS: { key: keyof Tariffs; label: string; step: number; note: string }[] = [
  { key: "jpy_to_rub", label: "JPY → ₽", step: 0.001,  note: "1 японская иена" },
  { key: "krw_to_rub", label: "KRW → ₽", step: 0.0001, note: "1 корейская вона" },
  { key: "cny_to_rub", label: "CNY → ₽", step: 0.01,   note: "1 китайский юань" },
  { key: "eur_to_rub", label: "EUR → ₽", step: 0.1,    note: "Для расчёта таможни ФТС" },
];
const CALC_FIELDS: { key: keyof Tariffs; label: string; step: number; note?: string }[] = [
  { key: "delivery_japan",   label: "Доставка из Японии, ₽",  step: 1000 },
  { key: "delivery_korea",   label: "Доставка из Кореи, ₽",   step: 1000 },
  { key: "delivery_china",   label: "Доставка из Китая, ₽",   step: 1000 },
  { key: "services",         label: "Услуги брокера, ₽",       step: 1000 },
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
};

type Tab = "overview" | "calculator" | "users";

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken]       = useState("");
  const [me, setMe]             = useState("");
  const [authed, setAuthed]     = useState(false);
  const [tab, setTab]           = useState<Tab>("overview");
  const [loginErr, setLoginErr] = useState("");

  const [tariffs, setTariffs]   = useState<Tariffs | null>(null);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [users, setUsers]       = useState<User[]>([]);

  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [saveError, setSaveError]   = useState("");

  const [newUser, setNewUser]   = useState({ username: "", password: "" });
  const [userErr, setUserErr]   = useState("");
  const [userOk, setUserOk]     = useState("");

  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    const u = sessionStorage.getItem("admin_me");
    if (t && u) { setToken(t); setMe(u); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed) return;
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/api/tariffs`).then(r => r.json()).then(setTariffs).catch(() => {});
    fetch(`${API}/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/api/admin/users`, { headers: h }).then(r => r.json()).then(setUsers).catch(() => {});
  }, [authed, token]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    try {
      const r = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) { const j = await r.json(); setLoginErr(j.detail || "Ошибка"); return; }
      const { token: t, username: u } = await r.json();
      sessionStorage.setItem("admin_token", t);
      sessionStorage.setItem("admin_me", u);
      setToken(t); setMe(u); setAuthed(true);
    } catch { setLoginErr("Сервер недоступен"); }
  }

  async function logout() {
    await fetch(`${API}/api/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_me");
    setAuthed(false); setToken(""); setMe(""); setTariffs(null); setStats(null); setUsers([]);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(tariffs),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) { setSaveError(err.message); setSaveStatus("error"); }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setUserErr(""); setUserOk("");
    try {
      const r = await fetch(`${API}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    const r = await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setUsers(u => u.filter(x => x.id !== id));
    else { const j = await r.json(); alert(j.detail); }
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
                { val: stats?.total_cars ?? "—",          lbl: "Машин в каталоге" },
                { val: stats?.delivered ?? "—",            lbl: "Доставлено клиентам" },
                { val: `${stats?.cheaper_percent ?? "—"}%`, lbl: "Дешевле рынка" },
                { val: `${stats?.avg_days ?? "—"} дн.`,   lbl: "Средний срок" },
              ].map(({ val, lbl }) => (
                <div key={lbl} style={s.card}>
                  <div style={s.statVal}>{val}</div>
                  <div style={s.statLbl}>{lbl}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Актуальные курсы (ЦБ РФ)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 40 }}>
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
            <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Логистика и услуги</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {tariffs && [
                { label: "Доставка Япония", val: `${tariffs.delivery_japan.toLocaleString("ru")} ₽` },
                { label: "Доставка Корея",  val: `${tariffs.delivery_korea.toLocaleString("ru")} ₽` },
                { label: "Доставка Китай",  val: `${tariffs.delivery_china.toLocaleString("ru")} ₽` },
                { label: "Услуги брокера",  val: `${tariffs.services.toLocaleString("ru")} ₽` },
              ].map(({ label, val }) => (
                <div key={label} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "rgba(245,243,238,0.5)" }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#f5f3ee" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALCULATOR */}
        {tab === "calculator" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 8 }}>Настройки калькулятора</h2>
            <p style={{ fontSize: 13, color: "rgba(245,243,238,0.4)", marginBottom: 32 }}>Курсы обновляются автоматически каждые 60 сек с ЦБ РФ.</p>
            {tariffs && (
              <form onSubmit={saveTariffs}>
                <h3 style={{ fontSize: 14, color: "#c8a45c", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Курсы валют</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                  {RATE_FIELDS.map(({ key, label, step, note }) => (
                    <div key={key} style={s.card}>
                      <label style={s.label}>{label} <span style={{ opacity: 0.5 }}>{note}</span></label>
                      <input type="number" step={step} value={tariffs[key]} onChange={e => change(key, e.target.value)} style={s.input}/>
                    </div>
                  ))}
                </div>
                <h3 style={{ fontSize: 14, color: "#c8a45c", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Доставка и услуги</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                  {CALC_FIELDS.map(({ key, label, step, note }) => (
                    <div key={key} style={s.card}>
                      <label style={s.label}>{label}{note && <span style={{ opacity: 0.5 }}> — {note}</span>}</label>
                      <input type="number" step={step} value={tariffs[key]} onChange={e => change(key, e.target.value)} style={s.input}/>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={saveStatus === "saving"}>
                    {saveStatus === "saving" ? "Сохранение…" : "Сохранить"}
                  </button>
                  {saveStatus === "saved" && <span style={{ color: "#4caf50", fontSize: 14 }}>✓ Сохранено</span>}
                  {saveStatus === "error"  && <span style={{ color: "#ff6b6b", fontSize: 14 }}>{saveError}</span>}
                </div>
              </form>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <h2 style={{ fontSize: 22, color: "#f5f3ee", marginBottom: 32 }}>Пользователи</h2>

            {/* List */}
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

            {/* Add user */}
            <h3 style={{ fontSize: 16, color: "#f5f3ee", marginBottom: 16 }}>Добавить пользователя</h3>
            <form onSubmit={addUser} style={{ ...s.card, display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 560 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Логин</label>
                <input value={newUser.username} onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))} style={s.input} required autoComplete="off"/>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Пароль (мин. 6 символов)</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} style={s.input} required minLength={6} autoComplete="new-password"/>
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
