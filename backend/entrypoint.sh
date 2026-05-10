#!/bin/sh
set -e
mkdir -p /app/static/photos /app/.img_cache
chmod -R 777 /app/static/photos /app/.img_cache
exec uvicorn main:app --host 0.0.0.0 --port 8000
