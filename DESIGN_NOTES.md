# Notas de diseño — auditoría taste-skill

Skills instaladas con `npx skills add Leonxlnx/taste-skill` (en `.agents/skills/`).
Aplicadas en modo **redesign–preserve** conforme a su propia sección 0: la audiencia
y el sistema de marca existente mandan, y Cute Cases tiene sistema cerrado por
especificación (§2: rosa dominante, todo redondeado, Fredoka/Nunito, Lucide, emojis
en microcopy). Donde la skill y la spec chocan, **gana la spec**.

## Design read (skill §0.B)

> Reading this as: e-commerce de consumo mobile-first para público 11–30 con
> sistema de marca "cute" cerrado por spec, en modo redesign–preserve, sobre
> Tailwind + tokens propios. Dials: VARIANCE 6 · MOTION 5 · DENSITY 4.

## Reglas de la skill aplicadas (compatibles con la spec)

| Regla de la skill | Acción en el proyecto |
|---|---|
| Button contrast check (AA obligatorio) | `--pink-600` ajustado `#F5259C → #DB0F8F`: texto blanco pasa de 3,75:1 (falla AA) a 4,69:1 ✓. Permitido por §2.2 ("valores ajustables manteniendo roles y contraste AA") |
| Tactile feedback en `:active` | Ya en `Button` (scale 0.96 §2.5); añadido a `Chip` e iconos del header |
| Indicación de página actual en nav | Header: `aria-current="page"` + tinte activo según ruta |
| Orphans/viudas en titulares | `text-wrap: balance` en h1–h3 |
| Scroll suave | `scroll-behavior: smooth` (desactivado con `prefers-reduced-motion`) |
| Hero necesita visual real, no icono suelto | Mock CSS del móvil con charms y arquitectura de doble bisel (placeholder honesto del vídeo pregenerado de §5.2 — nunca WebGL en la home §14) |
| Sombras tintadas al fondo, nunca negras | Ya cumplido por tokens §2.4 (sombras rosas) |
| Estados loading/empty/error completos | Ya cumplido (§5.1: skeletons, EmptyState, error+reintentar) |
| Shape consistency lock | Ya cumplido: píldora interactivos / 24px tarjetas / 28px sheets (§2.4), regla documentada |
| Label sobre input, error debajo, nunca placeholder-como-label | Ya cumplido (`Input` §15) |
| One accent lock | Ya cumplido: acento único rosa en todas las páginas |

## Reglas de la skill NO aplicadas (la spec las contradice)

- *Ban de Lucide* → la spec §2.6 fija Lucide (la propia skill lo permite si el proyecto lo fija).
- *Emoji policy restrictiva* → la spec §2.7 exige emojis en microcopy (override "playful" previsto por la skill).
- *Ban de rosa/gradientes vivos y preferencia por neutros* → §2.1 "Rosa dominante TOTAL" es requisito de marca.
- *Fuentes premium alternativas* → §2.3 fija Fredoka + Nunito.
- Personas "Awwwards/brutalist/minimalist" de las skills secundarias → no corresponden al brief.
