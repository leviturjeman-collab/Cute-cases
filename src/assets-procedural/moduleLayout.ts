/**
 * Disposicion del modulo de camara por forma (SS6.2) en MILIMETROS REALES.
 * La zona del seed es el recorte de la funda (con holgura); el grupo de
 * lentes se ancla a ella pero cada medida (radios, separaciones entre
 * centros y posiciones de flash/LiDAR/microfono) es absoluta, tomada de los
 * planos dimensionales que usan los fabricantes de fundas:
 *
 * - Duo diagonal (13-15): aros de 14,8 mm con centros a 12,8 mm en x e y
 *   (queda un canal visible entre aros), flash arriba a la derecha
 * - Triple Pro (13 Pro-16 Pro): aros de 16,1 mm en triangulo con columna
 *   izquierda a +-9,4 mm y lente derecha a +9,4 mm; flash sobre la lente
 *   derecha, LiDAR bajo ella y microfono arriba al centro
 * - Pastilla del 16/17: aros de 14,5 mm con centros a 17,8 mm
 * - Barra del 17 Pro: triangulo de aros de 16,5 mm pegado a los bordes de
 *   la barra, flash y LiDAR al extremo derecho
 * - Barra baja del 17 Air: un solo aro de 14,5 mm a 13 mm del borde
 * - 16e: aro de 12,5 mm con el flash debajo
 *
 * Es la unica fuente de verdad; la usan la funda 3D y el esquema SVG.
 */

export interface ModuleZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ModuleSpot {
  x: number;
  y: number;
  r: number;
}

export interface ModuleLayout {
  lenses: ModuleSpot[];
  flash: ModuleSpot;
  lidar?: ModuleSpot;
  mic?: ModuleSpot;
}

export function moduleLayout(forma: string, zone: ModuleZone): ModuleLayout {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  switch (forma) {
    case 'cuadrado-triple': {
      // Triangulo Pro real: columna izquierda (gran angular y tele) y ultra
      // gran angular a la derecha, con el canal entre aros del telefono real
      const r = 8.05;
      return {
        lenses: [
          { x: cx - 9.4, y: cy - 9.4, r },
          { x: cx - 9.4, y: cy + 9.4, r },
          { x: cx + 9.4, y: cy, r },
        ],
        flash: { x: cx + 9.9, y: cy - 13.8, r: 3 },
        lidar: { x: cx + 9.9, y: cy + 13.8, r: 2.6 },
        mic: { x: cx + 0.8, y: cy - 14, r: 0.75 },
      };
    }
    case 'cuadrado-diagonal': {
      // Duo diagonal 13-15: centros a 12,8 mm en cada eje, flash arriba a
      // la derecha y microfono entre el flash y la lente inferior
      const r = 7.4;
      return {
        lenses: [
          { x: cx - 6.4, y: cy - 6.4, r },
          { x: cx + 6.4, y: cy + 6.4, r },
        ],
        flash: { x: cx + 8.7, y: cy - 9.2, r: 3.3 },
        mic: { x: cx + 9.4, y: cy - 1.7, r: 0.75 },
      };
    }
    case 'barra-horizontal': {
      if (zone.h <= 28) {
        // Barra baja del 17 Air: un solo aro de 14,5 mm a 13 mm del borde
        // izquierdo y el flash centrado en el extremo derecho
        return {
          lenses: [{ x: zone.x + 13, y: cy, r: 7.25 }],
          flash: { x: zone.x + zone.w - 9, y: cy, r: 2.9 },
          mic: { x: zone.x + zone.w - 18, y: cy, r: 0.75 },
        };
      }
      // Barra del 17 Pro: triangulo de aros de 16,5 mm que apura los bordes
      // de la barra como en el telefono real; flash + LiDAR + microfono
      // hacia el extremo derecho
      const r = 8.25;
      return {
        lenses: [
          { x: zone.x + 13, y: cy - 8.4, r },
          { x: zone.x + 13, y: cy + 8.4, r },
          { x: zone.x + 29.5, y: cy, r },
        ],
        flash: { x: zone.x + zone.w - 10, y: cy - 8, r: 3 },
        lidar: { x: zone.x + zone.w - 10, y: cy + 8, r: 2.8 },
        mic: { x: zone.x + zone.w - 20, y: cy, r: 0.75 },
      };
    }
    case 'vertical-doble': {
      // iPhone 17: pastilla vertical centrada, flash a la derecha a la
      // altura del canal entre lentes
      const r = 7.25;
      return {
        lenses: [
          { x: cx, y: cy - 8.9, r },
          { x: cx, y: cy + 8.9, r },
        ],
        flash: { x: cx + 11.5, y: cy - 4, r: 3.1 },
        mic: { x: cx + 11.5, y: cy + 3, r: 0.75 },
      };
    }
    case 'vertical': {
      // iPhone 16: pastilla en la mitad izquierda del recorte (la funda
      // oficial incluye el flash a su derecha, a la altura del canal)
      const r = 7.25;
      return {
        lenses: [
          { x: zone.x + 13, y: cy - 8.9, r },
          { x: zone.x + 13, y: cy + 8.9, r },
        ],
        flash: { x: zone.x + 29, y: cy - 4, r: 3.1 },
        mic: { x: zone.x + 29, y: cy + 3, r: 0.75 },
      };
    }
    case 'camara-unica-vertical': {
      // 16e: aro de 12,5 mm arriba y flash de 5,2 mm debajo
      return {
        lenses: [{ x: cx, y: zone.y + 9, r: 6.25 }],
        flash: { x: cx, y: zone.y + 21, r: 2.6 },
      };
    }
    default: {
      return {
        lenses: [{ x: cx, y: cy, r: 7 }],
        flash: { x: cx + 9.5, y: cy - 9.5, r: 3 },
      };
    }
  }
}
