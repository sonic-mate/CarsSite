from pydantic import BaseModel
from typing import Optional


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

    class Config:
        from_attributes = True


class CalculatorIn(BaseModel):
    country: str
    auction_price: int
    engine_cc: int
    year: int
    fuel_type: str = "Бензин"


class CalculatorOut(BaseModel):
    auction_price: int
    delivery: int
    customs: int
    services: int
    total: int


class TariffsSchema(BaseModel):
    jpy_to_rub: float
    krw_to_rub: float
    cny_to_rub: float
    customs_rate: float
    customs_coef_new: float
    customs_coef_mid: float
    customs_coef_old: float
    delivery_japan: int
    delivery_korea: int
    delivery_china: int
    services: int
