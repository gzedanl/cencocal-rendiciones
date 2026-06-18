@echo off
echo ================================================
echo   Sistema Cencocal - Instalacion automatica
echo ================================================
echo.

echo [1/4] Verificando Node.js...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descarga desde: https://nodejs.org
    pause
    exit /b 1
)

echo [2/4] Instalando dependencias...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR instalando dependencias
    pause
    exit /b 1
)

echo [3/4] Instalando Tailwind CSS...
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo [4/4] Migrando base de datos y cargando datos de prueba...
echo IMPORTANTE: Asegurate de que PostgreSQL este corriendo y la DB exista
npx prisma migrate dev --name init
npx prisma db seed

echo.
echo ================================================
echo   Instalacion completada!
echo
echo   Para iniciar el sistema ejecuta: INICIAR.bat
echo ================================================
pause
