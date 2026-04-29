import { PHONE, SOCIALS } from "@/lib/types";
import Icon from "@/components/Icon";
import Link from "next/link";

const STEPS = [
  {
    t: "Консультация и обсуждение",
    d: "Обсудить марку, модель, характеристики желаемого авто. Специалисты просчитывают предварительный бюджет, учитывая все затраты подбора, приобретения и доставки.",
    days: "День 1",
  },
  {
    t: "Заключение договора",
    d: "При согласовании бюджета заключается договор. Типовой договор отправляется на согласование до подписания. Возможно подписание в офисе либо дистанционно.",
    days: "День 2–3",
  },
  {
    t: "Подготовка документов",
    d: "Подписание соглашения об обработке персональных данных, получение копий личных документов, необходимых для покупки и оформления авто.",
    days: "День 3–5",
  },
  {
    t: "Обеспечительный платёж",
    d: "Внесение платежа, подтверждающего намерения о приобретении. После этого начинается подбор авто и согласование всех нюансов.",
    days: "День 5",
  },
  {
    t: "Бронирование и инвойс",
    d: "Бронирование автомобиля и выставление инвойса только после полного согласования всех параметров.",
    days: "День 6–10",
  },
  {
    t: "Сопровождение процесса",
    d: "Специалисты подробно распишут все этапы сотрудничества и полностью сопроводят клиента по всем процедурам оформления до получения ключей.",
    days: "До 30 дней",
  },
];

export default function ProcessPage() {
  return (
    <main>
      <section className="section section-dark" style={{ background: "var(--ink-10)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 64px" }}>
            <span className="eyebrow-gold" style={{ marginBottom: 16 }}>6 шагов · 30 дней в среднем</span>
            <h1 style={{ fontSize: 80, lineHeight: 0.95 }}>КАК МЫ РАБОТАЕМ</h1>
            <p style={{ marginTop: 24, fontSize: 18, color: "rgba(245,243,238,0.75)" }}>
              Прозрачный процесс от&nbsp;первого звонка до&nbsp;ключей в&nbsp;руке. Без скрытых платежей и&nbsp;неприятных сюрпризов.
            </p>
          </div>
          <div className="steps" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {STEPS.map((s, i) => (
              <div className="step" key={i}>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
                <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>{s.days}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", marginBottom: 48 }}>Почему выбирают нас</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {[
              { icon: "shield" as const, t: "Гарантия на документы", d: "Все документы оформляются в полном соответствии с законодательством РФ. Мы несём ответственность за каждую сделку." },
              { icon: "clock" as const, t: "Фиксированные сроки", d: "Средний срок «под ключ» — 30 дней. Вы видите отчёты с каждого этапа в реальном времени." },
              { icon: "layers" as const, t: "Прозрачная стоимость", d: "Все расходы рассчитываются до аукциона. Никаких скрытых платежей и неприятных сюрпризов." },
              { icon: "check" as const, t: "Прямые контракты", d: "Работаем напрямую с японскими, корейскими и китайскими аукционами и дилерами. Без посредников." },
            ].map(({ icon, t, d }) => (
              <div key={t} style={{ padding: 24, border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                <div style={{ width: 48, height: 48, background: "var(--accent-soft)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon name={icon} size={24} style={{ color: "var(--accent)" }}/>
                </div>
                <h4 style={{ marginBottom: 8 }}>{t}</h4>
                <p style={{ fontSize: 14, color: "var(--fg-soft)" }}>{d}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 64, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-primary btn-lg" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Icon name="phone" size={18}/>
              Позвонить: {PHONE}
            </a>
            <a href={SOCIALS.max} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
              Написать в Max
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
