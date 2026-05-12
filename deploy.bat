@echo off

echo [deploy]
git pull 
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d 
docker compose -f docker-compose.prod.yml logs --tail=100
 docker compose -f docker-compose.prod.yml logs backend --tail=100 -f

echo [deploy] Done.
pause

