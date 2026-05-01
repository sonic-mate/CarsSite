from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import os
from contextlib import asynccontextmanager

from database import engine, get_db, Base, SessionLocal
from models import Car, Tariffs
from schemas import CalculatorIn, CalculatorOut, TariffsSchema
import aggregator
import tariff_cache


def _migrate():
    with engine.connect() as conn:
        for col, definition in [("photo_url", "VARCHAR"), ("source", "VARCHAR DEFAULT 'manual'")]:
            try:
                conn.execute(text(f"ALTER TABLE cars ADD COLUMN {col} {definition}"))
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    _init_tariffs()
    yield


app = FastAPI(title="Восток Авто Импорт API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Cars (on-demand from ajes.com) ───────────────────────────────────────────

@app.get("/api/cars")
async def list_cars(
    country: Optional[str] = None,
    brand: Optional[str] = None,
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    sort: str = "popular",
    page: int = 1,
    limit: int = 20,
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
    if sort == "price-asc":
        cars = sorted(cars, key=lambda c: c["price"])
    elif sort == "price-desc":
        cars = sorted(cars, key=lambda c: c["price"], reverse=True)
    elif sort == "year":
        cars = sorted(cars, key=lambda c: c.get("year", 0), reverse=True)
    return cars


@app.get("/api/cars/{car_id}")
async def get_car(car_id: str):
    car = await aggregator.get_by_id(car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")
    return car


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
    """
    Live car listings aggregated from:
      - Japan: ajes.com (requires AJES_API_KEY)
      - Korea: encar.com (no key)
      - China: dongchedi.com / che168.com (no key)
    Results cached 5 min per query.
    """
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

@app.get("/api/debug/ajes")
async def debug_ajes():
    """Test ajes.com SQL API for all three tables."""
    import httpx, os
    key = os.getenv("AJES_API_KEY", "DvemR43s")
    host = os.getenv("AJES_HOST", "78.46.90.228")
    results = {}
    for table, label in [("main", "japan"), ("korea", "korea"), ("china", "china")]:
        sql = f"SELECT * FROM {table} LIMIT 3"
        url = f"http://{host}/api/?json&code={key}&sql={sql}"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(url)
                raw_text = r.text[:600]
                try:
                    j = r.json()
                    if isinstance(j, list):
                        results[label] = {"status": r.status_code, "returned": len(j), "first_keys": list(j[0].keys()) if j else [], "sample": {k: j[0].get(k) for k in ["MARKA_NAME","MODEL_NAME","YEAR","FINISH","IMAGES"]} if j else {}}
                    else:
                        results[label] = {"status": r.status_code, "raw": str(j)[:300]}
                except Exception:
                    results[label] = {"status": r.status_code, "raw": raw_text}
        except Exception as e:
            results[label] = {"error": str(e)[:150]}
    return results


@app.get("/api/debug/sources")
async def debug_sources():
    """Raw diagnostic — tries multiple endpoint variants per source."""
    import httpx

    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    results = {}

    async def probe(url, params=None, headers=None, label=None):
        h = {"User-Agent": UA, "Accept": "application/json, */*", **(headers or {})}
        try:
            async with httpx.AsyncClient(timeout=12, headers=h, follow_redirects=True) as c:
                r = await c.get(url, params=params)
                text = r.text[:400]
                try:
                    j = r.json()
                    return {"status": r.status_code, "keys": list(j.keys()) if isinstance(j, dict) else f"list[{len(j)}]", "preview": str(j)[:300]}
                except Exception:
                    return {"status": r.status_code, "raw": text}
        except Exception as e:
            return {"error": str(e)[:200]}

    # ── encar: raw URL (no param encoding) ──────────────────────────────────
    encar_h = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": "https://www.encar.com/",
        "Origin": "https://www.encar.com",
    }
    encar_variants = [
        "https://api.encar.com/search/car/list/general?count=true&q=(And.Hidden.N._.(C.CarType.Y._.).)&sr=|ModifiedDate|0|5",
        "https://api.encar.com/search/car/list/general?count=true&q=(And.Hidden.N._.(C.CarType.Y._.))",
        "https://api.encar.com/search/car/list/general?count=true&q=(C.CarType.Y._.)&sr=|ModifiedDate|0|5",
        "https://api.encar.com/search/car/list/general?count=true&q=Hidden.N&sr=|ModifiedDate|0|5",
    ]
    for i, url in enumerate(encar_variants):
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=encar_h) as c:
                r = await c.get(url)
                try:
                    j = r.json()
                    items = j.get("SearchResults", [])
                    results[f"encar_raw_{i}"] = {"status": r.status_code, "count": j.get("Count"), "returned": len(items), "keys": list(j.keys())}
                except Exception:
                    results[f"encar_raw_{i}"] = {"status": r.status_code, "raw": r.text[:200]}
        except Exception as e:
            results[f"encar_raw_{i}"] = {"error": str(e)[:150]}

    # ── dongchedi: more paths + motor subdomain ──────────────────────────────
    dc_h = {"User-Agent": UA, "Referer": "https://www.dongchedi.com/", "Accept-Language": "zh-CN,zh;q=0.9", "Accept": "application/json, */*"}
    for url, label in [
        ("https://www.dongchedi.com/motor/pc/usedcar/search_list", "dc_search_list"),
        ("https://motor.dongchedi.com/api/pc/usedcar/list",        "dc_motor_sub"),
        ("https://www.dongchedi.com/api/usedcar/list",             "dc_api_list"),
        ("https://www.dongchedi.com/motor/usedcar/search",         "dc_motor_used"),
    ]:
        results[label] = await probe(url, params={"city_id": "0", "page": 1, "limit": 5}, headers=dc_h)

    return results


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

@app.post("/api/calculator", response_model=CalculatorOut)
def calculate(data: CalculatorIn, db: Session = Depends(get_db)):
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        t = Tariffs()

    if data.year >= 2024:
        age_k = t.customs_coef_new
    elif data.year >= 2021:
        age_k = t.customs_coef_mid
    else:
        age_k = t.customs_coef_old

    customs = round(data.auction_price * t.customs_rate * age_k)
    delivery_map = {
        "japan": t.delivery_japan,
        "korea": t.delivery_korea,
        "china": t.delivery_china,
    }
    delivery = delivery_map.get(data.country, t.delivery_japan)
    total = data.auction_price + customs + delivery + t.services
    return CalculatorOut(
        auction_price=data.auction_price,
        delivery=delivery,
        customs=customs,
        services=t.services,
        total=total,
    )


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
