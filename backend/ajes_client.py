"""
ajes.com / avto.jp SQL API client.

Single module replacing sources/japan.py, sources/korea.py, sources/china.py.
Monitors rate-limit headers (API-Counter, API-Limit, API-Rest) and handles
"daily limit" response from bot-protection system.
"""
import os
import re as _re
import gzip as _gzip
import json as _json
import html
import asyncio
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


def _parse_aj_xml(text: str) -> list[dict]:
    """
    Regex-based parser for avto.jp XML responses.
    Handles malformed XML (unescaped &, invalid chars, COUNT(*) tags).
    """
    rows = []
    for row_block in _re.finditer(r"<row>(.*?)</row>", text, _re.DOTALL):
        d = {}
        for field in _re.finditer(r"<([A-Za-z_][A-Za-z0-9_()*]*?)>(.*?)</\1>", row_block.group(1), _re.DOTALL):
            d[field.group(1)] = html.unescape(field.group(2))
        if d:
            rows.append(d)

    # COUNT(*) response: no <row> wrapper, just a single numeric value
    if not rows:
        m = _re.search(r"<[^>]+>(\d+)</[^>]+>", text)
        if m:
            rows = [{"cnt": m.group(1)}]

    return rows


# ── Base query ────────────────────────────────────────────────────────────────

async def query(sql: str, label: str = "ajes", gzip: bool = True) -> list | None:
    """Execute SQL against ajes API. Returns list of dicts or None on error/limit."""
    global _api_counter, _api_limit, _api_rest, _daily_limit_hit

    if _daily_limit_hit:
        print(f"[{label}] Daily limit hit — skipping query")
        return None

    if gzip:
        prefix = "gzip&" if not API_IP else f"gzip&ip={quote(API_IP)}&"
    else:
        prefix = "" if not API_IP else f"ip={quote(API_IP)}&"
    url = f"http://{API_HOST}/api/?{prefix}code={API_KEY}&sql={quote(sql)}"

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

        # Always try gzip if magic bytes present; otherwise use raw
        import zlib as _zlib
        if raw_bytes[:2] == b'\x1f\x8b':
            body = None
            try:
                body = _gzip.decompress(raw_bytes)
            except Exception:
                pass
            if body is None:
                try:
                    body = _zlib.decompress(raw_bytes[10:], wbits=-15)
                except Exception as _e:
                    print(f"[{label}] gzip-no-crc failed: {_e}")
            if body is None:
                try:
                    body = _zlib.decompress(raw_bytes, wbits=47)
                except Exception:
                    pass
            if body is None:
                body = raw_bytes
        else:
            body = raw_bytes

        # Decode: ajes returns windows-1251 XML
        for enc in ("cp1251", "utf-8"):
            try:
                raw = body.decode(enc)
                break
            except UnicodeDecodeError:
                pass
        else:
            raw = body.decode("utf-8", errors="replace")

        if "daily limit" in raw.lower():
            _daily_limit_hit = True
            print(f"[{label}] DAILY LIMIT HIT — counter={_api_counter}/{_api_limit}")
            return None

        print(f"[{label}] counter={_api_counter}/{_api_limit} rest={_api_rest} | {raw[:150]}")

        # Parse: XML (avto.jp v3 format) or JSON fallback
        stripped = raw.strip()
        if not stripped:
            return []

        if stripped.startswith("<"):
            rows = _parse_aj_xml(raw)
            if not rows:
                print(f"[{label}] 0 rows | raw={raw[:300]}")
            else:
                print(f"[{label}] parsed {len(rows)} rows")
            return rows

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


# Display name ↔ ajes value mapping for "catch-all" categories
_BRAND_DISPLAY = {"OTHERS": "Другие"}
_BRAND_AJES    = {v: k for k, v in _BRAND_DISPLAY.items()}  # "Другие" → "OTHERS"
_MODEL_AJES    = {"Другие": "OTHER"}  # MODEL_NAME LIKE '%OTHER%' catches OTHER, OTHER JAPAN, etc.


# ── Public query helpers ──────────────────────────────────────────────────────

async def search(
    table: str,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year_min: Optional[int] = None,
    price_max: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
    min_id: int = 0,
    **_,
) -> list[dict]:
    where = ["AUCTION_TYPE!=1"] if table == "main" else ["1=1"]
    if brand:
        ajes_brand = _BRAND_AJES.get(brand, brand)
        where.append(f"MARKA_NAME LIKE '%{_safe_brand(ajes_brand)}%'")
    if model:
        ajes_model = _MODEL_AJES.get(model, model)
        where.append(f"MODEL_NAME LIKE '%{_safe_brand(ajes_model)}%'")
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
    # lot_id is the numeric LOT value; fallback to string ID for old-format IDs
    if lot_id.isdigit():
        sql = f"SELECT * FROM {table} WHERE LOT={lot_id}"
    else:
        sql = f"SELECT * FROM {table} WHERE ID='{lot_id}'"
    data = await query(sql, label=_TABLE_LABEL.get(table, "ajes"))
    if not data:
        return []
    country = _TABLE_COUNTRY.get(table, "japan")
    return [norm(row, country) for row in data if row]


# Limit concurrent ajes COUNT queries to prevent overwhelming the API
_AJES_SEM = asyncio.Semaphore(6)


def _parse_count(data: list | None) -> int:
    """Extract COUNT(*) result — only trust TAG0 key to avoid parsing error responses."""
    if not data or not isinstance(data[0], dict):
        return 0
    val = data[0].get("TAG0") or data[0].get("cnt")
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


