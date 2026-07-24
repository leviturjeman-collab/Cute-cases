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
  | 'preset_visto';

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
