'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Input,
  Modal,
  PriceTag,
  Skeleton,
  SkeletonGrid,
  Stepper,
  Tabs,
  useToast,
  type SheetPosition,
} from '@/components/ui';

/** Demo de componentes (SS5.1): solo desarrollo. */
export default function DevUiPage() {
  const t = useTranslations();
  const { showToast } = useToast();
  const [chipOn, setChipOn] = useState(true);
  const [inputValue, setInputValue] = useState('Coquette');
  const [tab, setTab] = useState('uno');
  const [modalOpen, setModalOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetPosition>('collapsed');
  const [qty, setQty] = useState(2);
  const [price, setPrice] = useState(2495);

  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-4 py-10 pb-40">
      <h1 className="font-display text-[28px] font-semibold text-text">{t('devui.titulo')}</h1>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Button</h2>
        <div className="flex flex-wrap gap-2">
          <Button>primary md</Button>
          <Button size="lg">primary lg</Button>
          <Button variant="secondary">secondary</Button>
          <Button variant="ghost">ghost</Button>
          <Button variant="danger">danger</Button>
          <Button loading>loading</Button>
          <Button disabled>disabled</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Input</h2>
        <Input
          label={t('editor.renombrar')}
          value={inputValue}
          maxLength={40}
          showCount
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Input label={t('auth.email')} value="" error={t('auth.emailInvalido')} readOnly />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Chip / Badge</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={chipOn} onClick={() => setChipOn(!chipOn)}>
            {t('fundas.materiales.silicona')}
          </Chip>
          <Chip selected={false}>{t('fundas.materiales.rigida')}</Chip>
          <Badge variant="tresD">{t('common.badges.tresD')}</Badge>
          <Badge variant="sticker">{t('common.badges.sticker')}</Badge>
          <Badge variant="nuevo">{t('common.badges.nuevo')}</Badge>
          <Badge variant="noDisponible">{t('common.badges.noDisponible')}</Badge>
          <Badge variant="casa">{t('common.badges.disenoCasa')}</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Tabs</h2>
        <Tabs
          label="demo"
          tabs={[
            { id: 'uno', label: t('galeria.semana') },
            { id: 'dos', label: t('galeria.recientes') },
          ]}
          active={tab}
          onChange={setTab}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Toast / Modal</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => showToast(t('toasts.T01'), 'success')}>
            success
          </Button>
          <Button variant="secondary" onClick={() => showToast(t('toasts.T15'), 'error')}>
            error
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            modal
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('toasts.T16')}>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.acciones.cancelar')}
            </Button>
            <Button onClick={() => setModalOpen(false)}>{t('common.acciones.continuar')}</Button>
          </div>
        </Modal>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Stepper / PriceTag</h2>
        <div className="flex items-center gap-6">
          <Stepper value={qty} label={t('cesta.unidades')} onChange={setQty} onRemove={() => setQty(1)} />
          <button type="button" onClick={() => setPrice((p) => p + 195)}>
            <PriceTag centimos={price} />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Skeleton / EmptyState</h2>
        <Skeleton className="h-10 w-1/2" />
        <SkeletonGrid count={2} />
        <EmptyState
          title={t('misDisenos.vacioTitulo')}
          action={<Button>{t('misDisenos.vacioCta')}</Button>}
        />
      </section>

      <BottomSheet
        position={sheet}
        onPositionChange={setSheet}
        header={<p className="text-sm font-medium">BottomSheet</p>}
      >
        <div className="space-y-2 p-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </BottomSheet>
    </main>
  );
}
