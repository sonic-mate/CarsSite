"""
Aggregates live cars from ajes.com SQL API (Japan, Korea, China).
All sources require AJES_API_KEY. Demo key DvemR43s used if not set.
Cache: 5 min per query.
"""
import asyncio
import os
import time
from typing import Optional
from sources import japan, korea, china

CACHE_TTL = 300
_cache: dict[str, tuple[float, list]] = {}


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
    body: Optional[str] = None,
    price_max: Optional[int] = None,
    year_min: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
) -> list[dict]:
    ck = _key(country=country, brand=brand, body=body,
               price_max=price_max, year_min=year_min, page=page)
    cached = _get(ck)
    if cached is not None:
        return cached

    kw = dict(brand=brand, body=body, price_max=price_max,
              year_min=year_min, page=page, limit=limit)

    if country in ("korea", "china"):
        tasks = []
    elif country == "japan":
        tasks = [japan.fetch(**kw)]
    else:
        tasks = [japan.fetch(**kw)]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    cars: list[dict] = []
    for r in results:
        if isinstance(r, list):
            cars.extend(r)

    cars = [c for c in cars if c.get("price", 0) > 0 and c.get("brand")]

    _set(ck, cars)
    return cars


def active_sources() -> list[str]:
    return ["ajes.com (Япония)"]


def invalidate():
    _cache.clear()
