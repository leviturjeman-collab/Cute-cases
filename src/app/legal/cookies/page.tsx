import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Política de cookies' };

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-4">Política de cookies</h1>
        <Card className="mb-6 bg-pink-50">
          <h2 className="mb-2">Versión para humanos 💖</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>Usamos lo mínimo: una cookie de sesión para tu cuenta y otra para tu cesta.</li>
            <li>La analítica solo se activa si aceptas el aviso de cookies.</li>
            <li>Rechazar es tan fácil como aceptar, y no pierdes ninguna función.</li>
          </ul>
        </Card>
        <Card>
          <div className="flex flex-col gap-4 text-sm">
            <section>
              <h3>Cookies técnicas (necesarias)</h3>
              <p>
                Sesión de usuario (autenticación) y cesta de invitado. Sin ellas la web no puede
                funcionar y no requieren consentimiento.
              </p>
            </section>
            <section>
              <h3>Analítica (solo con tu consentimiento)</h3>
              <p>
                Usamos una herramienta de analítica respetuosa alojada en la UE para saber qué partes
                de la web gustan más. Solo se activa si aceptas el banner, y puedes cambiar de
                opinión borrando los datos del sitio en tu navegador.
              </p>
            </section>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
