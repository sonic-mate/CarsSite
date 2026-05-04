import datetime

# ─── Таможенный сбор (Постановление Правительства РФ № 342) ──────────────────

_CUSTOMS_FEE = [
    (200_000,    775),
    (450_000,    1_550),
    (1_200_000,  3_100),
    (2_700_000,  8_530),
    (4_200_000,  12_000),
    (5_500_000,  15_500),
    (7_000_000,  20_000),
    (999_999_999, 30_000),
]


def customs_fee(price_rub: int) -> int:
    for limit, fee in _CUSTOMS_FEE:
        if price_rub <= limit:
            return fee
    return 30_000


# ─── ФТС ставки для физлиц (ЕАЭС) ───────────────────────────────────────────

# Авто до 3 лет: ставки по ЦЕНЕ в EUR (таможенная стоимость)
# (price_eur_max, percent, min_eur_per_cc)
_RATES_NEW_BY_PRICE = [
    (8_500,   0.54, 2.5),
    (16_700,  0.48, 3.5),
    (42_300,  0.48, 5.5),
    (84_500,  0.48, 7.5),
    (169_000, 0.48, 15.0),
    (999_999, 0.48, 20.0),
]

# Авто 3–5 лет: €/куб.см по объёму двигателя
_RATES_MID = [
    (0,    1000,  1.5),
    (1000, 1500,  1.7),
    (1500, 1800,  2.5),
    (1800, 2300,  2.7),
    (2300, 3000,  3.0),
    (3000, 99999, 3.6),
]

# Авто старше 5 лет: €/куб.см по объёму двигателя
_RATES_OLD = [
    (0,    1000,  3.0),
    (1000, 1500,  3.2),
    (1500, 1800,  3.5),
    (1800, 2300,  4.8),
    (2300, 3000,  5.0),
    (3000, 99999, 5.7),
]


def _eur_per_cc_from_table(cc: int, rates: list) -> float:
    for lo, hi, rate in rates:
        if lo < cc <= hi or (lo == 0 and cc <= hi):
            return rate
    return rates[-1][2]


def _fmt(n: int) -> str:
    return f"{n:,}₽".replace(",", " ")


