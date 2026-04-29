"""
In-memory tariff cache — loaded from DB on startup, refreshed on PUT /api/tariffs.
Sources read currency rates from here so they don't need DB access.
"""
from dataclasses import dataclass


@dataclass
class TariffSnapshot:
    jpy_to_rub: float = 0.60
    krw_to_rub: float = 0.065
    cny_to_rub: float = 12.5
    customs_rate: float = 0.18
    customs_coef_new: float = 1.0
    customs_coef_mid: float = 1.1
    customs_coef_old: float = 1.25
    delivery_japan: int = 180_000
    delivery_korea: int = 160_000
    delivery_china: int = 200_000
    services: int = 80_000


_snapshot = TariffSnapshot()


def get() -> TariffSnapshot:
    return _snapshot


def update(t) -> None:
    global _snapshot
    _snapshot = TariffSnapshot(
        jpy_to_rub=t.jpy_to_rub,
        krw_to_rub=t.krw_to_rub,
        cny_to_rub=t.cny_to_rub,
        customs_rate=t.customs_rate,
        customs_coef_new=t.customs_coef_new,
        customs_coef_mid=t.customs_coef_mid,
        customs_coef_old=t.customs_coef_old,
        delivery_japan=t.delivery_japan,
        delivery_korea=t.delivery_korea,
        delivery_china=t.delivery_china,
        services=t.services,
    )
