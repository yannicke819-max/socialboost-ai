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
        // border tokens use raw rgba via CSS var; consume via 'border-border' utility
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          fg: 'hsl(var(--brand-fg) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
          // Backward-compat aliases for existing pages (#5c shipped with brand-500/600/50)
          // To be cleaned up in #5b landing redesign sweep
          50: 'hsl(var(--brand) / 0.1)',
          500: 'hsl(var(--brand) / <alpha-value>)',
          600: 'hsl(var(--brand) / <alpha-value>)',
          900: 'hsl(var(--brand-soft) / <alpha-value>)',
        },
        amber: {
          DEFAULT: 'hsl(var(--amber) / <alpha-value>)',
          soft: 'hsl(var(--amber-soft) / <alpha-value>)',
        },
        accent: 'hsl(var(--accent) / <alpha-value>)',
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
        soft: '0 1px 2px rgb(var(--shadow-rgb) / 0.4), 0 4px 12px rgb(var(--shadow-rgb) / 0.3)',
        card: '0 2px 4px rgb(var(--shadow-rgb) / 0.4), 0 12px 24px rgb(var(--shadow-rgb) / 0.4), 0 0 0 1px hsl(var(--border-strong))',
        pop: '0 4px 8px rgb(var(--shadow-rgb) / 0.5), 0 24px 48px rgb(var(--shadow-rgb) / 0.6)',
        glow: '0 0 0 1px hsl(var(--brand) / 0.45), 0 0 32px hsl(var(--brand) / 0.25)',
        'glow-amber': '0 0 0 1px hsl(var(--amber) / 0.45), 0 0 32px hsl(var(--amber) / 0.25)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
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
        pulse_dot: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        marquee: 'marquee 40s linear infinite',
        'pulse-dot': 'pulse_dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
