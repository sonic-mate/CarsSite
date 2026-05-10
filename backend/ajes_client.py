"""
ajes.com / avto.jp SQL API client.

Single module replacing sources/japan.py, sources/korea.py, sources/china.py.
Monitors rate-limit headers (API-Counter, API-Limit, API-Rest) and handles
"daily limit" response from bot-protection system.
"""
import os
import gzip as _gzip
import json as _json
import html
from urllib.parse import quote
from typing import Optional

import httpx

import tariff_cache
import calc
import color_map

API_KEY  = os.getenv("AJES_API_KEY", "")
API_HOST = os.getenv("AJES_HOST", "78.46.90.228")
API_IP   = os.getenv("AJES_IP", "")

# ── Rate-limit state (in-memory; resets with process restart) ─────────────────
_api_counter: int = 0
_api_limit: int = 0
_api_rest: int = 0
_daily_limit_hit: bool = False


def api_status() -> dict:
    return {
        "counter": _api_counter,
        "limit": _api_limit,
        "rest": _api_rest,
        "daily_limit_hit": _daily_limit_hit,
    }


def reset_daily_limit() -> None:
    global _daily_limit_hit
    _daily_limit_hit = False


# ── Base query ────────────────────────────────────────────────────────────────

async def query(sql: str, label: str = "ajes") -> list | None:
    """Execute SQL against ajes API. Returns list of dicts or None on error/limit."""
    global _api_counter, _api_limit, _api_rest, _daily_limit_hit

    if _daily_limit_hit:
        print(f"[{label}] Daily limit hit — skipping query")
        return None

    # Use /gzip/ path for compressed responses (production recommendation from ajes ТЗ)
    if API_IP:
        url = f"http://{API_HOST}/gzip/?ip={quote(API_IP)}&code={API_KEY}&sql={quote(sql)}"
    else:
        url = f"http://{API_HOST}/gzip/?code={API_KEY}&sql={quote(sql)}"

    try:
        async with httpx.AsyncClient(timeout=15) as c:
            async with c.stream("GET", url) as r:
                raw_bytes = b"".join([chunk async for chunk in r.aiter_raw()])
                # Read rate-limit headers before closing stream
                try:
                    if "API-Counter" in r.headers:
                        _api_counter = int(r.headers["API-Counter"])
                    if "API-Limit" in r.headers:
                        _api_limit = int(r.headers["API-Limit"])
                    if "API-Rest" in r.headers:
                        _api_rest = int(r.headers["API-Rest"])
                except (ValueError, TypeError):
                    pass

            if r.status_code != 200:
                print(f"[{label}] HTTP {r.status_code}: {raw_bytes[:200]}")
                return None

        if not raw_bytes:
            print(f"[{label}] Empty response")
            return None

        # Decompress (server may or may not gzip depending on response size)
        try:
            raw = _gzip.decompress(raw_bytes).decode("utf-8")
        except Exception:
            raw = raw_bytes.decode("utf-8", errors="replace")

        # Check for bot-protection daily limit response
        if "daily limit" in raw.lower():
            _daily_limit_hit = True
            print(f"[{label}] DAILY LIMIT HIT — counter={_api_counter}/{_api_limit}")
            return None

        print(f"[{label}] counter={_api_counter}/{_api_limit} rest={_api_rest} | {raw[:150]}")

        data = _json.loads(raw)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "error" in data:
            print(f"[{label}] API error: {data}")
            return None
        return data.get("data", data.get("result", []))

    except Exception as e:
        print(f"[{label}] Exception: {e}")
        return None


# ── Table metadata ────────────────────────────────────────────────────────────

_TABLE_COUNTRY = {"main": "japan", "korea": "korea", "china": "china"}
_TABLE_PREFIX  = {"main": "jp",    "korea": "kr",    "china": "cn"}
_TABLE_LABEL   = {"main": "ajes/jp", "korea": "ajes/kr", "china": "ajes/cn"}


def _safe_brand(brand: str) -> str:
    return brand.replace("\\", "\\\\").replace("'", "''").replace("%", "\\%").replace("_", "\\_")


# ── Public query helpers ──────────────────────────────────────────────────────

async def search(
    table: str,
    brand: Optional[str] = None,
    year_min: Optional[int] = None,
    price_max: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
    min_id: int = 0,
    **_,
) -> list[dict]:
    where = ["AUCTION_TYPE!=1"] if table == "main" else ["1=1"]
    if brand:
        where.append(f"MARKA_NAME LIKE '%{_safe_brand(brand)}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")
    if min_id:
        where.append(f"ID>{int(min_id)}")

    sql = (
        f"SELECT * FROM {table} WHERE {' AND '.join(where)}"
        f" ORDER BY ID DESC LIMIT {offset},{limit}"
    )
    data = await query(sql, label=_TABLE_LABEL.get(table, "ajes"))
    if not data:
        return []

    country = _TABLE_COUNTRY.get(table, "japan")
    cars = [norm(row, country) for row in data if row]
    if price_max:
        cars = [c for c in cars if c["price"] <= price_max]
    return cars


