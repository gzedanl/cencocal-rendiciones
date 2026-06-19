@echo off
echo Actualizando Railway con nuevas funcionalidades...
echo.
echo [1] Subiendo codigo a GitHub...
git add -A
git commit -m "feat: perfil usuario con datos bancarios + panel admin Guillermo"
git push
echo.
echo [2] Actualizando rol de Guillermo en la base de datos Railway...
echo IMPORTANTE: Asegurate de tener DATABASE_URL configurada
set DATABASE_URL=postgresql://postgres:aMRfzNPfYCxfmsDixDrnRDdjgYexJEbm@thomas.proxy.rlwy.net:31281/railway
npx ts-node prisma/seed.ts
echo.
echo Listo! Railway hara el rebuild automaticamente.
pause
