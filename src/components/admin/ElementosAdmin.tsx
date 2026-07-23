'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Polygon } from '@/lib/collision';
import { rectHitbox } from '@/lib/collision';
import { hitboxFromImage } from '@/lib/hitboxAutogen';
import { PolygonEditor } from '@/components/admin/PolygonEditor';
import { AdminButton, AdminTable, Field, inputCls } from '@/components/admin/adminUi';
import { formatCentimos } from '@/lib/pricing';

const CATEGORIAS = [
  'letras', 'corazones', 'lazos', 'flores', 'frutas', 'animales', 'estrellas', 'cadenas', 'temporada',
] as const;

interface ElementRow {
  id: string;
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria: string;
  precioCentimos: number;
  anchoMm: number;
  altoMm: number;
  profundidadMm: number | null;
  assetUrl: string;
  hitbox: Polygon;
  activo: boolean;
  esNuevo: boolean;
  orden: number;
  seasonId: string | null;
  letraChar: string | null;
  season: { nombre: string; emoji: string } | null;
}

interface Season {
  id: string;
  nombre: string;
  emoji: string;
}

type ElementForm = Omit<ElementRow, 'id' | 'season'> & { id?: string };

const emptyElement: ElementForm = {
  nombre: '',
  tipo: 'charm3d',
  categoria: 'corazones',
  precioCentimos: 250,
  anchoMm: 12,
  altoMm: 12,
  profundidadMm: 4,
  assetUrl: '',
  hitbox: rectHitbox(12, 12),
  activo: false,
  esNuevo: false,
  orden: 0,
  seasonId: null,
  letraChar: null,
};

/**
 * Admin · Elementos (§11): CRUD con hitbox autogenerada desde la silueta del
 * PNG (casco convexo + Douglas-Peucker) y editor de vértices manual.
 */
