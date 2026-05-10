from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response, Cookie, BackgroundTasks
from fastapi.staticfiles import StaticFiles
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
from models import Car, Tariffs, AdminUser, CityDelivery, AjBid, SyncState
from schemas import CarOut, CalculatorIn, CalculatorOut, TariffsSchema, CityDeliveryOut
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
        ("cars",    "equip",       "VARCHAR"),
        ("cars",    "kuzov",       "VARCHAR"),
        ("cars",    "auction_price",       "INTEGER DEFAULT 0"),
        ("cars",    "auction_price_local", "INTEGER DEFAULT 0"),
        ("cars",    "engine_cc",           "INTEGER DEFAULT 0"),
        ("cars",    "photo_urls_json",     "VARCHAR"),
        ("cars",    "auction_date",        "VARCHAR"),
        ("cars",    "auction_name",        "VARCHAR"),
        ("tariffs", "delivery_port",        "INTEGER DEFAULT 30606"),
        ("tariffs", "export_docs",          "INTEGER DEFAULT 11477"),
        ("tariffs", "freight_vlad_japan",   "INTEGER DEFAULT 33250"),
        ("tariffs", "freight_vlad_korea",   "INTEGER DEFAULT 28000"),
        ("tariffs", "freight_vlad_china",   "INTEGER DEFAULT 40000"),
        ("tariffs", "recycling_fee",        "INTEGER DEFAULT 3366"),
        ("tariffs", "freight_japan_jpy",    "INTEGER DEFAULT 175000"),
        ("tariffs", "recycling_fee_new",    "INTEGER DEFAULT 3400"),
        ("tariffs", "recycling_fee_old",    "INTEGER DEFAULT 5200"),
        ("tariffs", "broker_fee",           "INTEGER DEFAULT 25000"),
        ("tariffs", "bank_commission",      "INTEGER DEFAULT 7300"),
        ("tariffs", "lab_docs",             "INTEGER DEFAULT 25000"),
        ("tariffs", "storage_fee",          "INTEGER DEFAULT 35000"),
        ("tariffs", "local_delivery",       "INTEGER DEFAULT 7000"),
        ("tariffs", "registration_fee",     "INTEGER DEFAULT 10000"),
        ("tariffs", "delivery_omsk",            "INTEGER DEFAULT 135000"),
        ("tariffs", "company_commission",       "INTEGER DEFAULT 60000"),
        ("tariffs", "customs_rates_new_json",   "VARCHAR"),
        ("tariffs", "customs_rates_mid_json",   "VARCHAR"),
        ("tariffs", "customs_rates_old_json",   "VARCHAR"),
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {definition}"))
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


_CITY_DEFAULTS = [
    ("Владивосток",    0),
    ("Хабаровск",      15_000),
    ("Чита",           45_000),
    ("Улан-Удэ",       60_000),
    ("Иркутск",        75_000),
    ("Красноярск",     95_000),
    ("Новосибирск",    115_000),
    ("Омск",           135_000),
    ("Екатеринбург",   155_000),
    ("Уфа",            165_000),
    ("Казань",         180_000),
    ("Нижний Новгород", 190_000),
    ("Москва",         210_000),
    ("Санкт-Петербург", 215_000),
    ("Ростов-на-Дону", 210_000),
    ("Краснодар",      215_000),
]


def _init_cities():
    db = SessionLocal()
    try:
        if db.query(CityDelivery).count() == 0:
            for city_name, cost in _CITY_DEFAULTS:
                db.add(CityDelivery(city_name=city_name, cost_rub=cost))
            db.commit()
    finally:
        db.close()


CBR_URL = "https://www.cbr.ru/scripts/XML_daily.asp"


