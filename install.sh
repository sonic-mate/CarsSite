#!/bin/bash
set -e
# Запускать на сервере: bash install.sh --domain vostokavtoimport.ru --token SECRET

DOMAIN=""
ADMIN_TOKEN=""
DIR="$(cd "$(dirname "$0")" && pwd)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2";      shift 2 ;;
    --token)  ADMIN_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" || -z "$ADMIN_TOKEN" ]]; then
  echo "Usage: bash install.sh --domain vostokavtoimport.ru --token SECRET"
  exit 1
fi

# ── System ────────────────────────────────────────────────────────────────────
echo "==> Установка зависимостей..."
apt-get update -qq
apt-get install -y -qq curl nginx certbot python3-certbot-nginx

# ── Docker ────────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "==> Установка Docker..."
  curl -fsSL https://get.docker.com | sh
fi
apt-get install -y -qq docker-compose-plugin 2>/dev/null || true

# ── Загрузка образов ──────────────────────────────────────────────────────────
if [[ -f "$DIR/images.tar.gz" ]]; then
  echo "==> Загрузка Docker образов..."
  docker load < "$DIR/images.tar.gz"
else
  echo "ERROR: images.tar.gz не найден рядом со скриптом"
  exit 1
fi

# ── Docker Compose конфиг ─────────────────────────────────────────────────────
mkdir -p /opt/carssite
cat > /opt/carssite/docker-compose.yml <<EOF
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: carssite
      POSTGRES_USER: carssite
      POSTGRES_PASSWORD: carssite
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U carssite -d carssite"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  backend:
    image: carssite-backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://carssite:carssite@db:5432/carssite
      AJES_API_KEY: "VAInBvFrU76d"
      ADMIN_TOKEN: "${ADMIN_TOKEN}"
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 15s
    restart: unless-stopped

  frontend:
    image: carssite-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://${DOMAIN}
      INTERNAL_API_URL: http://backend:8000
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
EOF

# ── Запуск ────────────────────────────────────────────────────────────────────
echo "==> Запуск контейнеров..."
docker compose -f /opt/carssite/docker-compose.yml up -d

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "==> Настройка Nginx..."
cat > /etc/nginx/sites-available/carssite <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
EOF

ln -sf /etc/nginx/sites-available/carssite /etc/nginx/sites-enabled/carssite
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── SSL ───────────────────────────────────────────────────────────────────────
echo "==> SSL сертификат..."
certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" || \
  echo "WARN: SSL не удался. Запусти вручную: certbot --nginx -d ${DOMAIN}"

echo ""
echo "✓ Готово!"
echo "  Сайт:    https://${DOMAIN}"
echo "  Админка: https://${DOMAIN}/admin  (пароль: ${ADMIN_TOKEN})"
echo "  Логи:    docker compose -f /opt/carssite/docker-compose.yml logs -f"
