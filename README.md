# Sistema de Rendición de Gastos — Cencocal

Sistema digital completo para gestión de gastos corporativos.

---

## Instalación paso a paso

### 1. Instalar Node.js
Descargar e instalar desde: https://nodejs.org (versión LTS, 20.x o superior)

Verificar instalación:
```
node --version
npm --version
```

### 2. Instalar PostgreSQL
Descargar desde: https://www.postgresql.org/download/windows/
- Usuario: `postgres`
- Contraseña: `postgres`
- Puerto: `5432` (default)

Crear la base de datos:
```sql
CREATE DATABASE cencocal_rendiciones;
```

### 3. Instalar dependencias del proyecto
```
cd C:\Users\gzeda\CENCOCAL\RENDICIONES
npm install
```

### 4. Instalar Tailwind CSS
```
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 5. Configurar base de datos
```
npx prisma migrate dev --name init
npx prisma db seed
```

### 6. Iniciar el sistema
```
npm run dev
```

El sistema abre en: http://localhost:3000

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Guillermo (Rendidor) | guillermo.zedan@cencocal.cl | cencocal2024 |
| Naiffa (Autorizador) | naiffa.chahuan@cencocal.cl | cencocal2024 |
| Secretaria (Pagos) | secretaria@cencocal.cl | cencocal2024 |

---

## Flujo del sistema

```
Rendidor → sube boletas + OCR automático → envía rendición
    ↓
Naiffa recibe email → revisa → aprueba con firma digital
    ↓
Secretaria recibe email → marca como pagado → exporta nómina/remesa
```

---

## Configurar correo (Gmail)

1. Activar verificación en 2 pasos en Gmail
2. Crear "Contraseña de aplicación" en configuración de Google
3. Editar `.env`:
```
SMTP_USER=tu.correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   (contraseña de aplicación)
```

---

## Estructura del proyecto

```
RENDICIONES/
├── src/                    # Frontend React
│   ├── pages/              # Pantallas principales
│   ├── components/         # Componentes reutilizables
│   ├── services/           # API calls
│   ├── context/            # Estado global (Auth)
│   └── types/              # TypeScript types
├── server/                 # Backend Node.js
│   ├── routes/             # Endpoints API
│   ├── middleware/         # Autenticación JWT
│   └── services/           # Email, etc.
├── prisma/                 # Base de datos
│   ├── schema.prisma       # Modelo de datos
│   └── seed.ts             # Datos de prueba
└── .env                    # Configuración
```

---

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/rendiciones | Listar rendiciones |
| POST | /api/rendiciones | Crear rendición |
| PATCH | /api/rendiciones/:id/aprobar | Aprobar |
| PATCH | /api/rendiciones/:id/rechazar | Rechazar |
| PATCH | /api/pagos/:id/pagar | Marcar pagado |
| GET | /api/pagos/exportar-nomina | Excel nómina |
| GET | /api/pagos/remesa-bancaria | CSV remesa |
| GET | /api/reportes/mes | Reporte mensual |
