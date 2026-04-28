"""
Japanese auction cars — ajes.com SQL API
Endpoint: http://78.46.90.228/api/?ip=IP&json&code=KEY&sql=QUERY
Table: main
"""
import os
import httpx
from typing import Optional

API_KEY  = os.getenv("AJES_API_KEY", "DvemR43s")
API_HOST = os.getenv("AJES_HOST", "78.46.90.228")

JPY_TO_RUB = 0.60


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
    where = ["STATUS='sold'"]
    if brand:
        where.append(f"MARKA_NAME LIKE '%{brand}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")

    sql = f"SELECT * FROM main WHERE {' AND '.join(where)} ORDER BY AUCTION_DATE DESC LIMIT {limit} OFFSET {offset}"

    data = await _call(sql)
    if data is None:
        return []

    cars = [_norm(i, "japan") for i in data if i]
    if price_max:
        cars = [c for c in cars if c["price"] <= price_max]
    return cars


async def _call(sql: str) -> list | None:
    params = {"ip": "1.1.1.1", "json": "", "code": API_KEY, "sql": sql}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"http://{API_HOST}/api/", params=params)
            if r.status_code != 200:
                return None
            data = r.json()
            if isinstance(data, list):
                return data
            return data.get("data", data.get("result", []))
    except Exception:
        return None


def _norm(i: dict, country: str) -> dict:
    finish = int(i.get("FINISH", i.get("START", 0)) or 0)
    price_rub = int(finish * JPY_TO_RUB)

    images_raw = i.get("IMAGES", "") or ""
    photos = [p.strip() for p in images_raw.split("#") if p.strip()]
    photo = photos[0] if photos else None
    if photo and not photo.startswith("http"):
        photo = f"https://img.ajes.com/{photo}"

    brand = (i.get("MARKA_NAME") or "").strip()
    model = (i.get("MODEL_NAME") or "").strip()
    year = int(i.get("YEAR", 0) or 0)
    mileage = int(str(i.get("MILEAGE", "0")).replace(",", "").replace(" ", "") or 0)

    kuzov = str(i.get("KUZOV", "")).lower()
    suv = any(k in kuzov for k in ["suv", "кросс", "внедор", "4wd", "van"])

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
    }
