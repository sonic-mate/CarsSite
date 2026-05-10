"""
Japanese auction cars — ajes.com SQL API
Endpoint: http://78.46.90.228/api/?json&code=KEY&sql=QUERY
Table: main
"""
import os
import html
import httpx
from typing import Optional
import tariff_cache
import calc
import color_map

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
    where = ["AUCTION_TYPE!=1"]
    if brand:
        brand_safe = brand.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        where.append(f"MARKA_NAME LIKE '%{brand_safe}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")
    if min_id:
        where.append(f"ID>{int(min_id)}")

    sql = f"SELECT * FROM main WHERE {' AND '.join(where)} ORDER BY ID DESC LIMIT {offset},{limit}"
    data = await _call(sql)
    if not data:
        return []

    cars = [_norm(i) for i in data if i]
    if price_max:
        cars = [c for c in cars if c["price"] <= price_max]
    return cars


async def fetch_one(lot_id: str) -> list[dict]:
    val = lot_id if lot_id.isdigit() else f"'{lot_id}'"
    sql = f"SELECT * FROM main WHERE ID={val} LIMIT 1"
    data = await _call(sql)
    if not data:
        return []
    return [_norm(i) for i in data if i]


async def count(brand: Optional[str] = None, year_min: Optional[int] = None, **_) -> int:
    where = ["AUCTION_TYPE!=1"]
    if brand:
        brand_safe = brand.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")
        where.append(f"MARKA_NAME LIKE '%{brand_safe}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")
    sql = f"SELECT COUNT(*) FROM main WHERE {' AND '.join(where)}"
    data = await _call(sql)
    if data and isinstance(data[0], dict):
        return int(list(data[0].values())[0])
    return 0


async def _call(sql: str) -> list | None:
    import gzip as _gzip
    import json as _json
    from urllib.parse import quote
    ip_part = f"&ip={API_IP}" if API_IP else ""
    url = f"http://{API_HOST}/api/?gzip{ip_part}&code={API_KEY}&sql={quote(sql)}"
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(url)
            if r.status_code != 200:
                print(f"[ajes] HTTP {r.status_code}: {r.text[:200]}")
                return None
            raw_bytes = r.content
            if not raw_bytes:
                print(f"[ajes] Empty response, status={r.status_code}")
                return None
            try:
                raw = _gzip.decompress(raw_bytes).decode("utf-8")
            except Exception:
                raw = raw_bytes.decode("utf-8", errors="replace")
            print(f"[ajes] Response ({r.status_code}): {raw[:300]}")
            data = _json.loads(raw)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "error" in data:
                print(f"[ajes] API error: {data}")
                return None
            return data.get("data", data.get("result", []))
    except Exception as e:
        print(f"[ajes] Exception: {e}, url={url[:80]}")
        return None


def _photo_url(images_raw: str, size: str = "&w=320") -> str | None:
    photos = [p.strip() for p in (images_raw or "").split("#") if p.strip()]
    if not photos:
        return None
    img = photos[0]
    # Strip any existing size suffix before appending
    for suffix in ("&w=320", "&h=50", "&w=640", "&w=800"):
        if img.endswith(suffix):
            img = img[: -len(suffix)]
    if img.startswith("http"):
        return f"{img}{size}"
    if "ajes.com/" in img:
        return f"https://{img}{size}"
    # Bare token
    return f"https://7.ajes.com/img/{img}{size}"


