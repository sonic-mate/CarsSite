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
    eur_to_rub: float = 95.0
    customs_rate: float = 0.18
    customs_coef_new: float = 1.0
    customs_coef_mid: float = 1.1
    customs_coef_old: float = 1.25
    delivery_japan: int = 180_000
    delivery_korea: int = 160_000
    delivery_china: int = 200_000
    services: int = 80_000
    freight_japan_jpy: int = 175_000
    freight_vlad_japan: int = 33_250
    freight_vlad_korea: int = 28_000
    freight_vlad_china: int = 40_000
    delivery_port: int = 30_606
    export_docs: int = 11_477
    recycling_fee_new: int = 3_400
    recycling_fee_old: int = 5_200
    broker_fee: int = 25_000
    bank_commission: int = 7_300
    lab_docs: int = 25_000
    storage_fee: int = 35_000
    local_delivery: int = 7_000
    registration_fee: int = 10_000
    delivery_omsk: int = 135_000
    company_commission: int = 60_000
    customs_rates_new_json: str = None
    customs_rates_mid_json: str = None
    customs_rates_old_json: str = None


_snapshot = TariffSnapshot()


def get() -> TariffSnapshot:
    return _snapshot


def update(t) -> None:
    global _snapshot
    _snapshot = TariffSnapshot(
        jpy_to_rub=t.jpy_to_rub,
        krw_to_rub=t.krw_to_rub,
        cny_to_rub=t.cny_to_rub,
        eur_to_rub=t.eur_to_rub,
        customs_rate=t.customs_rate,
        customs_coef_new=t.customs_coef_new,
        customs_coef_mid=t.customs_coef_mid,
        customs_coef_old=t.customs_coef_old,
        delivery_japan=t.delivery_japan,
        delivery_korea=t.delivery_korea,
        delivery_china=t.delivery_china,
        services=t.services,
        freight_japan_jpy=getattr(t, "freight_japan_jpy", 175_000),
        freight_vlad_japan=getattr(t, "freight_vlad_japan", 33_250),
        freight_vlad_korea=getattr(t, "freight_vlad_korea", 28_000),
        freight_vlad_china=getattr(t, "freight_vlad_china", 40_000),
        delivery_port=getattr(t, "delivery_port", 30_606),
        export_docs=getattr(t, "export_docs", 11_477),
        recycling_fee_new=getattr(t, "recycling_fee_new", 3_400),
        recycling_fee_old=getattr(t, "recycling_fee_old", 5_200),
        broker_fee=getattr(t, "broker_fee", 25_000),
        bank_commission=getattr(t, "bank_commission", 7_300),
        lab_docs=getattr(t, "lab_docs", 25_000),
        storage_fee=getattr(t, "storage_fee", 35_000),
        local_delivery=getattr(t, "local_delivery", 7_000),
        registration_fee=getattr(t, "registration_fee", 10_000),
        delivery_omsk=getattr(t, "delivery_omsk", 135_000),
        company_commission=getattr(t, "company_commission", 60_000),
        customs_rates_new_json=getattr(t, "customs_rates_new_json", None),
        customs_rates_mid_json=getattr(t, "customs_rates_mid_json", None),
        customs_rates_old_json=getattr(t, "customs_rates_old_json", None),
    )
