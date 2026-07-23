import { getRequestConfig } from 'next-intl/server';

/**
 * i18n (§12.1): locale único `es` activo, arquitectura lista para añadir
 * idiomas. Prohibido texto hardcodeado en componentes: todo pasa por
 * diccionarios en ./messages/*.json.
 */
export const LOCALES = ['es'] as const;
export const DEFAULT_LOCALE = 'es';

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
