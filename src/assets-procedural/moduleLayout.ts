/**
 * Disposicion del modulo de camara por forma (SS6.2) en MILIMETROS REALES.
 * La zona del seed es el recorte de la funda (con holgura); el grupo de
 * lentes se ancla a ella pero cada medida es absoluta, tomada del hardware:
 *
 * - Duo diagonal (13-15): aros de 14,2 mm casi tocandose en diagonal
 *   (centros a 10,4 mm en x e y), flash de 6,6 mm arriba a la derecha
 * - Triple Pro (13 Pro-16 Pro): aros de 16 mm en triangulo compacto
 *   (columna izquierda a 17,2 mm; lente derecha a 15 mm de la columna),
 *   flash arriba a la derecha y LiDAR debajo
 * - Pastilla del 16: aros de 14,5 mm apilados a 16,4 mm entre centros
 * - Barra del 17 Pro: mismo triangulo con aros de 16,5 mm a la izquierda,
 *   flash y LiDAR en el extremo derecho
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
      // Triangulo Pro real: gran angular arriba-izq, tele abajo-izq,
      // ultra gran angular a la derecha, todos con aro de 16 mm
      const r = 8;
      return {
        lenses: [
          { x: cx - 8.5, y: cy - 8.6, r },
          { x: cx - 8.5, y: cy + 8.6, r },
          { x: cx + 6.5, y: cy, r },
        ],
        flash: { x: cx + 8.3, y: cy - 13.5, r: 3 },
        lidar: { x: cx + 8.3, y: cy + 13.5, r: 2.75 },
        mic: { x: cx + 0.5, y: cy - 13.2, r: 0.75 },
      };
    }
    case 'cuadrado-diagonal': {
      // Duo diagonal 13-15: aros de 14,2 mm casi tocandose en la diagonal
      const r = 7.1;
      return {
        lenses: [
          { x: cx - 5.2, y: cy - 5.2, r },
          { x: cx + 5.2, y: cy + 5.2, r },
        ],
        flash: { x: cx + 9.8, y: cy - 9.2, r: 3.3 },
        mic: { x: cx + 9.8, y: cy - 1.8, r: 0.75 },
      };
    }
    case 'barra-horizontal': {
      if (zone.h <= 28) {
        // Barra baja del 17 Air: un solo aro de 14,5 mm a 13 mm del borde
        // izquierdo y el flash en el extremo derecho
        return {
          lenses: [{ x: zone.x + 13, y: cy, r: 7.25 }],
          flash: { x: zone.x + zone.w - 9, y: cy, r: 2.9 },
          mic: { x: zone.x + zone.w - 18, y: cy, r: 0.75 },
        };
      }
      // Barra del 17 Pro: triangulo Pro con aros de 16,5 mm a la izquierda
      // (separado de la esquina redondeada), flash + LiDAR + microfono hacia
      // el extremo derecho
      const r = 8.25;
      return {
        lenses: [
          { x: zone.x + 13, y: cy - 8.5, r },
          { x: zone.x + 13, y: cy + 8.5, r },
          { x: zone.x + 28.5, y: cy, r },
        ],
        flash: { x: zone.x + zone.w - 10, y: cy - 8, r: 3 },
        lidar: { x: zone.x + zone.w - 10, y: cy + 8, r: 2.8 },
        mic: { x: zone.x + zone.w - 20, y: cy, r: 0.75 },
      };
    }
    case 'vertical-doble': {
      // iPhone 17: pastilla vertical de aros de 14,5 mm centrada en la zona,
      // flash a la derecha de la lente superior
      const r = 7.25;
      return {
        lenses: [
          { x: cx, y: cy - 8.2, r },
          { x: cx, y: cy + 8.2, r },
        ],
        flash: { x: cx + 11.5, y: cy - 8.2, r: 3.1 },
        mic: { x: cx + 11.5, y: cy, r: 0.75 },
      };
    }
    case 'vertical': {
      // iPhone 16: pastilla de aros de 14,5 mm a 16,4 mm entre centros en la
      // mitad izquierda del recorte y flash a su derecha, como en la funda
      // real (el recorte de Apple incluye el flash)
      const r = 7.25;
      return {
        lenses: [
          { x: zone.x + 13, y: cy - 8.2, r },
          { x: zone.x + 13, y: cy + 8.2, r },
        ],
        flash: { x: zone.x + 29, y: cy - 8.2, r: 3.1 },
        mic: { x: zone.x + 29, y: cy + 0.5, r: 0.75 },
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