async def fetch_one(table: str, lot_id: str) -> list[dict]:
    val = lot_id if lot_id.isdigit() else f"'{lot_id}'"
    sql = f"SELECT * FROM {table} WHERE ID={val} LIMIT 1"
    data = await query(sql, label=_TABLE_LABEL.get(table, "ajes"))
    if not data:
        return []
    country = _TABLE_COUNTRY.get(table, "japan")
    return [norm(row, country) for row in data if row]


async def count_table(
    table: str,
    brand: Optional[str] = None,
    year_min: Optional[int] = None,
    **_,
) -> int:
    where = ["AUCTION_TYPE!=1"] if table == "main" else ["1=1"]
    if brand:
        where.append(f"MARKA_NAME LIKE '%{_safe_brand(brand)}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")

    sql = f"SELECT COUNT(*) FROM {table} WHERE {' AND '.join(where)}"
    data = await query(sql, label=_TABLE_LABEL.get(table, "ajes"))
    if data and isinstance(data[0], dict):
        return int(list(data[0].values())[0])
    return 0


# ── Normalization ─────────────────────────────────────────────────────────────

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


def _fuel(time_flag) -> str:
    t = str(time_flag or "").upper()
    if t == "E":   return "Электро"
    if t in ("H", "HE"): return "Гибрид"
    if t == "D":   return "Дизель"
    if t in ("L", "C"): return "Газ"
    return "Бензин"


def _body_japan(model: str, brand: str) -> str:
    m, b = (model or "").upper(), (brand or "").upper()
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
    if b == "LEXUS" and any(k in m for k in ["RX", "NX", "UX", "LX", "GX"]):
        return "Кроссовер"
    if _chk(["RAV4", "CR-V", "CRV", "HARRIER", "VEZEL", "HR-V", "HRV",
              "CH-R", "C-HR", "OUTLANDER", "CX-3", "CX-5", "CX-8", "CX-30",
              "FORESTER", "OUTBACK", "SUBARU XV", "X-TRAIL", "XTRAIL",
              "QASHQAI", "JUKE", "MURANO", "KICKS", "ECLIPSE CROSS",
              "ASX", "TUCSON", "SPORTAGE", "SORENTO", "RUSH", "RAIZE",
              "TERIOS", "MAZDA CX", "TIGUAN", "COROLLA CROSS", "KIX", "CROSSROAD"]):
        return "Кроссовер"
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
              "EK WAGON", "EK CUSTOM", "IQ", "BB", "DAYZ", "CIVIC"]):
        return "Хэтчбэк"
    if b == "LEXUS" and any(k in m for k in ["GS", "LS", "ES", "HS"]):
        return "Седан"
    if _chk(["CAMRY", "CROWN", "MARK X", "CELSIOR", "ACCORD",
              "SKYLINE", "FUGA", "CIMA", "GLORIA", "LEGACY B4",
              "TEANA", "MAXIMA", "BLUEBIRD", "LAUREL", "CEDRIC",
              "PREMIO", "ALLION", "COROLLA AXIO", "MARK II",
              "CHASER", "CRESTA", "AVALON", "GRACE"]):
        return "Седан"
    return "Другой"


def _body_korea(model: str, brand: str) -> str:
    full = f"{(brand or '').upper()} {(model or '').upper()}".strip()
    _chk = lambda keys: any(k in full for k in keys)
    if _chk(["CARNIVAL", "STARIA", "STAREX", "GRAND STAREX", "SEDONA"]):
        return "Минивэн"
    if _chk(["PALISADE", "SANTA FE", "TERRACAN", "MOHAVE", "GV80", "EX90"]):
        return "Внедорожник"
    if _chk(["TUCSON", "SPORTAGE", "SORENTO", "STONIC", "KONA", "TRAILSTER",
              "IONIQ 5", "EV6", "EV9", "NEXO", "NIRO", "SELTOS", "VENUE"]):
        return "Кроссовер"
    if _chk(["I30", "I20", "I10", "ACCENT", "VERNA", "SOLARIS", "AVANTE",
              "ELANTRA", "K3", "RIO", "PRIDE", "SOUL", "RAY"]):
        return "Хэтчбэк"
    if _chk(["SONATA", "K5", "K8", "GRANDEUR", "AZERA", "GENESIS", "G80",
              "G70", "G90", "K9", "CADENZA", "OPTIMA", "STINGER"]):
        return "Седан"
    if _chk(["BONGO", "PORTER"]):
        return "Фургон"
    return "Другой"


