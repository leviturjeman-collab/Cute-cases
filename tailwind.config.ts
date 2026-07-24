import type { Config } from 'tailwindcss';

/**
 * Theme de Tailwind espejando los tokens v4 (§3.2–§3.4).
 * Radios: botones/inputs 10, tarjetas 16, paneles/sheets 20, miniaturas 12,
 * toasts 12. La estética píldora está descartada.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        pink: {
          100: 'var(--pink-100)',
          300: 'var(--pink-300)',
          500: 'var(--pink-500)',
          700: 'var(--pink-700)',
          800: 'var(--pink-800)',
        },
        text: 'var(--text)',
        'text-soft': 'var(--text-soft)',
        'text-disabled': 'var(--text-disabled)',
        border: 'var(--border)',
        error: 'var(--error)',
        'error-bg': 'var(--error-bg)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        control: '10px',
        card: '16px',
        sheet: '20px',
        thumb: '12px',
        toast: '12px',
        badge: '6px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