def _body_type(model: str, brand: str = "") -> str:
    m = (model or "").upper()
    b = (brand or "").upper()
    full = f"{b} {m}".strip()
    _chk = lambda keys: any(k in full for k in keys)

    if _chk(["ALPHARD", "VELLFIRE", "VOXY", "NOAH", "SERENA", "ELGRAND",
              "STEPWGN", "STEP WGN", "ODYSSEY", "SIENTA", "FREED", "WISH",
              "ESTIMA", "PREVIA", "DELICA", "CARNIVAL", "STARIA",
              "GRANDVIA", "REGIUS", "ROOMY", "TANK", "ISIS",
              "DAYZ ROOX", "TOWNACE WAGON", "LITEACE WAGON"]):
        return "Минивэн"

    if _chk(["HIACE", "TOWN ACE VAN", "LITE ACE VAN", "TOWNACE VAN",
              "LITEACE VAN", "CARAVAN", "NV200", "NV350", "BONGO",
              "ATLAS", "PROBOX", "SUCCEED", "SAMBAR", "CANTER",
              "HIJET TRUCK", "CARRY TRUCK", "DYNA", "ELF",
              "TITAN TRUCK", "CONDOR"]):
        return "Фургон"

    if _chk(["LAND CRUISER", "LC300", "LC 300", "PRADO", "PATROL",
              "PAJERO", "FORTUNER", "HILUX SURF", "4RUNNER", "SEQUOIA",
              "FJ CRUISER", "LANDCRUISER", "JIMNY", "BEGO"]):
        return "Внедорожник"

    # Lexus crossovers: brand=LEXUS model=RX/NX/UX/LX/GX
    if b == "LEXUS" and any(k in m for k in ["RX", "NX", "UX", "LX", "GX"]):
        return "Кроссовер"

    if _chk(["RAV4", "CR-V", "CRV", "HARRIER", "VEZEL", "HR-V", "HRV",
              "CH-R", "C-HR", "OUTLANDER", "CX-3", "CX-5", "CX-8", "CX-30",
              "FORESTER", "OUTBACK", "SUBARU XV", "X-TRAIL", "XTRAIL",
              "QASHQAI", "JUKE", "MURANO", "KICKS", "ECLIPSE CROSS",
              "ASX", "TUCSON", "SPORTAGE", "SORENTO", "RUSH", "RAIZE",
              "TERIOS", "MAZDA CX", "TIGUAN", "COROLLA CROSS",
              "KIX", "CROSSROAD"]):
        return "Кроссовер"

    # Lexus liftbacks: CT, IS
    if b == "LEXUS" and any(k in m for k in ["CT", "IS"]):
        return "Лифтбек"

    if _chk(["PRIUS", "CT200H", "INSIGHT", "MAZDA6", "ATENZA",
              "LEVORG", "IMPREZA", "LAFESTA", "SAI"]):
        return "Лифтбек"

    if _chk(["FIELDER", "CALDINA", "SHUTTLE", "JADE", "AVANCIER",
              "LEGACY TOURING", "MAZDA3 WAGON"]):
        return "Универсал"

    if _chk(["AQUA", "VITZ", "YARIS", "FIT", "SWIFT", "NOTE", "MARCH",
              "DEMIO", "MAZDA2", "MAZDA3", "MOVE", "TANTO", "WAGON R",
              "SPADE", "PORTE", "PASSO", "BOON", "ALTO", "HUSTLER",
              "MIRAGE", "LEAF", "MIRA", "N-BOX", "N BOX", "N WGN",
              "SPACIA", "TAFT", "AXELA", "COROLLA SPORT", "GOLF",
              "EK WAGON", "EK CUSTOM", "IQ", "BB",
              "DAYZ", "CIVIC"]):
        return "Хэтчбэк"

    # Lexus sedans: GS, LS, ES, HS
    if b == "LEXUS" and any(k in m for k in ["GS", "LS", "ES", "HS"]):
        return "Седан"

    if _chk(["CAMRY", "CROWN", "MARK X", "CELSIOR", "ACCORD",
              "SKYLINE", "FUGA", "CIMA", "GLORIA", "LEGACY B4",
              "TEANA", "MAXIMA", "BLUEBIRD", "LAUREL", "CEDRIC",
              "PREMIO", "ALLION", "COROLLA AXIO", "MARK II",
              "CHASER", "CRESTA", "AVALON", "GRACE"]):
        return "Седан"

    return "Другой"


def _norm(i: dict) -> dict:
    def _n(v): return int(v or 0) if str(v or "").isdigit() else 0
    finish = _n(i.get("FINISH")) or _n(i.get("START")) or _n(i.get("AVG_PRICE"))
    t = tariff_cache.get()
    auction_price_rub = int(finish * t.jpy_to_rub)

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

    kuzov = str(i.get("KUZOV", "")).lower()
    suv = any(k in kuzov for k in ["suv", "кросс", "внедор", "4wd", "van", "minivan"])

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
    engine_cc = _n(eng)
    price = calc.turnkey_price(auction_price_rub, engine_cc, year, fuel, "japan", t) if auction_price_rub > 0 else 0

    lot_id = str(i.get("ID", i.get("LOT", "")))

    priv = str(i.get("PRIV", "")).upper()
    drive_map = {"FF": "Передний", "FR": "Задний", "4WD": "Полный", "AWD": "Полный", "MR": "Задний", "RR": "Задний"}
    drive = drive_map.get(priv, priv or None)

    return {
        "id": f"jp-{lot_id}",
        "brand": brand,
        "model": model,
        "year": year,
        "country": "japan",
        "body": _body_type(model, brand),
        "mileage": mileage,
        "engine": engine or "—",
        "price": price,
        "badge": i.get("RATE"),
        "photo_tint": "#1a1d24",
        "silhouette": "suv" if suv else "sedan",
        "is_active": True,
        "photo_url": photo,
        "photo_urls": photo_urls,
        "source": "ajes",
        "auction_price": auction_price_rub,
        "auction_price_local": finish,
        "engine_cc": engine_cc,
        "color": color_map.normalize(i.get("COLOR")),
        "drive": drive,
        "grade": html.unescape((i.get("GRADE") or "").strip()) or None,
        "power": (str(i.get("PW", "")).strip() + " л.с.") if i.get("PW") else None,
        "steering": "Левый" if str(i.get("LHDRIVE", "")).strip() == "1" else ("Правый" if i.get("LHDRIVE") is not None else None),
        "town": (i.get("TOWN") or "").strip() or None,
        "equip": (i.get("EQUIP") or "").strip() or None,
        "kuzov": (i.get("KUZOV") or "").strip() or None,
        "auction_date": (i.get("AUCTION_DATE") or "").strip()[:10] or None,
        "auction_name": (i.get("AUCTION") or "").strip() or None,
    }
