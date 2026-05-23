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


# ─── Утилизационный сбор (физлица, с 1 января 2026) ──────────────────────────
# Формат строки: (max_hp_включительно, сумма_0-3_лет, сумма_3+_лет)
# None = "более X" (последняя строка)

_RECYCLING_EV = [          # EV и последовательные гибриды
    (80,   3_400,     5_200),
    (100,  991_200,   1_641_600),
    (130,  1_317_600, 1_912_800),
    (160,  1_560_000, 2_227_200),
    (190,  1_848_000, 2_594_400),
    (220,  2_193_600, 3_024_000),
    (250,  2_599_200, 3_523_200),
    (280,  3_079_200, 4_104_000),
    (None, 3_648_000, 4_780_800),
]

_RECYCLING_1_2 = [         # Объём 1.0–2.0 л
    (160,  3_400,     5_200),
    (190,  900_000,   1_492_800),
    (220,  952_800,   1_584_000),
    (250,  1_010_400, 1_677_600),
    (280,  1_142_400, 1_838_400),
    (310,  1_291_200, 2_011_200),
    (340,  1_459_200, 2_203_200),
    (370,  1_663_200, 2_412_000),
    (400,  1_896_000, 2_640_000),
    (430,  2_160_000, 2_892_000),
    (460,  2_464_800, 3_168_000),
    (500,  2_808_000, 3_468_000),
    (None, 3_201_600, 3_796_800),
]

_RECYCLING_2_3 = [         # Объём 2.0–3.0 л
    (160,  3_400,     5_200),
    (190,  2_306_800, 3_456_000),
    (220,  2_364_000, 3_501_600),
    (250,  2_402_400, 3_552_000),
    (280,  2_520_000, 3_660_000),
    (310,  2_620_800, 3_770_400),
    (340,  2_726_400, 3_873_600),
    (370,  2_834_400, 3_981_600),
    (400,  2_949_600, 4_094_400),
    (430,  3_067_200, 4_209_600),
    (460,  3_189_600, 4_327_200),
    (500,  3_316_800, 4_447_200),
    (None, 3_448_800, 4_572_000),
]

# >3.0 л — обязательный коммерческий утильсбор, мощность значения не имеет
_RECYCLING_3_35 = (2_584_000, 3_956_200)   # 3.0–3.5 л: (0-3 лет, 3+ лет)
_RECYCLING_35P  = (3_290_600, 4_325_800)   # 3.5+ л:    (0-3 лет, 3+ лет)


def _lookup_recycle(table: list, hp: int, is_new: bool) -> int:
    for max_hp, new_amt, old_amt in table:
        if max_hp is None or hp <= max_hp:
            return new_amt if is_new else old_amt
    last = table[-1]
    return last[1] if is_new else last[2]


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

    age = datetime.date.today().year - year

    if fuel_type == "Электро":
        customs = round(auction_price * 0.15)
        return {"customs": customs,
                "method": "15% от ТС (электромобиль)",
                "eur_rate": eur, "price_eur": price_eur}

    if age < 3:
        customs = round(auction_price * 0.48)
        return {"customs": customs,
                "method": "до 3 лет: 48% от ТС",
                "eur_rate": eur, "price_eur": price_eur}

    rates_mid = _load_rates(getattr(t, "customs_rates_mid_json", None), _RATES_MID)
    rates_old = _load_rates(getattr(t, "customs_rates_old_json", None), _RATES_OLD)

    if engine_cc <= 0:
        if age < 5:
            coef = t.customs_coef_mid
        else:
            coef = t.customs_coef_old
        customs = round(auction_price * t.customs_rate * coef)
        return {"customs": customs,
                "method": f"{round(t.customs_rate * coef * 100)}% от ТС (объём неизвестен)",
                "eur_rate": eur, "price_eur": price_eur}

    if age < 5:
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


def _jpy_rate(t) -> float:
    return t.jpy_to_rub * getattr(t, "jpy_coef", 1.075)


def get_delivery(country: str, t) -> int:
    if country == "japan":
        jpy_amount = getattr(t, "freight_japan_jpy", 175_000)
        return round(jpy_amount * _jpy_rate(t))
    if country == "korea":
        return getattr(t, "freight_vlad_korea", 28_000)
    if country == "china":
        return getattr(t, "freight_vlad_china", 40_000)
    return round(getattr(t, "freight_japan_jpy", 175_000) * _jpy_rate(t))


def _recycling_fee(t, year: int, power_hp: int = 0, engine_cc: int = 0, fuel_type: str = "Бензин") -> int:
    age = datetime.date.today().year - year
    is_new = age < 3

    if fuel_type == "Электро":
        return _lookup_recycle(_RECYCLING_EV, power_hp, is_new)

    if engine_cc <= 0:
        return getattr(t, "recycling_fee_new", 3_400) if is_new else getattr(t, "recycling_fee_old", 5_200)

    if engine_cc <= 2000:
        return _lookup_recycle(_RECYCLING_1_2, power_hp, is_new)
    if engine_cc <= 3000:
        return _lookup_recycle(_RECYCLING_2_3, power_hp, is_new)
    if engine_cc <= 3500:
        return _RECYCLING_3_35[0] if is_new else _RECYCLING_3_35[1]
    return _RECYCLING_35P[0] if is_new else _RECYCLING_35P[1]


def get_services_total(t, year: int = 2020, city_delivery: int = 0,
                       power_hp: int = 0, engine_cc: int = 0, fuel_type: str = "Бензин") -> int:
    return (_recycling_fee(t, year, power_hp, engine_cc, fuel_type) +
            getattr(t, "broker_fee", 25_000) +
            getattr(t, "bank_commission", 7_300) +
            getattr(t, "lab_docs", 25_000) +
            getattr(t, "storage_fee", 35_000) +
            getattr(t, "local_delivery", 7_000) +
            city_delivery +
            getattr(t, "company_commission", 60_000))


def get_items(auction_price: int, customs: int, country: str, t,
              city_delivery: int = 0, city_name: str = "Омск", year: int = 2020,
              power_hp: int = 0, engine_cc: int = 0, fuel_type: str = "Бензин") -> list:
    delivery = get_delivery(country, t)
    recycling = _recycling_fee(t, year, power_hp, engine_cc, fuel_type)

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
        loading_rub = round(loading_jpy * _jpy_rate(t))
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
