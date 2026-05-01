from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import os
import asyncio
from contextlib import asynccontextmanager

from database import engine, get_db, Base, SessionLocal
from models import Car, Tariffs
from schemas import CarOut, CalculatorIn, CalculatorOut, TariffsSchema
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


# ─── Car detail (live from ajes.com) ──────────────────────────────────────────

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
