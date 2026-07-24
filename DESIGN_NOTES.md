# Notas de diseno - Cute Cases v4

La especificacion v4 sustituye integramente a v1-v3. Estas notas registran las
decisiones tomadas donde la spec deja margen y las desviaciones conscientes.

## Taste-skill (`.agents/skills/`, `npx skills add Leonxlnx/taste-skill`)

Aplicada en modo redesign-preserve: el sistema de marca v4 (SS3) manda. Reglas
de la skill absorbidas por la propia v4: contraste AA en botones (primario
`--pink-700` sobre blanco), feedback tactil en `:active` (scale 0.98, 120 ms),
`aria-current` en la navegacion, estados cargando/vacio/error disenados en
todas las pantallas, sombras tintadas (SS3.4), un unico acento. La estetica
pildora esta descartada por SS3.4 (radios 10/16/20); Poppins + Inter por SS3.3;
cero emojis por D1 (la skill tambien los penaliza).

## Decisiones dentro del margen de la spec

- **Coordenadas de los presets (SS11.4)**: las de la spec son "provisionales" y
  colisionaban con la zona de camara del iPhone 15 Pro (45x45 mm + 1 mm de
  inflado). El seed valida cada preset y aborta si colisiona (mandato SS11.4);
  las coordenadas se ajustaron al primer hueco valido conservando la
  composicion (p. ej. Golden Hour desplazado a y>=56).
- **Letra "N con tilde" (letras 3D)**: la typeface helvetiker_bold no incluye
  ese glifo; `letterMesh` lo compone como N + capsula de tilde.
- **`User.activo`**: no aparece en el modelo SS12 pero lo exige SS17
  ("desactivar cuenta"); anadido con default `true`.
- **Relaciones `Design.device` y `Report.design`**: SS12 los deja como ids
  planos; se declararon como relaciones Prisma para las lecturas de cesta,
  galeria y moderacion (sin cambio de columnas).
- **Cesta de invitado**: SS5.4 sugiere `cc.cart` en localStorage; se implemento
  con cookie de sesion httpOnly + almacenamiento en servidor (mismo
  comportamiento funcional, merge por union al iniciar sesion via
  `POST /api/cart/merge`, y evita divergencia de validacion D9 en cliente).
- **Panel admin (SS17)**: los preestablecidos se componen con JSON del
  `designData` + validacion completa de colisiones en servidor (el "editor
  interno" 3D completo queda para una fase posterior); el resto de secciones
  cumple la tabla de capacidades, incluida la vista previa 3D en vivo de
  elementos y la regeneracion de hitbox desde la silueta.
- **Textos del panel admin**: castellano inline (es interfaz interna de
  operacion); todo el producto publico cumple D10 con el diccionario es.json.
- **Recuperar contrasena (SS15.2)**: pantalla con respuesta neutra; el envio
  real de email queda fuera del alcance de esta fase (no hay proveedor de
  correo en la spec).
- **Analitica (SS22)**: `src/lib/analytics.ts` emite los eventos canonicos solo
  con `cc.consent=accepted`; el proveedor (Plausible UE) se conecta anadiendo
  su script, sin tocar el resto del codigo.

## Renders (SS10.5)

`/dev/renders` genera `/public/renders` desde las recetas reales (D5, D7: sin
placeholders): tarjetas de fundas (camara "frontal" 0/82), preestablecidos y
hero (camara "tres-cuartos" 26/74), pasos de la home y miniaturas de la
coleccion de temporada. Fondo transparente sobre `--bg` de la pagina.
