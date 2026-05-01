import datetime

_RATES_NEW = [
    (0,    1000,  2.5),
    (1000, 1500,  3.5),
    (1500, 1800,  5.0),
    (1800, 2300,  7.5),
    (2300, 3000,  7.5),
    (3000, 99999, 15.0),
]
_RATES_MID = [
    (0,    1000,  1.5),
    (1000, 1500,  1.7),
    (1500, 1800,  2.5),
    (1800, 2300,  2.7),
    (2300, 3000,  3.0),
    (3000, 99999, 3.6),
]
_RATES_OLD = [
    (0,    1000,  3.0),
    (1000, 1500,  3.2),
    (1500, 1800,  3.5),
    (1800, 2300,  4.8),
    (2300, 3000,  5.0),
    (3000, 99999, 5.7),
]


def _eur_per_cc(cc: int, rates: list) -> float:
    for lo, hi, rate in rates:
        if lo < cc <= hi or (lo == 0 and cc <= hi):
            return rate
    return rates[-1][2]


def calc_customs(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> int:
    if fuel_type == "Электро":
        return round(auction_price * 0.15)

    age = datetime.date.today().year - year

    if engine_cc <= 0:
        if age < 3:
            coef = t.customs_coef_new
        elif age < 5:
            coef = t.customs_coef_mid
        else:
            coef = t.customs_coef_old
        return round(auction_price * t.customs_rate * coef)

    eur = t.eur_to_rub

    if age < 3:
        eur_cc = _eur_per_cc(engine_cc, _RATES_NEW)
        by_percent = round(auction_price * 0.48)
        by_cc = round(engine_cc * eur_cc * eur)
        return max(by_percent, by_cc)
    elif age < 5:
        eur_cc = _eur_per_cc(engine_cc, _RATES_MID)
        return round(engine_cc * eur_cc * eur)
    else:
        eur_cc = _eur_per_cc(engine_cc, _RATES_OLD)
        return round(engine_cc * eur_cc * eur)


def turnkey_price(auction_price_rub: int, engine_cc: int, year: int, fuel_type: str,
                  country: str, t) -> int:
    customs = calc_customs(auction_price_rub, engine_cc, year, fuel_type, t)
    delivery = {"japan": t.delivery_japan, "korea": t.delivery_korea, "china": t.delivery_china}.get(country, t.delivery_japan)
    return auction_price_rub + customs + delivery + t.services
