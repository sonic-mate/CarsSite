# AGENTS.md — CarsSite

AI-agent reference for this codebase. Read before making changes.

---

## Project

**Восток Авто Импорт** — Russian car import website. Shows Japanese/Korean/Chinese auction cars with turnkey price calculation (customs + delivery).

Production: `https://vostokavtoimport.ru` · Server: `85.239.61.178`

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy + PostgreSQL |
| Frontend | Next.js 14 (App Router, standalone output) |
| Sessions | Redis |
| External API | ajes.com SQL API (cars data) |
| Deploy | Docker Compose + nginx (host) |

---

## Repo layout

```
backend/
  main.py          — FastAPI app, all endpoints, startup lifecycle
  auth.py          — bcrypt hashing, Redis sessions
  calc.py          — customs duty calculation (ФТС rates)
  models.py        — SQLAlchemy models: Car, Tariffs, AdminUser
  schemas.py       — Pydantic schemas with Field validation
  database.py      — engine with connection pooling
  aggregator.py    — fan-out search across all 3 sources
  tariff_cache.py  — in-memory TariffSnapshot (no DB hit per request)
  sources/
    japan.py       — ajes.com table: main
    korea.py       — ajes.com table: kr
    china.py       — ajes.com table: che
  Dockerfile

frontend/
  src/app/
    page.tsx           — Home
    catalog/page.tsx   — Car catalog with filters
    cars/[id]/page.tsx — Car detail
    calculator/page.tsx — Customs calculator
    process/page.tsx   — How it works
    admin/page.tsx     — Admin panel (cookie auth, no public route)
  Dockerfile
  next.config.mjs      — output: standalone

docker-compose.yml       — dev
docker-compose.prod.yml  — production
deploy.bat               — git push + SSH rebuild on server
.env.example             — required env vars (no real values)
```

---

## Environment variables (required)

```
DB_PASSWORD        — PostgreSQL password
AJES_API_KEY       — ajes.com API key
ADMIN_USER         — admin panel login
ADMIN_PASS         — admin panel password (min 8 chars)
SECRET_KEY         — random 64-char hex
REDIS_URL          — redis://redis:6379/0 (set by compose)
PRODUCTION         — "1" in prod (controls cookie secure flag)
DEBUG_ENDPOINTS    — "1" to enable /api/debug/* routes (dev only)
CORS_ORIGINS       — comma-separated allowed origins (optional, has default)
```

`.env` file lives at project root. Docker Compose auto-loads it.

---

## Key architecture decisions

### Car data flow
1. Startup: `_sync_live_cars()` runs immediately, fetches up to 2000 cars from ajes.com (all 3 sources), stores as `source='live'` in DB
2. Every hour: full resync — deletes ALL `source='live'` rows, reinserts from API. Cars no longer on auction are removed automatically.
3. Manual/seed cars: `source='manual'` — never deleted by sync

### Price calculation
`calc.py` implements ФТС (Russian Federal Customs Service) rates:
- **New cars (<3yr)**: `max(percent_of_price, eur_per_cc)` — rates by EUR price bracket (`_RATES_NEW_BY_PRICE`)
- **Mid (3–5yr)**: `eur_per_cc × engine_cc` — rates by engine volume (`_RATES_MID`)
- **Old (>5yr)**: `eur_per_cc × engine_cc` — rates by engine volume (`_RATES_OLD`)
- **Electric**: flat 15% of price
- **Таможенный сбор**: fixed fee from `_CUSTOMS_FEE` table (ПП РФ № 342)
- Turnkey = auction_price + customs + customs_fee + delivery + services

### Tariffs
`Tariffs` table (id=1) stores currency rates + logistics costs. Updated every 60s from ЦБ РФ. `tariff_cache.py` holds in-memory snapshot so sources don't hit DB per request.

### Auth
- bcrypt (rounds=12) for password hashing
- Sessions stored in Redis with 8h sliding TTL
- Token delivered as httpOnly cookie (`admin_token`), also accepts `Authorization: Bearer` header as fallback
- Rate limit: 10 req/min on login endpoint

### CORS
Controlled by `CORS_ORIGINS` env var. Default: `https://vostokavtoimport.ru,http://localhost:3000`. `allow_credentials=True` required for cookie auth.

---

## API endpoints

```
GET  /api/cars              — catalog (filters: country, body, price_min/max, year_min/max, fuel, sort)
GET  /api/cars/{id}         — car detail
GET  /api/live/cars         — real-time from ajes.com (not DB)
POST /api/calculator        — customs calculation
POST /api/callback          — callback request (name + phone)
GET  /api/tariffs           — current rates
PUT  /api/tariffs           — update rates (admin only)
GET  /api/stats             — site stats
POST /api/admin/login       — login → sets httpOnly cookie
POST /api/admin/logout      — clears cookie
GET  /api/admin/users       — list admins (auth required)
POST /api/admin/users       — create admin (auth required)
DELETE /api/admin/users/{id} — delete admin (auth required)
GET  /health                — liveness + DB + Redis check
GET  /api/debug/*           — only if DEBUG_ENDPOINTS=1
```

---

## Frontend

Next.js App Router. All API calls use relative URLs (`const API = ""`), going through nginx proxy `/api/*` → backend:8000.

Admin panel: `/admin` — client component, cookie auth, no server-side token handling.

SSR pages use `INTERNAL_API_URL=http://backend:8000` (Docker network).

---

## Database

PostgreSQL 16. Schema managed by `Base.metadata.create_all()` + manual `_migrate()` for ALTER TABLE additions. No Alembic migrations.

**Indexes on Car**: `id`, `brand`, `year`, `country`, `body`, `price`, `is_active`, `source`

To add indexes on existing DB:
```sql
CREATE INDEX IF NOT EXISTS ix_cars_is_active ON cars(is_active);
CREATE INDEX IF NOT EXISTS ix_cars_country ON cars(country);
CREATE INDEX IF NOT EXISTS ix_cars_body ON cars(body);
CREATE INDEX IF NOT EXISTS ix_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS ix_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS ix_cars_brand ON cars(brand);
CREATE INDEX IF NOT EXISTS ix_cars_source ON cars(source);
```

---

## Deploy

```bash
# Local: push + rebuild server
deploy.bat

# Server manual rebuild
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d

# Reset admin user (after credential change)
docker compose -f docker-compose.prod.yml exec db psql -U carssite -c "DELETE FROM admin_users;"
docker compose -f docker-compose.prod.yml restart backend

# Check logs
docker compose -f docker-compose.prod.yml logs backend --tail=50
docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

---

## Security notes

- No hardcoded secrets anywhere — all from env vars
- SQL injection escaped in all 3 sources (brand parameter)
- Debug endpoints gated behind `DEBUG_ENDPOINTS` env var (off in prod)
- Rate limits: `/api/cars` 60/min, `/api/live/cars` 30/min, `/api/calculator` 30/min, `/api/callback` 5/min, `/api/admin/login` 10/min
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- Cookie: `httpOnly=True`, `SameSite=lax`, `secure=True` when `PRODUCTION=1`

---

## Known limitations

- Sessions in Redis are single-instance (no cluster) — acceptable for current scale
- No Alembic — schema changes require manual ALTER TABLE or volume reset
- `print()` used for logging — no structured log output
- No retry logic on ajes.com API calls
