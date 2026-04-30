#!/bin/bash
set -e
# Запускать локально из папки проекта перед деплоем

echo "==> Сборка Docker образов..."
docker compose build

echo "==> Экспорт образов в архив..."
docker save \
  carssite-frontend \
  carssite-backend \
  postgres:16-alpine \
  | gzip > deploy/images.tar.gz

echo "==> Копирование файлов деплоя..."
mkdir -p deploy
cp install.sh deploy/

echo ""
echo "✓ Папка deploy/ готова к загрузке на сервер"
echo "  Загрузи на сервер:"
echo "  scp -r deploy/ root@IP_СЕРВЕРА:/root/deploy"