async def fetch_brands(table: str) -> list[dict]:
    base_where = "AUCTION_TYPE!=1" if table == "main" else "1=1"
    # Step 1: get brand list (GROUP BY works without COUNT)
    sql = f"SELECT MARKA_ID, MARKA_NAME FROM {table} WHERE {base_where} GROUP BY MARKA_ID LIMIT 200"
    brands_data = await query(sql, label=f"brands/{table}", gzip=False)
    if not brands_data:
        return []

    brands = [(r.get("MARKA_ID", ""), (r.get("MARKA_NAME") or "").strip())
              for r in brands_data if r.get("MARKA_ID") and r.get("MARKA_NAME")]

    # Step 2: rate-limited parallel COUNT per MARKA_ID
    async def _count_brand(marka_id: str) -> int:
        async with _AJES_SEM:
            sql_c = f"SELECT COUNT(*) FROM {table} WHERE {base_where} AND MARKA_ID={int(marka_id)}"
            return _parse_count(await query(sql_c, label=f"brands/cnt/{table}", gzip=False))

    counts = await asyncio.gather(*[_count_brand(mid) for mid, _ in brands])

    result = [{"brand": _BRAND_DISPLAY.get(brand, brand), "count": cnt}
              for (mid, brand), cnt in zip(brands, counts) if brand and cnt > 0]
    result.sort(key=lambda x: -x["count"])
    return result


async def fetch_colors(table: str) -> list[dict]:
    base_where = "AUCTION_TYPE!=1" if table == "main" else "1=1"
    # Step 1: distinct raw color values
    sql = f"SELECT DISTINCT COLOR FROM {table} WHERE {base_where} AND COLOR!='' LIMIT 150"
    colors_data = await query(sql, label=f"colors/{table}", gzip=False)
    if not colors_data:
        return []

    raw_colors = [(r.get("COLOR") or "").strip() for r in colors_data if (r.get("COLOR") or "").strip()]

    # Group raw colors by normalized name — reduces COUNT queries from ~120 to ~20
    groups: dict[str, list[str]] = {}
    for raw in raw_colors:
        norm_c = color_map.normalize(raw)
        if norm_c:
            groups.setdefault(norm_c, []).append(raw)

    # Step 2: one COUNT per normalized group using IN clause
    async def _count_group(norm_name: str, raws: list[str]) -> int:
        async with _AJES_SEM:
            in_vals = ", ".join(f"'{r.replace(chr(39), chr(39)*2)}'" for r in raws)
            sql_c = f"SELECT COUNT(*) FROM {table} WHERE {base_where} AND COLOR IN ({in_vals})"
            return _parse_count(await query(sql_c, label=f"colors/cnt/{table}", gzip=False))

    norm_names = list(groups.keys())
    counts = await asyncio.gather(*[_count_group(n, groups[n]) for n in norm_names])

    result = [{"color": n, "count": cnt} for n, cnt in zip(norm_names, counts) if cnt > 0]
    result.sort(key=lambda x: -x["count"])
    return result


async def fetch_models(table: str, brand_name: str) -> list[dict]:
    base_where = "AUCTION_TYPE!=1" if table == "main" else "1=1"
    ajes_brand = _BRAND_AJES.get(brand_name, brand_name)
    safe = ajes_brand.replace("'", "''")
    # Step 1: distinct model names for this brand
    sql = (f"SELECT MODEL_NAME FROM {table} WHERE {base_where}"
           f" AND MARKA_NAME='{safe}' GROUP BY MODEL_NAME LIMIT 150")
    models_data = await query(sql, label=f"models/{table}", gzip=False)
    if not models_data:
        return []

    models = [(r.get("MODEL_NAME") or "").strip() for r in models_data if (r.get("MODEL_NAME") or "").strip()]

    # Step 2: rate-limited parallel COUNT per model
    async def _count_model(model: str) -> int:
        async with _AJES_SEM:
            esc = model.replace("'", "''")
            sql_c = (f"SELECT COUNT(*) FROM {table} WHERE {base_where}"
                     f" AND MARKA_NAME='{safe}' AND MODEL_NAME='{esc}'")
            return _parse_count(await query(sql_c, label=f"models/cnt/{table}", gzip=False))

    counts = await asyncio.gather(*[_count_model(m) for m in models])

    # Merge "OTHER*" models under "Другие"
    merged: dict[str, int] = {}
    for m, cnt in zip(models, counts):
        if cnt <= 0:
            continue
        display = "Другие" if m.upper().startswith("OTHER") else m
        merged[display] = merged.get(display, 0) + cnt
    result = [{"model": m, "count": cnt} for m, cnt in merged.items()]
    result.sort(key=lambda x: -x["count"])
    return result


async def count_table(
    table: str,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year_min: Optional[int] = None,
    **_,
) -> int:
    where = ["AUCTION_TYPE!=1"] if table == "main" else ["1=1"]
    if brand:
        ajes_brand = _BRAND_AJES.get(brand, brand)
        where.append(f"MARKA_NAME LIKE '%{_safe_brand(ajes_brand)}%'")
    if model:
        ajes_model = _MODEL_AJES.get(model, model)
        where.append(f"MODEL_NAME LIKE '%{_safe_brand(ajes_model)}%'")
    if year_min:
        where.append(f"YEAR>={year_min}")

    sql = f"SELECT COUNT(*) FROM {table} WHERE {' AND '.join(where)}"
    data = await query(sql, label=_TABLE_LABEL.get(table, "ajes"), gzip=False)
    return _parse_count(data)
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
    return f"https://7.ajes.com/imgs/{img}{size}"


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
    return "Другие"


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
    return "Другие"


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
    return "Другие"


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

    lot_id = str(i.get("ID") or i.get("LOT", ""))
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
