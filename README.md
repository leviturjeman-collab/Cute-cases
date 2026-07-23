# Cute Cases 💖

E-commerce **mobile-first** para personalizar fundas de iPhone con **charms 3D** y **stickers planos** sobre un editor 3D realista de giro controlado. Implementación de la [especificación funcional y técnica v2](#especificación).

## Stack

Next.js 14 (App Router) · React 18 · TypeScript estricto · Tailwind (tokens §2) · three.js + react-three-fiber + drei · Zustand (historial undo/redo) · TanStack Query · PostgreSQL + Prisma · NextAuth (credentials argon2id + Google + Apple) · next-intl (`es`, listo para i18n) · Zod en todos los límites · Vitest.

## Arranque rápido

```bash
npm install
cp .env.example .env          # ajusta DATABASE_URL/DIRECT_URL y NEXTAUTH_SECRET
docker compose up -d          # PostgreSQL local
npx prisma db push            # crea el esquema
npm run db:seed               # seeds de desarrollo (21 iPhones, fundas, ~70 elementos)
npm run dev
```

> **Base de datos elegida: Supabase** (aún sin conectar). El esquema ya está
> preparado: `DATABASE_URL` = Transaction pooler (6543, `?pgbouncer=true`) y
> `DIRECT_URL` = conexión directa (5432) para migraciones — plantilla en
> `.env.example`. Mientras tanto, el docker-compose local funciona igual.

Usuarios del seed: `admin@cutecases.dev` / `demo@cutecases.dev` (contraseña `cutecases123`).

```bash
npm run ci      # typecheck + lint + tests
npm test        # tests unitarios (colisiones SAT, precios, letras)
```

## Estructura

```
/src
  /app            rutas Next (públicas §5, /api §12.3, /admin §11)
  /components     design system §2.6 + layout + admin
  /editor         visor 3D, gestos, store Zustand con historial, autosave
  /lib
    /collision    SAT + broad-phase AABB + colocación (TS puro, testeado, §6.6)
    /pricing      precios en céntimos (TS puro, testeado, §6.7)
    /letters      normalización del generador de letras (§4.4)
    /i18n         diccionarios (100% del microcopy §17)
  /server         Prisma, Auth, validación de defensa en profundidad §12.5
/prisma           esquema §12.2 + seed de desarrollo
/tests            unit tests (casos límite §18)
```

## Calidad visual

La UI pasó la auditoría de `Leonxlnx/taste-skill` (instalada en `.agents/skills/`) en modo redesign–preserve: contraste AA en CTAs, feedback táctil, estados completos, bloqueo de consistencia de forma y color. Detalle en [DESIGN_NOTES.md](./DESIGN_NOTES.md).

## Decisiones y estado de implementación

### Cumplido según especificación
- **Coordenadas en mm reales** y precios en céntimos en todo el modelo de datos; el archivo de producción para el proveedor saldrá "gratis" de `Design.elementos`.
- **Colisiones**: SAT con descomposición de cóncavos (ear clipping), broad-phase AABB, margen de seguridad configurable desde admin, mismo módulo TS en cliente y servidor.
- **Validación en servidor (§12.5)**: existencia/actividad/caducidad, colisiones, recálculo de precio ignorando el del cliente, ownership. Tests de los casos §18.18–19 incluidos.
- **Editor**: 5 vistas controladas, tamaño fijo inescalable, rotación libre 360° (pinch = SOLO rotación), imán suave solo de posición (1,5 mm), reversión animada + E-05, precio en vivo con desglose, undo/redo (50 acciones), generador de letras con fila centrada y separación de 2 mm, autosave local 500 ms, flujo invitado→registro sin pérdida, flujo de caducados §4.5, teclado completo §15.
- **Compartir**: imagen stories 1080×1920 con marca de agua (Web Share API + fallback), enlace regalo `/d/token` (CSPRNG 160 bits, noindex, OG dinámico).
- **Galería** opt-in revocable con likes y reportes; moderación en admin.
- **Cesta UI** con merge invitado↔cuenta sin duplicados y checkout placeholder honesto (E-18).
- **Admin completo** con auditoría: dispositivos (editor visual de zona de cámara), fundas+variantes, elementos (hitbox autogenerada desde PNG + editor de vértices), letras, temporadas, preestablecidos (validación idéntica al editor), moderación, usuarios, ajustes.

### Decisiones tomadas (pendientes en la spec, con default aplicado)
- Imagen para redes: **solo 9:16** (default de la spec; el 1080×1080 queda preparado en `shareImage.ts`).
- Galería: **sin** "usar como inspiración" (default de la spec: no duplicar diseños ajenos).

### Simplificaciones honestas (a evolucionar)
- **Assets 3D**: no existen aún GLB/PNG del proveedor; los seeds usan el esquema `procedural://` que el visor renderiza con geometría procedural (corazones/lazos/estrellas extruidos, etc.). El campo `assetUrl` acepta GLB/PNG reales sin tocar código.
- ⚠️ **Dimensiones de dispositivos del seed**: aproximadas, SOLO para desarrollo. Antes de producción, introducir medidas verificadas desde el admin (§4.1). El código no hardcodea ninguna medida.
- Hitbox autogen: casco convexo + Douglas-Peucker sobre el alfa del PNG (la spec sugiere marching squares; el resultado es ajustable a mano en el editor de vértices).
- Orden del carrusel de preestablecidos: botones ↑/↓ en lugar de drag & drop.
- Rate limiting en memoria (interfaz lista para Upstash/Redis en producción multi-instancia).
- Miniaturas en `/public/uploads` en desarrollo; producción requiere storage S3-compatible + CDN.
- Analítica (§16): eventos definidos en la spec, integración de herramienta (Plausible/PostHog UE) pendiente de decidir cuenta/hosting; el consentimiento de cookies ya emite `cc:analytics-consent`.
- Playwright (happy path del editor) y verificación de email: pendientes.

## Especificación

La fuente de verdad es el documento *CUTE CASES — Especificación Funcional y Técnica Completa (v2)*. Las referencias `§n` de este README y del código apuntan a sus secciones.
