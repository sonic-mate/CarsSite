from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import os
import asyncio
import datetime
from contextlib import asynccontextmanager

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import engine, get_db, Base, SessionLocal
from models import Car, Tariffs, AdminUser
from schemas import CarOut, CalculatorIn, CalculatorOut, TariffsSchema
import aggregator
import tariff_cache
import calc as _calc
import auth


def _migrate():
    for table, col, definition in [
        ("cars",    "photo_url",    "VARCHAR"),
        ("cars",    "source",       "VARCHAR DEFAULT 'manual'"),
        ("tariffs", "eur_to_rub",   "FLOAT DEFAULT 95.0"),
        ("cars",    "color",    "VARCHAR"),
        ("cars",    "drive",    "VARCHAR"),
        ("cars",    "grade",    "VARCHAR"),
        ("cars",    "power",    "VARCHAR"),
        ("cars",    "steering", "VARCHAR"),
        ("cars",    "town",     "VARCHAR"),
        ("cars",    "equip",    "VARCHAR"),
        ("cars",    "kuzov",    "VARCHAR"),
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                conn.commit()
        except Exception:
            pass


def _init_admin():
    """Seed default admin user from env if no users exist."""
    username = os.getenv("ADMIN_USER")
    password = os.getenv("ADMIN_PASS")
    if not username or not password:
        print("[admin] WARNING: ADMIN_USER and ADMIN_PASS env vars not set — skipping admin seed")
        return
    db = SessionLocal()
    try:
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(username=username, password_hash=auth.hash_password(password)))
            db.commit()
            print(f"[admin] Created default user: {username}")
    finally:
        db.close()


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
        cars = await aggregator.search(limit=2000)
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
                    grade=d.get("grade"),
                    power=d.get("power"),
                    steering=d.get("steering"),
                    town=d.get("town"),
                    equip=d.get("equip"),
                    kuzov=d.get("kuzov"),
                ))
            db.commit()
            print(f"Synced {len(cars)} live cars.")
        finally:
            db.close()
    except Exception as e:
        print(f"Sync error: {e}")


