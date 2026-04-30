# Восток АвтоИмпорт

Авто из Японии, Китая, Кореи — под ключ.

## Stack

- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Backend**: Python FastAPI
- **DB**: PostgreSQL 16
- **Auction API**: ajes.com (optional, paid)

---

## Quick start — Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Manual dev start

```bash
# 1. Start DB
docker compose up db -d

# 2. Backend
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload

# 3. Frontend
cd frontend
npm install
npm run dev
```

---

## DNS — настройка аукционного поддомена

На хостинге добавьте DNS-записи для домена `vostokavtoimport.ru`:

```
auc   A     87.242.72.59
auc   AAAA  2a00:15f8:c001:3:225:90ff:fed4:7912
```

После применения будет работать: **http://auc.vostokavtoimport.ru**

### Доступ к аукционной платформе

| | |
|---|---|
| Пользователь | http://auc.vostokavtoimport.ru (login: test2 / test2) |
| Панель управления | http://auc.vostokavtoimport.ru/cp (login: vostokavtoimport.ru / quljemig) |

Видеоинструкции: https://youtu.be/zfMI-QVb_Jo · https://youtu.be/GPLuGi7Ch5Q

---

## Auction API (ajes.com)

Документация: https://avto.jp/api?enter  
Поиск: https://ajes.com/api/search

### Подключение

1. Оформить подписку на https://avto.jp/api?enter
2. Получить API ключ
3. Добавить в `backend/.env`:

```env
AJES_API_KEY=ваш_ключ_здесь
```

4. Перезапустить бекенд — каталог автоматически начнёт тянуть живые лоты.

### Тарифы (из ТЗ)

| Источник | Тариф |
|---|---|
| 140 яп. аукционов (без API) | 5 000 ₽/мес · 24 000 ₽/полгода |
| 140 яп. аукционов (с API) | 7 000 ₽/мес |
| Корея encar.com (с API) | 30 000 ₽/полгода |
| Китай che168.com (с API) | 30 000 ₽/полгода |

### Статус API

```
GET /api/auction/status
```

Вернёт `configured: true` если ключ установлен, иначе `false`.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/cars` | Список авто из БД (filters: country, body, price_min/max, year_min/max, sort) |
| GET | `/api/cars/{id}` | Одна машина |
| GET | `/api/auction/cars` | Живые лоты с ajes.com (нужен AJES_API_KEY) |
| GET | `/api/auction/status` | Статус подключения auction API |
| POST | `/api/calculator` | Расчёт стоимости под ключ |
| GET | `/api/stats` | Статистика сайта |
| GET | `/health` | Health check |

---

## Pages

| Route | |
|---|---|
| `/` | Главная |
| `/catalog` | Каталог с фильтрами |
| `/cars/[id]` | Карточка авто |
| `/calculator` | Калькулятор таможни |
| `/process` | Как мы работаем |
| `http://auc.vostokavtoimport.ru` | Аукционная платформа (внешняя) |

---

## Почта

Создать ящик `info@vostokavtoimport.ru` на beget.ru (даже если не используется — нужен для доверия).

### server
ssh root@85.239.61.178