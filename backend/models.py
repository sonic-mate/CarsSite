from sqlalchemy import Column, Integer, String, Float, Boolean, Enum
from database import Base
import enum


class Tariffs(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, default=1)
    # Currency rates
    jpy_to_rub = Column(Float, default=0.60)
    krw_to_rub = Column(Float, default=0.065)
    cny_to_rub = Column(Float, default=12.5)
    eur_to_rub = Column(Float, default=95.0)
    # Customs (fallback when engine_cc unknown)
    customs_rate = Column(Float, default=0.18)
    customs_coef_new = Column(Float, default=1.0)
    customs_coef_mid = Column(Float, default=1.1)
    customs_coef_old = Column(Float, default=1.25)
    # Logistics
    delivery_japan = Column(Integer, default=180_000)
    delivery_korea = Column(Integer, default=160_000)
    delivery_china = Column(Integer, default=200_000)
    # Services
    services = Column(Integer, default=80_000)


class Country(str, enum.Enum):
    japan = "japan"
    china = "china"
    korea = "korea"


class Badge(str, enum.Enum):
    hit = "Хит"
    new = "Новинка"
    premium = "Premium"


class Silhouette(str, enum.Enum):
    sedan = "sedan"
    suv = "suv"


class Car(Base):
    __tablename__ = "cars"

    id = Column(String, primary_key=True, index=True)
    brand = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    country = Column(String, nullable=False)
    body = Column(String, nullable=False)
    mileage = Column(Integer, nullable=False)
    engine = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    badge = Column(String, nullable=True)
    photo_tint = Column(String, default="#1a1d24")
    silhouette = Column(String, default="sedan")
    is_active = Column(Boolean, default=True)
    photo_url = Column(String, nullable=True)
    source = Column(String, default="manual")
    color = Column(String, nullable=True)
    drive = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    power = Column(String, nullable=True)
    steering = Column(String, nullable=True)
    town = Column(String, nullable=True)
    equip = Column(String, nullable=True)
    kuzov = Column(String, nullable=True)
