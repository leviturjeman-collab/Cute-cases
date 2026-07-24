import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  { href: '/admin/dispositivos', label: 'Dispositivos' },
  { href: '/admin/fundas', label: 'Fundas' },
  { href: '/admin/elementos', label: 'Elementos' },
  { href: '/admin/letras', label: 'Letras' },
  { href: '/admin/temporadas', label: 'Temporadas' },
  { href: '/admin/preestablecidos', label: 'Preestablecidos' },
  { href: '/admin/galeria', label: 'Galería' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/ajustes', label: 'Ajustes' },
  { href: '/admin/auditoria', label: 'Auditoría' },
];

/**
 * Panel de administración (§11): acceso solo rol admin, comprobado en servidor
 * (además de en cada endpoint). UI sobria del design system.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.rol !== 'admin') redirect('/');

  return (
    <div className="flex min-h-dvh bg-surface-2">
      <aside className="hidden w-52 shrink-0 border-r border-border bg-surface p-4 md:block">
        <Link href="/" className="mb-6 block font-display text-lg font-semibold text-pink-700">
          Cute Cases · Admin
        </Link>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-thumb px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-surface p-2 md:hidden">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="shrink-0 rounded-control px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
