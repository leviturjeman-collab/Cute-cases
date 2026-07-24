# Cute Cases

E-commerce **mobile-first** para disenar fundas de iPhone **pieza a pieza**: charms 3D y stickers reales colocados sobre un editor 3D con orbita por arrastre directo. Implementacion de la **especificacion funcional y tecnica v4** (que sustituye integramente a v1-v3).

## Directivas criticas (v4 SS1)

- **D1 - Cero emojis**: `npm run check:emoji` recorre `/src` y falla el build si aparece uno (paso obligatorio de CI).
- **D2 - El editor es el producto**: arrastre directo, iman de 1,5 mm, giro con dos dedos, papelera, historial de 50 pasos.
- **D3 - Camara de orbita por arrastre**: azimut +-80, polar 55-125, damping 0.08, zoom 0.8-1.8x, chips de vista con animacion de 400 ms.
- **D4 - Seed completo**: 21 iPhones (13-17), 6 fundas / 19 variantes, 48 elementos + coleccion Verano + 74 glifos de letras, 4 preestablecidos validados contra colisiones.
- **D5 - Assets procedurales**: recetas three.js parametrizadas (`src/assets-procedural`), sustituibles por GLB via `assetUrl` sin migracion.
- **D9 - El servidor siempre revalida**: colisiones y precios se recalculan en cada guardado/lectura (`src/server/designService.ts`).
- **D10 - Todo texto de interfaz** sale de `src/lib/i18n/messages/es.json` (microcopy T-01..T-24 incluido).

## Stack

Next.js 14 (App Router) - React 18 - TypeScript estricto - Tailwind (tokens SS3) - three.js + react-three-fiber + drei - Zustand (historial undo/redo) - TanStack Query - PostgreSQL + Prisma - NextAuth (credentials argon2id + Google/Apple opcionales) - next-intl (`es`) - Zod en todos los limites - Vitest + Playwright.

## Arranque rapido

```bash
npm install
cp .env.example .env   # DATABASE_URL/DIRECT_URL, NEXTAUTH_SECRET
npx prisma db push     # crea el esquema
npm run db:seed        # seed v4 completo (D4) + demo en desarrollo
npm run dev
```

Usuarios demo (solo con `SEED_DEMO_CONTENT` activo, por defecto en desarrollo): `admin@cutecases.dev`, `demo@cutecases.dev`, `estudio@cutecases.dev` (contrasena `cutecases-dev` o la de `SEED_ADMIN_PASSWORD`).

```bash
npm run ci           # check:emoji + typecheck + lint + tests
npm test             # unitarios: SAT (SS8.4), colocacion, precios, letras
npx playwright test  # happy path E2E (servidor sembrado; E2E_BASE_URL configurable)
```

## Motor de colisiones (SS8)

SAT sobre poligonos convexos en el plano trasero: contorno de funda de 28 vertices, margen de Settings como inflado de proyecciones, zona de camara inflada 1 mm, busqueda en espiral para colocacion automatica (paso 2 mm, <=400 candidatos, 4 rotaciones). Fuente unica compartida cliente/servidor en `src/lib/collision`.

## Renders de catalogo (SS10.5)

Utilidad interna `/dev/renders` (solo desarrollo): genera las imagenes de `/public/renders` (tarjetas de fundas, preestablecidos, hero y pasos) con las camaras nombradas "frontal" y "tres-cuartos". Automatizable con Playwright contra `npm run dev`.

## Despliegue

- **Vercel**: build estandar (`next build`); las paginas SSG consultan la BD en build, por lo que `DATABASE_URL`/`DIRECT_URL` deben estar disponibles en build.
- **Supabase**: `DATABASE_URL` = transaction pooler (6543, `?pgbouncer=true`), `DIRECT_URL` = conexion directa (5432). Miniaturas en Storage (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, bucket `thumbnails`); sin credenciales, en desarrollo actua un receptor local.

## Estructura

```
prisma/                esquema SS12 + seed SS11
src/lib/collision      SAT, geometria, colocacion (pura, testeada)
src/lib/silhouettes    siluetas de recetas -> hitboxes (SS11.6)
src/lib/pricing        precios en centimos (SS7.9)
src/lib/letters        normalizacion y metricas de letras (SS13.1)
src/assets-procedural  recetas three.js, materiales SS9, miniaturas SS10.4
src/editor             editor 3D SS7 (store, gestos, visor, autosave)
src/components         design system SS4 + layout + tarjetas
src/app                rutas SS5.1 (paginas, editor, admin, API SS13)
src/server             validacion canonica, servicios, errores estables
```

Notas de decisiones y desviaciones: [DESIGN_NOTES.md](DESIGN_NOTES.md).
