import datetime

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


def calc_customs_detail(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> dict:
    """
    Returns dict with:
      customs: int (rubles)
      method: str (human-readable formula)
      eur_rate: float
      price_eur: int (auction price in EUR)
    """
    eur = t.eur_to_rub
    price_eur = round(auction_price / eur)

    if fuel_type == "Электро":
        customs = round(auction_price * 0.15)
        return {
            "customs": customs,
            "method": "15% от ТС (электромобиль)",
            "eur_rate": eur,
            "price_eur": price_eur,
        }

    age = datetime.date.today().year - year

    if engine_cc <= 0:
        # Нет данных об объёме — процентная формула
        if age < 3:
            coef = t.customs_coef_new
        elif age < 5:
            coef = t.customs_coef_mid
        else:
            coef = t.customs_coef_old
        customs = round(auction_price * t.customs_rate * coef)
        return {
            "customs": customs,
            "method": f"{round(t.customs_rate * coef * 100)}% от ТС (объём неизвестен)",
            "eur_rate": eur,
            "price_eur": price_eur,
        }

    if age < 3:
        # Ставки по ЦЕНЕ в EUR
        for price_max, pct, min_ecc in _RATES_NEW_BY_PRICE:
            if price_eur <= price_max:
                by_percent = round(auction_price * pct)
                by_cc = round(engine_cc * min_ecc * eur)
                customs = max(by_percent, by_cc)
                chosen = "% от ТС" if by_percent >= by_cc else f"{min_ecc} €/куб.см"
                return {
                    "customs": customs,
                    "method": f"до 3 лет: max({round(pct*100)}%={_fmt(by_percent)}, {min_ecc}€/cc={_fmt(by_cc)}) → {chosen}",
                    "eur_rate": eur,
                    "price_eur": price_eur,
                }
        # Самая высокая скобка (>169k EUR)
        by_percent = round(auction_price * 0.48)
        by_cc = round(engine_cc * 20.0 * eur)
        customs = max(by_percent, by_cc)
        return {
            "customs": customs,
            "method": f"до 3 лет (>169k€): max(48%, 20€/куб.см)",
            "eur_rate": eur,
            "price_eur": price_eur,
        }

    elif age < 5:
        ecc = _eur_per_cc_from_table(engine_cc, _RATES_MID)
        customs = round(engine_cc * ecc * eur)
        return {
            "customs": customs,
            "method": f"3–5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
            "eur_rate": eur,
            "price_eur": price_eur,
        }

    else:
        ecc = _eur_per_cc_from_table(engine_cc, _RATES_OLD)
        customs = round(engine_cc * ecc * eur)
        return {
            "customs": customs,
            "method": f">5 лет: {ecc} €/куб.см × {engine_cc} куб.см",
            "eur_rate": eur,
            "price_eur": price_eur,
        }


def _fmt(n: int) -> str:
    return f"{n:,}₽".replace(",", " ")


def calc_customs(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> int:
    return calc_customs_detail(auction_price, engine_cc, year, fuel_type, t)["customs"]


def turnkey_price(auction_price_rub: int, engine_cc: int, year: int, fuel_type: str,
                  country: str, t) -> int:
    customs = calc_customs(auction_price_rub, engine_cc, year, fuel_type, t)
    delivery = {"japan": t.delivery_japan, "korea": t.delivery_korea, "china": t.delivery_china}.get(country, t.delivery_japan)
    return auction_price_rub + customs + delivery + t.services
