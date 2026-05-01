from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import os
import asyncio
import datetime
from contextlib import asynccontextmanager

from database import engine, get_db, Base, SessionLocal
from models import Car, Tariffs
from schemas import CarOut, CalculatorIn, CalculatorOut, TariffsSchema
import aggregator
import tariff_cache
import calc as _calc


def _migrate():
    for table, col, definition in [
        ("cars",    "photo_url",    "VARCHAR"),
        ("cars",    "source",       "VARCHAR DEFAULT 'manual'"),
        ("tariffs", "eur_to_rub",   "FLOAT DEFAULT 95.0"),
        ("cars",    "color",        "VARCHAR"),
        ("cars",    "drive",        "VARCHAR"),
        ("cars",    "auction",      "VARCHAR"),
        ("cars",    "auction_date", "VARCHAR"),
        ("cars",    "lot_number",   "VARCHAR"),
        ("cars",    "equip",        "VARCHAR"),
        ("cars",    "status",       "VARCHAR"),
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                conn.commit()
        except Exception:
            pass


def _init_tariffs():
    db = SessionLocal()
    try:
        t = db.query(Tariffs).filter(Tariffs.id == 1).first()
        if not t:
            t = Tariffs(id=1)
            db.add(t)
            db.commit()
            db.refresh(t)
        tariff_cache.update(t)
    finally:
        db.close()


CBR_URL = "https://www.cbr-xml-daily.ru/daily_json.js"


async def _fetch_rates() -> dict | None:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(CBR_URL)
            v = r.json()["Valute"]
            return {
                "eur_to_rub": round(v["EUR"]["Value"] / v["EUR"]["Nominal"], 4),
                "jpy_to_rub": round(v["JPY"]["Value"] / v["JPY"]["Nominal"], 4),
                "cny_to_rub": round(v["CNY"]["Value"] / v["CNY"]["Nominal"], 4),
                "krw_to_rub": round(v["KRW"]["Value"] / v["KRW"]["Nominal"], 6),
            }
    except Exception as e:
        print(f"Rate fetch error: {e}")
        return None


async def _rates_loop():
    await asyncio.sleep(10)
    while True:
        rates = await _fetch_rates()
        if rates:
            db = SessionLocal()
            try:
                t = db.query(Tariffs).filter(Tariffs.id == 1).first()
                if t:
                    for k, v in rates.items():
                        setattr(t, k, v)
                    db.commit()
                    db.refresh(t)
                    tariff_cache.update(t)
                    print(f"Rates: EUR={rates['eur_to_rub']} JPY={rates['jpy_to_rub']} CNY={rates['cny_to_rub']} KRW={rates['krw_to_rub']}")
            finally:
                db.close()
        await asyncio.sleep(60)


async def _sync_live_cars():
    try:
        cars = await aggregator.search(limit=500)
        if not cars:
            return
        db = SessionLocal()
        try:
            db.query(Car).filter(Car.source == "live").delete()
            for d in cars:
                db.add(Car(
                    id=d["id"], brand=d["brand"], model=d["model"],
                    year=d["year"], country=d["country"], body=d["body"],
                    mileage=d["mileage"], engine=d["engine"], price=d["price"],
                    badge=str(d["badge"]) if d.get("badge") else None,
                    photo_tint=d.get("photo_tint", "#1a1d24"),
                    silhouette=d.get("silhouette", "sedan"),
                    photo_url=d.get("photo_url"),
                    source="live", is_active=True,
                    color=d.get("color"),
                    drive=d.get("drive"),
                    auction=d.get("auction"),
                    auction_date=d.get("auction_date"),
                    lot_number=d.get("lot_number"),
                    equip=d.get("equip"),
                    status=d.get("status"),
                ))
            db.commit()
            print(f"Synced {len(cars)} live cars.")
        finally:
            db.close()
    except Exception as e:
        print(f"Sync error: {e}")


async def _sync_loop():
    await asyncio.sleep(5)
    while True:
        await _sync_live_cars()
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    _init_tariffs()
    asyncio.create_task(_rates_loop())
    asyncio.create_task(_sync_loop())
    yield


app = FastAPI(title="Восток Авто Импорт API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Catalog (from DB, synced hourly) ─────────────────────────────────────────

@app.get("/api/cars", response_model=List[CarOut])
def list_cars(
    country: Optional[str] = None,
    body: Optional[str] = None,
    price_min: Optional[int] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    fuel: Optional[str] = None,
    sort: str = "popular",
    db: Session = Depends(get_db),
):
    q = db.query(Car).filter(Car.is_active == True)
    if country:
        q = q.filter(Car.country == country)
    if body:
        q = q.filter(Car.body == body)
    if price_min:
        q = q.filter(Car.price >= price_min)
    if price_max:
        q = q.filter(Car.price <= price_max)
    if year_min:
        q = q.filter(Car.year >= year_min)
    if year_max:
        q = q.filter(Car.year <= year_max)
    if fuel:
        q = q.filter(Car.engine.ilike(f"%{fuel}%"))
    if sort == "price-asc":
        q = q.order_by(Car.price.asc())
    elif sort == "price-desc":
        q = q.order_by(Car.price.desc())
    elif sort == "year":
        q = q.order_by(Car.year.desc())
    return q.all()


# ─── Car detail (live from ajes.com, fallback to DB) ──────────────────────────

@app.get("/api/cars/{car_id}")
def get_car(car_id: str, db: Session = Depends(get_db)):
    db_car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
    if not db_car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")
    return db_car


# ─── Live cars from external APIs ────────────────────────────────────────────

@app.get("/api/live/cars")
async def live_cars(
    country: Optional[str] = None,
    brand: Optional[str] = None,
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    page: int = 1,
    limit: int = 100,
):
    cars = await aggregator.search(
        country=country,
        brand=brand,
        body=body,
        price_max=price_max,
        year_min=year_min,
        page=page,
        limit=limit,
    )
    return {
        "cars": cars,
        "count": len(cars),
        "page": page,
        "active_sources": aggregator.active_sources(),
    }


# ─── Debug ────────────────────────────────────────────────────────────────────

@app.get("/api/debug/images")
async def debug_images():
    """Check raw IMAGES field from ajes.com and resolved URLs."""
    from sources.japan import _call, _photo_url
    data = await _call("SELECT ID, MARKA_NAME, MODEL_NAME, IMAGES FROM main WHERE IMAGES IS NOT NULL AND IMAGES != '' ORDER BY ID DESC LIMIT 5")
    if not data:
        return {"error": "no data"}
    return [
        {
            "id": r.get("ID"),
            "car": f"{r.get('MARKA_NAME')} {r.get('MODEL_NAME')}",
            "raw_images": r.get("IMAGES", "")[:200],
            "resolved_url": _photo_url(r.get("IMAGES", "")),
        }
        for r in data
    ]


@app.get("/api/debug/bodies")
def debug_bodies(db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = db.query(Car.body, func.count(Car.id).label("cnt")).group_by(Car.body).order_by(func.count(Car.id).desc()).all()
    return [{"body": r.body, "count": r.cnt} for r in rows]


@app.get("/api/debug/unknown-bodies")
def debug_unknown_bodies(db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = (db.query(Car.brand, Car.model, func.count(Car.id).label("cnt"))
            .filter(Car.body == "Другой")
            .group_by(Car.brand, Car.model)
            .order_by(func.count(Car.id).desc())
            .all())
    return [{"brand": r.brand, "model": r.model, "count": r.cnt} for r in rows]


@app.get("/api/debug/ajes")
async def debug_ajes():
    """Test ajes.com SQL API for all three tables."""
    import httpx, os
    key = os.getenv("AJES_API_KEY", "VAInBvFrU76d")
    host = os.getenv("AJES_HOST", "78.46.90.228")
    results = {}
    for table, label in [("main", "japan"), ("kr", "korea"), ("che", "china")]:
        sql = f"SELECT * FROM {table} LIMIT 3"
        url = f"http://{host}/api/?json&code={key}&sql={sql}"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(url)
                raw_text = r.text[:600]
                try:
                    j = r.json()
                    if isinstance(j, list):
                        results[label] = {"status": r.status_code, "returned": len(j), "first_keys": list(j[0].keys()) if j else [], "sample": {k: j[0].get(k) for k in ["ID","LOT","STATUS","MARKA_NAME","MODEL_NAME","YEAR","START","FINISH","AVG_PRICE","IMAGES","TIME","RATE","COLOR","PRIV","EQUIP"]} if j else {}}
                    else:
                        results[label] = {"status": r.status_code, "raw": str(j)[:300]}
                except Exception:
                    results[label] = {"status": r.status_code, "raw": raw_text}
        except Exception as e:
            results[label] = {"error": str(e)[:150]}
    return results


@app.get("/api/debug/lot/{lot_id}")
async def debug_lot(lot_id: str):
    """Return raw ajes.com data for a specific lot ID."""
    from sources.japan import _call
    data = await _call(f"SELECT * FROM main WHERE ID={lot_id} LIMIT 1")
    return {"raw": data}


@app.get("/api/debug/sources")
async def debug_sources():
    """Test actual fetch from each source module."""
    from sources import korea, china
    try:
        kr_cars = await korea.fetch(limit=3)
    except Exception as e:
        kr_cars = f"ERROR: {e}"
    try:
        cn_cars = await china.fetch(limit=3)
    except Exception as e:
        cn_cars = f"ERROR: {e}"
    return {
        "korea": kr_cars if isinstance(kr_cars, str) else {"count": len(kr_cars), "sample": kr_cars[:1]},
        "china": cn_cars if isinstance(cn_cars, str) else {"count": len(cn_cars), "sample": cn_cars[:1]},
    }


# ─── Tariffs ─────────────────────────────────────────────────────────────────

@app.get("/api/tariffs", response_model=TariffsSchema)
def get_tariffs(db: Session = Depends(get_db)):
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tariffs not found")
    return t


@app.put("/api/tariffs", response_model=TariffsSchema)
def update_tariffs(
    data: TariffsSchema,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    token = os.getenv("ADMIN_TOKEN", "")
    expected = f"Bearer {token}"
    if not token or authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        t = Tariffs(id=1)
        db.add(t)

    for field, value in data.model_dump().items():
        setattr(t, field, value)

    db.commit()
    db.refresh(t)
    tariff_cache.update(t)
    return t


# ─── Calculator ───────────────────────────────────────────────────────────────

# ФТС ставки для физлиц (единая таможенная территория ЕАЭС)
# (cc_from, cc_to, eur_per_cc)
_RATES_NEW = [  # < 3 лет: max(48% от цены, €/cc)
    (0,    1000,  2.5),
    (1000, 1500,  3.5),
    (1500, 1800,  5.0),
    (1800, 2300,  7.5),
    (2300, 3000,  7.5),
    (3000, 99999, 15.0),
]
_RATES_MID = [  # 3–5 лет: €/cc
    (0,    1000,  1.5),
    (1000, 1500,  1.7),
    (1500, 1800,  2.5),
    (1800, 2300,  2.7),
    (2300, 3000,  3.0),
    (3000, 99999, 3.6),
]
_RATES_OLD = [  # > 5 лет: €/cc
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


def _calc_customs(auction_price: int, engine_cc: int, year: int, fuel_type: str, t) -> int:
    if fuel_type == "Электро":
        return round(auction_price * 0.15)

    age = datetime.date.today().year - year

    if engine_cc <= 0:
        # Нет данных об объёме — простая формула
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


@app.post("/api/calculator", response_model=CalculatorOut)
def calculate(data: CalculatorIn, db: Session = Depends(get_db)):
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        t = Tariffs()

    customs = _calc.calc_customs(data.auction_price, data.engine_cc, data.year, data.fuel_type, t)
    delivery = {"japan": t.delivery_japan, "korea": t.delivery_korea, "china": t.delivery_china}.get(data.country, t.delivery_japan)
    total = data.auction_price + customs + delivery + t.services
    return CalculatorOut(
        auction_price=data.auction_price,
        delivery=delivery,
        customs=customs,
        services=t.services,
        total=total,
    )


# ─── Callback requests ────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel
class CallbackIn(_BaseModel):
    name: str
    phone: str

@app.post("/api/callback", status_code=201)
def create_callback(data: CallbackIn):
    print(f"CALLBACK REQUEST: {data.name} | {data.phone}")
    return {"ok": True}


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "total_cars": db.query(Car).filter(Car.is_active == True).count(),
        "delivered": 458,
        "cheaper_percent": 30,
        "countries": 3,
        "avg_days": 30,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
