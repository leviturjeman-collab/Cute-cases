/**
 * Cálculo de precios (§6.7). TypeScript puro, compartido cliente/servidor.
 * Unidades: SIEMPRE céntimos (Int). El precio del cliente es informativo:
 * el servidor recalcula siempre desde base de datos (§12.5).
 */

export interface PricedElement {
  precioCentimos: number;
  nombre: string;
}

export interface PriceLine {
  label: string;
  centimos: number;
  /** id de instancia para poder eliminar desde el desglose (§6.7). */
  instanceId?: string;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  totalCentimos: number;
}

/**
 * total = precio_variante_funda + Σ precio_elementos_instanciados
 * (cada letra cuenta individualmente). Sin límite de importe (§4.3).
 */
export function computeTotalCentimos(
  variantPriceCentimos: number,
  instances: { elementId: string; instanceId?: string; letraChar?: string }[],
  elementsById: ReadonlyMap<string, PricedElement>,
): number {
  let total = variantPriceCentimos;
  for (const inst of instances) {
    const el = elementsById.get(inst.elementId);
    if (!el) throw new Error(`Elemento desconocido: ${inst.elementId}`);
    total += el.precioCentimos;
  }
  return total;
}

/** Desglose consultable desde el PriceTag (§6.7). */
export function computeBreakdown(
  caseLabel: string,
  variantPriceCentimos: number,
  instances: { elementId: string; instanceId?: string; letraChar?: string }[],
  elementsById: ReadonlyMap<string, PricedElement>,
): PriceBreakdown {
  const lines: PriceLine[] = [{ label: caseLabel, centimos: variantPriceCentimos }];
  for (const inst of instances) {
    const el = elementsById.get(inst.elementId);
    if (!el) continue;
    const label = inst.letraChar ? `${el.nombre} «${inst.letraChar}»` : el.nombre;
    lines.push({ label, centimos: el.precioCentimos, instanceId: inst.instanceId });
  }
  return {
    lines,
    totalCentimos: lines.reduce((acc, l) => acc + l.centimos, 0),
  };
}

/** Formatea céntimos como precio en EUR (es-ES): 2490 → "24,90 €". */
export function formatCentimos(centimos: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimos / 100);
}
