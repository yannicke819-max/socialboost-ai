import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'hsl(var(--bg) / <alpha-value>)',
          elevated: 'hsl(var(--bg-elevated) / <alpha-value>)',
          muted: 'hsl(var(--bg-muted) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'hsl(var(--fg) / <alpha-value>)',
          muted: 'hsl(var(--fg-muted) / <alpha-value>)',
          subtle: 'hsl(var(--fg-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'hsl(var(--border) / <alpha-value>)',
          strong: 'hsl(var(--border-strong) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          fg: 'hsl(var(--brand-fg) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
        },
        accent: 'hsl(var(--accent) / <alpha-value>)',
        lime: 'hsl(var(--lime) / <alpha-value>)',
        violet: 'hsl(var(--violet) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '20px',
        xl: '28px',
        '2xl': '32px',
      },
      boxShadow: {
        soft:
          '0 1px 2px rgb(var(--shadow-rgb) / 0.04), 0 4px 12px rgb(var(--shadow-rgb) / 0.04)',
        card:
          '0 2px 4px rgb(var(--shadow-rgb) / 0.04), 0 12px 24px rgb(var(--shadow-rgb) / 0.06), 0 0 0 1px rgb(var(--shadow-rgb) / 0.04)',
        pop:
          '0 4px 8px rgb(var(--shadow-rgb) / 0.06), 0 24px 48px rgb(var(--shadow-rgb) / 0.10)',
        glow: '0 0 0 1px hsl(var(--brand) / 0.4), 0 0 32px hsl(var(--brand) / 0.2)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