def _body_china(model: str, brand: str) -> str:
    full = f"{(brand or '').upper()} {(model or '').upper()}".strip()
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
    if _chk(["CAMRY", "ACCORD", "TEANA", "ALTIMA", "SONATA",
              "K5", "PASSAT", "MAGOTAN", "BUICK LACROSSE", "BUICK EXCELLE",
              "BYD HAN", "BYD SEAL", "NIO ET", "XPENG P", "ZEEKR 001",
              "TESLA MODEL 3", "TESLA MODEL S", "IM L7"]):
        return "Седан"
    return "Другой"


_BODY_FN    = {"japan": _body_japan, "korea": _body_korea, "china": _body_china}
_PHOTO_TINT = {"japan": "#1a1d24",   "korea": "#181b22",   "china": "#15181f"}
_CURRENCY   = {"japan": "jpy_to_rub","korea": "krw_to_rub","china": "cny_to_rub"}
_ID_PREFIX  = {"japan": "jp",        "korea": "kr",        "china": "cn"}
_DRIVE_MAP  = {
    "FF": "Передний", "FR": "Задний",
    "4WD": "Полный",  "AWD": "Полный",
    "MR": "Задний",   "RR": "Задний",
}


def norm(i: dict, country: str) -> dict:
    def _n(v): return int(v or 0) if str(v or "").isdigit() else 0

    finish = _n(i.get("FINISH")) or _n(i.get("START")) or _n(i.get("AVG_PRICE"))
    t = tariff_cache.get()
    rate = getattr(t, _CURRENCY.get(country, "jpy_to_rub"), t.jpy_to_rub)
    auction_price_rub = int(finish * rate)

    raw_images = i.get("IMAGES", "")
    photo = _photo_url(raw_images)
    photo_urls = [
        url for p in (raw_images or "").split("#")
        if p.strip() and (url := _photo_url(p.strip(), size="&w=320"))
    ]

    brand   = (i.get("MARKA_NAME") or "").strip()
    model   = (i.get("MODEL_NAME") or "").strip()
    year    = int(i.get("YEAR", 0) or 0)
    mileage = int(str(i.get("MILEAGE", "0")).replace(",", "").replace(" ", "") or 0)

    body_fn = _BODY_FN.get(country, _body_japan)
    body    = body_fn(model, brand)
    suv     = body in ("Внедорожник", "Кроссовер")

    eng      = i.get("ENG_V", "")
    kpp      = i.get("KPP", "")
    fuel     = _fuel(i.get("TIME", ""))
    engine   = " · ".join(p for p in [f"{eng}cc" if eng else "", kpp, fuel] if p)
    engine_cc = _n(eng)

    lot_id = str(i.get("ID", i.get("LOT", "")))
    price  = calc.turnkey_price(auction_price_rub, engine_cc, year, fuel, country, t) \
             if auction_price_rub > 0 else 0

    result: dict = {
        "id":                  f"{_ID_PREFIX.get(country, 'jp')}-{lot_id}",
        "brand":               brand,
        "model":               model,
        "year":                year,
        "country":             country,
        "body":                body,
        "mileage":             mileage,
        "engine":              engine or "—",
        "price":               price,
        "badge":               i.get("RATE"),
        "photo_tint":          _PHOTO_TINT.get(country, "#1a1d24"),
        "silhouette":          "suv" if suv else "sedan",
        "is_active":           True,
        "photo_url":           photo,
        "photo_urls":          photo_urls,
        "source":              "ajes",
        "source_url":          f"https://ajes.com/?lot={lot_id}",
        "auction_price":       auction_price_rub,
        "auction_price_local": finish,
        "engine_cc":           engine_cc,
        "auction_name":        (i.get("AUCTION") or "").strip() or None,
    }

    if country == "japan":
        priv = str(i.get("PRIV", "")).upper()
        kuzov = str(i.get("KUZOV", "")).lower()
        if any(k in kuzov for k in ["suv", "кросс", "внедор", "4wd", "van", "minivan"]):
            result["silhouette"] = "suv"
        result.update({
            "color":    color_map.normalize(i.get("COLOR")),
            "drive":    _DRIVE_MAP.get(priv, priv or None),
            "grade":    html.unescape((i.get("GRADE") or "").strip()) or None,
            "power":    (str(i.get("PW", "")).strip() + " л.с.") if i.get("PW") else None,
            "steering": "Левый" if str(i.get("LHDRIVE", "")).strip() == "1"
                        else ("Правый" if i.get("LHDRIVE") is not None else None),
            "town":     (i.get("TOWN") or "").strip() or None,
            "equip":    (i.get("EQUIP") or "").strip() or None,
            "kuzov":    (i.get("KUZOV") or "").strip() or None,
        })

    return result
