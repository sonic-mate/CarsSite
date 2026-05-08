from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, DateTime
from database import Base
import enum
import datetime


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
    # Logistics (legacy totals, kept for compat)
    delivery_japan = Column(Integer, default=180_000)
    delivery_korea = Column(Integer, default=160_000)
    delivery_china = Column(Integer, default=200_000)
    # Services (legacy total, kept for compat)
    services = Column(Integer, default=80_000)
    # Detailed delivery items
    delivery_port = Column(Integer, default=30_606)
    export_docs = Column(Integer, default=11_477)
    freight_vlad_japan = Column(Integer, default=33_250)
    freight_vlad_korea = Column(Integer, default=28_000)
    freight_vlad_china = Column(Integer, default=40_000)
    # Detailed delivery
    freight_japan_jpy = Column(Integer, default=175_000)   # JPY, converted at runtime
    # Detailed service items
    recycling_fee = Column(Integer, default=3_366)          # legacy, kept for compat
    recycling_fee_new = Column(Integer, default=3_400)      # < 3 лет
    recycling_fee_old = Column(Integer, default=5_200)      # >= 3 лет
    broker_fee = Column(Integer, default=25_000)
    bank_commission = Column(Integer, default=7_300)
    lab_docs = Column(Integer, default=25_000)
    storage_fee = Column(Integer, default=35_000)
    local_delivery = Column(Integer, default=7_000)
    registration_fee = Column(Integer, default=10_000)
    delivery_omsk = Column(Integer, default=135_000)        # fallback for catalog cards
    company_commission = Column(Integer, default=60_000)
    # Customs rate tables (JSON arrays); None = use hardcoded ФТС defaults
    customs_rates_new_json = Column(String, nullable=True)   # [[price_max_eur, pct, min_ecc], ...]
    customs_rates_mid_json = Column(String, nullable=True)   # [[cc_lo, cc_hi, eur_per_cc], ...]
    customs_rates_old_json = Column(String, nullable=True)   # [[cc_lo, cc_hi, eur_per_cc], ...]


class CityDelivery(Base):
    __tablename__ = "city_delivery"
    id = Column(Integer, primary_key=True, autoincrement=True)
    city_name = Column(String, nullable=False, unique=True)
    cost_rub = Column(Integer, nullable=False, default=0)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


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
    brand = Column(String, nullable=False, index=True)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False, index=True)
    country = Column(String, nullable=False, index=True)
    body = Column(String, nullable=False, index=True)
    mileage = Column(Integer, nullable=False)
    engine = Column(String, nullable=False)
    price = Column(Integer, nullable=False, index=True)
    badge = Column(String, nullable=True)
    photo_tint = Column(String, default="#1a1d24")
    silhouette = Column(String, default="sedan")
    is_active = Column(Boolean, default=True, index=True)
    photo_url = Column(String, nullable=True)
    source = Column(String, default="manual", index=True)
    auction_price = Column(Integer, default=0, nullable=True)
    auction_price_local = Column(Integer, default=0, nullable=True)
    engine_cc = Column(Integer, default=0, nullable=True)
    color = Column(String, nullable=True)
    drive = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    power = Column(String, nullable=True)
    steering = Column(String, nullable=True)
    town = Column(String, nullable=True)
    equip = Column(String, nullable=True)
    kuzov = Column(String, nullable=True)
    photo_urls_json = Column(String, nullable=True)
    auction_date = Column(String, nullable=True)
    auction_name = Column(String, nullable=True)
