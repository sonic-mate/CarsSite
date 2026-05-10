"""
jpcenter.ru catalog import script.

Usage:
    python import_jpcenter.py --dump /path/to/jpcenter_dump.sql
    python import_jpcenter.py --csv  /path/to/jpcenter_cars.csv

The dump from jpcenter.ru contains car specifications with texts and photos
that are permanent (unlike auction lots which disappear after sale).

Column mapping (jpcenter → our Car model):
    id          → "jpc-{id}"  (source="jpcenter")
    brand       → brand
    model       → model
    year        → year
    body_type   → body
    mileage     → mileage (km)
    engine_cc   → engine_cc
    fuel_type   → engine (fuel part)
    transmission→ engine (kpp part)
    drive       → drive
    color       → color
    price_jpy   → auction_price_local  (convert to RUB at current rate)
    photo_main  → photo_url  (download locally via _proxy_url or direct)
    photos_json → photo_urls_json
    description → stored in AjBid.data_json["description"]

Run this script ONCE after receiving the dump from jpcenter.ru.
Existing records with source="jpcenter" are skipped (upsert by id).
"""

import os
import sys
import argparse
import json

# ── Bootstrap project path ────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from database import SessionLocal, engine, Base
from models import Car, AjBid
import tariff_cache
import calc
import datetime

Base.metadata.create_all(bind=engine)


# ── Column mapping helpers ────────────────────────────────────────────────────

FUEL_MAP = {
    "gasoline": "Бензин", "petrol": "Бензин", "benzin": "Бензин",
    "hybrid": "Гибрид",
    "electric": "Электро", "ev": "Электро",
    "diesel": "Дизель",
    "gas": "Газ", "lpg": "Газ",
}

BODY_MAP = {
    "sedan": "Седан", "crossover": "Кроссовер", "suv": "Внедорожник",
    "minivan": "Минивэн", "hatchback": "Хэтчбэк", "liftback": "Лифтбек",
    "wagon": "Универсал", "van": "Фургон",
}

DRIVE_MAP = {
    "ff": "Передний", "fwd": "Передний",
    "fr": "Задний", "rwd": "Задний",
    "4wd": "Полный", "awd": "Полный",
}


def _map_row(row: dict) -> dict | None:
    """Map a jpcenter row dict to our Car field dict. Returns None to skip."""
    try:
        raw_id = str(row.get("id", "")).strip()
        if not raw_id:
            return None

        brand = (row.get("brand") or row.get("marka") or "").strip()
        model = (row.get("model") or "").strip()
        year  = int(row.get("year") or row.get("year_manufacture") or 0)
        if not brand or not year:
            return None

        engine_cc = int(row.get("engine_cc") or row.get("engine_volume") or 0)
        mileage   = int(row.get("mileage") or row.get("probeg") or 0)
        fuel_raw  = (row.get("fuel_type") or row.get("fuel") or "").lower()
        fuel      = FUEL_MAP.get(fuel_raw, "Бензин")
        kpp       = (row.get("transmission") or row.get("kpp") or "").upper()
        drive_raw = (row.get("drive") or row.get("privod") or "").lower()
        drive     = DRIVE_MAP.get(drive_raw)
        color     = (row.get("color") or row.get("color_name") or "").strip() or None
        body_raw  = (row.get("body_type") or row.get("kuzov") or "").lower()
        body      = BODY_MAP.get(body_raw, "Другой")

        engine_str = " · ".join(p for p in [
            f"{engine_cc}cc" if engine_cc else "", kpp, fuel
        ] if p)

        # Price
        price_jpy = int(row.get("price_jpy") or row.get("price") or 0)
        t = tariff_cache.get()
        auction_price_rub = round(price_jpy * t.jpy_to_rub) if price_jpy else 0
        price = calc.turnkey_price(auction_price_rub, engine_cc, year, fuel, "japan", t) \
            if auction_price_rub > 0 else 0

        # Photos — jpcenter stores absolute URLs
        photo_main = (row.get("photo_main") or row.get("photo") or "").strip() or None
        photos_raw = row.get("photos_json") or row.get("photos") or "[]"
        try:
            photo_list = json.loads(photos_raw) if isinstance(photos_raw, str) else photos_raw
        except Exception:
            photo_list = [photo_main] if photo_main else []

        return {
            "id": f"jpc-{raw_id}",
            "brand": brand, "model": model, "year": year,
            "country": "japan",  # jpcenter is Japanese spec catalog
            "body": body, "mileage": mileage, "engine": engine_str or "—",
            "price": price, "source": "jpcenter", "is_active": True,
            "engine_cc": engine_cc, "fuel": fuel, "drive": drive, "color": color,
            "photo_url": photo_main,
            "photo_urls": photo_list,
            "auction_price": auction_price_rub,
            "auction_price_local": price_jpy,
            "description": (row.get("description") or row.get("opisanie") or "").strip() or None,
        }
    except Exception as e:
        print(f"Row mapping error: {e} — row keys: {list(row.keys())[:8]}")
        return None


