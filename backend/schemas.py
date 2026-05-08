from pydantic import BaseModel, Field
from typing import Optional, List


class CarBase(BaseModel):
    id: str
    brand: str
    model: str
    year: int
    country: str
    body: str
    mileage: int
    engine: str
    price: int
    badge: Optional[str] = None
    photo_tint: str = "#1a1d24"
    silhouette: str = "sedan"
    photo_url: Optional[str] = None
    source: str = "manual"


class CarCreate(CarBase):
    pass


class CarOut(CarBase):
    is_active: bool
    auction_price: Optional[int] = None
    auction_price_local: Optional[int] = None
    engine_cc: Optional[int] = None
    color: Optional[str] = None
    drive: Optional[str] = None
    power: Optional[str] = None
    grade: Optional[str] = None
    steering: Optional[str] = None
    town: Optional[str] = None
    equip: Optional[str] = None
    kuzov: Optional[str] = None
    photo_urls_json: Optional[str] = None
    auction_date: Optional[str] = None
    auction_name: Optional[str] = None

    class Config:
        from_attributes = True


class CalculatorIn(BaseModel):
    country: str = Field(..., pattern="^(japan|korea|china)$")
    auction_price: int = Field(..., gt=0, lt=100_000_000)
    engine_cc: int = Field(..., ge=0, le=12000)
    year: int = Field(..., ge=1900, le=2030)
    fuel_type: str = Field("Бензин")
    city: Optional[str] = None


class BreakdownItem(BaseModel):
    label: str
    value: int


class CalculatorOut(BaseModel):
    auction_price: int
    delivery: int
    customs: int
    customs_fee: int = 0
    services: int
    total: int
    eur_rate: float = 95.0
    price_eur: int = 0
    customs_method: str = ""
    items: List[BreakdownItem] = []


class CityDeliveryOut(BaseModel):
    id: int
    city_name: str
    cost_rub: int

    class Config:
        from_attributes = True


class TariffsSchema(BaseModel):
    jpy_to_rub: float
    krw_to_rub: float
    cny_to_rub: float
    eur_to_rub: float = 95.0
    customs_rate: float
    customs_coef_new: float
    customs_coef_mid: float
    customs_coef_old: float
    delivery_japan: int
    delivery_korea: int
    delivery_china: int
    services: int
    freight_japan_jpy: int = 175_000
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
    customs_rates_new_json: Optional[str] = None
    customs_rates_mid_json: Optional[str] = None
    customs_rates_old_json: Optional[str] = None
