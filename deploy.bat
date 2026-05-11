@echo off

echo [deploy]
git pull 
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d 
docker compose -f docker-compose.prod.yml logs --tail=100

echo [deploy] Done.
pause

