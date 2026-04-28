// Catalog screen
const Catalog = ({ onOpenCar }) => {
  const [country, setCountry] = React.useState("all");
  const [body, setBody] = React.useState(new Set());
  const [sort, setSort] = React.useState("popular");

  let cars = [...window.CARS];
  if (country !== "all") cars = cars.filter(c => c.country === country);
  if (body.size) cars = cars.filter(c => body.has(c.body));
  if (sort === "price-asc") cars.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") cars.sort((a, b) => b.price - a.price);
  if (sort === "year") cars.sort((a, b) => b.year - a.year);

  const toggleBody = (b) => {
    const n = new Set(body); n.has(b) ? n.delete(b) : n.add(b); setBody(n);
  };

  return (
    <main data-screen-label="02 Catalog">
      <section style={{ padding: "48px 0 24px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--accent)", display: "block", marginBottom: 12 }}>Каталог</span>
          <h1 style={{ fontSize: 64 }}>{cars.length} автомобилей в&nbsp;наличии</h1>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="country-tabs">
            {["all", "japan", "china", "korea"].map(k => (
              <div key={k} className={"country-tab" + (country === k ? " active" : "")} onClick={() => setCountry(k)}>
                {k !== "all" && <img src={window.COUNTRY_FLAG[k]} alt=""/>}
                <span>{k === "all" ? "Все" : window.COUNTRY_LABEL[k]}</span>
                <span className="count">{k === "all" ? window.CARS.length : window.CARS.filter(c => c.country === k).length}</span>
              </div>
            ))}
          </div>

          <div className="catalog-layout">
            <aside className="filter-panel">
              <div className="filter-section">
                <h5>Тип кузова</h5>
                {["Седан", "Кроссовер", "Внедорожник", "Лифтбек"].map(b => (
                  <label key={b} className="check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={body.has(b)} onChange={() => toggleBody(b)}/>
                      {b}
                    </span>
                    <span className="count">{window.CARS.filter(c => c.body === b).length}</span>
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <h5>Цена, ₽</h5>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="От" style={{ fontSize: 13, padding: "10px 12px" }}/>
                  <input className="input" placeholder="До" style={{ fontSize: 13, padding: "10px 12px" }}/>
                </div>
              </div>
              <div className="filter-section">
                <h5>Год выпуска</h5>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="От" style={{ fontSize: 13, padding: "10px 12px" }}/>
                  <input className="input" placeholder="До" style={{ fontSize: 13, padding: "10px 12px" }}/>
                </div>
              </div>
              <div className="filter-section">
                <h5>Тип двигателя</h5>
                {["Бензин", "Гибрид", "Электро", "Дизель"].map(t => (
                  <label key={t} className="check">
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox"/>{t}
                    </span>
                  </label>
                ))}
              </div>
              <Button variant="dark" block style={{ marginTop: 8 }}>Применить</Button>
            </aside>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
                <span className="caption" style={{ fontSize: 14 }}>Найдено: <strong style={{ color: "var(--ink-10)" }}>{cars.length}</strong></span>
                <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 220 }}>
                  <option value="popular">Сначала популярные</option>
                  <option value="price-asc">Сначала дешевле</option>
                  <option value="price-desc">Сначала дороже</option>
                  <option value="year">Сначала новее</option>
                </select>
              </div>
              <div className="car-grid">
                {cars.map(c => <CarCard key={c.id} car={c} onOpen={onOpenCar}/>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

window.Catalog = Catalog;
