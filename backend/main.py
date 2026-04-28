from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List

from database import engine, get_db, Base
from models import Car
from schemas import CarOut, CalculatorIn, CalculatorOut
from seed import seed
import aggregator

Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(title="Восток АвтоИмпорт API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── DB cars (curated catalog) ────────────────────────────────────────────────

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


@app.get("/api/cars/{car_id}", response_model=CarOut)
def get_car(car_id: str, db: Session = Depends(get_db)):
    car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
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
    limit: int = 20,
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
        for sql in [
            f"SELECT * FROM {table} LIMIT 3",
            f"SELECT * FROM {table} ORDER BY ID DESC LIMIT 3",
        ]:
            params = {"ip": "1.1.1.1", "json": "", "code": key, "sql": sql}
            try:
                async with httpx.AsyncClient(timeout=15) as c:
                    r = await c.get(f"http://{host}/api/", params=params)
                    raw_text = r.text[:800]
                    try:
                        j = r.json()
                        results[f"{label}___{sql[:40]}"] = {
                            "status": r.status_code,
                            "type": type(j).__name__,
                            "raw_preview": str(j)[:400],
                        }
                    except Exception:
                        results[f"{label}___{sql[:40]}"] = {"status": r.status_code, "raw": raw_text}
                    break  # only try second sql if first fails
            except Exception as e:
                results[f"{label}___{sql[:40]}"] = {"error": str(e)[:150]}
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


# ─── Calculator ───────────────────────────────────────────────────────────────

@app.post("/api/calculator", response_model=CalculatorOut)
def calculate(data: CalculatorIn):
    age_k = 1.0 if data.year >= 2024 else (1.1 if data.year >= 2021 else 1.25)
    customs = round(data.auction_price * 0.18 * age_k)
    delivery_map = {"japan": 180000, "korea": 160000, "china": 200000}
    delivery = delivery_map.get(data.country, 180000)
    services = 80000
    total = data.auction_price + customs + delivery + services
    return CalculatorOut(
        auction_price=data.auction_price,
        delivery=delivery,
        customs=customs,
        services=services,
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
