export const dynamic = "force-dynamic";
import Link from "next/link";
import { getCars } from "@/lib/api";

import CarCard from "@/components/CarCard";
import CarSilhouette from "@/components/CarSilhouette";
import Icon from "@/components/Icon";
import { PHONE, EMAIL, ADDRESS, SOCIALS, formatPrice } from "@/lib/types";
import "./home.css";

const REVIEWS = [
  {
    name: "Виталий К.",
    car: "Honda",
    text: "Рад, что обратился к этой компании. За короткое время нашли машину, подходящую по моим запросам. Каждый день скидывали по несколько объявлений для выбора. По всем вопросам отвечали быстро, конкретно и понятно. Время прибытия автомобиля не менялось в течении пути. Машину оценивал эксперт в Китае. Спасибо Алексею за помощь.",
  },
  {
    name: "Вероника Г.",
    car: "Nissan Qashqai 2021",
    text: "Недавно купили Ниссан Кашкай 2021 года и остались очень довольны. Стоимость была фиксированной. Первая модель не подошла из-за недочетов, но вторую нашли быстро. Привезли в Ростовскую область. Все документы передали во время отгрузки и дали памятку по постановке на учёт. По стоимости вышло выгоднее, чем покупать здесь.",
  },
  {
    name: "Марина П.",
    car: "",
    text: "Выражаю искреннюю благодарность Алексею и Ирине за подбор автомобиля по моим критериям. За быстрое, оперативное решение всех задач. Контроль за авто на всех этапах покупки и транспортировки. Ребята, вам процветания и лёгкости в работе! Довольна на 200%! Советую обращаться без сомнения!",
  },
  {
    name: "Татьяна Я.",
    car: "Honda Vezel из Японии",
    text: "Обратилась в эту фирму по совету подруги и не пожалела. Машинку покупали с Японии Хонду Везел, всегда Алексей был со мной на связи, доставка в Омск заняла меньше двух месяцев. Машина огонь. Спасибо Алексею и Ирине. Рекомендую 100%",
  },
  {
    name: "Алексей А.",
    car: "Jeep Compass",
    text: "Обратился чтобы мне подобрали автомобиль из Китая, Кореи или Японии. Алексей подобрал варианты по моему вкусу и посоветовал что можно купить по приятным ценам. С момента выбора автомобиля до получения ключей и всей документации составило меньше месяца. Благодарю за подбор качественного автомобиля по приятной цене.",
  },
  {
    name: "Анастасия П.",
    car: "Geely Coolray из Китая",
    text: "Большое спасибо команде «Восток Авто» за помощь в импорте моего нового Geely Coolray из Китая! Особенно приятно, что итоговая стоимость была рассчитана заранее и полностью прозрачна: никаких скрытых платежей или неприятных сюрпризов. Всем, кто планирует заказывать авто из-за рубежа, смело рекомендую.",
  },
];

const PROCESS_STEPS = [
  { t: "Консультация", d: "Обсудить марку, модель, характеристики желаемого авто. Специалисты просчитывают предварительный бюджет, учитывая все затраты подбора, приобретения и доставки." },
  { t: "Договор", d: "При согласовании бюджета заключается договор. Типовой договор отправляется на согласование до подписания. Возможно подписание в офисе либо дистанционно." },
  { t: "Документы", d: "Подписание соглашения об обработке персональных данных, получение копий личных документов, необходимых для покупки и оформления авто." },
  { t: "Платёж", d: "Внесение обеспечительного платежа, подтверждающего намерения о приобретении. После этого начинается подбор авто и согласование всех нюансов." },
  { t: "Бронирование", d: "Бронирование автомобиля и выставление инвойса только после полного согласования всех параметров." },
  { t: "Сопровождение", d: "Специалисты подробно распишут все этапы сотрудничества и полностью сопроводят клиента по всем процедурам оформления." },
];

