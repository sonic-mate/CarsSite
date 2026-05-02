@echo off
echo [upload] Pushing to git...
git add -A
git commit -m "upload" 2>nul || echo [upload] Nothing to commit
git push

echo [upload] Done.
pause

