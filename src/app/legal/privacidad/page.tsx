import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Política de privacidad' };

/**
 * Privacidad (§13): resumen "para humanos" arriba, texto completo debajo,
 * lenguaje claro y comprensible desde 11 años.
 */
export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-4">Política de privacidad</h1>
        <Card className="mb-6 bg-pink-50">
          <h2 className="mb-2">Versión para humanos 💖</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>Solo te pedimos tu email (y tu nombre si quieres). Nada más.</li>
            <li>No pedimos tu fecha de nacimiento, teléfono ni dirección.</li>
            <li>Tus diseños son tuyos: solo aparecen en la galería si tú lo activas, y puedes quitarlos cuando quieras.</li>
            <li>Puedes borrar tu cuenta cuando quieras y se borra todo lo tuyo.</li>
            <li>Las cookies de analítica solo se usan si nos dices que sí.</li>
          </ul>
        </Card>
        <Card>
          <div className="flex flex-col gap-4 text-sm">
            <section>
              <h3>1. Responsable del tratamiento</h3>
              <p>
                Cute Cases (España) es responsable de los datos personales que nos facilitas al usar
                esta web. Puedes escribirnos para cualquier duda sobre tus datos.
              </p>
            </section>
            <section>
              <h3>2. Qué datos tratamos y para qué</h3>
              <p>
                Tratamos tu email y, si lo indicas, tu nombre, con la única finalidad de gestionar tu
                cuenta, guardar tus diseños y permitirte usar la galería y los likes. Aplicamos el
                principio de minimización de datos del RGPD: no recogemos datos innecesarios.
              </p>
            </section>
            <section>
              <h3>3. Base jurídica</h3>
              <p>
                La base es la ejecución del servicio que nos pides (art. 6.1.b RGPD) y tu
                consentimiento para la analítica (art. 6.1.a RGPD), que puedes retirar en cualquier
                momento.
              </p>
            </section>
            <section>
              <h3>4. Tus derechos</h3>
              <p>
                Puedes acceder, rectificar, suprimir, limitar u oponerte al tratamiento de tus datos.
                La eliminación de cuenta desde tus ajustes borra tus diseños y likes de forma
                permanente. También puedes reclamar ante la AEPD (aepd.es).
              </p>
            </section>
            <section>
              <h3>5. Conservación y seguridad</h3>
              <p>
                Conservamos tus datos mientras tengas cuenta. Las contraseñas se guardan cifradas con
                algoritmos modernos (argon2id) y las conexiones van siempre cifradas.
              </p>
            </section>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
