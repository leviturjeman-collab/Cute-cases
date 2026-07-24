'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api-client';
import type { Hitbox, Polygon } from '@/lib/collision';
import { rectHitbox } from '@/lib/collision';
import { recipeHitbox } from '@/lib/silhouettes';
import { PolygonEditor } from '@/components/admin/PolygonEditor';
import { AdminButton, AdminDrawer, AdminTable, Field, inputCls } from '@/components/admin/adminUi';
import { ElementThumb } from '@/editor/ElementThumb';
import { formatCentimos } from '@/lib/pricing';
import type { CatalogElement } from '@/editor/types';

const CATEGORIAS = [
  'letras',
  'corazones',
  'lazos',
  'flores',
  'frutas',
  'animales',
  'estrellas',
  'cadenas',
  'temporada',
] as const;

const ACABADOS = ['metal-oro', 'metal-plata', 'esmalte', 'cristal', 'nacar', 'vinilo'] as const;

const RECIPES = [
  'heart-extrude',
  'heart-flat',
  'heart-outline-flat',
  'star-extrude',
  'star-flat',
  'sun-extrude',
  'moon-extrude',
  'shooting-star-3d',
  'flower-3d',
  'flower-flat',
  'tulip-3d',
  'icecream-3d',
  'bouquet-flat',
  'bow-3d',
  'bow-flat',
  'bow-outline-flat',
  'cherry-3d',
  'strawberry-3d',
  'lemon-3d',
  'apple-3d',
  'banana-3d',
  'watermelon-flat',
  'pineapple-flat',
  'bear-3d',
  'cat-3d',
  'bunny-3d',
  'catface-flat',
  'butterfly-3d',
  'butterfly-flat',
  'bee-3d',
  'paw-flat',
  'umbrella-3d',
  'shell-3d',
  'constellation-flat',
  'wave-flat',
  'chain-segment',
  'pearl-strand',
  'chain-flat',
  'letter-extrude',
  'letter-flat',
];

interface ElementRow {
  id: string;
  slug: string;
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria: string;
  precioCentimos: number;
  anchoMm: number;
  altoMm: number;
  profundidadMm: number | null;
  recipe: string | null;
  recipeParams: Record<string, unknown> | null;
  assetUrl: string | null;
  hitbox: Hitbox;
  acabado: string;
  colores: string[];
  letraChar: string | null;
  esNuevo: boolean;
  orden: number;
  activo: boolean;
  seasonId: string | null;
  season: { nombre: string } | null;
}

interface Season {
  id: string;
  nombre: string;
}

type ElementForm = Omit<ElementRow, 'id' | 'season'> & { id?: string };

const emptyElement: ElementForm = {
  slug: '',
  nombre: '',
  tipo: 'charm3d',
  categoria: 'corazones',
  precioCentimos: 250,
  anchoMm: 12,
  altoMm: 12,
  profundidadMm: 4,
  recipe: 'heart-3d',
  recipeParams: null,
  assetUrl: null,
  hitbox: rectHitbox(12, 12),
  acabado: 'esmalte',
  colores: ['#E84393'],
  letraChar: null,
  esNuevo: false,
  orden: 0,
  activo: false,
  seasonId: null,
};

/**
 * Admin - Elementos (SS17): CRUD con seleccion de receta, vista previa 3D en
 * vivo, regeneracion de hitbox desde la silueta (SS11.6) y editor de vertices.
 */
