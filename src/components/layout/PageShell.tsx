import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

/** Marco comun de paginas publicas (SS5.2). El editor no lo usa (sin footer). */
export function PageShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {footer && <Footer />}
    </div>
  );
}