def calc_customs_detail(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> dict:
    """
    Returns dict:
      customs: int      — пошлина ФТС (руб)
      fee: int          — таможенный сбор (руб)
      method: str       — формула
      eur_rate: float
      price_eur: int
    """
    eur = t.eur_to_rub
    price_eur = round(auction_price / eur)
    fee = customs_fee(auction_price)

    if fuel_type == "Электро":
        customs = round(auction_price * 0.15)
        return {"customs": customs, "fee": fee,
                "method": "15% от ТС (электромобиль)",
                "eur_rate": eur, "price_eur": price_eur}

    age = datetime.date.today().year - year

    if engine_cc <= 0:
        if age < 3:
            coef = t.customs_coef_new
        elif age < 5:
            coef = t.customs_coef_mid
        else:
            coef = t.customs_coef_old
        customs = round(auction_price * t.customs_rate * coef)
        return {"customs": customs, "fee": fee,
                "method": f"{round(t.customs_rate * coef * 100)}% от ТС (объём неизвестен)",
                "eur_rate": eur, "price_eur": price_eur}

    if age < 3:
        for price_max, pct, min_ecc in _RATES_NEW_BY_PRICE:
            if price_eur <= price_max:
                by_percent = round(auction_price * pct)
                by_cc = round(engine_cc * min_ecc * eur)
                customs = max(by_percent, by_cc)
                chosen = "% от ТС" if by_percent >= by_cc else f"{min_ecc} €/куб.см"
                return {"customs": customs, "fee": fee,
                        "method": f"до 3 лет: max({round(pct*100)}%={_fmt(by_percent)}, {min_ecc}€/cc={_fmt(by_cc)}) → {chosen}",
                        "eur_rate": eur, "price_eur": price_eur}
        by_percent = round(auction_price * 0.48)
        by_cc = round(engine_cc * 20.0 * eur)
        customs = max(by_percent, by_cc)
        return {"customs": customs, "fee": fee,
                "method": "до 3 лет (>169k€): max(48%, 20€/куб.см)",
                "eur_rate": eur, "price_eur": price_eur}

    elif age < 5:
        ecc = _eur_per_cc_from_table(engine_cc, _RATES_MID)
        customs = round(engine_cc * ecc * eur)
        return {"customs": customs, "fee": fee,
                "method": f"3–5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
                "eur_rate": eur, "price_eur": price_eur}

    else:
        ecc = _eur_per_cc_from_table(engine_cc, _RATES_OLD)
        customs = round(engine_cc * ecc * eur)
        return {"customs": customs, "fee": fee,
                "method": f">5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
                "eur_rate": eur, "price_eur": price_eur}


def calc_customs(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> int:
    d = calc_customs_detail(auction_price, engine_cc, year, fuel_type, t)
    return d["customs"] + d["fee"]


def get_delivery(country: str, t) -> int:
    freight = {"japan": getattr(t, "freight_vlad_japan", 33_250),
               "korea": getattr(t, "freight_vlad_korea", 28_000),
               "china": getattr(t, "freight_vlad_china", 40_000)}.get(country, 33_250)
    return getattr(t, "delivery_port", 30_606) + getattr(t, "export_docs", 11_477) + freight


def get_services_total(t) -> int:
    return (getattr(t, "recycling_fee", 3_366) + getattr(t, "broker_fee", 9_000) +
            getattr(t, "bank_commission", 7_300) + getattr(t, "lab_docs", 25_000) +
            getattr(t, "storage_fee", 35_000) + getattr(t, "local_delivery", 7_000) +
            getattr(t, "registration_fee", 10_000) + getattr(t, "delivery_omsk", 135_000) +
            getattr(t, "company_commission", 60_000))


def get_items(auction_price: int, customs: int, customs_fee_val: int, country: str, t) -> list:
    freight = {"japan": getattr(t, "freight_vlad_japan", 33_250),
               "korea": getattr(t, "freight_vlad_korea", 28_000),
               "china": getattr(t, "freight_vlad_china", 40_000)}.get(country, 33_250)
    return [
        {"label": "Цена аукциона", "value": auction_price},
        {"label": "Доставка в порт трейлером", "value": getattr(t, "delivery_port", 30_606)},
        {"label": "Оформление экспортных документов", "value": getattr(t, "export_docs", 11_477)},
        {"label": "Фрахт до Владивостока", "value": freight},
        {"label": "Утилизационный сбор", "value": getattr(t, "recycling_fee", 3_366)},
        {"label": "Пошлина", "value": customs},
        {"label": "Таможенный сбор", "value": customs_fee_val},
        {"label": "Услуги брокера", "value": getattr(t, "broker_fee", 9_000)},
        {"label": "Комиссия за банковские переводы", "value": getattr(t, "bank_commission", 7_300)},
        {"label": "Лаборатория, ЕПТС, СБКТС", "value": getattr(t, "lab_docs", 25_000)},
        {"label": "Склад Временного Хранения", "value": getattr(t, "storage_fee", 35_000)},
        {"label": "Перегон по Владивостоку", "value": getattr(t, "local_delivery", 7_000)},
        {"label": "Прописка, ИНН", "value": getattr(t, "registration_fee", 10_000)},
        {"label": "Доставка до Омска", "value": getattr(t, "delivery_omsk", 135_000)},
        {"label": "Комиссия компании и подготовка к выдаче", "value": getattr(t, "company_commission", 60_000)},
    ]


def turnkey_price(auction_price_rub: int, engine_cc: int, year: int, fuel_type: str,
                  country: str, t) -> int:
    customs_total = calc_customs(auction_price_rub, engine_cc, year, fuel_type, t)
    delivery = get_delivery(country, t)
    services = get_services_total(t)
    return auction_price_rub + customs_total + delivery + services
