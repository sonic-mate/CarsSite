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
