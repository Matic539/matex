# Sistema Matex — Aplicación Web (v1)

Sistema de Gestión y Análisis de Datos para Matex. Monorepo del prototipo según **PDP-01** (`software/_documentacion-tecnica/PLAN_DESARROLLO_PROTOTIPO.md`).

| Paquete | Stack | Puerto dev |
|---|---|---|
| `backend/` | Node.js · TypeScript · Express · Prisma · PostgreSQL | 3000 |
| `frontend/` | React · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui | 5173 |

## Requisitos previos

- Node.js ≥ 20 (`node --version`)
- PostgreSQL con la BD `matex` cargada (ver `software/_documentacion-tecnica/GUIA_IMPLEMENTACION_BD.md`)

## Setup inicial

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env       # editar: DATABASE_URL y JWT_SECRET
npx prisma generate          # genera el cliente tipado
npm run seed                 # usuarios demo (admin/ventas/bodega)
npm run dev                  # http://localhost:3000/api/v1/health
```

### 2. Frontend

```bash
cd frontend
npm install                  # npm install -g npm@11.18.0
copy .env.example .env
npm run dev                  # http://localhost:5173
```

El dev server de Vite tiene proxy `/api` → `localhost:3000`, no hay que configurar CORS en desarrollo.

## Usuarios demo (tras `npm run seed`)

| Email | Rol | Contraseña |
|---|---|---|
| admin@matex.cl | admin | la definida en `SEED_DEMO_PASSWORD` |
| ventas@matex.cl | ventas | ídem |
| bodega@matex.cl | inventario | ídem |

> Contraseñas temporales, solo para desarrollo. Cambiar en producción.

## Scripts útiles

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run dev` | ambos | servidor de desarrollo con hot-reload |
| `npm run build` | ambos | build de producción |
| `npm run typecheck` | ambos | verificación de tipos sin compilar |
| `npm run seed` | backend | inserta usuarios demo |
| `npm test` | backend | tests unitarios (Vitest) |

## Estructura

```
backend/src/
├── config/        # variables de entorno validadas
├── lib/           # cliente Prisma singleton
├── middleware/    # errores, auth (fase 1), logging
├── modules/       # un directorio por dominio: routes → controller → service
└── app.ts / server.ts

frontend/src/
├── api/           # cliente HTTP tipado
├── components/    # ui/ (shadcn) · layout/
├── pages/         # una carpeta por página
├── lib/           # utilidades (cn)
└── router.tsx     # rutas (protección por rol en fase 1)
```

## Convenciones

- API REST bajo `/api/v1/`, recursos en plural, respuestas `{ data, meta }`, errores `{ error: { code, message } }`.
- Reglas de negocio (RN-01, RN-02, RN-06) en la capa **service**, con transacciones Prisma.
- Commits: `tipo(ámbito): descripción` — ej. `feat(ventas): registro manual multi-producto`.
- La integración Vessi y el módulo predictivo quedan fuera del prototipo (ver PDP-01 §6).
