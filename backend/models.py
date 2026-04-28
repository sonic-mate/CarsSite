from sqlalchemy import Column, Integer, String, Float, Boolean, Enum
from database import Base
import enum


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