async def _sync_loop():
    while True:
        await _sync_live_cars()
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    _init_tariffs()
    _init_admin()
    tasks = [
        asyncio.create_task(_rates_loop()),
        asyncio.create_task(_sync_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass


# ─── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Восток Авто Импорт API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── Security headers ─────────────────────────────────────────────────────────

class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(_SecurityHeadersMiddleware)


# ─── CORS ─────────────────────────────────────────────────────────────────────

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "https://vostokavtoimport.ru,http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# ─── Catalog (from DB, synced hourly) ─────────────────────────────────────────

@app.get("/api/cars", response_model=List[CarOut])
@limiter.limit("60/minute")
def list_cars(request: Request,
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


# ─── Car detail ───────────────────────────────────────────────────────────────

@app.get("/api/cars/{car_id}")
def get_car(car_id: str, db: Session = Depends(get_db)):
    db_car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
    if not db_car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")
    return db_car


# ─── Live cars from external APIs ────────────────────────────────────────────

@app.get("/api/live/cars")
@limiter.limit("30/minute")
async def live_cars(request: Request,
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


# ─── Debug (gated behind DEBUG_ENDPOINTS env var) ────────────────────────────

def _require_debug():
    if not os.getenv("DEBUG_ENDPOINTS"):
        raise HTTPException(status_code=404, detail="Not found")


@app.get("/api/debug/images")
async def debug_images(_: None = Depends(_require_debug)):
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
def debug_bodies(db: Session = Depends(get_db), _: None = Depends(_require_debug)):
    from sqlalchemy import func
    rows = db.query(Car.body, func.count(Car.id).label("cnt")).group_by(Car.body).order_by(func.count(Car.id).desc()).all()
    return [{"body": r.body, "count": r.cnt} for r in rows]


@app.get("/api/debug/unknown-bodies")
def debug_unknown_bodies(db: Session = Depends(get_db), _: None = Depends(_require_debug)):
    from sqlalchemy import func
    rows = (db.query(Car.brand, Car.model, func.count(Car.id).label("cnt"))
            .filter(Car.body == "Другой")
            .group_by(Car.brand, Car.model)
            .order_by(func.count(Car.id).desc())
            .all())
    return [{"brand": r.brand, "model": r.model, "count": r.cnt} for r in rows]


@app.get("/api/debug/ajes")
async def debug_ajes(_: None = Depends(_require_debug)):
    import httpx
    key = os.getenv("AJES_API_KEY", "")
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
async def debug_lot(lot_id: str, _: None = Depends(_require_debug)):
    if not lot_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid lot ID")
    from sources.japan import _call
    data = await _call(f"SELECT * FROM main WHERE ID={lot_id} LIMIT 1")
    return {"raw": data}


@app.get("/api/debug/sources")
async def debug_sources(_: None = Depends(_require_debug)):
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


# ─── Admin auth dependency ────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class _LoginIn(_BaseModel):
    username: str
    password: str

class _UserIn(_BaseModel):
    username: str
    password: str

def _require_admin(
    authorization: Optional[str] = Header(default=None),
    admin_token: Optional[str] = Cookie(default=None),
) -> str:
    # Accept token from httpOnly cookie (preferred) or Authorization header (fallback)
    token = admin_token or (authorization or "").removeprefix("Bearer ").strip()
    username = auth.check_session(token)
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return username


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
    db: Session = Depends(get_db),
    _: str = Depends(_require_admin),
):
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
@limiter.limit("30/minute")
def calculate(request: Request, data: CalculatorIn, db: Session = Depends(get_db)):
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        t = Tariffs()

    detail = _calc.calc_customs_detail(data.auction_price, data.engine_cc, data.year, data.fuel_type, t)
    customs = detail["customs"]
    fee = detail["fee"]
    delivery = {"japan": t.delivery_japan, "korea": t.delivery_korea, "china": t.delivery_china}.get(data.country, t.delivery_japan)
    total = data.auction_price + customs + fee + delivery + t.services
    return CalculatorOut(
        auction_price=data.auction_price,
        delivery=delivery,
        customs=customs,
        customs_fee=fee,
        services=t.services,
        total=total,
        eur_rate=detail["eur_rate"],
        price_eur=detail["price_eur"],
        customs_method=detail["method"],
    )


# ─── Callback requests ────────────────────────────────────────────────────────

class CallbackIn(_BaseModel):
    name: str
    phone: str

    from pydantic import field_validator
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 100:
            raise ValueError("name must be 1–100 chars")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re
        v = v.strip()
        if not re.match(r"^\+?[\d\s\-\(\)]{5,30}$", v):
            raise ValueError("invalid phone")
        return v

@app.post("/api/callback", status_code=201)
@limiter.limit("5/minute")
def create_callback(request: Request, data: CallbackIn):
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


# ─── Admin Auth ───────────────────────────────────────────────────────────────

_IS_PRODUCTION = os.getenv("NODE_ENV") == "production" or os.getenv("PRODUCTION") == "1"


@app.post("/api/admin/login")
@limiter.limit("10/minute")
def admin_login(request: Request, response: Response, data: _LoginIn, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == data.username).first()
    if not user or not auth.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    token = auth.create_session(user.username)
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite="lax",
        max_age=60 * 60 * 8,
        path="/",
    )
    return {"username": user.username}

@app.post("/api/admin/logout")
def admin_logout(
    response: Response,
    authorization: Optional[str] = Header(default=None),
    admin_token: Optional[str] = Cookie(default=None),
):
    token = admin_token or (authorization or "").removeprefix("Bearer ").strip()
    auth.revoke_session(token)
    response.delete_cookie(key="admin_token", path="/")
    return {"ok": True}

@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), _: str = Depends(_require_admin)):
    users = db.query(AdminUser).order_by(AdminUser.created_at).all()
    return [{"id": u.id, "username": u.username, "created_at": u.created_at} for u in users]

@app.post("/api/admin/users", status_code=201)
def create_user(data: _UserIn, db: Session = Depends(get_db), _: str = Depends(_require_admin)):
    if db.query(AdminUser).filter(AdminUser.username == data.username).first():
        raise HTTPException(status_code=409, detail="Пользователь уже существует")
    if len(data.password) < 8:
        raise HTTPException(status_code=422, detail="Пароль минимум 8 символов")
    u = AdminUser(username=data.username, password_hash=auth.hash_password(data.password))
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id, "username": u.username}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), me: str = Depends(_require_admin)):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Не найден")
    if user.username == me:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")
    db.delete(user); db.commit()
    return {"ok": True}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        auth._redis().ping()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
