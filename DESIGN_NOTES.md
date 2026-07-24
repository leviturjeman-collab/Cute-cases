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

## Anexo v4.3 (auditoria del editor y funcionalidades nuevas)

Implementado integramente E1-E9 y las funcionalidades N1-N8, N13-N17 y N20,
mas la Parte IV (panel) y la Parte V (telemetria). Decisiones:

- **E1**: `src/editor/camera/fit.ts` deriva la distancia del fov, el aspecto
  y el area util; el rig fija `maxDistance = dFit` (alejar al maximo = funda
  completa), desplaza el target al centro del area util y reencuadra animado
  ante resize/orientacion/sheet. Matriz e2e de 13 combinaciones (3 modelos x
  4 viewports + cambio de area util) verificada con el hook `__ccFit` (solo
  dev), equivalente numerico a la asercion por framebuffer. Las alturas del
  bottom sheet se acotaron a fracciones de viewport para landscape.
- **E2**: HDR de estudio real (Poly Haven studio_small_08, CC0) servido desde
  `/public/env/studio.hdr` (sin dependencia de red externa); 512 px de
  resolucion (256 en gama baja), rim light 0.25 y bump de version de
  `cc.thumbs` para regenerar miniaturas.
- **E4**: el borde de vinilo y el AO se generan desde `recipeOutline` (la
  misma silueta de las hitboxes) con inflado por escala por eje.
- **N1**: el menu contextual de pieza vive en el panel anclado de la pieza
  seleccionada (duplicar, bloquear, sustituir, centrar, eliminar) en lugar de
  un popover junto al asa: misma funcion, un solo anclaje visual.
- **N3**: el bloqueo es estado de sesion del editor (no se serializa al
  diseno); las piezas bloqueadas siguen contando para colisiones y precio.
- **N8**: favoritos en `User.favoritos` (Json) con merge por union al iniciar
  sesion; recientes en localStorage.
- **N9/N10**: anclajes por modelo en `src/editor/compositions.ts` (marco,
  diagonal, columna, orbita de camara, esquina), validados uno a uno; el
  diseno sorpresa usa esas plantillas con paleta simple por acabado.
- **Pendiente (P2 o decision de producto)**: N11 tamano real, N12 fondos de
  visor, N18 historial de versiones y N19 snap angular (el propio anexo lo
  condiciona a confirmacion de producto).
