import type { Config } from 'tailwindcss';

/**
 * Design tokens de Cute Cases (§2.2–§2.4 de la especificación).
 * Los valores viven también como CSS custom properties en src/styles/tokens.css;
 * aquí se mapean al theme de Tailwind para usarlos como utilidades.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50: 'var(--pink-50)',
          100: 'var(--pink-100)',
          200: 'var(--pink-200)',
          300: 'var(--pink-300)',
          500: 'var(--pink-500)',
          600: 'var(--pink-600)',
          700: 'var(--pink-700)',
        },
        surface: 'var(--surface)',
        text: 'var(--text)',
        'text-soft': 'var(--text-soft)',
        error: 'var(--error)',
        'error-bg': 'var(--error-bg)',
        success: 'var(--success)',
        focus: 'var(--focus)',
      },
      fontFamily: {
        display: ['var(--font-fredoka)', 'Baloo 2', 'Quicksand', 'ui-rounded', 'sans-serif'],
        body: ['var(--font-nunito)', 'ui-rounded', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        card: '24px',
        sheet: '28px',
        thumb: '16px',
        toast: '20px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(199,21,133,.08)',
        md: '0 6px 20px rgba(199,21,133,.12)',
        lg: '0 12px 32px rgba(199,21,133,.16)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        // escala 4px ya cubierta por defecto de Tailwind (múltiplos de 0.25rem)
      },
    },
  },
  plugins: [],
};

export default config;
