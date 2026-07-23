'use client';

import { useRef, useState } from 'react';
import type { Polygon } from '@/lib/collision';

export interface PolygonEditorProps {
  /** Polígono en mm. Para hitboxes, origen = centro; para cámara, esq. sup. izq. */
  value: Polygon;
  onChange: (poly: Polygon) => void;
  /** Ancho/alto del lienzo de referencia en mm. */
  widthMm: number;
  heightMm: number;
  /** true si el origen del polígono es el centro del lienzo (hitbox). */
  centered?: boolean;
}

const VIEW = 280;

/**
 * Editor visual de polígonos (§11): arrastrar vértices, añadir con doble clic
 * sobre una arista, eliminar con clic derecho. Usado para zona de cámara y
 * ajuste manual de hitboxes.
 */
export function PolygonEditor({ value, onChange, widthMm, heightMm, centered = false }: PolygonEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const scale = VIEW / Math.max(widthMm, heightMm);
  const ox = centered ? (VIEW - widthMm * scale) / 2 + (widthMm * scale) / 2 : (VIEW - widthMm * scale) / 2;
  const oy = centered ? (VIEW - heightMm * scale) / 2 + (heightMm * scale) / 2 : (VIEW - heightMm * scale) / 2;

  const toSvg = (p: { x: number; y: number }) => ({ x: ox + p.x * scale, y: oy + p.y * scale });
  const fromSvg = (x: number, y: number) => ({
    x: Math.round(((x - ox) / scale) * 10) / 10,
    y: Math.round(((y - oy) / scale) * 10) / 10,
  });

  const pointerPos = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW,
      y: ((e.clientY - rect.top) / rect.height) * VIEW,
    };
  };

  const points = value.map(toSvg);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-72 w-72 touch-none rounded-thumb border-2 border-pink-200 bg-white"
      onPointerMove={(e) => {
        if (dragIdx === null) return;
        const { x, y } = pointerPos(e);
        const next = [...value];
        next[dragIdx] = fromSvg(x, y);
        onChange(next);
      }}
      onPointerUp={() => setDragIdx(null)}
      onPointerLeave={() => setDragIdx(null)}
      onDoubleClick={(e) => {
        // añadir vértice al final
        const rect = svgRef.current!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * VIEW;
        const y = ((e.clientY - rect.top) / rect.height) * VIEW;
        onChange([...value, fromSvg(x, y)]);
      }}
    >
      {/* contorno de referencia */}
      <rect
        x={centered ? ox - (widthMm * scale) / 2 : ox}
        y={centered ? oy - (heightMm * scale) / 2 : oy}
        width={widthMm * scale}
        height={heightMm * scale}
        fill="#FFF5FA"
        stroke="#FFC9E3"
        strokeDasharray="4 3"
      />
      <path d={path} fill="rgba(245,37,156,0.15)" stroke="#F5259C" strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={6}
          fill={dragIdx === i ? '#C71585' : '#FF69B4'}
          className="cursor-move"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as Element).setPointerCapture(e.pointerId);
            setDragIdx(i);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (value.length > 3) onChange(value.filter((_, j) => j !== i));
          }}
        />
      ))}
    </svg>
  );
}