async def _fetch_rates() -> dict | None:
    try:
        import httpx
        import xml.etree.ElementTree as ET
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(CBR_URL, headers={"Accept": "application/xml"})
            if r.status_code != 200:
                print(f"CBR HTTP {r.status_code}")
                return None
        root = ET.fromstring(r.text)
        raw: dict[str, float] = {}
        for v in root.findall("Valute"):
            code = v.findtext("CharCode")
            nominal = int(v.findtext("Nominal") or 1)
            value = float((v.findtext("Value") or "0").replace(",", "."))
            if code:
                raw[code] = value / nominal
        needed = {"EUR", "JPY", "CNY", "KRW"}
        if not needed.issubset(raw):
            print(f"CBR missing codes: {needed - raw.keys()}")
            return None
        return {
            "eur_to_rub": round(raw["EUR"], 4),
            "jpy_to_rub": round(raw["JPY"], 4),
            "cny_to_rub": round(raw["CNY"], 4),
            "krw_to_rub": round(raw["KRW"], 6),
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


def _proxy_url(url: str | None) -> str | None:
    if not url:
        return None
    from urllib.parse import quote
    return f"/api/img-proxy?url={quote(url, safe='')}"


def _car_from_dict(d: dict) -> Car:
    import json as _json
    return Car(
        id=d["id"], brand=d["brand"], model=d["model"],
        year=d["year"], country=d["country"], body=d["body"],
        mileage=d["mileage"], engine=d["engine"], price=d["price"],
        badge=str(d["badge"]) if d.get("badge") else None,
        photo_tint=d.get("photo_tint", "#1a1d24"),
        silhouette=d.get("silhouette", "sedan"),
        photo_url=_proxy_url(d.get("photo_url")),
        source="live", is_active=True,
        color=d.get("color"), drive=d.get("drive"),
        grade=d.get("grade"), power=d.get("power"),
        steering=d.get("steering"), town=d.get("town"),
        equip=d.get("equip"), kuzov=d.get("kuzov"),
        auction_price=d.get("auction_price", 0),
        auction_price_local=d.get("auction_price_local", 0),
        engine_cc=d.get("engine_cc", 0),
        photo_urls_json=_json.dumps(
            [_proxy_url(u) for u in (d.get("photo_urls") or []) if u]
        ) if d.get("photo_urls") else None,
        auction_date=d.get("auction_date"),
        auction_name=d.get("auction_name"),
    )


def _raw_id(car_id: str) -> int:
    """Extract numeric ID from 'jp-12345' → 12345."""
    try:
        return int(car_id.split("-", 1)[1])
    except Exception:
        return 0


def _get_or_init_sync_state(db, country: str, prefix: str) -> SyncState:
    """Get SyncState; if missing, initialize from max ID already in DB."""
    state = db.query(SyncState).filter(SyncState.country == country).first()
    if not state:
        # Bootstrap from existing cars
        from sqlalchemy import func
        row = db.query(Car.id).filter(
            Car.country == country, Car.source == "live"
        ).all()
        max_id = max((_raw_id(r.id) for r in row), default=0)
        state = SyncState(country=country, last_max_id=max_id)
        db.add(state)
        db.flush()
        print(f"Sync bootstrap {country}: last_max_id={max_id}")
    return state


MAX_SYNC_PAGES = 50   # up to 10 000 lots per country per sync
PAGE_SIZE      = 200


async def _sync_incremental():
    """Fetch lots per country. String-ID countries (japan) paginate up to MAX_SYNC_PAGES."""
    from sources import japan, korea, china

    sources = [
        ("japan", "jp", japan),
        ("korea", "kr", korea),
        ("china", "cn", china),
    ]

    for country, prefix, src in sources:
        db = SessionLocal()
        try:
            state = _get_or_init_sync_state(db, country, prefix)
            db.commit()

            total_inserted = 0
            total_api = 0

            # For integer-ID countries use incremental (1 page). For string-ID (japan) paginate.
            incremental = state.last_max_id > 0
            max_pages = 1 if incremental else MAX_SYNC_PAGES

            for page in range(1, max_pages + 1):
                try:
                    raw_lots = await src.fetch(
                        min_id=state.last_max_id, limit=PAGE_SIZE, page=page
                    )
                except Exception as e:
                    print(f"Sync {country} page={page} fetch error: {e}")
                    break

                total_api += len(raw_lots)
                if not raw_lots:
                    break

                good_lots = [d for d in raw_lots if d.get("price", 0) > 0 and d.get("brand")]

                for d in good_lots:
                    try:
                        if not db.query(Car.id).filter(Car.id == d["id"]).first():
                            db.add(_car_from_dict(d))
                            total_inserted += 1
                        else:
                            db.query(Car).filter(Car.id == d["id"]).update(
                                {"price": d["price"], "auction_price": d.get("auction_price", 0),
                                 "is_active": True},
                                synchronize_session=False,
                            )
                    except Exception as e:
                        print(f"Sync {country} insert error {d.get('id')}: {e}")
                        db.rollback()

                max_raw = max((_raw_id(d["id"]) for d in good_lots), default=0)
                if max_raw > 0:
                    state = db.query(SyncState).filter(SyncState.country == country).first()
                    if state:
                        state.last_max_id = max(state.last_max_id, max_raw)
                db.commit()

                if len(raw_lots) < PAGE_SIZE:
                    break  # last page

            print(f"Sync {country}: API={total_api} lots, +{total_inserted} new")
        except Exception as e:
            print(f"Sync {country} error: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            db.close()


async def _sync_loop():
    # Give DB time to init on startup
    await asyncio.sleep(15)
    while True:
        await _sync_incremental()
        await asyncio.sleep(14400)  # every 4 hours


# ─── AjBids — permanent lot archive for SEO ──────────────────────────────────

def _extract_orig_url(proxy_url: str) -> str | None:
    """Decode /api/img-proxy?url=... back to original upstream URL."""
    from urllib.parse import urlparse, parse_qs, unquote
    try:
        parsed = urlparse(proxy_url)
        params = parse_qs(parsed.query)
        urls = params.get("url", [])
        return unquote(urls[0]) if urls else None
    except Exception:
        return None


def _save_to_aj_bids(lot_id: str, car_data: dict) -> None:
    """Save lot to aj_bids archive. Called as background task on first view."""
    import json as _json
    db = SessionLocal()
    try:
        if db.query(AjBid).filter(AjBid.lot_id == lot_id).first():
            return
        # Extract original (upstream) photo URLs from proxied URLs
        proxied = car_data.get("photo_urls") or []
        orig_urls = [u for u in (_extract_orig_url(p) for p in proxied) if u]
        db.add(AjBid(
            lot_id=lot_id,
            country=car_data.get("country", ""),
            brand=car_data.get("brand"),
            model=car_data.get("model"),
            year=car_data.get("year"),
            photo_urls_orig=_json.dumps(orig_urls) if orig_urls else None,
            data_json=_json.dumps(car_data),
            processed=False,
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"AjBid save error {lot_id}: {e}")
    finally:
        db.close()


async def _download_photos_for_bid(bid: AjBid) -> bool:
    """Download and cache photos for one bid. Returns True on success."""
    import json as _json, httpx
    try:
        orig_urls = _json.loads(bid.photo_urls_orig or "[]")
        if not orig_urls:
            return True  # nothing to download, mark processed

        lot_dir = os.path.join(PHOTOS_DIR, bid.lot_id)
        os.makedirs(lot_dir, exist_ok=True)
        local_urls = []

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            for idx, url in enumerate(orig_urls[:10]):  # max 10 photos per lot
                ext = "jpg"
                local_path = os.path.join(lot_dir, f"{idx}.{ext}")
                if os.path.exists(local_path):
                    local_urls.append(f"/api/photos/{bid.lot_id}/{idx}.{ext}")
                    continue
                try:
                    r = await client.get(url, headers={"Referer": "https://ajes.com/"})
                    if r.status_code != 200:
                        continue
                    loop = asyncio.get_event_loop()
                    content, _ = await loop.run_in_executor(
                        None, _compress_image, r.content, ""
                    )
                    with open(local_path, "wb") as f:
                        f.write(content)
                    local_urls.append(f"/api/photos/{bid.lot_id}/{idx}.{ext}")
                except Exception:
                    continue

        if local_urls:
            # Patch data_json photo_urls with local paths
            db = SessionLocal()
            try:
                data = _json.loads(bid.data_json or "{}")
                data["photo_urls"] = local_urls
                data["photo_url"] = local_urls[0] if local_urls else data.get("photo_url")
                db.query(AjBid).filter(AjBid.id == bid.id).update(
                    {"processed": True, "data_json": _json.dumps(data)},
                    synchronize_session=False,
                )
                db.commit()
            finally:
                db.close()
        return True
    except Exception as e:
        print(f"Photo download error {bid.lot_id}: {e}")
        return False


async def _photo_download_loop():
    """Hourly job: download photos for unprocessed bids. Max 400 lots/day."""
    await asyncio.sleep(60)  # wait for startup
    while True:
        db = SessionLocal()
        try:
            today = datetime.datetime.utcnow().date()
            today_start = datetime.datetime(today.year, today.month, today.day)
            done_today = db.query(AjBid).filter(
                AjBid.processed == True,
                AjBid.created_at >= today_start,
            ).count()
            remaining = max(0, 400 - done_today)
            per_run = min(remaining, 17)  # spread ~400/day over 24 runs

            if per_run > 0:
                pending = db.query(AjBid).filter(
                    AjBid.processed == False,
                    AjBid.photo_urls_orig.isnot(None),
                ).order_by(AjBid.created_at.asc()).limit(per_run).all()
            else:
                pending = []
        finally:
            db.close()

        for bid in pending:
            await _download_photos_for_bid(bid)
            await asyncio.sleep(2)  # gentle rate on ajes.com

        await asyncio.sleep(3600)  # run hourly


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    _init_tariffs()
    _init_admin()
    _init_cities()
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    tasks = [
        asyncio.create_task(_rates_loop()),
        asyncio.create_task(_sync_loop()),
        asyncio.create_task(_photo_download_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass


# ─── Rate limiter ─────────────────────────────────────────────────────────────

PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "static", "photos")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Восток Авто Импорт API", version="1.0.0", lifespan=lifespan)
os.makedirs(PHOTOS_DIR, exist_ok=True)
app.mount("/api/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")
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
    mileage_min: Optional[int] = None,
    mileage_max: Optional[int] = None,
    fuel: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    transmission: Optional[str] = None,
    engine_cc_min: Optional[int] = None,
    engine_cc_max: Optional[int] = None,
    lot_id: Optional[str] = None,
    sort: str = "popular",
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Car).filter(Car.is_active == True)
    if country:       q = q.filter(Car.country == country)
    if body:          q = q.filter(Car.body == body)
    if brand:         q = q.filter(Car.brand.ilike(f"%{brand}%"))
    if model:         q = q.filter(Car.model.ilike(f"%{model}%"))
    if fuel:          q = q.filter(Car.engine.ilike(f"%{fuel}%"))
    if transmission:  q = q.filter(Car.engine.ilike(f"%{transmission}%"))
    if color:         q = q.filter(Car.color.ilike(f"%{color}%"))
    if price_min:     q = q.filter(Car.price >= price_min)
    if price_max:     q = q.filter(Car.price <= price_max)
    if year_min:      q = q.filter(Car.year >= year_min)
    if year_max:      q = q.filter(Car.year <= year_max)
    if mileage_min:   q = q.filter(Car.mileage >= mileage_min)
    if mileage_max:   q = q.filter(Car.mileage <= mileage_max)
    if engine_cc_min: q = q.filter(Car.engine_cc >= engine_cc_min)
    if engine_cc_max: q = q.filter(Car.engine_cc <= engine_cc_max)
    if lot_id:        q = q.filter(Car.id.ilike(f"%{lot_id}%"))
    if sort == "price-asc":    q = q.order_by(Car.price.asc(),   Car.id.desc())
    elif sort == "price-desc": q = q.order_by(Car.price.desc(),  Car.id.desc())
    elif sort == "year":       q = q.order_by(Car.year.desc(),   Car.id.desc())
    elif sort == "mileage":    q = q.order_by(Car.mileage.asc(), Car.id.desc())
    else:                      q = q.order_by(Car.id.desc())
    return q.offset(offset).limit(min(limit, 200)).all()


@app.get("/api/cars-brands")
@limiter.limit("30/minute")
def cars_brands(request: Request, country: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy import func
    q = db.query(Car.brand, func.count(Car.id).label("cnt")).filter(Car.is_active == True)
    if country:
        q = q.filter(Car.country == country)
    rows = q.group_by(Car.brand).order_by(func.count(Car.id).desc()).all()
    return [{"brand": r.brand, "count": r.cnt} for r in rows]


@app.get("/api/cars-models")
@limiter.limit("30/minute")
def cars_models(request: Request, brand: str, country: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy import func
    q = db.query(Car.model, func.count(Car.id).label("cnt")).filter(Car.is_active == True, Car.brand.ilike(f"%{brand}%"))
    if country:
        q = q.filter(Car.country == country)
    rows = q.group_by(Car.model).order_by(func.count(Car.id).desc()).limit(60).all()
    return [{"model": r.model, "count": r.cnt} for r in rows]


@app.get("/api/cars-colors")
@limiter.limit("30/minute")
def cars_colors(request: Request, country: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy import func
    q = db.query(Car.color, func.count(Car.id).label("cnt")).filter(Car.is_active == True, Car.color.isnot(None), Car.color != "")
    if country:
        q = q.filter(Car.country == country)
    rows = q.group_by(Car.color).order_by(func.count(Car.id).desc()).limit(40).all()
    return [{"color": r.color, "count": r.cnt} for r in rows]


@app.get("/api/cars-count")
@limiter.limit("60/minute")
def count_cars(request: Request,
    country: Optional[str] = None,
    body: Optional[str] = None,
    fuel: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    price_min: Optional[int] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    mileage_min: Optional[int] = None,
    mileage_max: Optional[int] = None,
    color: Optional[str] = None,
    transmission: Optional[str] = None,
    engine_cc_min: Optional[int] = None,
    engine_cc_max: Optional[int] = None,
    lot_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    def _apply(q):
        if body:          q = q.filter(Car.body == body)
        if fuel:          q = q.filter(Car.engine.ilike(f"%{fuel}%"))
        if brand:         q = q.filter(Car.brand.ilike(f"%{brand}%"))
        if model:         q = q.filter(Car.model.ilike(f"%{model}%"))
        if transmission:  q = q.filter(Car.engine.ilike(f"%{transmission}%"))
        if color:         q = q.filter(Car.color.ilike(f"%{color}%"))
        if price_min:     q = q.filter(Car.price >= price_min)
        if price_max:     q = q.filter(Car.price <= price_max)
        if year_min:      q = q.filter(Car.year >= year_min)
        if year_max:      q = q.filter(Car.year <= year_max)
        if mileage_min:   q = q.filter(Car.mileage >= mileage_min)
        if mileage_max:   q = q.filter(Car.mileage <= mileage_max)
        if engine_cc_min: q = q.filter(Car.engine_cc >= engine_cc_min)
        if engine_cc_max: q = q.filter(Car.engine_cc <= engine_cc_max)
        if lot_id:        q = q.filter(Car.id.ilike(f"%{lot_id}%"))
        return q
    base = db.query(Car).filter(Car.is_active == True)
    if country:
        base = base.filter(Car.country == country)
    total = _apply(base).count()
    by_country = {
        c: _apply(db.query(Car).filter(Car.is_active == True, Car.country == c)).count()
        for c in ["japan", "korea", "china"]
    }
    return {"total": total, "by_country": by_country}


# ─── Car detail ───────────────────────────────────────────────────────────────

@app.get("/api/cars/{car_id}")
def get_car(car_id: str, db: Session = Depends(get_db),
            background_tasks: BackgroundTasks = None):
    import json as _json
    db_car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
    if not db_car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")
    result = {c.name: getattr(db_car, c.name) for c in db_car.__table__.columns}
    try:
        result["photo_urls"] = _json.loads(result.get("photo_urls_json") or "[]")
    except Exception:
        result["photo_urls"] = []
    if background_tasks is not None:
        background_tasks.add_task(_save_to_aj_bids, car_id, result)
    return result


@app.get("/api/seo/cars")
def seo_cars_list(limit: int = 1000, offset: int = 0, db: Session = Depends(get_db)):
    """List of lot_ids saved in aj_bids — for sitemap generation."""
    rows = db.query(AjBid.lot_id, AjBid.created_at).order_by(
        AjBid.created_at.desc()
    ).offset(offset).limit(min(limit, 5000)).all()
    return [{"lot_id": r.lot_id, "updated_at": r.created_at.isoformat()} for r in rows]


@app.get("/api/cars/{car_id}/breakdown")
def get_car_breakdown(car_id: str, db: Session = Depends(get_db)):
    db_car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
    if not db_car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")
    t = tariff_cache.get()
    ap = getattr(db_car, "auction_price", 0) or 0
    cc = getattr(db_car, "engine_cc", 0) or 0
    if ap <= 0:
        return None
    detail = _calc.calc_customs_detail(ap, cc, db_car.year, db_car.engine or "Бензин", t)
    delivery = _calc.get_delivery(db_car.country, t)
    services = _calc.get_services_total(t, db_car.year)
    items = _calc.get_items(ap, detail["customs"], db_car.country, t, 0, "Омск", db_car.year)
    total = sum(i["value"] for i in items)
    return {
        "auction_price": ap,
        "customs": detail["customs"],
        "customs_fee": 0,
        "delivery": delivery,
        "services": services,
        "total": total,
        "items": items,
    }



@app.get("/api/cars/{car_id}/similar", response_model=List[CarOut])
def get_similar_cars(car_id: str, db: Session = Depends(get_db)):
    db_car = db.query(Car).filter(Car.id == car_id, Car.is_active == True).first()
    if not db_car:
        raise HTTPException(status_code=404, detail="Автомобиль не найден")

    base = db.query(Car).filter(Car.is_active == True, Car.id != car_id)

    # same brand + country first
    by_brand = base.filter(Car.brand == db_car.brand, Car.country == db_car.country).limit(6).all()
    if len(by_brand) >= 6:
        return by_brand

    seen = {c.id for c in by_brand}
    # fill with same body + country
    by_body = base.filter(
        Car.body == db_car.body,
        Car.country == db_car.country,
        ~Car.id.in_(seen),
    ).limit(6 - len(by_brand)).all()

    return by_brand + by_body


# ─── Image proxy ─────────────────────────────────────────────────────────────

ALLOWED_IMG_HOSTS = {"ajes.com", "7.ajes.com", "img.ajes.com"}

_IMG_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".img_cache")
os.makedirs(_IMG_CACHE_DIR, exist_ok=True)


def _img_cache_path(url: str, webp: bool) -> str:
    import hashlib
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    ext = "webp" if webp else "jpg"
    return os.path.join(_IMG_CACHE_DIR, f"{key}.{ext}")


def _compress_image(data: bytes, accept: str) -> tuple[bytes, str]:
    try:
        from PIL import Image, ImageFilter
        import io
        img = Image.open(io.BytesIO(data))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))
        out = io.BytesIO()
        if "image/webp" in accept:
            img.save(out, format="WEBP", quality=95, method=4)
            return out.getvalue(), "image/webp"
        img.save(out, format="JPEG", quality=92, optimize=True, progressive=True)
        return out.getvalue(), "image/jpeg"
    except Exception:
        return data, "image/jpeg"


@app.get("/api/img-proxy")
@limiter.limit("240/minute")
async def img_proxy(request: Request, url: str):
    import asyncio
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.netloc.lstrip("www.")
    if not any(host == h or host.endswith("." + h) for h in ALLOWED_IMG_HOSTS):
        raise HTTPException(status_code=403, detail="Host not allowed")

    accept = request.headers.get("accept", "")
    webp = "image/webp" in accept
    cache_path = _img_cache_path(url, webp)

    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            cached = f.read()
        ct = "image/webp" if webp else "image/jpeg"
        return Response(content=cached, media_type=ct,
            headers={"Cache-Control": "public, max-age=604800", "X-Cache": "HIT"})

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(url, headers={"Referer": "https://ajes.com/"})
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail="Upstream error")
        loop = asyncio.get_event_loop()
        content, content_type = await loop.run_in_executor(None, _compress_image, r.content, accept)
        try:
            with open(cache_path, "wb") as f:
                f.write(content)
        except Exception:
            pass
        return Response(content=content, media_type=content_type,
            headers={"Cache-Control": "public, max-age=604800", "X-Cache": "MISS"})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Fetch failed")


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


# ─── Cities ──────────────────────────────────────────────────────────────────

@app.get("/api/cities", response_model=List[CityDeliveryOut])
def get_cities(db: Session = Depends(get_db)):
    return db.query(CityDelivery).order_by(CityDelivery.id).all()


@app.put("/api/cities/{city_id}", response_model=CityDeliveryOut)
def update_city(city_id: int, cost_rub: int, db: Session = Depends(get_db),
                _: str = Depends(_require_admin)):
    city = db.query(CityDelivery).filter(CityDelivery.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    city.cost_rub = cost_rub
    db.commit()
    db.refresh(city)
    return city


# ─── Calculator ───────────────────────────────────────────────────────────────

def _to_rub(amount: float, currency: str, t) -> int:
    if currency == "JPY":
        return round(amount * t.jpy_to_rub)
    if currency == "KRW":
        return round(amount * t.krw_to_rub)
    if currency == "CNY":
        return round(amount * t.cny_to_rub)
    return round(amount)


@app.post("/api/calculator", response_model=CalculatorOut)
@limiter.limit("30/minute")
def calculate(request: Request, data: CalculatorIn, db: Session = Depends(get_db)):
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        t = Tariffs()

    auction_price_rub = _to_rub(data.auction_price, data.currency, t)

    city_delivery = 0
    city_name = "Омск"
    if data.city:
        city_row = db.query(CityDelivery).filter(CityDelivery.city_name == data.city).first()
        if city_row:
            city_delivery = city_row.cost_rub
            city_name = city_row.city_name

    detail = _calc.calc_customs_detail(auction_price_rub, data.engine_cc, data.year, data.fuel_type, t)
    customs = detail["customs"]
    delivery = _calc.get_delivery(data.country, t)
    services = _calc.get_services_total(t, data.year, city_delivery)
    items = _calc.get_items(auction_price_rub, customs, data.country, t, city_delivery, city_name, data.year)
    total = sum(i["value"] for i in items)
    return CalculatorOut(
        auction_price=auction_price_rub,
        delivery=delivery,
        customs=customs,
        services=services,
        total=total,
        eur_rate=detail["eur_rate"],
        price_eur=detail["price_eur"],
        customs_method=detail["method"],
        items=items,
    )


# ─── Customs rate tables ─────────────────────────────────────────────────────

# ФТС bracket boundaries (official EAEU, do not change)
_CC_BRACKETS = [(0, 1000), (1000, 1500), (1500, 1800), (1800, 2300), (2300, 3000), (3000, 99999)]


def _cell_float(val, default=None):
    try:
        s = str(val).strip().replace("\xa0", "").replace(" ", "").replace(",", ".").replace("₽", "").replace("¥", "").replace("₩", "")
        return float(s) if s else default
    except (ValueError, TypeError):
        return default


def _parse_customs_rows(raw_rows: list) -> dict:
    """
    Parse the fixed spreadsheet layout (as shown in the admin UI):
      Row 1  (index 0): headers — skip
      Row 2  (index 1): A=JPY/RUB, B=EUR/RUB, C=coef_mid(3–5), D=empty, E=coef_old(5+)
      Row 3  (index 2): empty — skip
      Row 4  (index 3): column headers — skip
      Row 5+ (index 4+): A=cc, B=mid_rate, C=mid_rub(skip), D=old_rate, E=old_rub(skip)
    """
    jpy_rate = eur_rate = coef_mid = coef_old = None
    data_rows = []  # list of (cc, mid_rate, old_rate)

    for row in raw_rows:
        if len(row) < 2:
            continue
        a = _cell_float(row[0])
        b = _cell_float(row[1] if len(row) > 1 else None)
        c = _cell_float(row[2] if len(row) > 2 else None)
        e = _cell_float(row[4] if len(row) > 4 else None)
        d = _cell_float(row[3] if len(row) > 3 else None)

        # Rates row: A < 2 (JPY ~0.5), B > 50 (EUR ~87)
        if a and 0 < a < 2 and b and b > 50:
            jpy_rate = a
            eur_rate = b
            if c: coef_mid = c
            if e: coef_old = e
            continue

        # Data row: A = cc integer 100–9999, B and D = EUR/cc rates (small floats)
        if a and 100 <= a <= 9999 and b and 0 < b < 30:
            old_rate = d if (d and 0 < d < 30) else None
            if old_rate:
                data_rows.append((int(round(a)), b, old_rate))

    if not data_rows:
        return {"error": "Строки с объёмом двигателя не найдены. Проверьте формат таблицы."}

    def build_brackets(col: int) -> list:
        result = []
        last_rate = None
        for lo, hi in _CC_BRACKETS:
            rate = None
            for cc, mid, old in data_rows:
                r = mid if col == 0 else old
                if lo < cc <= hi:
                    rate = r
                    break
            if rate is None:
                rate = last_rate  # inherit last known
            if rate is not None:
                result.append([lo, hi, rate])
                last_rate = rate
        return result

    return {
        "jpy_to_rub": jpy_rate,
        "eur_to_rub": eur_rate,
        "customs_coef_mid": coef_mid,
        "customs_coef_old": coef_old,
        "rates_mid": build_brackets(0),
        "rates_old": build_brackets(1),
    }


class _GsheetImportIn(_BaseModel):
    url: str


def _gsheet_to_csv_url(url: str) -> str:
    import re
    m = re.search(r'/spreadsheets/d/([a-zA-Z0-9_-]+)', url)
    if not m:
        raise HTTPException(status_code=400, detail="Не распознан URL Google Sheets")
    sheet_id = m.group(1)
    gid_m = re.search(r'[#&?]gid=(\d+)', url)
    gid = gid_m.group(1) if gid_m else "0"
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"


@app.post("/api/admin/customs/preview-gsheet")
@limiter.limit("10/minute")
async def preview_customs_gsheet(request: Request, data: _GsheetImportIn,
                                  _: str = Depends(_require_admin)):
    import csv as _csv, io as _io
    csv_url = _gsheet_to_csv_url(data.url)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(csv_url)
            if r.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Ошибка загрузки листа: HTTP {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка сети: {e}")

    raw_rows = list(_csv.reader(_io.StringIO(r.text)))
    result = _parse_customs_rows(raw_rows)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/admin/customs/preview-excel")
@limiter.limit("10/minute")
async def preview_customs_excel(request: Request, _: str = Depends(_require_admin)):
    from fastapi import UploadFile, File
    import io as _io
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Файл не получен")
    try:
        import openpyxl
        wb = openpyxl.load_workbook(_io.BytesIO(body), read_only=True, data_only=True)
        ws = wb.active
        raw_rows = [[cell.value for cell in row] for row in ws.iter_rows()]
        wb.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка чтения Excel: {e}")
    result = _parse_customs_rows(raw_rows)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


class _CustomsApplyIn(_BaseModel):
    customs_coef_mid: Optional[float] = None
    customs_coef_old: Optional[float] = None
    rates_mid: Optional[List] = None
    rates_old: Optional[List] = None


@app.put("/api/admin/customs")
def update_customs_rates(data: _CustomsApplyIn, db: Session = Depends(get_db),
                         _: str = Depends(_require_admin)):
    import json as _json
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tariffs not found")
    if data.rates_mid is not None:
        t.customs_rates_mid_json = _json.dumps(data.rates_mid)
    if data.rates_old is not None:
        t.customs_rates_old_json = _json.dumps(data.rates_old)
    if data.customs_coef_mid:
        t.customs_coef_mid = data.customs_coef_mid
    if data.customs_coef_old:
        t.customs_coef_old = data.customs_coef_old
    db.commit()
    db.refresh(t)
    tariff_cache.update(t)
    return {"ok": True}


@app.get("/api/admin/customs")
def get_customs_rates(db: Session = Depends(get_db), _: str = Depends(_require_admin)):
    import json as _json
    t = db.query(Tariffs).filter(Tariffs.id == 1).first()
    def _parse(json_str, fallback):
        if json_str:
            try:
                return _json.loads(json_str)
            except Exception:
                pass
        return [list(row) for row in fallback]
    from calc import _RATES_MID, _RATES_OLD
    return {
        "rates_mid": _parse(t.customs_rates_mid_json if t else None, _RATES_MID),
        "rates_old": _parse(t.customs_rates_old_json if t else None, _RATES_OLD),
    }


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
