/**
 * Calculo de precios (SS7.9, D8). TypeScript puro, compartido cliente/servidor.
 * Unidades: SIEMPRE centimos (Int). El total del cliente es informativo:
 * el servidor recalcula siempre desde BD (D9, SS14.1).
 */

export interface PricedElement {
  precioCentimos: number;
  nombre: string;
}

export interface PriceLine {
  label: string;
  centimos: number;
  instanceId?: string;
  elementId?: string;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  totalCentimos: number;
}

/** total = variant.precio + suma items.precio (cada letra cuenta, SS7.9). */
export function computeTotalCentimos(
  variantPriceCentimos: number,
  items: { elementId: string; instanceId?: string; letterChar?: string }[],
  elementsById: ReadonlyMap<string, PricedElement>,
): number {
  let total = variantPriceCentimos;
  for (const item of items) {
    const el = elementsById.get(item.elementId);
    if (!el) throw new Error(`Elemento desconocido: ${item.elementId}`);
    total += el.precioCentimos;
  }
  return total;
}

/** Desglose del PriceTag (SS7.9): funda + una linea por elemento. */
export function computeBreakdown(
  caseLabel: string,
  variantPriceCentimos: number,
  items: { elementId: string; instanceId?: string; letterChar?: string }[],
  elementsById: ReadonlyMap<string, PricedElement>,
): PriceBreakdown {
  const lines: PriceLine[] = [{ label: caseLabel, centimos: variantPriceCentimos }];
  for (const item of items) {
    const el = elementsById.get(item.elementId);
    if (!el) continue;
    const label = item.letterChar ? `${el.nombre} "${item.letterChar}"` : el.nombre;
    lines.push({ label, centimos: el.precioCentimos, instanceId: item.instanceId, elementId: item.elementId });
  }
  return { lines, totalCentimos: lines.reduce((acc, l) => acc + l.centimos, 0) };
}

/** Formatea centimos como EUR es-ES (coma decimal, simbolo pospuesto, SS18). */
export function formatCentimos(centimos: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(centimos / 100);
}
