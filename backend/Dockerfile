FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN printf '#!/bin/sh\nset -e\nmkdir -p /app/static/photos /app/.img_cache\nchmod -R 777 /app/static/photos /app/.img_cache\nexec uvicorn main:app --host 0.0.0.0 --port 8000\n' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
