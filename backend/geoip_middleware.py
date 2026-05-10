"""
GeoIP country blocking middleware.
Uses MaxMind GeoLite2-Country.mmdb (binary format — fast tree lookup, ~0.5ms).

Setup:
  1. Register free at https://www.maxmind.com/en/geolite2/signup
  2. Download GeoLite2-Country.mmdb
  3. Place in backend/ directory (or set GEOIP_DB env var)
  4. File is .gitignore'd — never commit it
"""
import os
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("geoip")

BLOCKED_COUNTRIES: frozenset[str] = frozenset({"CN", "HK", "SG", "VN", "AR", "BR", "FR"})

MMDB_PATH = os.getenv("GEOIP_DB", os.path.join(os.path.dirname(__file__), "GeoLite2-Country.mmdb"))

_reader = None
_reader_tried = False


def _get_reader():
    global _reader, _reader_tried
    if _reader_tried:
        return _reader
    _reader_tried = True
    if not os.path.isfile(MMDB_PATH):
        logger.warning("[geoip] GeoLite2-Country.mmdb not found at %s — geo-blocking disabled", MMDB_PATH)
        return None
    try:
        import maxminddb
        _reader = maxminddb.open_database(MMDB_PATH)
        logger.info("[geoip] Loaded GeoIP database: %s", MMDB_PATH)
    except Exception as e:
        logger.error("[geoip] Failed to open database: %s", e)
    return _reader


def get_country(ip: str) -> str | None:
    reader = _get_reader()
    if not reader:
        return None
    try:
        record = reader.get(ip)
        if record and "country" in record:
            return record["country"]["iso_code"]
    except Exception:
        pass
    return None


def _real_ip(request) -> str:
    """Extract real client IP, respecting reverse-proxy headers set by nginx."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = request.headers.get("X-Real-IP", "")
    if real:
        return real.strip()
    return request.client.host if request.client else "0.0.0.0"


# Paths that bypass geo-blocking (health checks, internal probes)
_BYPASS_PREFIXES = ("/health", "/api/photos/")


class GeoIPBlockMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in _BYPASS_PREFIXES):
            return await call_next(request)

        ip = _real_ip(request)

        # Skip private/loopback IPs (Docker internal calls, localhost dev)
        if ip.startswith(("127.", "10.", "172.", "192.168.", "::1")):
            return await call_next(request)

        country = get_country(ip)
        if country in BLOCKED_COUNTRIES:
            logger.info("[geoip] Blocked %s (%s) → %s", ip, country, path)
            return Response(
                content="Access restricted",
                status_code=403,
                media_type="text/plain",
            )

        return await call_next(request)