function ElementosAdmin({ soloLetras = false }: { soloLetras?: boolean }) {
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [editing, setEditing] = useState<ElementForm | null>(null);
  const filtroCategoria = soloLetras ? 'letras' : (params.get('categoria') ?? '');

  const { data } = useQuery({
    queryKey: ['admin-elements'],
    queryFn: () => api<{ elements: ElementRow[] }>('/api/admin/elements'),
  });
  const { data: seasonsData } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: () => api<{ seasons: Season[] }>('/api/admin/seasons'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-elements'] });

  const save = useMutation({
    mutationFn: async (el: ElementForm) => {
      const { id, ...body } = el;
      if (id) await api(`/api/admin/elements/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/elements', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/elements/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const list = (data?.elements ?? []).filter((el) =>
    filtroCategoria ? el.categoria === filtroCategoria : true,
  );
  const e = editing;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{soloLetras ? 'Letras' : 'Elementos'}</h1>
        <AdminButton
          onClick={() =>
            setEditing(
              soloLetras
                ? { ...emptyElement, categoria: 'letras', anchoMm: 9, altoMm: 11, letraChar: 'A', precioCentimos: 150 }
                : { ...emptyElement },
            )
          }
        >
          + Nuevo
        </AdminButton>
      </div>

      {e && (
        <form
          className="mb-6 grid gap-3 rounded-thumb border border-pink-200 bg-white p-4 md:grid-cols-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            save.mutate(e);
          }}
        >
          <Field label="Nombre">
            <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
          </Field>
          <Field label="Tipo">
            <select className={inputCls} value={e.tipo} onChange={(ev) => setEditing({ ...e, tipo: ev.target.value as 'charm3d' | 'plano' })}>
              <option value="charm3d">charm3d (con volumen)</option>
              <option value="plano">plano (sticker)</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={e.categoria} onChange={(ev) => setEditing({ ...e, categoria: ev.target.value })}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Precio (céntimos)">
            <input type="number" className={inputCls} value={e.precioCentimos} onChange={(ev) => setEditing({ ...e, precioCentimos: Number(ev.target.value) })} />
          </Field>
          <Field label="Ancho mm">
            <input type="number" step="0.1" className={inputCls} value={e.anchoMm} onChange={(ev) => setEditing({ ...e, anchoMm: Number(ev.target.value) })} />
          </Field>
          <Field label="Alto mm">
            <input type="number" step="0.1" className={inputCls} value={e.altoMm} onChange={(ev) => setEditing({ ...e, altoMm: Number(ev.target.value) })} />
          </Field>
          <Field label="Profundidad mm (charms)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={e.profundidadMm ?? ''}
              onChange={(ev) => setEditing({ ...e, profundidadMm: ev.target.value ? Number(ev.target.value) : null })}
            />
          </Field>
          <Field label="Asset (GLB/PNG o procedural://)">
            <input className={inputCls} value={e.assetUrl} onChange={(ev) => setEditing({ ...e, assetUrl: ev.target.value })} />
          </Field>
          <Field label="Letra (solo letras)">
            <input
              className={inputCls}
              maxLength={1}
              value={e.letraChar ?? ''}
              onChange={(ev) => setEditing({ ...e, letraChar: ev.target.value.toUpperCase() || null })}
            />
          </Field>
          <Field label="Colección de temporada">
            <select
              className={inputCls}
              value={e.seasonId ?? ''}
              onChange={(ev) => setEditing({ ...e, seasonId: ev.target.value || null })}
            >
              <option value="">— permanente —</option>
              {seasonsData?.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Orden">
            <input type="number" className={inputCls} value={e.orden} onChange={(ev) => setEditing({ ...e, orden: Number(ev.target.value) })} />
          </Field>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-1 text-sm font-bold">
              <input type="checkbox" checked={e.activo} onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })} /> Activo
            </label>
            <label className="flex items-center gap-1 text-sm font-bold">
              <input type="checkbox" checked={e.esNuevo} onChange={(ev) => setEditing({ ...e, esNuevo: ev.target.checked })} /> Badge Nuevo
            </label>
          </div>

          <div className="md:col-span-3">
            <p className="mb-1 text-sm font-bold">Hitbox (mm, origen = centro)</p>
            <div className="mb-2 flex flex-wrap gap-2">
              <AdminButton variant="secondary" onClick={() => setEditing({ ...e, hitbox: rectHitbox(e.anchoMm, e.altoMm) })}>
                Rectángulo
              </AdminButton>
              <label className="cursor-pointer rounded-pill border border-pink-300 bg-white px-4 py-1.5 text-sm font-bold text-pink-700">
                Autogenerar desde PNG…
                <input
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    const hitbox = await hitboxFromImage(file, e.anchoMm, e.altoMm);
                    setEditing({ ...e, hitbox });
                  }}
                />
              </label>
            </div>
            <PolygonEditor
              value={e.hitbox}
              onChange={(hitbox) => setEditing({ ...e, hitbox })}
              widthMm={Math.max(e.anchoMm * 1.4, 10)}
              heightMm={Math.max(e.altoMm * 1.4, 10)}
              centered
            />
          </div>
          <div className="flex gap-2 md:col-span-3">
            <AdminButton type="submit" disabled={save.isPending}>Guardar</AdminButton>
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>Cancelar</AdminButton>
          </div>
        </form>
      )}

      <AdminTable headers={['Nombre', 'Tipo', 'Categoría', 'mm', 'Precio', 'Activo', '']}>
        {list.map((el) => (
          <tr key={el.id} className="border-b border-pink-50">
            <td className="px-3 py-1.5 font-bold">
              {el.letraChar ? `${el.nombre} «${el.letraChar}»` : el.nombre}{' '}
              {el.season && <span title={el.season.nombre}>{el.season.emoji}</span>}
              {el.esNuevo && ' 🆕'}
            </td>
            <td className="px-3 py-1.5">{el.tipo}</td>
            <td className="px-3 py-1.5">{el.categoria}</td>
            <td className="px-3 py-1.5">
              {el.anchoMm}×{el.altoMm}
            </td>
            <td className="px-3 py-1.5">{formatCentimos(el.precioCentimos)}</td>
            <td className="px-3 py-1.5">{el.activo ? '✅' : '—'}</td>
            <td className="px-3 py-1.5 text-right">
              <span className="flex justify-end gap-2">
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    const { season: _season, ...rest } = el;
                    setEditing(rest);
                  }}
                >
                  Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove.mutate(el.id)}>Eliminar</AdminButton>
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

export { ElementosAdmin };