export function ElementosAdmin({ soloLetras = false }: { soloLetras?: boolean }) {
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [editing, setEditing] = useState<ElementForm | null>(null);
  const [polyIdx, setPolyIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? `${err.code}: ${err.message}` : 'Error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/elements/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const hitboxAuto = useMutation({
    mutationFn: (id: string) =>
      api<{ hitbox: Hitbox }>(`/api/admin/elements/${id}/hitbox/auto`, { method: 'POST' }),
    onSuccess: (res) => {
      if (editing) setEditing({ ...editing, hitbox: res.hitbox });
      invalidate();
    },
  });

  const list = (data?.elements ?? []).filter((el) =>
    filtroCategoria ? el.categoria === filtroCategoria : true,
  );

  const e = editing;
  const previewElement: CatalogElement | null = e
    ? {
        id: e.id ?? `preview-${e.slug || 'nuevo'}-${e.recipe ?? ''}-${e.acabado}-${e.colores.join('')}-${e.anchoMm}x${e.altoMm}`,
        slug: e.slug || 'preview',
        nombre: e.nombre || 'Vista previa',
        tipo: e.tipo,
        categoria: e.categoria,
        precioCentimos: e.precioCentimos,
        anchoMm: e.anchoMm,
        altoMm: e.altoMm,
        profundidadMm: e.profundidadMm,
        recipe: e.recipe,
        recipeParams: e.recipeParams,
        assetUrl: e.assetUrl,
        hitbox: e.hitbox,
        acabado: e.acabado,
        colores: e.colores,
        letraChar: e.letraChar,
        esNuevo: e.esNuevo,
      }
    : null;

  const regenerarLocal = () => {
    if (!e?.recipe) return;
    try {
      setEditing({ ...e, hitbox: recipeHitbox(e.recipe, e.anchoMm, e.altoMm) });
      setPolyIdx(0);
    } catch {
      setError('No se pudo generar la hitbox de esa receta');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{soloLetras ? 'Letras' : 'Elementos'}</h1>
        <AdminButton
          onClick={() => {
            setEditing(
              soloLetras
                ? { ...emptyElement, categoria: 'letras', recipe: 'letter', letraChar: 'A' }
                : { ...emptyElement },
            );
            setPolyIdx(0);
          }}
        >
          Nuevo elemento
        </AdminButton>
      </div>
      {soloLetras && (
        <p className="mb-4 text-xs text-text-soft">
          Juegos de letras (SS17): receta, altura y precio por caracter. El generador expande el
          texto del usuario a un elemento por caracter (SS13.1).
        </p>
      )}

      <AdminDrawer
        open={e !== null}
        title={e?.id ? 'Editar elemento' : 'Nuevo elemento'}
        onClose={() => setEditing(null)}
      >
        {e && (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              save.mutate(e);
            }}
          >
            {/* Vista previa 3D en vivo (SS17) */}
            <div className="flex items-center gap-3 rounded-thumb border border-border bg-surface-2 p-3 md:col-span-2">
              {previewElement && <ElementThumb element={previewElement} size={72} />}
              <p className="text-xs text-text-soft">
                Vista previa renderizada con la receta y el acabado actuales.
              </p>
            </div>

            <Field label="Slug">
              <input className={inputCls} value={e.slug} onChange={(ev) => setEditing({ ...e, slug: ev.target.value })} />
            </Field>
            <Field label="Nombre">
              <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
            </Field>
            <Field label="Tipo">
              <select className={inputCls} value={e.tipo} onChange={(ev) => setEditing({ ...e, tipo: ev.target.value as 'charm3d' | 'plano' })}>
                <option value="charm3d">charm3d</option>
                <option value="plano">plano</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select className={inputCls} value={e.categoria} onChange={(ev) => setEditing({ ...e, categoria: ev.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Receta procedural (D5)">
              <select
                className={inputCls}
                value={e.recipe ?? ''}
                onChange={(ev) => setEditing({ ...e, recipe: ev.target.value || null })}
              >
                <option value="">(GLB externo)</option>
                {RECIPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Acabado">
              <select className={inputCls} value={e.acabado} onChange={(ev) => setEditing({ ...e, acabado: ev.target.value })}>
                {ACABADOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Colores (hex separados por coma)">
              <input
                className={inputCls}
                value={e.colores.join(',')}
                onChange={(ev) =>
                  setEditing({
                    ...e,
                    colores: ev.target.value
                      .split(',')
                      .map((c) => c.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Precio (centimos)">
              <input type="number" className={inputCls} value={e.precioCentimos} onChange={(ev) => setEditing({ ...e, precioCentimos: Number(ev.target.value) })} />
            </Field>
            <Field label="Ancho (mm)">
              <input type="number" step="0.1" className={inputCls} value={e.anchoMm} onChange={(ev) => setEditing({ ...e, anchoMm: Number(ev.target.value) })} />
            </Field>
            <Field label="Alto (mm)">
              <input type="number" step="0.1" className={inputCls} value={e.altoMm} onChange={(ev) => setEditing({ ...e, altoMm: Number(ev.target.value) })} />
            </Field>
            <Field label="Profundidad (mm, charm3d)">
              <input
                type="number"
                step="0.1"
                className={inputCls}
                value={e.profundidadMm ?? ''}
                onChange={(ev) => setEditing({ ...e, profundidadMm: ev.target.value ? Number(ev.target.value) : null })}
              />
            </Field>
            <Field label="Letra (solo juego de letras)">
              <input
                className={inputCls}
                maxLength={1}
                value={e.letraChar ?? ''}
                onChange={(ev) => setEditing({ ...e, letraChar: ev.target.value.toUpperCase() || null })}
              />
            </Field>
            <Field label="Temporada">
              <select
                className={inputCls}
                value={e.seasonId ?? ''}
                onChange={(ev) => setEditing({ ...e, seasonId: ev.target.value || null })}
              >
                <option value="">(ninguna)</option>
                {seasonsData?.seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orden">
              <input type="number" className={inputCls} value={e.orden} onChange={(ev) => setEditing({ ...e, orden: Number(ev.target.value) })} />
            </Field>

            <div className="md:col-span-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Hitbox (poligonos convexos, origen centro)</p>
                <AdminButton variant="secondary" onClick={regenerarLocal} disabled={!e.recipe}>
                  Regenerar desde la silueta
                </AdminButton>
                {e.id && (
                  <AdminButton
                    variant="secondary"
                    onClick={() => hitboxAuto.mutate(e.id!)}
                    disabled={hitboxAuto.isPending || !e.recipe}
                  >
                    Regenerar en servidor
                  </AdminButton>
                )}
              </div>
              <div className="mb-2 flex gap-1.5">
                {e.hitbox.map((_, i) => (
                  <AdminButton
                    key={i}
                    variant={polyIdx === i ? 'primary' : 'secondary'}
                    onClick={() => setPolyIdx(i)}
                  >
                    {i + 1}
                  </AdminButton>
                ))}
              </div>
              {e.hitbox[polyIdx] && (
                <PolygonEditor
                  value={e.hitbox[polyIdx]!}
                  onChange={(poly: Polygon) => {
                    const next = [...e.hitbox];
                    next[polyIdx] = poly;
                    setEditing({ ...e, hitbox: next });
                  }}
                  widthMm={Math.max(e.anchoMm, 1)}
                  heightMm={Math.max(e.altoMm, 1)}
                  centered
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={e.activo} onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })} />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={e.esNuevo} onChange={(ev) => setEditing({ ...e, esNuevo: ev.target.checked })} />
              Badge Nuevo
            </label>
            {error && <p className="text-sm text-error md:col-span-2">{error}</p>}
            <div className="flex gap-2 md:col-span-2">
              <AdminButton type="submit" disabled={save.isPending}>
                Guardar
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </AdminButton>
            </div>
          </form>
        )}
      </AdminDrawer>

      <AdminTable headers={['Elemento', 'Categoria', 'Receta', 'mm', 'Precio', 'Estado', '']}>
        {list.map((el) => (
          <tr key={el.id} className="border-b border-border">
            <td className="px-3 py-2 font-semibold">
              {el.nombre}
              {el.letraChar ? ` (${el.letraChar})` : ''}
              <span className="ml-1 text-xs font-normal text-text-soft">/{el.slug}</span>
            </td>
            <td className="px-3 py-2">
              {el.categoria}
              {el.season ? ` - ${el.season.nombre}` : ''}
            </td>
            <td className="px-3 py-2 text-xs">{el.recipe ?? 'GLB'}</td>
            <td className="tabular px-3 py-2">
              {el.anchoMm}x{el.altoMm}
            </td>
            <td className="tabular px-3 py-2">{formatCentimos(el.precioCentimos)}</td>
            <td className="px-3 py-2">
              {el.activo ? 'Activo' : 'Inactivo'}
              {el.esNuevo ? ' - Nuevo' : ''}
            </td>
            <td className="px-3 py-2 text-right">
              <span className="flex justify-end gap-2">
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    setEditing({ ...el, colores: el.colores ?? [] });
                    setPolyIdx(0);
                    setError(null);
                  }}
                >
                  Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove.mutate(el.id)}>
                  Eliminar
                </AdminButton>
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
