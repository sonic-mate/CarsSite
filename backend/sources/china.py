"""
Chinese auction cars — ajes.com SQL API
Table: che
"""
import os
import httpx
from typing import Optional
import tariff_cache
import calc

API_KEY  = os.getenv("AJES_API_KEY", "")
API_HOST = os.getenv("AJES_HOST", "78.46.90.228")
API_IP   = os.getenv("AJES_IP", "")


async def fetch(
    brand: Optional[str] = None,
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    min_id: int = 0,
    **_,
) -> list[dict]:
    offset = (page - 1) * limit
    where = ["1=1"]
    if brand:
        brand_safe = brand.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        where.append(f"MARKA_NAME LIKE '%{brand_safe}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")
    if min_id:
        where.append(f"ID>{int(min_id)}")

    sql = f"SELECT * FROM china WHERE {' AND '.join(where)} ORDER BY ID DESC LIMIT {offset},{limit}"
    data = await _call(sql)
    if not data:
        return []

    cars = [_norm(i) for i in data if i]
    if price_max:
        cars = [c for c in cars if c["price"] <= price_max]
    return cars


async def fetch_one(lot_id: str) -> list[dict]:
    sql = f"SELECT * FROM china WHERE ID={lot_id} LIMIT 1"
    data = await _call(sql)
    if not data:
        return []
    return [_norm(i) for i in data if i]


async def count(brand: Optional[str] = None, year_min: Optional[int] = None, **_) -> int:
    where = ["1=1"]
    if brand:
        brand_safe = brand.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        where.append(f"MARKA_NAME LIKE '%{brand_safe}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")
    sql = f"SELECT COUNT(*) FROM china WHERE {' AND '.join(where)}"
    data = await _call(sql)
    if data and isinstance(data[0], dict):
        return int(list(data[0].values())[0])
    return 0


async def _call(sql: str) -> list | None:
    import json as _json
    from urllib.parse import quote
    if API_IP:
        url = f"http://{API_HOST}/api/?ip={API_IP}&code={API_KEY}&sql={quote(sql)}"
    else:
        url = f"http://{API_HOST}/api/?code={API_KEY}&sql={quote(sql)}"
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(url)
            if r.status_code != 200:
                print(f"[ajes/cn] HTTP {r.status_code}: {r.text[:200]}")
                return None
            raw = r.text
            if not raw:
                print(f"[ajes/cn] Empty response, status={r.status_code}")
                return None
            print(f"[ajes/cn] Response ({r.status_code}): {raw[:300]}")
            data = _json.loads(raw)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "error" in data:
                print(f"[ajes/cn] API error: {data}")
                return None
            return data.get("data", data.get("result", []))
    except Exception as e:
        print(f"[ajes/cn] Exception: {e}, url={url[:80]}")
        return None


def _photo_url(images_raw: str, size: str = "&w=320") -> str | None:
    photos = [p.strip() for p in (images_raw or "").split("#") if p.strip()]
    if not photos:
        return None
    img = photos[0]
    for suffix in ("&w=320", "&h=50", "&w=640", "&w=800"):
        if img.endswith(suffix):
            img = img[: -len(suffix)]
    if img.startswith("http"):
        return f"{img}{size}"
    if "ajes.com/" in img:
        return f"https://{img}{size}"
    return f"https://7.ajes.com/img/{img}{size}"


def _body_type(model: str, brand: str = "") -> str:
    m = (model or "").upper()
    b = (brand or "").upper()
    full = f"{b} {m}".strip()
    _chk = lambda keys: any(k in full for k in keys)

    if _chk(["GL8", "BUICK GL8", "ODYSSEY", "CARNIVAL"]):
        return "Минивэн"
    if _chk(["LAND CRUISER", "PRADO", "FORTUNER", "PATROL"]):
        return "Внедорожник"
    if _chk(["TIGUAN", "TERAMONT", "ATLAS", "TOUAREG", "CR-V", "RAV4",
              "FORESTER", "OUTLANDER", "SORENTO", "SANTA FE", "TUCSON",
              "HAVAL", "TANK", "GWM", "AION", "SERES", "BYD SONG",
              "BYD TANG", "CHERY TIGGO", "GEELY ATLAS", "GEELY MONJARO",
              "EXEED", "OMODA", "JAECOO", "LI ONE", "LI L", "XPENG G",
              "NIO ES", "NIO EC", "ZEEKR", "VOYAH", "DEEPAL"]):
        return "Кроссовер"
    if _chk(["POLO", "GOLF", "LAVIDA", "BORA", "JETTA", "SAGITAR",
              "BYD DOLPHIN", "BYD SEAGULL", "MINI"]):
        return "Хэтчбэк"
    if _chk(["CAMRY", "ACCORD", "ACCORD", "TEANA", "ALTIMA", "SONATA",
              "K5", "PASSAT", "MAGOTAN", "BUICK LACROSSE", "BUICK EXCELLE",
              "BYD HAN", "BYD SEAL", "NIO ET", "XPENG P", "ZEEKR 001",
              "TESLA MODEL 3", "TESLA MODEL S", "IM L7"]):
        return "Седан"
    return "Другой"


def _norm(i: dict) -> dict:
    finish = int(i.get("FINISH") or i.get("START") or i.get("AVG_PRICE") or 0)
    t = tariff_cache.get()
    auction_price_rub = int(finish * t.cny_to_rub)

    raw_images = i.get("IMAGES", "")
    photo = _photo_url(raw_images)
    photo_urls = [
        url for p in (raw_images or "").split("#")
        if p.strip() and (url := _photo_url(p.strip(), size="&w=320"))
    ]
    brand = (i.get("MARKA_NAME") or "").strip()
    model = (i.get("MODEL_NAME") or "").strip()
    year = int(i.get("YEAR", 0) or 0)
    mileage = int(str(i.get("MILEAGE", "0")).replace(",", "").replace(" ", "") or 0)

    body = _body_type(model, brand)
    suv = body in ("Внедорожник", "Кроссовер")

    eng = i.get("ENG_V", "")
    kpp = i.get("KPP", "")
    time_flag = str(i.get("TIME", "")).upper()
    if time_flag == "E":
        fuel = "Электро"
    elif time_flag in ("H", "HE"):
        fuel = "Гибрид"
    elif time_flag == "D":
        fuel = "Дизель"
    elif time_flag in ("L", "C"):
        fuel = "Газ"
    else:
        fuel = "Бензин"
    engine = " · ".join(p for p in [f"{eng}cc" if eng else "", kpp, fuel] if p)
    engine_cc = int(eng) if str(eng).isdigit() else 0
    price = calc.turnkey_price(auction_price_rub, engine_cc, year, fuel, "china", t) if auction_price_rub > 0 else 0

    lot_id = str(i.get("ID", i.get("LOT", "")))

    return {
        "id": f"cn-{lot_id}",
        "brand": brand,
        "model": model,
        "year": year,
        "country": "china",
        "body": body,
        "mileage": mileage,
        "engine": engine or "—",
        "price": price,
        "badge": i.get("RATE"),
        "photo_tint": "#15181f",
        "silhouette": "suv" if suv else "sedan",
        "is_active": True,
        "photo_url": photo,
        "photo_urls": photo_urls,
        "source": "ajes",
        "source_url": f"https://ajes.com/?lot={lot_id}",
        "auction_price": auction_price_rub,
        "auction_price_local": finish,
        "engine_cc": engine_cc,
        "auction_date": (i.get("AUCTION_DATE") or "").strip()[:10] or None,
        "auction_name": (i.get("AUCTION") or "").strip() or None,
    }
