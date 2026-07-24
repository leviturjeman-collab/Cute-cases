'use client';

/**
 * Analitica (SS22): solo tras consentimiento (cc.consent === 'accepted').
 * Eventos canonicos con nombre estable; el proveedor (Plausible/PostHog UE)
 * se conecta aqui sin tocar el resto del codigo.
 */

export type AnalyticsEvent =
  | 'home_cta_click'
  | 'modelo_seleccionado'
  | 'funda_vista'
  | 'variante_cambiada'
  | 'editor_abierto'
  | 'elemento_anadido'
  | 'elemento_eliminado'
  | 'letras_generadas'
  | 'colision_al_soltar'
  | 'vista_cambiada'
  | 'diseno_guardado'
  | 'registro_completado'
  | 'compartido'
  | 'regalo_abierto'
  | 'anadido_cesta'
  | 'galeria_publicado'
  | 'like'
  | 'preset_visto'
  // Telemetria nueva del editor (anexo v4.3, Parte V)
  | 'reencuadre_usado'
  | 'asa_rotacion_usada'
  | 'guia_capturada'
  | 'pieza_duplicada'
  | 'pieza_bloqueada'
  | 'variante_cambiada_en_editor'
  | 'busqueda_elementos'
  | 'favorito_marcado'
  | 'composicion_aplicada'
  | 'sorpresa_generada'
  | 'hint_completado'
  | 'espacio_bajo_mostrado'
  | 'deshacer_toast_usado';

export function hasConsent(): boolean {
  try {
    return window.localStorage.getItem('cc.consent') === 'accepted';
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
  if (typeof window === 'undefined' || !hasConsent()) return;
  const w = window as unknown as { plausible?: (e: string, o?: { props?: object }) => void };
  if (typeof w.plausible === 'function') {
    w.plausible(event, props ? { props } : undefined);
  }
}
