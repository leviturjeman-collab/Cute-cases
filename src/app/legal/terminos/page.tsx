import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Términos y condiciones' };

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-4">Términos y condiciones</h1>
        <Card className="mb-6 bg-pink-50">
          <h2 className="mb-2">Versión para humanos 💖</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>Cute Cases sirve para diseñar y (pronto) comprar fundas personalizadas.</li>
            <li>Tus diseños son para ti; no publiques nada ofensivo en la galería.</li>
            <li>Podemos retirar de la galería contenido que incumpla estas normas.</li>
            <li>La compra online llegará en una fase próxima; los precios mostrados son informativos.</li>
          </ul>
        </Card>
        <Card>
          <div className="flex flex-col gap-4 text-sm">
            <section>
              <h3>1. Objeto</h3>
              <p>
                Estos términos regulan el uso de la web de Cute Cases: el editor de diseños, las
                cuentas de usuario, la galería y la cesta. El proceso de compra y pago se activará en
                una fase posterior y tendrá sus propias condiciones de venta.
              </p>
            </section>
            <section>
              <h3>2. Uso de la galería</h3>
              <p>
                Publicar un diseño en la galería es siempre voluntario y revocable. No está permitido
                publicar contenido ofensivo, que infrinja derechos de terceros o inapropiado para
                menores. Existe un botón de reporte y moderamos activamente.
              </p>
            </section>
            <section>
              <h3>3. Propiedad intelectual</h3>
              <p>
                Los elementos decorativos, la marca y el software son de Cute Cases. Tus
                combinaciones y diseños te pertenecen para tu uso personal.
              </p>
            </section>
            <section>
              <h3>4. Disponibilidad</h3>
              <p>
                Los elementos de temporada pueden dejar de estar disponibles; si un diseño guardado
                contiene elementos caducados, la web te lo indicará y te ayudará a sustituirlos.
              </p>
            </section>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
