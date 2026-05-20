import datetime
import json as _json

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


def _load_rates(json_str, fallback):
    if json_str:
        try:
            parsed = _json.loads(json_str)
            if parsed and isinstance(parsed, list) and len(parsed) > 0:
                return [tuple(row) for row in parsed]
        except Exception:
            pass
    return fallback


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
      customs: int      — пошлина ФТС (руб), без таможенного сбора
      method: str       — формула
      eur_rate: float
      price_eur: int
    """
    eur = t.eur_to_rub
    price_eur = round(auction_price / eur)

    rates_new = _load_rates(getattr(t, "customs_rates_new_json", None), _RATES_NEW_BY_PRICE)
    rates_mid = _load_rates(getattr(t, "customs_rates_mid_json", None), _RATES_MID)
    rates_old = _load_rates(getattr(t, "customs_rates_old_json", None), _RATES_OLD)

    if fuel_type == "Электро":
        customs = round(auction_price * 0.15)
        return {"customs": customs,
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
        return {"customs": customs,
                "method": f"{round(t.customs_rate * coef * 100)}% от ТС (объём неизвестен)",
                "eur_rate": eur, "price_eur": price_eur}

    if age < 3:
        for price_max, pct, min_ecc in rates_new:
            if price_eur <= price_max:
                by_percent = round(auction_price * pct)
                by_cc = round(engine_cc * min_ecc * eur)
                customs = max(by_percent, by_cc)
                chosen = "% от ТС" if by_percent >= by_cc else f"{min_ecc} €/куб.см"
                return {"customs": customs,
                        "method": f"до 3 лет: max({round(pct*100)}%={_fmt(by_percent)}, {min_ecc}€/cc={_fmt(by_cc)}) → {chosen}",
                        "eur_rate": eur, "price_eur": price_eur}
        by_percent = round(auction_price * 0.48)
        by_cc = round(engine_cc * 20.0 * eur)
        customs = max(by_percent, by_cc)
        return {"customs": customs,
                "method": "до 3 лет (>169k€): max(48%, 20€/куб.см)",
                "eur_rate": eur, "price_eur": price_eur}

    elif age < 5:
        ecc = _eur_per_cc_from_table(engine_cc, rates_mid)
        customs = round(engine_cc * ecc * eur)
        return {"customs": customs,
                "method": f"3–5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
                "eur_rate": eur, "price_eur": price_eur}

    else:
        ecc = _eur_per_cc_from_table(engine_cc, rates_old)
        customs = round(engine_cc * ecc * eur)
        return {"customs": customs,
                "method": f">5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
                "eur_rate": eur, "price_eur": price_eur}


def calc_customs(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> int:
    return calc_customs_detail(auction_price, engine_cc, year, fuel_type, t)["customs"]


def get_delivery(country: str, t) -> int:
    if country == "japan":
        jpy_amount = getattr(t, "freight_japan_jpy", 175_000)
        return round(jpy_amount * t.jpy_to_rub)
    if country == "korea":
        return getattr(t, "freight_vlad_korea", 28_000)
    if country == "china":
        return getattr(t, "freight_vlad_china", 40_000)
    return round(getattr(t, "freight_japan_jpy", 175_000) * t.jpy_to_rub)


def _recycling_fee(t, year: int) -> int:
    age = datetime.date.today().year - year
    if age < 3:
        return getattr(t, "recycling_fee_new", 3_400)
    return getattr(t, "recycling_fee_old", 5_200)


def get_services_total(t, year: int = 2020, city_delivery: int = 0) -> int:
    return (_recycling_fee(t, year) +
            getattr(t, "broker_fee", 25_000) +
            getattr(t, "bank_commission", 7_300) +
            getattr(t, "lab_docs", 25_000) +
            getattr(t, "storage_fee", 35_000) +
            getattr(t, "local_delivery", 7_000) +
            getattr(t, "registration_fee", 10_000) +
            city_delivery +
            getattr(t, "company_commission", 60_000))


def get_items(auction_price: int, customs: int, country: str, t,
              city_delivery: int = 0, city_name: str = "Омск", year: int = 2020) -> list:
    delivery = get_delivery(country, t)
    recycling = _recycling_fee(t, year)

    items: list = [{"label": "Цена аукциона", "value": auction_price}]

    if country == "japan":
        freight_jpy = getattr(t, "freight_japan_jpy", 175_000)
        items.append({
            "label": "Доставка в порт Японии + Фрахт до Владивостока",
            "value": delivery,
            "value_local": freight_jpy,
            "local_currency": "JPY",
        })
        loading_jpy = getattr(t, "loading_fee_jpy", 40_000)
        loading_rub = round(loading_jpy * t.jpy_to_rub)
        items.append({
            "label": "Погрузо-разгрузочные работы",
            "value": loading_rub,
            "value_local": loading_jpy,
            "local_currency": "JPY",
        })
    else:
        items.append({"label": "Доставка до Владивостока", "value": delivery})

    items.extend([
        {"label": "Комиссия за банковские переводы", "value": getattr(t, "bank_commission", 7_300)},
        {"label": "Таможенная пошлина", "value": customs},
        {"label": "Льготный утилизационный сбор", "value": recycling},
        {"label": "Услуги брокера", "value": getattr(t, "broker_fee", 25_000)},
        {"label": "Лаборатория, ЕПТС, СБКТС", "value": getattr(t, "lab_docs", 25_000)},
        {"label": "Склад Временного Хранения", "value": getattr(t, "storage_fee", 35_000)},
        {"label": "Перегон по Владивостоку", "value": getattr(t, "local_delivery", 7_000)},
        {"label": "Прописка, ИНН", "value": getattr(t, "registration_fee", 10_000)},
        {"label": f"Доставка до {city_name}", "value": city_delivery},
        {"label": "Комиссия компании и подготовка к выдаче", "value": getattr(t, "company_commission", 60_000)},
    ])

    return items


def turnkey_price(auction_price_rub: int, engine_cc: int, year: int, fuel_type: str,
                  country: str, t, city_delivery: int = None) -> int:
    if city_delivery is None:
        city_delivery = getattr(t, "delivery_omsk", 135_000)
    customs = calc_customs(auction_price_rub, engine_cc, year, fuel_type, t)
    delivery = get_delivery(country, t)
    services = get_services_total(t, year, city_delivery)
    return auction_price_rub + customs + delivery + services
