"""
On-demand aggregator — queries ajes.com per user request.
Cache: 5 min per unique query combination.
"""
import asyncio
import time
from typing import Optional

import ajes_client

CACHE_TTL = 300
_cache: dict[str, tuple[float, list]] = {}

_TABLE = {"japan": "main", "korea": "korea", "china": "china"}
_COUNTRY = {v: k for k, v in _TABLE.items()}  # reverse map


def _key(**kw) -> str:
    return "|".join(f"{k}={v}" for k, v in sorted(kw.items()))


def _get(key: str) -> list | None:
    e = _cache.get(key)
    return e[1] if e and time.time() - e[0] < CACHE_TTL else None


def _set(key: str, data: list):
    _cache[key] = (time.time(), data)


async def search(
    country: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
) -> list[dict]:
    ck = _key(country=country, brand=brand, model=model, body=body,
               price_max=price_max, year_min=year_min, page=page, limit=limit)
    cached = _get(ck)
    if cached is not None:
        return cached

    offset = (page - 1) * limit
    kw = dict(brand=brand, model=model, price_max=price_max, year_min=year_min,
               limit=limit, offset=offset)

    tables = [_TABLE[country]] if country in _TABLE else list(_TABLE.values())
    results = await asyncio.gather(
        *[ajes_client.search(table=t, **kw) for t in tables],
        return_exceptions=True,
    )

    cars: list[dict] = []
    for r in results:
        if isinstance(r, list):
            cars.extend(r)

    cars = [c for c in cars if c.get("price", 0) > 0 and c.get("brand")]
    _set(ck, cars)
    return cars


async def count(
    country: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year_min: Optional[int] = None,
) -> dict:
    kw = dict(brand=brand, model=model, year_min=year_min)
    tables = [_TABLE[country]] if country in _TABLE else list(_TABLE.values())

    counts = await asyncio.gather(
        *[ajes_client.count_table(table=t, **kw) for t in tables],
        return_exceptions=True,
    )

    by_country: dict[str, int] = {}
    total = 0
    for table, cnt in zip(tables, counts):
        n = cnt if isinstance(cnt, int) else 0
        by_country[_COUNTRY[table]] = n
        total += n

    return {"total": total, "by_country": by_country}


async def get_by_id(car_id: str) -> dict | None:
    prefix_table = {"jp": "main", "kr": "korea", "cn": "china"}
    parts = car_id.split("-", 1)
    if len(parts) != 2 or parts[0] not in prefix_table:
        return None

    # 1. Search in-memory cache (user likely just loaded the catalog list)
    for _, (_, cars) in list(_cache.items()):
        for c in cars:
            if c.get("id") == car_id:
                return c

    # 2. Direct ajes query (works for numeric lot IDs; hash IDs may return empty)
    table = prefix_table[parts[0]]
    lot_id = parts[1]
    cars = await ajes_client.fetch_one(table=table, lot_id=lot_id)
    return cars[0] if cars else None


def active_sources() -> list[str]:
    return ["ajes.com (Япония)", "ajes.com (Корея)", "ajes.com (Китай)"]


def invalidate():
    _cache.clear()
