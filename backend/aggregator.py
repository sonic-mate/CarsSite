"""
On-demand aggregator — queries ajes.com per user request.
Cache: 5 min per unique query combination.
"""
import asyncio
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
               price_max=price_max, year_min=year_min, page=page, limit=limit)
    cached = _get(ck)
    if cached is not None:
        return cached

    kw = dict(brand=brand, body=body, price_max=price_max,
              year_min=year_min, page=page, limit=limit)

    if country == "japan":
        tasks = [japan.fetch(**kw)]
    elif country == "korea":
        tasks = [korea.fetch(**kw)]
    elif country == "china":
        tasks = [china.fetch(**kw)]
    else:
        tasks = [japan.fetch(**kw), korea.fetch(**kw), china.fetch(**kw)]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    cars: list[dict] = []
    for r in results:
        if isinstance(r, list):
            cars.extend(r)

    cars = [c for c in cars if c.get("price", 0) > 0 and c.get("brand")]

    _set(ck, cars)
    return cars


async def get_by_id(car_id: str) -> dict | None:
    ck = f"id={car_id}"
    cached = _get(ck)
    if cached is not None:
        return cached[0] if cached else None

    if car_id.startswith("jp-"):
        cars = await japan.fetch_one(car_id[3:])
    elif car_id.startswith("kr-"):
        cars = await korea.fetch_one(car_id[3:])
    elif car_id.startswith("cn-"):
        cars = await china.fetch_one(car_id[3:])
    else:
        return None

    _set(ck, cars)
    return cars[0] if cars else None


def active_sources() -> list[str]:
    return ["ajes.com (Япония)", "ajes.com (Корея)", "ajes.com (Китай)"]


def invalidate():
    _cache.clear()
