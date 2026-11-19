/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          bg: '#f7faf6',
          subtle: '#f0f5ee',
          mint: '#e2f1e5',
          'mint-light': '#ebf5ed',
          'mint-dark': '#24824d',
          border: '#dde8de',
          'border-strong': '#c8dacb',
        },
        forest: {
          text: '#0e291e',
          'text-secondary': '#476253',
          'text-muted': '#799484',
          dark: '#0a2017',
          accent: '#164e33',
          surface: '#ffffff',
        },
        lime: {
          from: '#d3ea67',
          to: '#a4db68',
          hover: '#b5e570',
        },
        verdict: {
          supported: '#156938',
          'supported-bg': '#e5f6e9',
          'supported-border': '#bcebc5',
          partially: '#1a6468',
          'partially-bg': '#e1f4f4',
          'partially-border': '#b8e5e5',
          unsupported: '#8a5b10',
          'unsupported-bg': '#fef5e4',
          'unsupported-border': '#f6e0b3',
          contradictory: '#9c3224',
          'contradictory-bg': '#fdf0ee',
          'contradictory-border': '#f8cac4',
          outdated: '#6b3fa0',
          'outdated-bg': '#f5eefc',
          'outdated-border': '#dcc9f4',
          insufficient: '#4e6457',
          'insufficient-bg': '#eef4f0',
          'insufficient-border': '#d3dfd7',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(18, 52, 36, 0.04), 0 1px 3px -1px rgba(18, 52, 36, 0.03)',
        'card': '0 8px 24px -4px rgba(18, 52, 36, 0.05), 0 2px 6px -1px rgba(18, 52, 36, 0.03)',
        'glow-lime': '0 4px 16px 0 rgba(164, 219, 104, 0.35)',
        'modal': '0 20px 40px -8px rgba(14, 41, 30, 0.12), 0 6px 16px -4px rgba(14, 41, 30, 0.08)',
      },
      transitionDuration: {
        'button': '140ms',
        'nav': '180ms',
        'modal': '180ms',
        'page': '200ms',
      }
    },
  },
  plugins: [],
}
