from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database import Base
import datetime


class Tariffs(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, default=1)
    jpy_to_rub = Column(Float, default=0.60)
    krw_to_rub = Column(Float, default=0.065)
    cny_to_rub = Column(Float, default=12.5)
    eur_to_rub = Column(Float, default=95.0)
    customs_rate = Column(Float, default=0.18)
    customs_coef_new = Column(Float, default=1.0)
    customs_coef_mid = Column(Float, default=1.4)
    customs_coef_old = Column(Float, default=1.15)
    delivery_japan = Column(Integer, default=180_000)
    delivery_korea = Column(Integer, default=160_000)
    delivery_china = Column(Integer, default=200_000)
    services = Column(Integer, default=80_000)
    delivery_port = Column(Integer, default=30_606)
    export_docs = Column(Integer, default=11_477)
    freight_vlad_japan = Column(Integer, default=33_250)
    freight_vlad_korea = Column(Integer, default=28_000)
    freight_vlad_china = Column(Integer, default=40_000)
    freight_japan_jpy = Column(Integer, default=175_000)
    loading_fee_jpy = Column(Integer, default=40_000)
    recycling_fee = Column(Integer, default=3_366)
    recycling_fee_new = Column(Integer, default=3_400)
    recycling_fee_old = Column(Integer, default=5_200)
    broker_fee = Column(Integer, default=25_000)
    bank_commission = Column(Integer, default=7_300)
    lab_docs = Column(Integer, default=25_000)
    storage_fee = Column(Integer, default=35_000)
    local_delivery = Column(Integer, default=7_000)
    registration_fee = Column(Integer, default=10_000)
    delivery_omsk = Column(Integer, default=135_000)
    company_commission = Column(Integer, default=60_000)
    customs_rates_new_json = Column(String, nullable=True)
    customs_rates_mid_json = Column(String, nullable=True)
    customs_rates_old_json = Column(String, nullable=True)


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


class AjBid(Base):
    """Lots viewed by real users — permanent archive for SEO /cars pages."""
    __tablename__ = "aj_bids"
    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(String, unique=True, nullable=False, index=True)
    country = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    photo_urls_orig = Column(String, nullable=True)   # JSON list of original upstream URLs
    data_json = Column(String, nullable=True)          # full car snapshot as JSON
    processed = Column(Boolean, default=False, index=True)  # True = photos saved locally
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