export default async function HomePage() {
  const allCars = await getCars().catch(() => []);
  const featured = [...allCars]
    .sort((a, b) => parseFloat((b as any).badge || "0") - parseFloat((a as any).badge || "0"))
    .slice(0, 6);

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"/>
        <div className="hero-car-stage">
          <CarSilhouette kind="suv" w={720} color="#1a1d24"/>
        </div>
        <div className="hero-protect"/>
        <div className="hero-inner">
          <span className="eyebrow-gold">Япония — Китай — Корея</span>
          <h1>АВТО ПОД ЗАКАЗ НА <span style={{ color: "var(--gold)" }}>30% ДЕШЕВЛЕ</span> РЫНКА</h1>
          <p className="hero-lead">
            Подберём лучший вариант по Вашим параметрам. Рассчитаем стоимость «под ключ» за&nbsp;5&nbsp;минут. Доставка за&nbsp;30&nbsp;дней.
          </p>

          <div className="search-panel">
            <div className="search-row">
              <select className="select search-select"><option>Любая марка</option><option>Toyota</option><option>Lexus</option><option>BYD</option><option>Genesis</option><option>Hyundai</option><option>Honda</option><option>Nissan</option></select>
              <select className="select search-select"><option>Любой кузов</option><option>Седан</option><option>Внедорожник</option><option>Кроссовер</option></select>
              <select className="select search-select"><option>Любая цена</option><option>До 2 млн</option><option>До 3 млн</option><option>До 5 млн</option><option>До 10 млн</option></select>
              <Link href="/catalog" className="btn btn-primary btn-lg">Найти</Link>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num">458</div>
              <div className="stat-lbl">Довольных клиентов</div>
            </div>
            <div className="stat">
              <div className="stat-num">30<span style={{ color: "var(--gold)" }}>%</span></div>
              <div className="stat-lbl">Дешевле рынка</div>
            </div>
            <div className="stat">
              <div className="stat-num">3</div>
              <div className="stat-lbl">Страны импорта</div>
            </div>
            <div className="stat">
              <div className="stat-num">30 <span style={{ color: "var(--gold)" }}>дн.</span></div>
              <div className="stat-lbl">Под ключ</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section">
        <div className="container">
          <div className="section-head section-head-flex">
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Витрина</span>
              <h2>Актуальные предложения</h2>
            </div>
            <Link href="/catalog" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Весь каталог <Icon name="arrow" size={16}/>
            </Link>
          </div>
          <div className="car-grid">
            {featured.map(car => <CarCard key={car.id} car={car}/>)}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section" style={{ background: "var(--ink-95)" }}>
        <div className="container">
          <div className="about-grid">
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>О компании</span>
              <h2 style={{ marginBottom: 24 }}>Восток Авто Импорт</h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--fg-soft)", marginBottom: 20 }}>
                Мы специализируемся на подборе, покупке и доставке автомобилей из Японии, Китая и Кореи. Наша компания стремится предоставить клиентам лучшие предложения на рынке, высокий уровень сервиса и надёжность.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--fg-soft)" }}>
                Работаем напрямую с поставщиками. Имеем надёжных партнёров в странах-импортёрах. Привлекаем независимых экспертов для оценки состояния автомобилей перед покупкой. Обеспечиваем прозрачность сделок и соблюдение всех норм и стандартов.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { t: "Широкий выбор", d: "Привозим лучшие автомобили из Японии, Китая и Кореи — большой выбор моделей и марок." },
                { t: "Выгодные цены", d: "Конкурентоспособны благодаря прямым связям с поставщиками и оптимизации логистики." },
                { t: "Качественный сервис", d: "Высокий уровень обслуживания на всех этапах: от выбора авто до доставки и оформления." },
              ].map(({ t, d }) => (
                <div key={t} style={{ padding: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Icon name="check" size={16} style={{ color: "var(--accent)", flexShrink: 0 }}/>
                    <strong style={{ fontSize: 15 }}>{t}</strong>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--fg-muted)", marginLeft: 26 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COUNTRIES */}
      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Направления</span>
            <h2>Откуда привозим</h2>
          </div>
          <div className="countries-grid">
            {[
              {
                key: "japan",
                title: "Япония",
                text: "Компания Восток Авто Импорт привезёт любой автомобиль, представленный на аукционных площадках Японии. Подбор авто и участие в аукционе осуществляется после заключения договора и внесения обеспечительного платежа, а также согласования технических параметров, бюджета и аукционного листа.",
              },
              {
                key: "china",
                title: "Китай",
                text: "За последние годы Китай стал одним из главных центров автомобильного производства в мире. На авторынке Китая представлены не только китайские бренды, но также европейские и американские. Компания Восток Авто Импорт привезёт любой автомобиль, представленный на торговых площадках Китая.",
              },
              {
                key: "korea",
                title: "Южная Корея",
                text: "Корейские марки авто пользуются популярностью у автолюбителей России, поскольку отличаются повышенной надёжностью и вниманием к деталям. Российских потребителей привлекает доступная цена, высокое качество сборки, а также долговечность комплектующих.",
              },
            ].map(({ key, title, text }) => (
              <div key={key} className="country-card">
                <div className="country-card-flag">
                  <img src={`/flags/${key}.svg`} alt={title} width={48} height={32}/>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href={`/catalog?country=${key}`} className="btn btn-ghost" style={{ marginTop: 16, display: "inline-flex", gap: 6, alignItems: "center", padding: "12px 0" }}>
                  Смотреть авто из {title === "Южная Корея" ? "Кореи" : title === "Япония" ? "Японии" : "Китая"} <Icon name="arrow" size={14}/>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS TEASER */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow-gold" style={{ marginBottom: 12 }}>6 шагов · 30 дней</span>
            <h2>Как мы работаем</h2>
          </div>
          <div className="steps steps-home">
            {PROCESS_STEPS.map((s, i) => (
              <div className="step" key={i}>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/process" className="btn btn-lg" style={{ background: "var(--accent)", color: "#fff", display: "inline-flex", gap: 8, alignItems: "center" }}>
              Подробнее о процессе <Icon name="arrow" size={16}/>
            </Link>
          </div>
        </div>
      </section>

      {/* CALCULATOR TEASER */}
      <section className="section">
        <div className="container">
          <div className="calc-teaser">
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Калькулятор</span>
              <h2 style={{ marginBottom: 24 }}>Узнайте полную стоимость за&nbsp;5&nbsp;минут</h2>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--fg-soft)", marginBottom: 32 }}>
                Аукционная цена, налоги, доставка, услуги&nbsp;— всё в&nbsp;одном расчёте. Никаких скрытых платежей и&nbsp;неприятных сюрпризов.
              </p>
              <Link href="/calculator" className="btn btn-primary btn-lg" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                Рассчитать <Icon name="arrow" size={16}/>
              </Link>
            </div>
            <div className="calc-preview">
              {[
                { k: "Аукционная цена", v: "1 850 000 ₽" },
                { k: "Доставка и страхование", v: "180 000 ₽" },
                { k: "Растаможка", v: "240 000 ₽" },
                { k: "Услуги «Восток»", v: "80 000 ₽" },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <span style={{ color: "var(--fg-muted)" }}>{k}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Итого под ключ</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent)" }}>2 350 000 ₽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="section" style={{ background: "var(--ink-95)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>Отзывы</span>
            <h2>Что говорят клиенты</h2>
          </div>
          <div className="reviews-grid">
            {REVIEWS.map((r) => (
              <div key={r.name} className="review-card">
                <div className="review-stars">★★★★★</div>
                <p className="review-text">«{r.text}»</p>
                <div className="review-author">
                  <strong>{r.name}</strong>
                  {r.car && <span>{r.car}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ fontSize: 14, color: "var(--fg-muted)", marginBottom: 16 }}>Больше отзывов на картах</p>
            <div className="review-platforms">
              <a href="https://2gis.ru/omsk/firm/70000001099829664/tab/reviews" target="_blank" rel="noopener noreferrer" className="platform-btn">
                <span className="platform-icon platform-2gis">2</span>
                <span>
                  <span className="platform-name">2ГИС</span>
                  <span className="platform-sub">Читать отзывы →</span>
                </span>
              </a>
              <a href="https://yandex.ru/maps/org/vostok_avto_import/142304072848/reviews/" target="_blank" rel="noopener noreferrer" className="platform-btn">
                <span className="platform-icon platform-yandex">Я</span>
                <span>
                  <span className="platform-name">Яндекс Карты</span>
                  <span className="platform-sub">Читать отзывы →</span>
                </span>
              </a>
              <a href="https://maps.app.goo.gl/pMMUHuzSX1jm7fiE7" target="_blank" rel="noopener noreferrer" className="platform-btn">
                <span className="platform-icon platform-google">G</span>
                <span>
                  <span className="platform-name">Google Maps</span>
                  <span className="platform-sub">Читать отзывы →</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section-tight" style={{ background: "var(--ink-05)" }}>
        <div className="container cta-bar">
          <div>
            <span className="eyebrow-gold" style={{ marginBottom: 8 }}>Звонок бесплатный · ежедневно</span>
            <div className="cta-phone">{PHONE}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "rgba(245,243,238,0.6)" }}>{EMAIL} · {ADDRESS}</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-primary btn-lg" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Icon name="phone" size={18}/>
              Позвонить
            </a>
            <a href={SOCIALS.max} target="_blank" rel="noopener noreferrer" className="btn btn-lg" style={{ borderColor: "var(--gold)", color: "var(--gold)", background: "transparent", border: "1px solid var(--gold)", display: "inline-flex", gap: 8, alignItems: "center" }}>
              Max
            </a>
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-lg" style={{ borderColor: "rgba(245,243,238,0.3)", color: "#fff", background: "transparent", border: "1px solid rgba(245,243,238,0.3)", display: "inline-flex", gap: 8, alignItems: "center" }}>
              Telegram
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