def _upsert_row(db, mapped: dict) -> bool:
    """Insert car if not exists. Returns True if inserted."""
    from urllib.parse import quote
    existing = db.query(Car.id).filter(Car.id == mapped["id"]).first()
    if existing:
        return False

    def proxy(url):
        return f"/api/img-proxy?url={quote(url, safe='')}" if url else None

    photo_urls = mapped.get("photo_urls") or []
    db.add(Car(
        id=mapped["id"], brand=mapped["brand"], model=mapped["model"],
        year=mapped["year"], country=mapped["country"], body=mapped["body"],
        mileage=mapped["mileage"], engine=mapped["engine"], price=mapped["price"],
        source=mapped["source"], is_active=True,
        engine_cc=mapped["engine_cc"], color=mapped["color"], drive=mapped["drive"],
        auction_price=mapped["auction_price"],
        auction_price_local=mapped["auction_price_local"],
        photo_url=proxy(mapped["photo_url"]),
        photo_urls_json=json.dumps([proxy(u) for u in photo_urls if u]) if photo_urls else None,
        silhouette="suv" if mapped["body"] in ("Внедорожник", "Кроссовер") else "sedan",
    ))

    # Also seed AjBid so it gets photo download treatment
    if not db.query(AjBid.id).filter(AjBid.lot_id == mapped["id"]).first():
        data = {k: v for k, v in mapped.items() if k != "description"}
        data["photo_urls"] = [proxy(u) for u in photo_urls if u]
        db.add(AjBid(
            lot_id=mapped["id"],
            country=mapped["country"],
            brand=mapped["brand"],
            model=mapped["model"],
            year=mapped["year"],
            photo_urls_orig=json.dumps([u for u in photo_urls if u]),
            data_json=json.dumps({**data, "description": mapped.get("description")}),
            processed=False,
            created_at=datetime.datetime.utcnow(),
        ))
    return True


# ── CSV import ────────────────────────────────────────────────────────────────

def import_csv(path: str):
    import csv
    db = SessionLocal()
    inserted = skipped = errors = 0
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            batch = 0
            for row in reader:
                mapped = _map_row(dict(row))
                if not mapped:
                    errors += 1
                    continue
                if _upsert_row(db, mapped):
                    inserted += 1
                else:
                    skipped += 1
                batch += 1
                if batch % 500 == 0:
                    db.commit()
                    print(f"  … {batch} rows processed (+{inserted} inserted)")
        db.commit()
    finally:
        db.close()
    print(f"CSV import done: {inserted} inserted, {skipped} skipped (dup), {errors} errors")


# ── SQL dump import ───────────────────────────────────────────────────────────

def import_sql_dump(path: str):
    """
    Parse a MySQL dump and import INSERT rows.
    Assumes the dump has standard INSERT INTO `table` VALUES (...) format.
    Adjust TABLE_NAME to match the actual table in the jpcenter dump.
    """
    import re

    TABLE_NAME = "cars"  # ← change if jpcenter dump uses a different table name
    COLUMNS: list[str] = []  # ← fill in after inspecting the dump's CREATE TABLE

    print(f"Parsing SQL dump: {path}")
    print("NOTE: Set TABLE_NAME and COLUMNS at top of import_sql_dump() after inspecting the dump.")

    insert_re = re.compile(
        rf"INSERT INTO `?{TABLE_NAME}`?\s+VALUES\s*(.+?);",
        re.IGNORECASE | re.DOTALL,
    )
    row_re = re.compile(r"\(([^)]+)\)")

    db = SessionLocal()
    inserted = skipped = 0
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            content = f.read()

        for m in insert_re.finditer(content):
            for row_m in row_re.finditer(m.group(1)):
                values_str = row_m.group(1)
                # Simple CSV-like split (doesn't handle escaped commas in strings perfectly)
                values = [v.strip().strip("'\"") for v in values_str.split(",")]
                if COLUMNS and len(values) == len(COLUMNS):
                    row = dict(zip(COLUMNS, values))
                else:
                    # No column names — skip, user must fill COLUMNS list
                    print("COLUMNS list is empty — fill it in import_sql_dump() and re-run.")
                    return

                mapped = _map_row(row)
                if not mapped:
                    continue
                if _upsert_row(db, mapped):
                    inserted += 1
                else:
                    skipped += 1
                if (inserted + skipped) % 500 == 0:
                    db.commit()
                    print(f"  … {inserted + skipped} processed (+{inserted} inserted)")

        db.commit()
    finally:
        db.close()
    print(f"SQL import done: {inserted} inserted, {skipped} skipped")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import jpcenter.ru catalog into CarsSite DB")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--csv",  metavar="FILE", help="Path to CSV export from jpcenter")
    group.add_argument("--dump", metavar="FILE", help="Path to MySQL dump (.sql) from jpcenter")
    args = parser.parse_args()

    if args.csv:
        import_csv(args.csv)
    elif args.dump:
        import_sql_dump(args.dump)
