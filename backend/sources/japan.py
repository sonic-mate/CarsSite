"""
Japanese auction cars — ajes.com SQL API
Endpoint: http://78.46.90.228/api/?json&code=KEY&sql=QUERY
Table: main
"""
import os
import httpx
from typing import Optional
import tariff_cache

API_KEY  = os.getenv("AJES_API_KEY", "VAInBvFrU76d")
API_HOST = os.getenv("AJES_HOST", "78.46.90.228")


async def fetch(
    brand: Optional[str] = None,
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    **_,
) -> list[dict]:
    offset = (page - 1) * limit
    where = ["1=1"]
    if brand:
        where.append(f"MARKA_NAME LIKE '%{brand}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")

    sql = f"SELECT * FROM main WHERE {' AND '.join(where)} ORDER BY ID DESC LIMIT {offset},{limit}"
    data = await _call(sql)
    if not data:
        return []

    cars = [_norm(i) for i in data if i]
    if price_max:
        cars = [c for c in cars if c["price"] <= price_max]
    return cars


async def fetch_one(lot_id: str) -> list[dict]:
    sql = f"SELECT * FROM main WHERE ID={lot_id} LIMIT 1"
    data = await _call(sql)
    if not data:
        return []
    return [_norm(i) for i in data if i]


async def _call(sql: str) -> list | None:
    from urllib.parse import quote
    url = f"http://{API_HOST}/api/?json&code={API_KEY}&sql={quote(sql)}"
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(url)
            if r.status_code != 200:
                return None
            data = r.json()
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "error" in data:
                return None
            return data.get("data", data.get("result", []))
    except Exception:
        return None


def _photo_url(images_raw: str) -> str | None:
    photos = [p.strip() for p in (images_raw or "").split("#") if p.strip()]
    if not photos:
        return None
    img = photos[0]
    if img.startswith("http"):
        return f"{img}&w=320"
    return f"https://7.ajes.com/imgs/{img}&w=320"


def _norm(i: dict) -> dict:
    def _n(v): return int(v or 0) if str(v or "").isdigit() else 0
    finish = _n(i.get("FINISH")) or _n(i.get("START")) or _n(i.get("AVG_PRICE"))
    price_rub = int(finish * tariff_cache.get().jpy_to_rub)

    photo = _photo_url(i.get("IMAGES", ""))
    brand = (i.get("MARKA_NAME") or "").strip()
    model = (i.get("MODEL_NAME") or "").strip()
    year = int(i.get("YEAR", 0) or 0)
    mileage = int(str(i.get("MILEAGE", "0")).replace(",", "").replace(" ", "") or 0)

    kuzov = str(i.get("KUZOV", "")).lower()
    suv = any(k in kuzov for k in ["suv", "кросс", "внедор", "4wd", "van", "minivan"])

    eng = i.get("ENG_V", "")
    kpp = i.get("KPP", "")
    time_flag = str(i.get("TIME", "")).upper()
    if time_flag == "E":
        fuel = "Электро"
    elif time_flag == "H":
        fuel = "Гибрид"
    else:
        fuel = "Бензин"
    engine = " · ".join(p for p in [f"{eng}cc" if eng else "", kpp, fuel] if p)

    lot_id = str(i.get("ID", i.get("LOT", "")))

    return {
        "id": f"jp-{lot_id}",
        "brand": brand,
        "model": model,
        "year": year,
        "country": "japan",
        "body": i.get("KUZOV") or "Седан",
        "mileage": mileage,
        "engine": engine or "—",
        "price": price_rub,
        "badge": i.get("RATE"),
        "photo_tint": "#1a1d24",
        "silhouette": "suv" if suv else "sedan",
        "is_active": True,
        "photo_url": photo,
        "source": "ajes",
        "source_url": f"https://ajes.com/?lot={lot_id}",
        "_raw_images": i.get("IMAGES", ""),
    }
